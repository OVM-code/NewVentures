import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getIdeaById,
  getVariantStats,
  getChannelStats,
  listSignups,
} from "@/lib/data";
import ConfirmSubmit from "../confirm-submit";
import LinkBuilder from "../link-builder";
import { compareToLeader } from "@/lib/stats";

export const dynamic = "force-dynamic";

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

const INTENT_LABELS: Record<string, string> = {
  yes_now: "Take my money",
  yes: "Yes, probably",
  maybe: "Maybe",
  no: "Just curious",
};

const VERDICT_STYLES: Record<string, string> = {
  significant: "text-emerald-400",
  promising: "text-amber-300",
  inconclusive: "text-neutral-400",
  insufficient: "text-neutral-500",
};

export default async function IdeaDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const idea = await getIdeaById(id);
  if (!idea) notFound();

  const [variantStats, channelStats, signups] = await Promise.all([
    getVariantStats(id),
    getChannelStats(id),
    listSignups(id),
  ]);

  const totalVisits = variantStats.reduce((s, v) => s + v.visits, 0);
  const totalSignups = variantStats.reduce((s, v) => s + v.signups, 0);

  // Leader = highest observed conversion rate (with any traffic); the others
  // are then tested against it for statistical significance.
  const leader =
    variantStats.length > 1
      ? variantStats.reduce((best, v) => (v.conversionRate > best.conversionRate ? v : best))
      : null;

  const intentCounts = new Map<string, number>();
  for (const s of signups) {
    if (s.intent) intentCounts.set(s.intent, (intentCounts.get(s.intent) || 0) + 1);
  }
  const answered = [...intentCounts.values()].reduce((a, b) => a + b, 0);
  const wouldPay = (intentCounts.get("yes_now") || 0) + (intentCounts.get("yes") || 0);

  return (
    <div className="space-y-10">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/admin" className="text-sm text-neutral-500 hover:text-white">
            &larr; All ideas
          </Link>
          <h1 className="text-2xl font-semibold mt-2">{idea.name}</h1>
          <p className="text-neutral-400">{idea.pitch}</p>
          <div className="flex items-center gap-3 mt-3">
            <a
              href={`/w/${idea.slug}`}
              target="_blank"
              className="text-sm px-3 py-1.5 rounded-md bg-neutral-800 border border-neutral-700 hover:border-neutral-600"
            >
              /w/{idea.slug} &#8599;
            </a>
            <a
              href={`/api/export/${idea.id}`}
              className="text-sm px-3 py-1.5 rounded-md bg-neutral-800 border border-neutral-700 hover:border-neutral-600"
            >
              Export signups CSV
            </a>
          </div>
        </div>
        <form action={`/api/ideas/${idea.id}/delete`} method="POST">
          <ConfirmSubmit
            message={`Delete "${idea.name}" and all its signups? This can't be undone.`}
            className="text-sm text-red-400 hover:text-red-300"
          >
            Delete idea
          </ConfirmSubmit>
        </form>
      </div>

      <section className="grid sm:grid-cols-3 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <div className="text-2xl font-semibold">{totalVisits}</div>
          <div className="text-sm text-neutral-500">Page visits</div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <div className="text-2xl font-semibold">{totalSignups}</div>
          <div className="text-sm text-neutral-500">Signups</div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <div className="text-2xl font-semibold">
            {totalVisits > 0 ? pct(totalSignups / totalVisits) : "—"}
          </div>
          <div className="text-sm text-neutral-500">Overall conversion</div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-1">Headline / copy variants (A/B test)</h2>
        <p className="text-sm text-neutral-500 mb-4">
          Visitors are randomly assigned a variant (weighted). Compare conversion rate to find the
          copy that resonates most.
        </p>
        <div className="grid gap-3 mb-5">
          {variantStats.map(({ variant, visits, signups: s, conversionRate }) => {
            const isLeader = leader?.variant.id === variant.id;
            const verdict =
              leader && !isLeader
                ? compareToLeader(leader.signups, leader.visits, s, visits)
                : null;
            return (
            <div
              key={variant.id}
              className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex items-start justify-between gap-4"
            >
              <div>
                <div className="text-xs uppercase tracking-wide text-neutral-500 mb-1">
                  Variant {variant.label} &middot; weight {variant.weight}
                  {isLeader && (
                    <span className="ml-2 text-emerald-400 normal-case tracking-normal">
                      current leader
                    </span>
                  )}
                </div>
                <div className="font-medium">{variant.headline}</div>
                {variant.subcopy && (
                  <div className="text-sm text-neutral-400 mt-1">{variant.subcopy}</div>
                )}
                <div className="text-xs text-neutral-500 mt-1">CTA: {variant.cta_text}</div>
                {verdict && (
                  <div className={`text-xs mt-2 ${VERDICT_STYLES[verdict.tone]}`}>
                    vs leader: {verdict.label}
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="font-semibold">{pct(conversionRate)}</div>
                <div className="text-xs text-neutral-500">
                  {s}/{visits}
                </div>
                {variantStats.length > 1 && (
                  <form action={`/api/variants/${variant.id}/delete`} method="POST" className="mt-2">
                    <input type="hidden" name="ideaId" value={idea.id} />
                    <ConfirmSubmit
                      message={`Delete variant "${variant.label}" and its recorded visits/signups?`}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Delete
                    </ConfirmSubmit>
                  </form>
                )}
              </div>
            </div>
            );
          })}
        </div>

        <form
          action="/api/variants"
          method="POST"
          className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 grid gap-4 sm:grid-cols-2"
        >
          <input type="hidden" name="ideaId" value={idea.id} />
          <div>
            <label className="block text-sm text-neutral-400 mb-1">Label</label>
            <input
              name="label"
              required
              placeholder="B"
              className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1">Weight (traffic share)</label>
            <input
              name="weight"
              type="number"
              defaultValue={1}
              min={1}
              className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm text-neutral-400 mb-1">Headline</label>
            <input
              name="headline"
              required
              placeholder="A different way to pitch the idea"
              className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm text-neutral-400 mb-1">Subcopy</label>
            <input
              name="subcopy"
              placeholder="Optional supporting line"
              className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1">CTA button text</label>
            <input
              name="ctaText"
              placeholder="Join the waitlist"
              className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>
          <div className="flex items-end">
            <button className="w-full rounded-md bg-white text-black font-medium py-2 hover:bg-neutral-200 transition">
              Add variant
            </button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-1">Channel links</h2>
        <p className="text-sm text-neutral-500 mb-4">
          Copy a pre-tagged link per channel you&apos;re testing — signups and visits are
          attributed automatically, so the table below stays trustworthy.
        </p>
        <LinkBuilder slug={idea.slug} />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-1">Marketing channel performance</h2>
        <p className="text-sm text-neutral-500 mb-4">
          Where interested people actually come from, by tagged link.
        </p>
        {channelStats.length === 0 ? (
          <p className="text-neutral-500 text-sm">No tagged traffic yet.</p>
        ) : (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-800/50 text-neutral-400">
                <tr>
                  <th className="text-left px-4 py-2">Source</th>
                  <th className="text-left px-4 py-2">Medium</th>
                  <th className="text-left px-4 py-2">Campaign</th>
                  <th className="text-right px-4 py-2">Visits</th>
                  <th className="text-right px-4 py-2">Signups</th>
                  <th className="text-right px-4 py-2">Conv.</th>
                </tr>
              </thead>
              <tbody>
                {channelStats.map((c, i) => (
                  <tr key={i} className="border-t border-neutral-800">
                    <td className="px-4 py-2">{c.utm_source}</td>
                    <td className="px-4 py-2">{c.utm_medium}</td>
                    <td className="px-4 py-2">{c.utm_campaign}</td>
                    <td className="px-4 py-2 text-right">{c.visits}</td>
                    <td className="px-4 py-2 text-right">{c.signups}</td>
                    <td className="px-4 py-2 text-right">{pct(c.conversionRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-1">Purchase intent</h2>
        <p className="text-sm text-neutral-500 mb-4">
          Answers to &ldquo;would you pay for this?&rdquo; asked right after signup. A long
          waitlist of &ldquo;just curious&rdquo; is a very different signal from a short list
          that wants to pay.
        </p>
        {answered === 0 ? (
          <p className="text-neutral-500 text-sm">No answers yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
              <div className="text-2xl font-semibold">{pct(wouldPay / answered)}</div>
              <div className="text-sm text-neutral-500">
                would pay ({wouldPay}/{answered} answered, {signups.length - answered} skipped)
              </div>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-wrap items-center gap-2">
              {Object.entries(INTENT_LABELS).map(([value, label]) => (
                <span
                  key={value}
                  className="text-xs px-2.5 py-1 rounded-full bg-neutral-800 border border-neutral-700"
                >
                  {label}: {intentCounts.get(value) || 0}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">Signups ({signups.length})</h2>
        {signups.length === 0 ? (
          <p className="text-neutral-500 text-sm">No signups yet.</p>
        ) : (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-800/50 text-neutral-400">
                <tr>
                  <th className="text-left px-4 py-2">Email</th>
                  <th className="text-left px-4 py-2">Name</th>
                  <th className="text-left px-4 py-2">Source</th>
                  <th className="text-left px-4 py-2">Would pay?</th>
                  <th className="text-left px-4 py-2">Price expectation</th>
                  <th className="text-left px-4 py-2">When</th>
                </tr>
              </thead>
              <tbody>
                {signups.map((s) => (
                  <tr key={s.id} className="border-t border-neutral-800">
                    <td className="px-4 py-2">{s.email}</td>
                    <td className="px-4 py-2">{s.name || "—"}</td>
                    <td className="px-4 py-2">{s.utm_source || "—"}</td>
                    <td className="px-4 py-2">{s.intent ? INTENT_LABELS[s.intent] || s.intent : "—"}</td>
                    <td className="px-4 py-2">{s.price_expectation || "—"}</td>
                    <td className="px-4 py-2 text-neutral-400">{s.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
