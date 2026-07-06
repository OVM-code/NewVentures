import Link from "next/link";
import { listIdeas } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const ideas = await listIdeas();

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-semibold mb-1">New idea</h1>
        <p className="text-neutral-400 text-sm mb-4">
          Spin up a waitlist page in a few seconds. You can add A/B headline variants after.
        </p>
        <form
          action="/api/ideas"
          method="POST"
          className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 grid gap-4 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <label className="block text-sm text-neutral-400 mb-1">Idea name</label>
            <input
              name="name"
              required
              placeholder="e.g. AI Dog Walker Matcher"
              className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm text-neutral-400 mb-1">One-line pitch (used as default headline)</label>
            <input
              name="pitch"
              required
              placeholder="e.g. Find a trusted dog walker in your neighborhood in 60 seconds"
              className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm text-neutral-400 mb-1">Description (optional, shown on page)</label>
            <textarea
              name="description"
              rows={2}
              placeholder="A bit more detail about the idea"
              className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1">Custom URL slug (optional)</label>
            <input
              name="slug"
              placeholder="ai-dog-walker"
              className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>
          <div className="flex items-end">
            <button className="w-full rounded-md bg-white text-black font-medium py-2 hover:bg-neutral-200 transition">
              Create waitlist
            </button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">Your ideas</h2>
        {ideas.length === 0 ? (
          <p className="text-neutral-500 text-sm">No ideas yet. Create your first one above.</p>
        ) : (
          <div className="grid gap-4">
            {ideas.map((idea) => (
              <Link
                key={idea.id}
                href={`/admin/${idea.id}`}
                className="block bg-neutral-900 border border-neutral-800 rounded-xl p-5 hover:border-neutral-700 transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{idea.name}</h3>
                    <p className="text-sm text-neutral-400">{idea.pitch}</p>
                    <p className="text-xs text-neutral-500 mt-1">/w/{idea.slug}</p>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-white font-semibold">{idea.signupCount}</div>
                    <div className="text-neutral-500">signups</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
