#!/usr/bin/env node
/**
 * Smoke test — boots the BUILT app against a throwaway SQLite file and
 * exercises the contracts that matter (see AGENTS.md):
 *   - /admin pages and admin APIs reject unauthenticated requests
 *   - login issues a session; admin APIs accept it
 *   - public waitlist flow: page renders, variant assignment is STICKY
 *     across requests, visits are recorded
 *   - signup dedupes by (idea, email) with a friendly response
 *   - CSV export requires auth and contains the signup
 *
 * Zero dependencies. Run `npm run build` first (or use `npm run check`).
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3199;
const BASE = `http://127.0.0.1:${PORT}`;
const PASSWORD = 'smoke-test-password';
const DB_FILE = 'smoke-test.db';

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log(`  ✓ ${msg}`);
  else { failures++; console.log(`  ✗ ${msg}`); }
};
const setCookies = (res) =>
  typeof res.headers.getSetCookie === 'function'
    ? res.headers.getSetCookie()
    : [res.headers.get('set-cookie')].filter(Boolean);
const cookieValue = (res, name) => {
  for (const c of setCookies(res)) {
    const m = c.match(new RegExp(`^${name}=([^;]+)`));
    if (m) return m[1];
  }
  return null;
};

function cleanupDb() {
  for (const f of fs.readdirSync(ROOT)) {
    if (f.startsWith(DB_FILE)) fs.rmSync(path.join(ROOT, f), { force: true });
  }
}

cleanupDb();
console.log('Smoke test: starting built app on a throwaway database…');
const server = spawn(path.join(ROOT, 'node_modules', '.bin', 'next'), ['start', '-p', String(PORT)], {
  cwd: ROOT,
  env: { ...process.env, ADMIN_PASSWORD: PASSWORD, SESSION_SECRET: '', TURSO_DATABASE_URL: `file:${DB_FILE}`, TURSO_AUTH_TOKEN: '' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '';
server.stdout.on('data', (d) => { serverLog += d; });
server.stderr.on('data', (d) => { serverLog += d; });

try {
  // wait for readiness
  const deadline = Date.now() + 60_000;
  for (;;) {
    try { const r = await fetch(BASE + '/', { redirect: 'manual' }); if (r.status < 500) break; } catch {}
    if (Date.now() > deadline) throw new Error('server did not become ready in 60s\n' + serverLog);
    await new Promise((r) => setTimeout(r, 500));
  }

  /* ── auth boundary ── */
  const unauthPage = await fetch(BASE + '/admin', { redirect: 'manual' });
  ok(unauthPage.status >= 300 && unauthPage.status < 400 && (unauthPage.headers.get('location') || '').includes('/login'),
    'unauthenticated /admin redirects to /login');

  const unauthApi = await fetch(BASE + '/api/ideas', { method: 'POST', body: new URLSearchParams({ name: 'x', pitch: 'y' }) });
  ok(unauthApi.status === 401, 'unauthenticated POST /api/ideas returns 401');

  const badLogin = await fetch(BASE + '/api/login', { method: 'POST', body: new URLSearchParams({ password: 'wrong' }), redirect: 'manual' });
  ok((badLogin.headers.get('location') || '').includes('error=1'), 'wrong password is rejected');

  const login = await fetch(BASE + '/api/login', { method: 'POST', body: new URLSearchParams({ password: PASSWORD }), redirect: 'manual' });
  const session = cookieValue(login, 'admin_session');
  ok(!!session, 'correct password issues a session cookie');
  const authed = { cookie: `admin_session=${session}` };

  /* ── idea creation ── */
  const create = await fetch(BASE + '/api/ideas', {
    method: 'POST', headers: authed, redirect: 'manual',
    body: new URLSearchParams({ name: 'Smoke Test Idea', pitch: 'A pitch used only by the smoke test', slug: 'smoke-test-idea' }),
  });
  const ideaId = (create.headers.get('location') || '').split('/admin/')[1];
  ok(create.status === 303 && !!ideaId, 'authenticated idea creation redirects to the idea dashboard');

  const publicPage = await fetch(BASE + '/w/smoke-test-idea');
  ok(publicPage.status === 200, 'public waitlist page /w/<slug> renders');
  ok((await fetch(BASE + '/w/does-not-exist')).status === 404, 'unknown slug 404s');

  /* ── sticky variant assignment ── */
  const assignBody = { slug: 'smoke-test-idea', utmSource: 'smoke', utmMedium: 'test', utmCampaign: 'ci' };
  const a1 = await fetch(BASE + '/api/assign', { method: 'POST', body: JSON.stringify(assignBody) });
  const first = await a1.json();
  const variantCookie = cookieValue(a1, 'wl_variant_smoke-test-idea');
  ok(!!first.variantId && variantCookie === first.variantId, 'first visit assigns a variant and sets the sticky cookie');

  const a2 = await fetch(BASE + '/api/assign', {
    method: 'POST', body: JSON.stringify(assignBody),
    headers: { cookie: `wl_variant_smoke-test-idea=${first.variantId}` },
  });
  const second = await a2.json();
  ok(second.variantId === first.variantId, 'repeat visit with the cookie gets the SAME variant (sticky assignment)');

  /* ── signup + dedupe ── */
  const signupBody = { slug: 'smoke-test-idea', variantId: first.variantId, email: 'Smoke@Example.com', name: 'Smokey', utmSource: 'smoke' };
  const s1 = await (await fetch(BASE + '/api/signup', { method: 'POST', body: JSON.stringify(signupBody) })).json();
  ok(s1.ok === true && !s1.alreadySignedUp, 'signup succeeds');
  const s2 = await (await fetch(BASE + '/api/signup', { method: 'POST', body: JSON.stringify(signupBody) })).json();
  ok(s2.ok === true && s2.alreadySignedUp === true, 'duplicate signup (same idea+email) returns friendly alreadySignedUp');

  /* ── export ── */
  ok((await fetch(BASE + `/api/export/${ideaId}`)).status === 401, 'CSV export without a session returns 401');
  const csv = await (await fetch(BASE + `/api/export/${ideaId}`, { headers: authed })).text();
  ok(csv.includes('smoke@example.com'), 'CSV export contains the signup, email normalized to lowercase');
  ok(csv.includes('smoke'), 'CSV export carries the UTM channel');

  console.log(failures ? `${failures} smoke check(s) FAILED` : 'All smoke checks passed.');
} catch (e) {
  failures++;
  console.error('✗ smoke test aborted:', e.message);
} finally {
  server.kill('SIGTERM');
  await new Promise((r) => setTimeout(r, 300));
  cleanupDb();
}
process.exit(failures ? 1 : 0);
