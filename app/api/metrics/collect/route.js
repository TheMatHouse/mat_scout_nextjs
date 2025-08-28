// app/api/metrics/collect/route.js
import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/mongo";
import AnalyticsEvent from "@/models/analyticsEvent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Optional: set to a long random string server-side
const ACCEPT_SECRET = process.env.ANALYTICS_ACCEPT_SECRET;

// allow both prod and staging domains
const ALLOWED_HOSTS = new Set([
  "matscout.com",
  "www.matscout.com",
  "staging-matscout.com",
  "www.staging-matscout.com",
  "localhost:3000",
]);

const BOT_REGEX =
  /\b(bot|crawl|spider|slurp|headless|phantom|uptime|statuscake|pingdom|monitoring|preview)\b/i;

function sha256(str) {
  return crypto.createHash("sha256").update(str).digest("hex");
}
function shortHash(str) {
  return sha256(str).slice(0, 32);
}
function dateOnlyUTC(d = new Date()) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

export async function POST(req) {
  try {
    const url = new URL(req.url);
    const host = req.headers.get("host") || url.host || "";
    if (!ALLOWED_HOSTS.has(host)) {
      // silently ignore; avoid becoming a public endpoint
      return NextResponse.json({ ok: false }, { status: 204 });
    }

    if (ACCEPT_SECRET) {
      const provided = req.headers.get("x-analytics-secret");
      if (provided !== ACCEPT_SECRET) {
        return NextResponse.json({ ok: false }, { status: 204 });
      }
    }

    const ua = (req.headers.get("user-agent") || "").slice(0, 512);
    if (BOT_REGEX.test(ua)) {
      return NextResponse.json({ ok: true }, { status: 204 });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "";

    // Parse body
    const body = await req.json().catch(() => ({}));
    const now = new Date();
    const eventTs = body?.ts ? new Date(body.ts) : now;

    // Build anonymized identifiers (no IP stored)
    const daySalt = dateOnlyUTC(now).toISOString().slice(0, 10);
    const visitor = shortHash(`${ip}:${ua}:${daySalt}`);
    const ipHash = ip ? shortHash(ip) : "";

    // Normalize fields
    const path = (body?.path || "").slice(0, 512);
    const referrer = (body?.referrer || "").slice(0, 512);
    const utm = body?.utm || {};
    const perf = body?.perf || {};

    // Ignore admin pages to avoid self-noise
    if (path.startsWith("/admin") || path.startsWith("/dashboard")) {
      return NextResponse.json({ ok: true }, { status: 204 });
    }

    await connectDB();

    await AnalyticsEvent.create({
      ts: eventTs,
      path,
      referrer,
      ua,
      utm_source: utm.source || "",
      utm_medium: utm.medium || "",
      utm_campaign: utm.campaign || "",
      utm_term: utm.term || "",
      utm_content: utm.content || "",
      visitor,
      ipHash,
      perf: {
        ttfb: Number(perf.ttfb ?? 0) || undefined,
        fcp: Number(perf.fcp ?? 0) || undefined,
      },
      day: dateOnlyUTC(eventTs),
    });

    return NextResponse.json({ ok: true }, { status: 204 });
  } catch {
    // Don't leak errors; respond no-content to be resilient
    return NextResponse.json({ ok: false }, { status: 204 });
  }
}

export const GET = async () =>
  NextResponse.json({ ok: true, method: "POST only" }, { status: 200 });
