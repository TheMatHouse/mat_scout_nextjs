export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { getAnalyticsClient, getProperty } from "@/lib/ga";

/* -------------------- simple in-memory cache -------------------- */
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map(); // key -> { ts, payload }

/* -------------------- utils -------------------- */
function hasAdminAccess(user) {
  if (!user) return false;
  if (user.isAdmin === true) return true;
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

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
function toISODate(d) {
  // format YYYY-MM-DD
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function daysBetween(start, end) {
  return Math.max(
    1,
    Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24))
  );
}

function parseRange(searchParams) {
  // supports ?range=7d|28d|90d OR ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
  const today = new Date();
  const endDefault = toISODate(today);
  const range = (searchParams.get("range") || "").toLowerCase();
  const startParam = searchParams.get("startDate");
  const endParam = searchParams.get("endDate");

  let startDate, endDate;

  if (startParam && endParam) {
    startDate = startParam;
    endDate = endParam;
  } else {
    let days = 28;
    if (range === "7d") days = 7;
    else if (range === "28d") days = 28;
    else if (range === "90d") days = 90;
    endDate = endDefault;
    startDate = toISODate(addDays(today, -days + 1));
  }

  // Compare period?
  const compare =
    (searchParams.get("compare") || "false").toLowerCase() === "true";
  let prevStart = null,
    prevEnd = null;
  if (compare) {
    const len = daysBetween(startDate, endDate);
    prevEnd = toISODate(addDays(new Date(startDate), -1));
    prevStart = toISODate(addDays(new Date(prevEnd), -(len - 1)));
  }

  const limit = clamp(parseInt(searchParams.get("limit") || "10", 10), 5, 50);

  return {
    startDate,
    endDate,
    compare,
    prevStart,
    prevEnd,
    limit,
  };
}

function makeKey(property, opts) {
  return JSON.stringify({ property, ...opts });
}

function toNumber(v) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function toRows(resp) {
  return resp?.rows || [];
}

function calcTotals(trafficRows) {
  return trafficRows.reduce(
    (acc, d) => ({
      users: acc.users + (d.users || 0),
      views: acc.views + (d.views || 0),
    }),
    { users: 0, views: 0 }
  );
}

function csvEscape(val) {
  const s = String(val ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function toCSV(headers, rows) {
  const head = headers.map(csvEscape).join(",") + "\n";
  const body = rows
    .map((r) => headers.map((h) => csvEscape(r[h])).join(","))
    .join("\n");
  return head + body + (body ? "\n" : "");
}

/* -------------------- GA calls -------------------- */
async function runReports(property, analytics, opts) {
  const { startDate, endDate, prevStart, prevEnd, compare, limit } = opts;

  const run = async (requestBody) => {
    const [resp] = await analytics.runReport({ property, ...requestBody });
    return resp;
  };

  const trafficPromise = run({
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "date" }],
    metrics: [{ name: "totalUsers" }, { name: "screenPageViews" }],
  });

  const topPagesPromise = run({
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "pagePath" }],
    metrics: [{ name: "screenPageViews" }],
    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    limit,
  });

  const devicesPromise = run({
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "deviceCategory" }],
    metrics: [{ name: "totalUsers" }],
    orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
  });

  const referrersPromise = run({
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "sessionSourceMedium" }],
    metrics: [{ name: "sessions" }],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit,
  });

  const geoPromise = run({
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "country" }],
    metrics: [{ name: "totalUsers" }],
    orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
    limit,
  });

  const compareTrafficPromise = compare
    ? run({
        dateRanges: [{ startDate: prevStart, endDate: prevEnd }],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "totalUsers" }, { name: "screenPageViews" }],
      })
    : Promise.resolve(null);

  const [traffic, topPages, devices, referrers, geo, trafficPrev] =
    await Promise.all([
      trafficPromise,
      topPagesPromise,
      devicesPromise,
      referrersPromise,
      geoPromise,
      compareTrafficPromise,
    ]);

  // transform
  const trafficRows = toRows(traffic).map((r) => ({
    date: r.dimensionValues?.[0]?.value ?? "",
    users: toNumber(r.metricValues?.[0]?.value),
    views: toNumber(r.metricValues?.[1]?.value),
  }));

  const topPageRows = toRows(topPages).map((r) => ({
    path: r.dimensionValues?.[0]?.value ?? "",
    views: toNumber(r.metricValues?.[0]?.value),
  }));

  const deviceRows = toRows(devices).map((r) => ({
    device: r.dimensionValues?.[0]?.value ?? "",
    users: toNumber(r.metricValues?.[0]?.value),
  }));

  const refRows = toRows(referrers).map((r) => ({
    sourceMedium: r.dimensionValues?.[0]?.value ?? "",
    sessions: toNumber(r.metricValues?.[0]?.value),
  }));

  const geoRows = toRows(geo).map((r) => ({
    country: r.dimensionValues?.[0]?.value ?? "",
    users: toNumber(r.metricValues?.[0]?.value),
  }));

  let trafficPrevRows = [];
  let totalsPrev = { users: 0, views: 0 };
  if (trafficPrev) {
    trafficPrevRows = toRows(trafficPrev).map((r) => ({
      date: r.dimensionValues?.[0]?.value ?? "",
      users: toNumber(r.metricValues?.[0]?.value),
      views: toNumber(r.metricValues?.[1]?.value),
    }));
    totalsPrev = calcTotals(trafficPrevRows);
  }

  const totals = calcTotals(trafficRows);

  // deltas
  const deltaUsers = totals.users - totalsPrev.users;
  const deltaViews = totals.views - totalsPrev.views;
  const pct = (a, b) => (b === 0 ? null : (a / b) * 100);
  const deltaUsersPct = pct(deltaUsers, totalsPrev.users);
  const deltaViewsPct = pct(deltaViews, totalsPrev.views);

  return {
    totals,
    totalsPrev,
    deltas: {
      users: deltaUsers,
      views: deltaViews,
      usersPct: deltaUsersPct,
      viewsPct: deltaViewsPct,
    },
    traffic: trafficRows,
    trafficPrev: trafficPrevRows,
    topPages: topPageRows,
    devices: deviceRows,
    referrers: refRows,
    geo: geoRows,
  };
}

/* -------------------- CSV responder -------------------- */
function buildCSV(dataset, data, meta) {
  const { startDate, endDate } = meta.range;
  const filename = `analytics_${dataset}_${startDate}_to_${endDate}.csv`;

  let headers = [];
  let rows = [];

  switch (dataset) {
    case "traffic":
      headers = ["date", "users", "views"];
      rows = data.traffic;
      break;
    case "topPages":
      headers = ["path", "views"];
      rows = data.topPages;
      break;
    case "devices":
      headers = ["device", "users"];
      rows = data.devices;
      break;
    case "referrers":
      headers = ["sourceMedium", "sessions"];
      rows = data.referrers;
      break;
    case "geo":
      headers = ["country", "users"];
      rows = data.geo;
      break;
    default:
      headers = ["message"];
      rows = [{ message: "Unknown dataset" }];
  }

  const csv = toCSV(headers, rows);
  const init = {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  };
  return new Response(csv, init);
}

/* -------------------- main handler -------------------- */
export async function GET(req) {
  try {
    const user = await getCurrentUser();
    if (!hasAdminAccess(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const sp = url.searchParams;
    const opts = parseRange(sp);
    const property = getProperty();
    const analytics = getAnalyticsClient();

    // cache
    const key = makeKey(property, opts);
    const hit = cache.get(key);
    if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
      // CSV export also served from cache if available
      if ((sp.get("format") || "").toLowerCase() === "csv") {
        const dataset = (sp.get("dataset") || "").trim() || "traffic";
        const meta = {
          range: { startDate: opts.startDate, endDate: opts.endDate },
        };
        return buildCSV(dataset, hit.payload, meta);
      }
      return NextResponse.json(hit.payload);
    }

    const data = await runReports(property, analytics, opts);

    const payload = {
      ok: true,
      meta: {
        property,
        range: { startDate: opts.startDate, endDate: opts.endDate },
        compare: opts.compare
          ? { startDate: opts.prevStart, endDate: opts.prevEnd }
          : null,
        limit: opts.limit,
      },
      totals: data.totals,
      totalsPrev: data.totalsPrev,
      deltas: data.deltas,
      traffic: data.traffic,
      trafficPrev: data.trafficPrev,
      topPages: data.topPages,
      devices: data.devices,
      referrers: data.referrers,
      geo: data.geo,
    };

    cache.set(key, { ts: Date.now(), payload });

    // CSV export?
    if ((sp.get("format") || "").toLowerCase() === "csv") {
      const dataset = (sp.get("dataset") || "").trim() || "traffic";
      return buildCSV(dataset, payload, payload.meta);
    }

    return NextResponse.json(payload);
  } catch (err) {
    console.error("Admin analytics error:", err);
    return NextResponse.json(
      { error: "Failed to fetch GA data" },
      { status: 500 }
    );
  }
}
