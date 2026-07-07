import { NextRequest, NextResponse } from "next/server";
import { getIdeaBySlug, listVariants, recordSignup } from "@/lib/data";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const slug = String(body.slug || "");
  const variantId = String(body.variantId || "");
  const email = String(body.email || "").trim();
  const name = body.name ? String(body.name).trim() : null;
  const company = String(body.company || "").trim();

  if (!slug || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "valid email required" }, { status: 400 });
  }

  // Honeypot: real visitors never see or fill this field, so a non-empty value
  // means a bot. Pretend success without recording anything.
  if (company) {
    return NextResponse.json({ ok: true });
  }

  const idea = await getIdeaBySlug(slug);
  if (!idea) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const variants = await listVariants(idea.id);
  const variant = variants.find((v) => v.id === variantId) || variants[0];
  if (!variant) {
    return NextResponse.json({ error: "no variant" }, { status: 500 });
  }

  const result = await recordSignup({
    ideaId: idea.id,
    variantId: variant.id,
    name,
    email,
    utmSource: body.utmSource || null,
    utmMedium: body.utmMedium || null,
    utmCampaign: body.utmCampaign || null,
    utmContent: body.utmContent || null,
    referrer: body.referrer || null,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: true, alreadySignedUp: true, signupId: result.id });
  }

  return NextResponse.json({ ok: true, signupId: result.id });
}
