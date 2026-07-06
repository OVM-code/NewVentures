import { NextRequest, NextResponse } from "next/server";
import { getIdeaBySlug, listVariants, pickWeightedVariant, recordVisit } from "@/lib/data";

function cookieNameFor(slug: string) {
  return `wl_variant_${slug}`;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const slug = String(body.slug || "");
  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  const idea = await getIdeaBySlug(slug);
  if (!idea) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const variants = await listVariants(idea.id);
  if (variants.length === 0) {
    return NextResponse.json({ error: "no variants configured" }, { status: 500 });
  }

  const cookieName = cookieNameFor(slug);
  const existingVariantId = request.cookies.get(cookieName)?.value;
  let variant = variants.find((v) => v.id === existingVariantId);
  let isNewAssignment = false;

  if (!variant) {
    variant = pickWeightedVariant(variants);
    isNewAssignment = true;
  }

  const utmSource = body.utmSource || null;
  const utmMedium = body.utmMedium || null;
  const utmCampaign = body.utmCampaign || null;
  const utmContent = body.utmContent || null;
  const referrer = body.referrer || null;

  await recordVisit({
    ideaId: idea.id,
    variantId: variant.id,
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    referrer,
  });

  const response = NextResponse.json({
    ideaId: idea.id,
    variantId: variant.id,
    headline: variant.headline,
    subcopy: variant.subcopy,
    ctaText: variant.cta_text,
  });

  if (isNewAssignment) {
    response.cookies.set(cookieName, variant.id, {
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 90,
      path: "/",
    });
  }

  return response;
}
