import { NextRequest, NextResponse } from "next/server";
import { checkPassword, createSessionCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const password = String(form.get("password") || "");
  const next = String(form.get("next") || "/admin");

  if (!checkPassword(password)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "1");
    url.searchParams.set("next", next);
    return NextResponse.redirect(url, { status: 303 });
  }

  const cookie = await createSessionCookie();
  const response = NextResponse.redirect(new URL(next, request.url), { status: 303 });
  response.cookies.set(cookie.name, cookie.value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: cookie.maxAge,
    path: "/",
  });
  return response;
}
