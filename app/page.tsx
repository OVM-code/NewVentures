import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">Waitlist Lab</h1>
        <p className="text-neutral-400">Test business ideas fast with waitlist pages and A/B copy.</p>
        <Link
          href="/admin"
          className="inline-block rounded-md bg-white text-black font-medium px-5 py-2.5 hover:bg-neutral-200 transition"
        >
          Go to admin
        </Link>
      </div>
    </div>
  );
}
