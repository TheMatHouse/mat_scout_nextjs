// app/api/analytics/summary/route.js
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { BetaAnalyticsDataClient } from "@google-analytics/data";

// cache the client across invocations
let _client;

/**
 * Prefer explicit ENV credentials (GA_CLIENT_EMAIL + GA_PRIVATE_KEY).
 * Fall back to GOOGLE_APPLICATION_CREDENTIALS (JSON file) if env creds are absent.
 * This avoids filesystem permission issues when env creds are available.
 */
function getGAClient() {
  if (_client) return _client;

  const clientEmail = process.env.GA_CLIENT_EMAIL;
  let privateKey = process.env.GA_PRIVATE_KEY || "";

  if (clientEmail && privateKey) {
    // tolerate \n-escaped keys and stray CRs
    if (privateKey.includes("\\n"))
      privateKey = privateKey.replace(/\\n/g, "\n");
    privateKey = privateKey.replace(/\r/g, "").trim();

    _client = new BetaAnalyticsDataClient({
      credentials: { client_email: clientEmail, private_key: privateKey },
    });
    _client.__authMode = "env-creds";
    return _client;
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    _client = new BetaAnalyticsDataClient(); // let ADC read the JSON file
    _client.__authMode = "adc-file";
    return _client;
  }

  throw new Error(
    "Missing GA credentials. Provide GA_CLIENT_EMAIL + GA_PRIVATE_KEY or set GOOGLE_APPLICATION_CREDENTIALS."
  );
}

function resolveDateRange(range) {
  const now = new Date();
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const days = range === "90d" ? 90 : range === "28d" ? 28 : 7;
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - (days - 1));
  const fmt = (d) => d.toISOString().slice(0, 10);
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
      { name: "userEngagementDuration" },
    ],
  });

  const row = resp.rows?.[0]?.metricValues || [];
  const users = Number(row[0]?.value || 0);
  const sessions = Number(row[1]?.value || 0);
  const eng = Number(row[2]?.value || 0);

  return {
    users,
    sessions,
    avgEngagementSeconds: sessions ? Math.round(eng / sessions) : 0,
  };
}

async function fetchTopPages(client, propertyId, range) {
  const { startDate, endDate } = resolveDateRange(range);
  const [resp] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "pagePath" }],
    metrics: [{ name: "screenPageViews" }],
    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    limit: "10",
  });

  return (resp.rows || []).map((r) => ({
    page: r.dimensionValues?.[0]?.value || "(unknown)",
    views: Number(r.metricValues?.[0]?.value || 0),
  }));
}

async function fetchTopEvents(client, propertyId, range) {
  const { startDate, endDate } = resolveDateRange(range);
  const [resp] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "eventName" }],
    metrics: [{ name: "eventCount" }],
    orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
    limit: "10",
  });

  return (resp.rows || []).map((r) => ({
    event: r.dimensionValues?.[0]?.value || "(unknown)",
    count: Number(r.metricValues?.[0]?.value || 0),
  }));
}

export async function GET(req) {
  const url = new URL(req.url);
  const range = url.searchParams.get("range") || "7d";
  const debug = url.searchParams.get("debug") === "1";

  try {
    const propertyId = process.env.GA_PROPERTY_ID;
    if (!propertyId) throw new Error("GA_PROPERTY_ID is missing");

    const client = getGAClient();

    let e1 = null,
      e2 = null,
      e3 = null;
    const [summary, topPages, topEvents] = await Promise.all([
      fetchSummary(client, propertyId, range).catch(
        (err) => ((e1 = err), null)
      ),
      fetchTopPages(client, propertyId, range).catch((err) => ((e2 = err), [])),
      fetchTopEvents(client, propertyId, range).catch(
        (err) => ((e3 = err), [])
      ),
    ]);

    return NextResponse.json({
      summary,
      topPages,
      topEvents,
      ...(debug && {
        _debug: {
          summaryError: e1?.message,
          pagesError: e2?.message,
          eventsError: e3?.message,
          hasPropertyId: !!process.env.GA_PROPERTY_ID,
          hasClientEmail: !!process.env.GA_CLIENT_EMAIL,
          hasPrivateKey: !!process.env.GA_PRIVATE_KEY,
          hasGacFile: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
          authMode: _client?.__authMode || "unknown",
          propertyId: process.env.GA_PROPERTY_ID,
        },
      }),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
