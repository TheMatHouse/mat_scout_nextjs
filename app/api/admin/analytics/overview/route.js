// app/api/admin/analytics/overview/route.js
import { NextResponse } from "next/server";
import { getOverview } from "@/lib/gaData";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await getOverview({ days: 7 });
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 200 }
      );
    }
    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  } catch (e) {
    console.error("GA overview error:", e?.message || e);
    return NextResponse.json(
      { ok: false, error: "analytics_failed" },
      { status: 200 }
    );
  }
}
