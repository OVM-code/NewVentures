import { NextRequest, NextResponse } from "next/server";
import { updateSignupIntent, INTENT_VALUES, type Intent } from "@/lib/data";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const signupId = String(body.signupId || "");
  const intent = String(body.intent || "");
  const priceExpectation = String(body.priceExpectation || "").trim().slice(0, 100);

  if (!signupId || signupId.length > 40) {
    return NextResponse.json({ error: "signupId required" }, { status: 400 });
  }
  if (intent && !INTENT_VALUES.includes(intent as Intent)) {
    return NextResponse.json({ error: "invalid intent" }, { status: 400 });
  }
  if (!intent && !priceExpectation) {
    return NextResponse.json({ error: "nothing to record" }, { status: 400 });
  }

  const updated = await updateSignupIntent({
    signupId,
    intent: (intent as Intent) || undefined,
    priceExpectation: priceExpectation || undefined,
  });

  if (!updated) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
