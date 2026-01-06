export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";

/* --------------------------------------------------
   ENV CHECK
-------------------------------------------------- */
const IS_PROD = process.env.VERCEL_ENV === "production";

/* -------------------- handler -------------------- */
export async function GET(req) {
  // ⛔️ Preview / Staging: analytics disabled, BUT route exists
  if (!IS_PROD) {
    return NextResponse.json(
      {
        ok: false,
        disabled: true,
        message: "Analytics disabled outside production",
      },
      { status: 200 }
    );
  }

  // 🔐 Auth (prod only)
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /**
   * 🚨 CRITICAL:
   * Use require() INSIDE prod execution
   * This keeps GA completely invisible to the build step
   */
  // eslint-disable-next-line global-require
  const { getAnalyticsClient, getProperty } = require("@/lib/ga");

  const analytics = getAnalyticsClient();
  const property = getProperty();

  const [resp] = await analytics.runReport({
    property,
    dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
    dimensions: [{ name: "date" }],
    metrics: [{ name: "totalUsers" }],
  });

  const rows =
    resp?.rows?.map((r) => ({
      date: r.dimensionValues?.[0]?.value ?? "",
      users: Number(r.metricValues?.[0]?.value ?? 0),
    })) ?? [];

  return NextResponse.json({
    ok: true,
    traffic: rows,
  });
}
