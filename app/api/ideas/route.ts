import { NextRequest, NextResponse } from "next/server";
import { createIdea } from "@/lib/data";
import { isValidSession, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!(await isValidSession(session))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const name = String(form.get("name") || "").trim();
  const pitch = String(form.get("pitch") || "").trim();
  const description = String(form.get("description") || "").trim();
  const slug = String(form.get("slug") || "").trim();

  if (!name || !pitch) {
    return NextResponse.json({ error: "name and pitch are required" }, { status: 400 });
  }

  const idea = await createIdea({ name, pitch, description, slug: slug || undefined });
  return NextResponse.redirect(new URL(`/admin/${idea.id}`, request.url), { status: 303 });
}
