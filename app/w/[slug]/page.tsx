import { notFound } from "next/navigation";
import { getIdeaBySlug } from "@/lib/data";
import WaitlistForm from "./waitlist-form";

export const dynamic = "force-dynamic";

export default async function WaitlistPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const idea = await getIdeaBySlug(slug);
  if (!idea) notFound();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        <WaitlistForm
          slug={slug}
          fallbackHeadline={idea.pitch}
          fallbackSubcopy={idea.description}
        />
      </div>
    </div>
  );
}
