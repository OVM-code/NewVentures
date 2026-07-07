import { nanoid } from "nanoid";
import { db, ensureSchema } from "./db";

export type Idea = {
  id: string;
  slug: string;
  name: string;
  pitch: string;
  description: string | null;
  created_at: string;
};

export type Variant = {
  id: string;
  idea_id: string;
  label: string;
  headline: string;
  subcopy: string | null;
  cta_text: string;
  weight: number;
  created_at: string;
};

export type Signup = {
  id: string;
  idea_id: string;
  variant_id: string;
  name: string | null;
  email: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  referrer: string | null;
  intent: string | null;
  price_expectation: string | null;
  created_at: string;
};

export const INTENT_VALUES = ["yes_now", "yes", "maybe", "no"] as const;
export type Intent = (typeof INTENT_VALUES)[number];

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || nanoid(8);
}

export async function listIdeas(): Promise<(Idea & { signupCount: number; visitCount: number })[]> {
  await ensureSchema();
  const result = await db.execute(`
    SELECT
      i.*,
      (SELECT COUNT(*) FROM signups s WHERE s.idea_id = i.id) as signupCount,
      (SELECT COUNT(*) FROM visits v WHERE v.idea_id = i.id) as visitCount
    FROM ideas i
    ORDER BY i.created_at DESC
  `);
  return result.rows as unknown as (Idea & { signupCount: number; visitCount: number })[];
}

export async function createIdea(input: {
  name: string;
  pitch: string;
  description?: string;
  slug?: string;
}): Promise<Idea> {
  await ensureSchema();
  const id = nanoid();
  const baseSlug = slugify(input.slug || input.name);
  let slug = baseSlug;
  let attempt = 0;

  // Retry on the actual unique-constraint violation rather than check-then-insert,
  // which would lose a race between two concurrent creates for the same slug.
  while (true) {
    try {
      await db.execute({
        sql: "INSERT INTO ideas (id, slug, name, pitch, description) VALUES (?, ?, ?, ?, ?)",
        args: [id, slug, input.name, input.pitch, input.description || null],
      });
      break;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!/UNIQUE constraint failed/i.test(message) || attempt >= 20) throw err;
      attempt += 1;
      slug = `${baseSlug}-${attempt + 1}`;
    }
  }

  await db.execute({
    sql: `INSERT INTO variants (id, idea_id, label, headline, subcopy, cta_text, weight)
          VALUES (?, ?, 'A', ?, ?, 'Join the waitlist', 1)`,
    args: [nanoid(), id, input.name, input.pitch],
  });

  const idea = await getIdeaById(id);
  if (!idea) throw new Error("Failed to create idea");
  return idea;
}

export async function getIdeaById(id: string): Promise<Idea | null> {
  await ensureSchema();
  const result = await db.execute({ sql: "SELECT * FROM ideas WHERE id = ?", args: [id] });
  return (result.rows[0] as unknown as Idea) || null;
}

export async function getIdeaBySlug(slug: string): Promise<Idea | null> {
  await ensureSchema();
  const result = await db.execute({ sql: "SELECT * FROM ideas WHERE slug = ?", args: [slug] });
  return (result.rows[0] as unknown as Idea) || null;
}

export async function deleteIdea(id: string): Promise<void> {
  await ensureSchema();
  // SQLite/libsql don't enforce ON DELETE CASCADE unless "PRAGMA foreign_keys = ON"
  // is set per-connection, which isn't guaranteed across a serverless HTTP client
  // (e.g. Turso). Delete children explicitly so no rows are orphaned.
  await db.execute({ sql: "DELETE FROM signups WHERE idea_id = ?", args: [id] });
  await db.execute({ sql: "DELETE FROM visits WHERE idea_id = ?", args: [id] });
  await db.execute({ sql: "DELETE FROM variants WHERE idea_id = ?", args: [id] });
  await db.execute({ sql: "DELETE FROM ideas WHERE id = ?", args: [id] });
}

export async function listVariants(ideaId: string): Promise<Variant[]> {
  await ensureSchema();
  const result = await db.execute({
    sql: "SELECT * FROM variants WHERE idea_id = ? ORDER BY created_at ASC",
    args: [ideaId],
  });
  return result.rows as unknown as Variant[];
}

export async function createVariant(input: {
  ideaId: string;
  label: string;
  headline: string;
  subcopy?: string;
  ctaText?: string;
  weight?: number;
}): Promise<Variant> {
  await ensureSchema();
  const id = nanoid();
  await db.execute({
    sql: `INSERT INTO variants (id, idea_id, label, headline, subcopy, cta_text, weight)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      input.ideaId,
      input.label,
      input.headline,
      input.subcopy || null,
      input.ctaText || "Join the waitlist",
      input.weight ?? 1,
    ],
  });
  const result = await db.execute({ sql: "SELECT * FROM variants WHERE id = ?", args: [id] });
  return result.rows[0] as unknown as Variant;
}

export async function deleteVariant(id: string): Promise<void> {
  await ensureSchema();
  await db.execute({ sql: "DELETE FROM signups WHERE variant_id = ?", args: [id] });
  await db.execute({ sql: "DELETE FROM visits WHERE variant_id = ?", args: [id] });
  await db.execute({ sql: "DELETE FROM variants WHERE id = ?", args: [id] });
}

export function pickWeightedVariant(variants: Variant[]): Variant {
  const totalWeight = variants.reduce((sum, v) => sum + Math.max(v.weight, 1), 0);
  let r = Math.random() * totalWeight;
  for (const v of variants) {
    r -= Math.max(v.weight, 1);
    if (r <= 0) return v;
  }
  return variants[variants.length - 1];
}

export async function recordVisit(input: {
  ideaId: string;
  variantId: string;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  referrer?: string | null;
}): Promise<void> {
  await ensureSchema();
  await db.execute({
    sql: `INSERT INTO visits (id, idea_id, variant_id, utm_source, utm_medium, utm_campaign, utm_content, referrer)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      nanoid(),
      input.ideaId,
      input.variantId,
      input.utmSource || null,
      input.utmMedium || null,
      input.utmCampaign || null,
      input.utmContent || null,
      input.referrer || null,
    ],
  });
}

export async function recordSignup(input: {
  ideaId: string;
  variantId: string;
  name?: string | null;
  email: string;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  referrer?: string | null;
}): Promise<{ ok: true; id: string } | { ok: false; reason: "duplicate"; id: string | null }> {
  await ensureSchema();
  const id = nanoid();
  const email = input.email.toLowerCase().trim();
  try {
    await db.execute({
      sql: `INSERT INTO signups (id, idea_id, variant_id, name, email, utm_source, utm_medium, utm_campaign, utm_content, referrer)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        input.ideaId,
        input.variantId,
        input.name || null,
        email,
        input.utmSource || null,
        input.utmMedium || null,
        input.utmCampaign || null,
        input.utmContent || null,
        input.referrer || null,
      ],
    });
    return { ok: true, id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/UNIQUE constraint failed/i.test(message)) {
      // Return the existing signup's id so a repeat visitor can still
      // answer (or revise) the intent question.
      const existing = await db.execute({
        sql: "SELECT id FROM signups WHERE idea_id = ? AND email = ?",
        args: [input.ideaId, email],
      });
      return { ok: false, reason: "duplicate", id: (existing.rows[0]?.id as string) || null };
    }
    throw err;
  }
}

export async function updateSignupIntent(input: {
  signupId: string;
  intent?: Intent;
  priceExpectation?: string;
}): Promise<boolean> {
  await ensureSchema();
  const sets: string[] = [];
  const args: string[] = [];
  if (input.intent) {
    sets.push("intent = ?");
    args.push(input.intent);
  }
  if (input.priceExpectation) {
    sets.push("price_expectation = ?");
    args.push(input.priceExpectation);
  }
  if (sets.length === 0) return false;
  args.push(input.signupId);
  const result = await db.execute({
    sql: `UPDATE signups SET ${sets.join(", ")} WHERE id = ?`,
    args,
  });
  return result.rowsAffected > 0;
}

export async function listSignups(ideaId: string): Promise<Signup[]> {
  await ensureSchema();
  const result = await db.execute({
    sql: "SELECT * FROM signups WHERE idea_id = ? ORDER BY created_at DESC",
    args: [ideaId],
  });
  return result.rows as unknown as Signup[];
}

export type VariantStats = {
  variant: Variant;
  visits: number;
  signups: number;
  conversionRate: number;
};

export async function getVariantStats(ideaId: string): Promise<VariantStats[]> {
  await ensureSchema();
  const variants = await listVariants(ideaId);
  const stats: VariantStats[] = [];
  for (const variant of variants) {
    const visitsResult = await db.execute({
      sql: "SELECT COUNT(*) as c FROM visits WHERE variant_id = ?",
      args: [variant.id],
    });
    const signupsResult = await db.execute({
      sql: "SELECT COUNT(*) as c FROM signups WHERE variant_id = ?",
      args: [variant.id],
    });
    const visits = Number(visitsResult.rows[0]?.c || 0);
    const signups = Number(signupsResult.rows[0]?.c || 0);
    stats.push({
      variant,
      visits,
      signups,
      conversionRate: visits > 0 ? signups / visits : 0,
    });
  }
  return stats;
}

export type ChannelStats = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  visits: number;
  signups: number;
  conversionRate: number;
};

export async function getChannelStats(ideaId: string): Promise<ChannelStats[]> {
  await ensureSchema();
  const visitsResult = await db.execute({
    sql: `SELECT
            COALESCE(utm_source, '(none)') as utm_source,
            COALESCE(utm_medium, '(none)') as utm_medium,
            COALESCE(utm_campaign, '(none)') as utm_campaign,
            COUNT(*) as c
          FROM visits
          WHERE idea_id = ?
          GROUP BY utm_source, utm_medium, utm_campaign`,
    args: [ideaId],
  });
  const signupsResult = await db.execute({
    sql: `SELECT
            COALESCE(utm_source, '(none)') as utm_source,
            COALESCE(utm_medium, '(none)') as utm_medium,
            COALESCE(utm_campaign, '(none)') as utm_campaign,
            COUNT(*) as c
          FROM signups
          WHERE idea_id = ?
          GROUP BY utm_source, utm_medium, utm_campaign`,
    args: [ideaId],
  });

  type ChannelRow = {
    utm_source: string;
    utm_medium: string;
    utm_campaign: string;
    c: number;
  };

  const key = (r: ChannelRow) => `${r.utm_source}::${r.utm_medium}::${r.utm_campaign}`;

  const signupRows = signupsResult.rows as unknown as ChannelRow[];
  const visitRows = visitsResult.rows as unknown as ChannelRow[];

  const signupMap = new Map<string, number>();
  for (const row of signupRows) {
    signupMap.set(key(row), Number(row.c));
  }

  const channels: ChannelStats[] = [];
  for (const row of visitRows) {
    const visits = Number(row.c);
    const signups = signupMap.get(key(row)) || 0;
    channels.push({
      utm_source: row.utm_source,
      utm_medium: row.utm_medium,
      utm_campaign: row.utm_campaign,
      visits,
      signups,
      conversionRate: visits > 0 ? signups / visits : 0,
    });
  }

  // include channels that only have signups but somehow no matching visit row (edge case)
  for (const row of signupRows) {
    if (!channels.find((c) => c.utm_source === row.utm_source && c.utm_medium === row.utm_medium && c.utm_campaign === row.utm_campaign)) {
      channels.push({
        utm_source: row.utm_source,
        utm_medium: row.utm_medium,
        utm_campaign: row.utm_campaign,
        visits: 0,
        signups: Number(row.c),
        conversionRate: 0,
      });
    }
  }

  return channels.sort((a, b) => b.signups - a.signups);
}
