// app/api/metrics/rollup/daily/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import AnalyticsEvent from "@/models/analyticsEvent";
import AnalyticsDaily from "@/models/analyticsDaily";

const ROLLUP_SECRET = process.env.ROLLUP_SECRET || "";

/* ---------- helpers ---------- */
function startOfUTC(dateLike) {
  const d = new Date(dateLike);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
function addDaysUTC(dateLike, n) {
  return new Date(startOfUTC(dateLike).getTime() + n * 86400000);
}

async function buildOneDay(dayUTC) {
  const start = startOfUTC(dayUTC);
  const end = addDaysUTC(start, 1);

  const pv = await AnalyticsEvent.countDocuments({
    ts: { $gte: start, $lt: end },
  });
  const uv = (
    await AnalyticsEvent.distinct("visitor", { ts: { $gte: start, $lt: end } })
  ).length;

  const pages = await AnalyticsEvent.aggregate([
    { $match: { ts: { $gte: start, $lt: end } } },
    { $group: { _id: "$path", pv: { $sum: 1 } } },
    { $project: { _id: 0, path: "$_id", pv: 1 } },
    { $sort: { pv: -1 } },
    { $limit: 50 },
  ]);

  const referrers = await AnalyticsEvent.aggregate([
    { $match: { ts: { $gte: start, $lt: end } } },
    { $group: { _id: "$referrer", pv: { $sum: 1 } } },
    { $project: { _id: 0, referrer: "$_id", pv: 1 } },
    { $sort: { pv: -1 } },
    { $limit: 50 },
  ]);

  async function utmKey(key) {
    return AnalyticsEvent.aggregate([
      {
        $match: { ts: { $gte: start, $lt: end }, [`utm_${key}`]: { $ne: "" } },
      },
      { $group: { _id: `$utm_${key}`, pv: { $sum: 1 } } },
      { $project: { _id: 0, key: "$_id", pv: 1 } },
      { $sort: { pv: -1 } },
      { $limit: 50 },
    ]);
  }
  const utm = {
    source: await utmKey("source"),
    medium: await utmKey("medium"),
    campaign: await utmKey("campaign"),
  };

  await AnalyticsDaily.findOneAndUpdate(
    { day: start },
    { day: start, pv, uv, pages, referrers, utm, builtAt: new Date() },
    { upsert: true, setDefaultsOnInsert: true }
  );

  return { day: start.toISOString().slice(0, 10), pv, uv };
}

/* ---------- API handlers ---------- */
export async function POST(req) {
  console.log("COLLECT DEBUG", {
    NODE_ENV: process.env.NODE_ENV,
    dev: process.env.NODE_ENV !== "production",
    host: req.headers.get("host"),
  });
  try {
    const DEV = process.env.NODE_ENV !== "production";
    const url = new URL(req.url);
    const host = req.headers.get("host") || url.host || "";

    // Allow localhost in dev unconditionally
    if (!DEV) {
      const ALLOWED_HOSTS = new Set([
        "matscout.com",
        "www.matscout.com",
        "staging-matscout.com",
        "www.staging-matscout.com",
        "matscout.com:443",
        "www.matscout.com:443",
        "staging-matscout.com:443",
        "www.staging-matscout.com:443",
      ]);
      if (!ALLOWED_HOSTS.has(host)) {
        return NextResponse.json({ error: "bad_origin" }, { status: 403 });
      }
    }

    // Secret required in all envs (so only you can trigger rollups)
    const provided = req.headers.get("x-rollup-secret") || "";
    if (!ROLLUP_SECRET) {
      return NextResponse.json(
        { ok: false, error: "ROLLUP_SECRET not set on server" },
        { status: 500 }
      );
    }
    if (provided !== ROLLUP_SECRET) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    await connectDB();

    const results = [];
    if (body?.day) {
      results.push(await buildOneDay(startOfUTC(body.day)));
    } else if (body?.from && body?.to) {
      const from = startOfUTC(body.from);
      const to = startOfUTC(body.to);
      if (to < from) throw new Error("Invalid range: to < from");
      for (let d = from; d <= to; d = addDaysUTC(d, 1)) {
        results.push(await buildOneDay(d));
      }
    } else {
      const today = startOfUTC(new Date());
      const yesterday = addDaysUTC(today, -1);
      results.push(await buildOneDay(yesterday));
    }

    return NextResponse.json({ ok: true, results }, { status: 200 });
  } catch (e) {
    console.error("rollup/daily error:", e);
    return NextResponse.json({ ok: false, error: true }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: true, hint: "POST with {day} or {from,to}" },
    { status: 200 }
  );
}
