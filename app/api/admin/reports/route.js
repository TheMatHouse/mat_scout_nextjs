export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { getCurrentUser } from "@/lib/auth-server";

/** ---------- admin gate ---------- */
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

/** ---------- tiny utils ---------- */
function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function parseDates(sp) {
  const start = sp.get("startDate");
  const end = sp.get("endDate");
  if (start && end) return { startDate: start, endDate: end };

  // default: last 28 days
  const today = new Date();
  const endDate = toISO(today);
  const startDate = toISO(
    new Date(today.getFullYear(), today.getMonth(), today.getDate() - 27)
  );
  return { startDate, endDate };
}
function csvEscape(val) {
  const s = String(val ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function toCSV(headers, rows) {
  const head = headers.join(",") + "\n";
  const body = rows
    .map((r) => headers.map((h) => csvEscape(r[h])).join(","))
    .join("\n");
  return head + (body ? body + "\n" : "");
}

/** ---------- Mongo connector (singleton) ---------- */
let _client;
async function getDb() {
  if (_client?.topology?.isConnected()) return _client.db();
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  _client = new MongoClient(uri, { maxPoolSize: 5 });
  await _client.connect();
  // Default DB name from URI, or override with MONGODB_DB
  const dbName = process.env.MONGODB_DB || _client.db().databaseName;
  return _client.db(dbName);
}

/** ---------- report handlers ---------- */
// 1) Users created per calendar day
async function usersByDay(db, { startDate, endDate }) {
  const match = {
    createdAt: {
      $gte: new Date(`${startDate}T00:00:00.000Z`),
      $lte: new Date(`${endDate}T23:59:59.999Z`),
    },
  };
  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ];
  const rows = await db.collection("users").aggregate(pipeline).toArray();
  return rows.map((r) => ({ date: r._id, count: r.count }));
}

// 2) Generic: any collection, docs created per calendar day (requires createdAt)
async function collectionByDay(db, { startDate, endDate, collection }) {
  if (!collection) throw new Error("Missing 'collection' for collectionByDay");
  const match = {
    createdAt: {
      $gte: new Date(`${startDate}T00:00:00.000Z`),
      $lte: new Date(`${endDate}T23:59:59.999Z`),
    },
  };
  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ];
  const rows = await db.collection(collection).aggregate(pipeline).toArray();
  return rows.map((r) => ({ date: r._id, count: r.count }));
}

/** ---------- main ---------- */
export async function GET(req) {
  try {
    const user = await getCurrentUser();
    if (!hasAdminAccess(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sp = new URL(req.url).searchParams;
    const { startDate, endDate } = parseDates(sp);
    const report = sp.get("report") || "usersByDay";
    const format = (sp.get("format") || "json").toLowerCase();

    const db = await getDb();

    let result = [];
    if (report === "usersByDay") {
      result = await usersByDay(db, { startDate, endDate });
    } else if (report === "collectionByDay") {
      const collection = sp.get("collection");
      result = await collectionByDay(db, { startDate, endDate, collection });
    } else {
      return NextResponse.json({ error: "Unknown report" }, { status: 400 });
    }

    const payload = {
      ok: true,
      meta: { report, startDate, endDate, rowCount: result.length },
      rows: result,
    };

    if (format === "csv") {
      const headers = ["date", "count"];
      const csv = toCSV(headers, result);
      const filename = `report_${report}_${startDate}_to_${endDate}.csv`;
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json(payload);
  } catch (err) {
    console.error("Admin reports error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to build report" },
      { status: 500 }
    );
  }
}
