// app/api/analytics/summary/route.js
import { NextResponse } from "next/server";
import { BetaAnalyticsDataClient } from "@google-analytics/data";

// --- Auth: service account via env ---
function getGAClient() {
  const clientEmail = process.env.GA_CLIENT_EMAIL;
  let privateKey = process.env.GA_PRIVATE_KEY || "";

  if (!clientEmail || !privateKey) {
    throw new Error(
      "GA_CLIENT_EMAIL or GA_PRIVATE_KEY is missing (check server env)."
    );
  }

  // If private key is stored with escaped newlines, fix it:
  privateKey = privateKey.replace(/\\n/g, "\n");

  return new BetaAnalyticsDataClient({
    credentials: { client_email: clientEmail, private_key: privateKey },
  });
}

function resolveDateRange(range) {
  // GA supports { startDate, endDate } with keywords like '7daysAgo'.
  // We'll compute explicit dates for clarity.
  const now = new Date();
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  ); // today (UTC)
  const n = range === "90d" ? 90 : range === "28d" ? 28 : 7;
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - (n - 1)); // include today as day 1

  const fmt = (d) => d.toISOString().slice(0, 10); // YYYY-MM-DD
  return { startDate: fmt(start), endDate: fmt(end) };
}

async function fetchSummary(client, propertyId, range) {
  const { startDate, endDate } = resolveDateRange(range);
  const [resp] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    metrics: [
      { name: "totalUsers" },
      { name: "sessions" },
      { name: "userEngagementDuration" }, // seconds (sum over range)
    ],
  });

  const row = resp.rows?.[0]?.metricValues || [];
  const totalUsers = Number(row[0]?.value || 0);
  const sessions = Number(row[1]?.value || 0);
  const engagementSecondsTotal = Number(row[2]?.value || 0);

  // Simple avg engagement per session (fallback if sessions=0)
  const avgEngagementSeconds =
    sessions > 0 ? Math.round(engagementSecondsTotal / sessions) : 0;

  return {
    users: totalUsers,
    sessions,
    avgEngagementSeconds,
  };
}

async function fetchTopPages(client, propertyId, range, limit = 10) {
  const { startDate, endDate } = resolveDateRange(range);
  const [resp] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "pagePath" }], // or "pageTitle"
    metrics: [{ name: "screenPageViews" }],
    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    limit: String(limit),
  });

  return (resp.rows || []).map((r) => ({
    page: r.dimensionValues?.[0]?.value || "(unknown)",
    views: Number(r.metricValues?.[0]?.value || 0),
  }));
}

async function fetchTopEvents(client, propertyId, range, limit = 10) {
  const { startDate, endDate } = resolveDateRange(range);
  const [resp] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "eventName" }],
    metrics: [{ name: "eventCount" }],
    orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
    limit: String(limit),
  });

  return (resp.rows || []).map((r) => ({
    event: r.dimensionValues?.[0]?.value || "(unknown)",
    count: Number(r.metricValues?.[0]?.value || 0),
  }));
}

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const range = url.searchParams.get("range") || "7d";

    const propertyId = process.env.GA_PROPERTY_ID;
    if (!propertyId) {
      return NextResponse.json(
        { error: "GA_PROPERTY_ID env var is missing." },
        { status: 500 }
      );
    }

    const client = getGAClient();

    // Run all in parallel
    const [summary, topPages, topEvents] = await Promise.all([
      fetchSummary(client, propertyId, range).catch(() => null),
      fetchTopPages(client, propertyId, range).catch(() => []),
      fetchTopEvents(client, propertyId, range).catch(() => []),
    ]);

    return NextResponse.json(
      {
        summary,
        topPages,
        topEvents,
      },
      { status: 200 }
    );
  } catch (err) {
    const message =
      err?.errors?.[0]?.message || err?.message || "Analytics error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
