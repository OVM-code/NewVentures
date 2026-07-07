"use client";

import { useState, useSyncExternalStore } from "react";

const CHANNEL_PRESETS = [
  { name: "Twitter / X", source: "twitter", medium: "post" },
  { name: "LinkedIn", source: "linkedin", medium: "post" },
  { name: "Reddit", source: "reddit", medium: "comment" },
  { name: "Instagram", source: "instagram", medium: "bio" },
  { name: "TikTok", source: "tiktok", medium: "video" },
  { name: "Facebook", source: "facebook", medium: "post" },
  { name: "Newsletter", source: "newsletter", medium: "email" },
  { name: "Cold email", source: "cold-email", medium: "email" },
  { name: "Direct message", source: "dm", medium: "message" },
];

function sanitizeTag(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// window.location.origin is browser-only; the empty server snapshot keeps
// SSR/hydration consistent and the component renders once the origin is known.
const emptySubscribe = () => () => {};
function useOrigin(): string {
  return useSyncExternalStore(
    emptySubscribe,
    () => window.location.origin,
    () => ""
  );
}

export default function LinkBuilder({ slug }: { slug: string }) {
  const origin = useOrigin();
  const [campaign, setCampaign] = useState("launch");
  const [customSource, setCustomSource] = useState("");
  const [customMedium, setCustomMedium] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  function buildUrl(source: string, medium: string): string {
    const url = new URL(`/w/${slug}`, origin || "http://localhost");
    url.searchParams.set("utm_source", source);
    url.searchParams.set("utm_medium", medium);
    const c = sanitizeTag(campaign);
    if (c) url.searchParams.set("utm_campaign", c);
    return url.toString();
  }

  async function copy(url: string, key: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(key);
      setTimeout(() => setCopied((prev) => (prev === key ? null : prev)), 1500);
    } catch {
      // clipboard unavailable (e.g. non-HTTPS); leave the URL visible to select manually
    }
  }

  if (!origin) return null;

  const customReady = sanitizeTag(customSource).length > 0;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-neutral-400">Campaign name</label>
        <input
          value={campaign}
          onChange={(e) => setCampaign(e.target.value)}
          placeholder="launch"
          className="rounded-md bg-neutral-800 border border-neutral-700 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
        />
        <span className="text-xs text-neutral-500">
          applied to every link below — change it per push (e.g. launch, v2-copy, april-test)
        </span>
      </div>

      <div className="grid gap-2">
        {CHANNEL_PRESETS.map((ch) => {
          const url = buildUrl(ch.source, ch.medium);
          return (
            <div
              key={ch.source}
              className="flex items-center gap-3 bg-neutral-950/60 border border-neutral-800 rounded-md px-3 py-2"
            >
              <span className="text-sm w-32 shrink-0">{ch.name}</span>
              <code className="text-xs text-neutral-500 truncate flex-1">{url}</code>
              <button
                onClick={() => copy(url, ch.source)}
                className="text-xs px-3 py-1 rounded bg-neutral-800 border border-neutral-700 hover:border-neutral-500 shrink-0 transition"
              >
                {copied === ch.source ? "Copied ✓" : "Copy"}
              </button>
            </div>
          );
        })}

        <div className="flex items-center gap-3 bg-neutral-950/60 border border-neutral-800 rounded-md px-3 py-2">
          <div className="flex gap-2 w-64 shrink-0">
            <input
              value={customSource}
              onChange={(e) => setCustomSource(e.target.value)}
              placeholder="source"
              className="w-1/2 rounded bg-neutral-800 border border-neutral-700 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-white/20"
            />
            <input
              value={customMedium}
              onChange={(e) => setCustomMedium(e.target.value)}
              placeholder="medium"
              className="w-1/2 rounded bg-neutral-800 border border-neutral-700 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-white/20"
            />
          </div>
          <code className="text-xs text-neutral-500 truncate flex-1">
            {customReady
              ? buildUrl(sanitizeTag(customSource), sanitizeTag(customMedium) || "other")
              : "custom channel…"}
          </code>
          <button
            onClick={() =>
              customReady &&
              copy(buildUrl(sanitizeTag(customSource), sanitizeTag(customMedium) || "other"), "custom")
            }
            disabled={!customReady}
            className="text-xs px-3 py-1 rounded bg-neutral-800 border border-neutral-700 hover:border-neutral-500 shrink-0 transition disabled:opacity-40"
          >
            {copied === "custom" ? "Copied ✓" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}
