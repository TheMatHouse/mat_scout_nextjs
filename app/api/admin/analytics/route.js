export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { getAnalyticsClient, getProperty } from "@/lib/ga";

function hasAdminAccess(user) {
  if (!user) return false;
  if (user.isAdmin === true) return true; // ✅ your marker
  if (user.role && ["admin", "owner", "superadmin"].includes(user.role))
    return true;
  if (Array.isArray(user.roles) && user.roles.includes("admin")) return true;
  if (
    Array.isArray(user.permissions) &&
    user.permissions.includes("viewAnalytics")
  )
    return true;
  return false;
}

export async function GET() {
  try {
    const user = await getCurrentUser(); // from "@/lib/auth-server"
    if (!hasAdminAccess(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const analytics = getAnalyticsClient();
    const property = getProperty();

    const run = (requestBody) =>
      analytics.runReport({ property, ...requestBody }).then(([r]) => r);

    const [traffic, topPages, devices, referrers] = await Promise.all([
      run({
        dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "totalUsers" }, { name: "screenPageViews" }],
      }),
      run({
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 10,
      }),
      run({
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        dimensions: [{ name: "deviceCategory" }],
        metrics: [{ name: "totalUsers" }],
        orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
      }),
      run({
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        dimensions: [{ name: "sessionSourceMedium" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 10,
      }),
    ]);

    const rows = (r) => r?.rows || [];

    const trafficRows = rows(traffic).map((r) => ({
      date: r.dimensionValues?.[0]?.value ?? "",
      users: Number(r.metricValues?.[0]?.value ?? 0),
      views: Number(r.metricValues?.[1]?.value ?? 0),
    }));

    const topPageRows = rows(topPages).map((r) => ({
      path: r.dimensionValues?.[0]?.value ?? "",
      views: Number(r.metricValues?.[0]?.value ?? 0),
    }));

    const deviceRows = rows(devices).map((r) => ({
      device: r.dimensionValues?.[0]?.value ?? "",
      users: Number(r.metricValues?.[0]?.value ?? 0),
    }));

    const refRows = rows(referrers).map((r) => ({
      sourceMedium: r.dimensionValues?.[0]?.value ?? "",
      sessions: Number(r.metricValues?.[0]?.value ?? 0),
    }));

    const totals = trafficRows.reduce(
      (acc, d) => ({ users: acc.users + d.users, views: acc.views + d.views }),
      { users: 0, views: 0 }
    );

    return NextResponse.json({
      ok: true,
      totals,
      traffic: trafficRows,
      topPages: topPageRows,
      devices: deviceRows,
      referrers: refRows,
    });
  } catch (err) {
    console.error("Admin analytics error:", err);
    return NextResponse.json(
      { error: "Failed to fetch GA data" },
      { status: 500 }
    );
  }
}
