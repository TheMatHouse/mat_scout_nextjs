// lib/gaData.js
import { BetaAnalyticsDataClient } from "@google-analytics/data";

let _client;

/** Get a singleton GA Data API client (server-side only) */
export function getGAClient() {
  if (_client) return _client;

  const propertyId = process.env.GA4_PROPERTY_ID;
  const client_email = process.env.GA_CLIENT_EMAIL;
  let private_key = process.env.GA_PRIVATE_KEY;

  if (!propertyId) throw new Error("GA4_PROPERTY_ID missing");
  if (!client_email) throw new Error("GA_CLIENT_EMAIL missing");
  if (!private_key) throw new Error("GA_PRIVATE_KEY missing");

  // Convert "\n" escapes from .env into real newlines
  private_key = private_key.replace(/\\n/g, "\n");

  _client = new BetaAnalyticsDataClient({
    credentials: { client_email, private_key },
  });
  return _client;
}

/** GA property path: "properties/<numericId>" */
export function getGAPropertyPath() {
  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!propertyId) throw new Error("GA4_PROPERTY_ID missing");
  return `properties/${propertyId}`; // numeric property id, not G-XXXX
}

/** Convenience wrapper to run a GA report */
export async function runGAReport({
  startDate,
  endDate,
  dimensions = [],
  metrics = [],
  limit,
  orderBys,
}) {
  const client = getGAClient();
  const property = getGAPropertyPath();

  const [resp] = await client.runReport({
    property,
    dateRanges: [{ startDate, endDate }],
    dimensions,
    metrics,
    limit,
    orderBys,
  });

  return resp;
}

/** Parse GA rows into simple objects */
export function parseGARows(resp, dims = [], mets = []) {
  const rows = resp?.rows || [];
  return rows.map((r) => {
    const o = {};
    dims.forEach((d, i) => (o[d] = r.dimensionValues?.[i]?.value ?? ""));
    mets.forEach((m, i) => (o[m] = Number(r.metricValues?.[i]?.value ?? 0)));
    return o;
  });
}
