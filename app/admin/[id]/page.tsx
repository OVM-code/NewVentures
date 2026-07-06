import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getIdeaById,
  getVariantStats,
  getChannelStats,
  listSignups,
} from "@/lib/data";

export const dynamic = "force-dynamic";

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

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
          <button className="text-sm text-red-400 hover:text-red-300">Delete idea</button>
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
          {variantStats.map(({ variant, visits, signups: s, conversionRate }) => (
            <div
              key={variant.id}
              className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex items-start justify-between gap-4"
            >
              <div>
                <div className="text-xs uppercase tracking-wide text-neutral-500 mb-1">
                  Variant {variant.label} &middot; weight {variant.weight}
                </div>
                <div className="font-medium">{variant.headline}</div>
                {variant.subcopy && (
                  <div className="text-sm text-neutral-400 mt-1">{variant.subcopy}</div>
                )}
                <div className="text-xs text-neutral-500 mt-1">CTA: {variant.cta_text}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-semibold">{pct(conversionRate)}</div>
                <div className="text-xs text-neutral-500">
                  {s}/{visits}
                </div>
                {variantStats.length > 1 && (
                  <form action={`/api/variants/${variant.id}/delete`} method="POST" className="mt-2">
                    <input type="hidden" name="ideaId" value={idea.id} />
                    <button className="text-xs text-red-400 hover:text-red-300">Delete</button>
                  </form>
                )}
              </div>
            </div>
          ))}
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
        <h2 className="text-lg font-semibold mb-1">Marketing channel performance</h2>
        <p className="text-sm text-neutral-500 mb-4">
          Share <code className="text-neutral-400">{`/w/${idea.slug}?utm_source=twitter&utm_medium=post&utm_campaign=launch`}</code>{" "}
          style links per channel to compare where interested people actually come from.
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
                  <th className="text-left px-4 py-2">When</th>
                </tr>
              </thead>
              <tbody>
                {signups.map((s) => (
                  <tr key={s.id} className="border-t border-neutral-800">
                    <td className="px-4 py-2">{s.email}</td>
                    <td className="px-4 py-2">{s.name || "—"}</td>
                    <td className="px-4 py-2">{s.utm_source || "—"}</td>
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
