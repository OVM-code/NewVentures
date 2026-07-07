<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Waitlist Lab — maintainer contract

This app runs **in production with live data**: real signups (emails of interested
people) and real experiment metrics live in a Turso database. Code changes here can
silently corrupt experiments or lose signups. Read this before changing anything;
`README.md` explains what the product does.

## The contract

**1. There is no migration system — schema changes are manual and additive.**
`lib/db.ts` runs `CREATE TABLE IF NOT EXISTS` on first request. That statement does
**nothing** to a table that already exists, so editing a column definition in `db.ts`
silently leaves production unchanged. To change the schema: add an idempotent,
additive migration to `ensureSchema` (e.g. `ALTER TABLE … ADD COLUMN` wrapped in a
try/catch or guarded by a `pragma table_info` check), update the matching type in
`lib/data.ts`, and extend `smoke.mjs`. Never rename or retype existing columns and
never `DROP` anything — the production data has no backup you control.

**2. Experiment integrity is sacred.** Variant assignment is sticky per visitor via
the `wl_variant_<slug>` cookie: a returning visitor must always see the variant they
were first assigned, or the A/B statistics are corrupted. Don't change assignment
mechanics, cookie names, or what counts as a visit/signup while any experiment is
live. Deleting a variant or an idea **CASCADE-deletes its recorded visits and
signups** — that is intentional but irreversible; treat it as a destructive action
and never do it programmatically without the owner asking.

**3. Signup handling is a public, forgiving endpoint.** Emails are normalized
(lowercase, trimmed) and deduped per idea by a unique index; a duplicate signup
returns `{ok:true, alreadySignedUp:true}` — friendly, never an error, and revealing
nothing else. Keep it that way: this endpoint is exposed to the open internet.

**4. The auth pattern must be replicated exactly in new admin routes.**
`proxy.ts` guards `/admin` **pages only** — it does not cover `/api/*`. Every API
route that mutates data or exposes signups checks `isValidSession` itself and
returns 401 (see `app/api/ideas/route.ts` for the canonical shape). Public by
design: `assign`, `signup`, `login`, `logout` — everything else requires the
session. Auth code uses timing-safe comparison and HMAC-signed cookies
(`lib/auth.ts`); don't weaken either. Never commit `.env.local`, never log
`ADMIN_PASSWORD`/`SESSION_SECRET`/`TURSO_AUTH_TOKEN`, never print signup emails
into build or CI logs.

**5. The CSV export format is a downstream contract.** The owner pulls exports into
email tools; changing columns or their order breaks that silently. Extend by
appending columns, don't reorder or rename.

**6. Keep dependencies minimal.** The stack is deliberately small (Next + libsql +
nanoid). Don't add libraries, ORMs, or services for things the platform already does.

## Verification — run before every commit

```
npm run check     # lint + typecheck + build + smoke
```

`smoke.mjs` boots the built app on a throwaway SQLite file and exercises the actual
contract: auth boundaries (401s, login), idea creation, public page, **sticky**
variant assignment, signup dedupe, and authenticated CSV export. If you change any
behavior it covers, update the smoke test in the same commit — a green check must
keep meaning "the contract holds". CI runs the same command on every push and PR.

For UI changes, also drive the real flow once: `npm run dev`, create an idea in
`/admin`, open `/w/<slug>` with UTM params, sign up, and look at the dashboard
numbers. The smoke test covers the API contract, not visual correctness.

## Playbooks

- **Adding a field to signups/visits:** idempotent `ALTER TABLE` in `ensureSchema` →
  type in `lib/data.ts` → write path (`recordSignup`/`recordVisit`) → append to CSV
  export → extend smoke test → `npm run check`.
- **Adding an admin API route:** copy the session-check-then-401 shape from
  `app/api/ideas/route.ts`. Add a smoke assertion that the new route 401s without a
  session.
- **Changing the waitlist page or assign flow:** re-read contract #2 first; the
  stickiness assertion in the smoke test must stay green without modification — if
  you had to change *that assertion*, you are breaking live experiments.
