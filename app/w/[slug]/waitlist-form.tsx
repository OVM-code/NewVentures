"use client";

import { useEffect, useState } from "react";

type Assignment = {
  ideaId: string;
  variantId: string;
  headline: string;
  subcopy: string | null;
  ctaText: string;
};

function getUtmParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: params.get("utm_source"),
    utmMedium: params.get("utm_medium"),
    utmCampaign: params.get("utm_campaign"),
    utmContent: params.get("utm_content"),
    referrer: document.referrer || null,
  };
}

export default function WaitlistForm({
  slug,
  fallbackHeadline,
  fallbackSubcopy,
}: {
  slug: string;
  fallbackHeadline: string;
  fallbackSubcopy: string | null;
}) {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState(""); // honeypot; real users never see or fill this

  useEffect(() => {
    const utm = getUtmParams();
    fetch("/api/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, ...utm }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setAssignment(data);
      })
      .catch(() => {});
  }, [slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    const utm = getUtmParams();
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          variantId: assignment?.variantId,
          name,
          email,
          company,
          ...utm,
        }),
      });
      if (!res.ok) throw new Error("failed");
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  const headline = assignment?.headline || fallbackHeadline;
  const subcopy = assignment?.subcopy ?? fallbackSubcopy;
  const ctaText = assignment?.ctaText || "Join the waitlist";

  if (status === "done") {
    return (
      <div className="text-center space-y-3">
        <div className="text-4xl">🎉</div>
        <h1 className="text-2xl font-semibold">You&apos;re on the list</h1>
        <p className="text-neutral-400">We&apos;ll email you as soon as it&apos;s ready.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-center">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{headline}</h1>
        {subcopy && <p className="text-neutral-400 mt-3">{subcopy}</p>}
      </div>
      <form onSubmit={handleSubmit} className="space-y-3 text-left">
        <input
          type="text"
          name="company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute -left-[9999px] w-px h-px overflow-hidden"
        />
        <input
          type="text"
          placeholder="Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/20"
        />
        <input
          type="email"
          required
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/20"
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="w-full rounded-md bg-white text-black font-medium py-3 hover:bg-neutral-200 transition disabled:opacity-50"
        >
          {status === "submitting" ? "Joining…" : ctaText}
        </button>
        {status === "error" && (
          <p className="text-sm text-red-400 text-center">Something went wrong. Try again.</p>
        )}
      </form>
    </div>
  );
}
