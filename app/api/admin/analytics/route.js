import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server"; // per your project memory
import { getAnalyticsClient, getProperty } from "@/lib/ga";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "admin" && user.role !== "owner")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const analytics = await getAnalyticsClient();
    const property = getProperty();

    const [traffic, topPages, devices, referrers] = await Promise.all([
      analytics.properties.runReport({
        property,
        requestBody: {
          dimensions: [{ name: "date" }],
          metrics: [{ name: "totalUsers" }, { name: "screenPageViews" }],
          dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
        },
      }),
      analytics.properties.runReport({
        property,
        requestBody: {
          dimensions: [{ name: "pagePath" }],
          metrics: [{ name: "screenPageViews" }],
          dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
          orderBys: [{ desc: true, metric: { metricName: "screenPageViews" } }],
          limit: 10,
        },
      }),
      analytics.properties.runReport({
        property,
        requestBody: {
          dimensions: [{ name: "deviceCategory" }],
          metrics: [{ name: "totalUsers" }],
          dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
          orderBys: [{ desc: true, metric: { metricName: "totalUsers" } }],
        },
      }),
      analytics.properties.runReport({
        property,
        requestBody: {
          dimensions: [{ name: "sessionSourceMedium" }],
          metrics: [{ name: "sessions" }],
          dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
          orderBys: [{ desc: true, metric: { metricName: "sessions" } }],
          limit: 10,
        },
      }),
    ]);

    const toRows = (r) => r.data?.rows || [];

    const trafficRows = toRows(traffic).map((r) => ({
      date: r.dimensionValues?.[0]?.value ?? "",
      users: Number(r.metricValues?.[0]?.value ?? 0),
      views: Number(r.metricValues?.[1]?.value ?? 0),
    }));

    const topPageRows = toRows(topPages).map((r) => ({
      path: r.dimensionValues?.[0]?.value ?? "",
      views: Number(r.metricValues?.[0]?.value ?? 0),
    }));

    const deviceRows = toRows(devices).map((r) => ({
      device: r.dimensionValues?.[0]?.value ?? "",
      users: Number(r.metricValues?.[0]?.value ?? 0),
    }));

    const refRows = toRows(referrers).map((r) => {
      const label = r.dimensionValues?.[0]?.value ?? ""; // e.g. "google / organic"
      return {
        sourceMedium: label,
        sessions: Number(r.metricValues?.[0]?.value ?? 0),
      };
    });

    const totals = trafficRows.reduce(
      (acc, d) => {
        acc.users += d.users;
        acc.views += d.views;
        return acc;
      },
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
