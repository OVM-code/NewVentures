import { NextRequest, NextResponse } from "next/server";
import { deleteVariant } from "@/lib/data";
import { isValidSession, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!(await isValidSession(session))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const form = await request.formData();
  const ideaId = String(form.get("ideaId") || "");
  await deleteVariant(id);
  return NextResponse.redirect(new URL(`/admin/${ideaId}`, request.url), { status: 303 });
}
