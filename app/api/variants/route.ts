import { NextRequest, NextResponse } from "next/server";
import { createVariant } from "@/lib/data";
import { isValidSession, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!(await isValidSession(session))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const ideaId = String(form.get("ideaId") || "");
  const label = String(form.get("label") || "").trim();
  const headline = String(form.get("headline") || "").trim();
  const subcopy = String(form.get("subcopy") || "").trim();
  const ctaText = String(form.get("ctaText") || "").trim();
  const weight = Number(form.get("weight") || 1);

  if (!ideaId || !label || !headline) {
    return NextResponse.json({ error: "label and headline are required" }, { status: 400 });
  }

  await createVariant({ ideaId, label, headline, subcopy, ctaText: ctaText || undefined, weight });
  return NextResponse.redirect(new URL(`/admin/${ideaId}`, request.url), { status: 303 });
}
