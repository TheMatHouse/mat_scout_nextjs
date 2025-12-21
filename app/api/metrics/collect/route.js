// // app/api/metrics/collect/route.js
// import { NextResponse } from "next/server";
// import crypto from "crypto";
// import { connectDB } from "@/lib/mongo";
// import AnalyticsEvent from "@/models/analyticsEvent";

// export const runtime = "nodejs";
// export const dynamic = "force-dynamic";

// // Only enforced in PROD if set
// const ACCEPT_SECRET = process.env.ANALYTICS_ACCEPT_SECRET || null;

// const PROD_ALLOWED_HOSTS = new Set([
//   "matscout.com",
//   "www.matscout.com",
//   "staging-matscout.com",
//   "www.staging-matscout.com",
//   "matscout.com:443",
//   "www.matscout.com:443",
//   "staging-matscout.com:443",
//   "www.staging-matscout.com:443",
// ]);

// const BOT_REGEX =
//   /\b(bot|crawl|spider|slurp|headless|phantom|uptime|statuscake|pingdom|monitoring|preview)\b/i;

// function sha256(str) {
//   return crypto.createHash("sha256").update(str).digest("hex");
// }
// function shortHash(str) {
//   return sha256(str).slice(0, 32);
// }
// function dateOnlyUTC(d = new Date()) {
//   const x = new Date(d);
//   x.setUTCHours(0, 0, 0, 0);
//   return x;
// }

// export async function POST(req) {
//   const nodeEnv = process.env.NODE_ENV;
//   const dev = nodeEnv !== "production";
//   const url = new URL(req.url);
//   const host = req.headers.get("host") || url.host || "";

//   try {
//     // ✅ allow localhost explicitly (helps if dev isn’t detected)
//     const isLocal =
//       host.startsWith("localhost:") || host.startsWith("127.0.0.1:");
//     if (!isLocal && nodeEnv === "production" && !PROD_ALLOWED_HOSTS.has(host)) {
//       return NextResponse.json({ error: "bad_origin" }, { status: 403 });
//     }

//     // Secret check (prod only, if set)
//     if (!isLocal && nodeEnv === "production" && ACCEPT_SECRET) {
//       const provided = req.headers.get("x-analytics-secret");
//       if (provided !== ACCEPT_SECRET) {
//         return NextResponse.json({ ok: false }, { status: 403 });
//       }
//     }

//     const ua = (req.headers.get("user-agent") || "").slice(0, 512);
//     if (BOT_REGEX.test(ua)) {
//       return new Response(null, { status: 204 });
//     }

//     const ip =
//       req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
//       req.headers.get("x-real-ip") ||
//       "";

//     const body = await req.json().catch(() => ({}));
//     const now = new Date();
//     const eventTs = body?.ts ? new Date(body.ts) : now;

//     const daySalt = dateOnlyUTC(now).toISOString().slice(0, 10);
//     const visitor = shortHash(`${ip}:${ua}:${daySalt}`);
//     const ipHash = ip ? shortHash(ip) : "";

//     const path = (body?.path || "").slice(0, 512);
//     const referrer = (body?.referrer || "").slice(0, 512);
//     const utm = body?.utm || {};
//     const perf = body?.perf || {};

//     // Ignore admin/dashboard traffic
//     if (path.startsWith("/admin") || path.startsWith("/dashboard")) {
//       return new Response(null, { status: 204 });
//     }

//     await connectDB();

//     await AnalyticsEvent.create({
//       ts: eventTs,
//       path,
//       referrer,
//       ua,
//       utm_source: utm.source || "",
//       utm_medium: utm.medium || "",
//       utm_campaign: utm.campaign || "",
//       utm_term: utm.term || "",
//       utm_content: utm.content || "",
//       visitor,
//       ipHash,
//       perf: {
//         ttfb: Number(perf.ttfb ?? 0) || undefined,
//         fcp: Number(perf.fcp ?? 0) || undefined,
//       },
//       day: dateOnlyUTC(eventTs),
//     });

//     return new Response(null, { status: 204 });
//   } catch (e) {
//     console.error("metrics/collect error", e);
//     return NextResponse.json({ ok: false, error: true }, { status: 500 });
//   }
// }

// export const GET = async () =>
//   NextResponse.json({ ok: true, method: "POST only" }, { status: 200 });
export async function POST() {
  // Metrics must NEVER be fatal.
  // If anything fails, we silently succeed.
  return Response.json({ ok: true });
}
