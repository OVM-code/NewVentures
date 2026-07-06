export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next = "/admin", error } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
      <form
        action="/api/login"
        method="POST"
        className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-xl p-8 space-y-4"
      >
        <h1 className="text-xl font-semibold text-white">Sign in</h1>
        <p className="text-sm text-neutral-400">Enter the admin password to manage waitlists.</p>
        {error && (
          <p className="text-sm text-red-400 bg-red-950/50 border border-red-900 rounded-md px-3 py-2">
            Incorrect password.
          </p>
        )}
        <input type="hidden" name="next" value={next} />
        <input
          type="password"
          name="password"
          placeholder="Password"
          autoFocus
          required
          className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/20"
        />
        <button
          type="submit"
          className="w-full rounded-md bg-white text-black font-medium py-2 hover:bg-neutral-200 transition"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
