export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";

/* --------------------------------------------------
   ONLY allow analytics on real production
-------------------------------------------------- */
const IS_REAL_PROD = process.env.VERCEL_ENV === "production";

/* -------------------- simple in-memory cache -------------------- */
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map();

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
    else if (range === "90d") days = 90;
    endDate = endDefault;
    startDate = toISODate(addDays(today, -days + 1));
  }

  const limit = clamp(parseInt(searchParams.get("limit") || "10", 10), 5, 50);

  return { startDate, endDate, limit };
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

function calcTotals(rows) {
  return rows.reduce(
    (acc, d) => ({
      users: acc.users + (d.users || 0),
      views: acc.views + (d.views || 0),
    }),
    { users: 0, views: 0 }
  );
}

/* -------------------- main handler -------------------- */
export async function GET(req) {
  try {
    // 🚫 HARD STOP OUTSIDE REAL PRODUCTION
    if (!IS_REAL_PROD) {
      return NextResponse.json(
        {
          ok: false,
          disabled: true,
          message: "Analytics disabled outside production",
        },
        { status: 204 }
      );
    }

    const user = await getCurrentUser();
    if (!hasAdminAccess(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ⬇️ Import GA ONLY now (never at build time)
    const { getAnalyticsClient, getProperty } = await import("@/lib/ga");

    const url = new URL(req.url);
    const opts = parseRange(url.searchParams);

    const property = getProperty();
    const analytics = getAnalyticsClient();

    const key = makeKey(property, opts);
    const hit = cache.get(key);
    if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
      return NextResponse.json(hit.payload);
    }

    const [trafficResp] = await analytics.runReport({
      property,
      dateRanges: [{ startDate: opts.startDate, endDate: opts.endDate }],
      dimensions: [{ name: "date" }],
      metrics: [{ name: "totalUsers" }, { name: "screenPageViews" }],
    });

    const traffic = toRows(trafficResp).map((r) => ({
      date: r.dimensionValues?.[0]?.value ?? "",
      users: toNumber(r.metricValues?.[0]?.value),
      views: toNumber(r.metricValues?.[1]?.value),
    }));

    const payload = {
      ok: true,
      meta: {
        property,
        range: { startDate: opts.startDate, endDate: opts.endDate },
      },
      totals: calcTotals(traffic),
      traffic,
    };

    cache.set(key, { ts: Date.now(), payload });

    return NextResponse.json(payload);
  } catch (err) {
    console.error("Admin analytics error:", err);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
