// lib/gaData.js
import { BetaAnalyticsDataClient } from "@google-analytics/data";

const propertyId = process.env.GA4_PROPERTY_ID;
const clientEmail = process.env.GA_CLIENT_EMAIL;
let privateKey = process.env.GA_PRIVATE_KEY;

// Allow keys wrapped in quotes with \n
if (privateKey?.startsWith('"') || privateKey?.startsWith("'")) {
  try {
    privateKey = JSON.parse(privateKey);
  } catch {}
}

if (!propertyId || !clientEmail || !privateKey) {
  // Don't throw here; let the API route return a clear message
  console.warn(
    "GA Data API envs missing: GA4_PROPERTY_ID / GA_CLIENT_EMAIL / GA_PRIVATE_KEY"
  );
}

const gaClient = new BetaAnalyticsDataClient({
  credentials: {
    client_email: clientEmail,
    private_key: privateKey,
  },
});

export async function getOverview({ days = 7 } = {}) {
  if (!propertyId || !clientEmail || !privateKey) {
    return { ok: false, error: "GA credentials missing", data: null };
  }

  const dateRange = [
    { startDate: `${days}daysAgo`, endDate: "yesterday" },
    { startDate: "today", endDate: "today" },
  ];

  // 1) Daily users/sessions (timeseries)
  const [timeseries] = await gaClient.runReport({
    property: `properties/${propertyId}`,
    dateRanges: dateRange,
    dimensions: [{ name: "date" }],
    metrics: [{ name: "activeUsers" }, { name: "sessions" }],
    orderBys: [{ dimension: { dimensionName: "date" } }],
  });

  // 2) Top pages (admin only)
  const [topPages] = await gaClient.runReport({
    property: `properties/${propertyId}`,
    dateRanges: dateRange,
    dimensions: [{ name: "pagePath" }],
    metrics: [{ name: "screenPageViews" }],
    limit: 10,
    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    // (Optional) If you want to only include /admin paths:
    // dimensionFilter: { filter: { fieldName: "pagePath", stringFilter: { value: "/admin", matchType: "BEGINS_WITH" } } }
  });

  // 3) Top events
  const [topEvents] = await gaClient.runReport({
    property: `properties/${propertyId}`,
    dateRanges: dateRange,
    dimensions: [{ name: "eventName" }],
    metrics: [{ name: "eventCount" }, { name: "totalUsers" }],
    limit: 10,
    orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
  });

  // Shape the data
  const ts = (timeseries.rows || []).map((r) => ({
    date: r.dimensionValues[0].value,
    users: Number(r.metricValues[0].value || 0),
    sessions: Number(r.metricValues[1].value || 0),
  }));

  const pages = (topPages.rows || []).map((r) => ({
    path: r.dimensionValues[0].value,
    views: Number(r.metricValues[0].value || 0),
  }));

  const events = (topEvents.rows || []).map((r) => ({
    name: r.dimensionValues[0].value,
    count: Number(r.metricValues[0].value || 0),
    users: Number(r.metricValues[1].value || 0),
  }));

  return { ok: true, data: { timeseries: ts, pages, events } };
}
