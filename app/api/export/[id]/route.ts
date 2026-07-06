import { NextRequest, NextResponse } from "next/server";
import { getIdeaById, listSignups, listVariants } from "@/lib/data";
import { isValidSession, SESSION_COOKIE_NAME } from "@/lib/auth";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!(await isValidSession(session))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const idea = await getIdeaById(id);
  if (!idea) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const [signups, variants] = await Promise.all([listSignups(id), listVariants(id)]);
  const variantLabel = new Map(variants.map((v) => [v.id, v.label]));

  const header = [
    "email",
    "name",
    "variant",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "referrer",
    "created_at",
  ];
  const rows = signups.map((s) =>
    [
      s.email,
      s.name || "",
      variantLabel.get(s.variant_id) || "",
      s.utm_source || "",
      s.utm_medium || "",
      s.utm_campaign || "",
      s.utm_content || "",
      s.referrer || "",
      s.created_at,
    ]
      .map((v) => csvEscape(String(v)))
      .join(",")
  );

  const csv = [header.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${idea.slug}-signups.csv"`,
    },
  });
}
