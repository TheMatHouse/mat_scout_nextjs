// app/api/settings/notifications/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import { getCurrentUser } from "@/lib/auth-server";

/** Keep in sync with UI */
const DEFAULTS = {
  joinRequests: { inApp: true, email: true },
  teamUpdates: { inApp: true, email: false },
  scoutingReports: { inApp: true, email: true },
  followed: {
    matchReports: { inApp: true, email: false },
    profileUpdates: { inApp: true, email: false },
    avatarChanges: { inApp: true, email: false },
  },
  followers: {
    newFollower: { inApp: true, email: false },
  },
};

const bool = (v, fallback = false) =>
  typeof v === "boolean" ? v : v == null ? fallback : !!v;

const isObject = (x) => x && typeof x === "object" && !Array.isArray(x);
const isLeaf = (x) => isObject(x) && ("inApp" in x || "email" in x);

function normalizeNode(node) {
  if (!isObject(node)) return null;
  if (isLeaf(node)) {
    return { inApp: bool(node.inApp, false), email: bool(node.email, false) };
  }
  const out = {};
  for (const [k, v] of Object.entries(node)) {
    const child = normalizeNode(v);
    if (child) out[k] = child;
  }
  return Object.keys(out).length ? out : null;
}

function sanitizeSettings(obj) {
  const norm = normalizeNode(obj || {});
  return norm || {};
}

function deepMerge(a = {}, b = {}) {
  if (isLeaf(a) && isLeaf(b)) {
    return { inApp: bool(b.inApp, a.inApp), email: bool(b.email, a.email) };
  }
  if (isLeaf(a) && !isLeaf(b)) return b;
  if (!isLeaf(a) && isLeaf(b)) return b;

  const out = { ...a };
  for (const [k, v] of Object.entries(b || {})) {
    out[k] = k in out ? deepMerge(out[k], v) : v;
  }
  return out;
}

function flattenLeaves(obj, base = "notificationSettings") {
  const out = {};
  if (isLeaf(obj)) {
    out[`${base}.inApp`] = bool(obj.inApp, false);
    out[`${base}.email`] = bool(obj.email, false);
    return out;
  }
  for (const [k, v] of Object.entries(obj || {})) {
    if (!isObject(v)) continue;
    Object.assign(out, flattenLeaves(v, `${base}.${k}`));
  }
  return out;
}

function hasPath(obj, dotPath) {
  const parts = dotPath.split(".");
  let cur = obj;
  for (const p of parts) {
    if (!isObject(cur) || !(p in cur)) return false;
    cur = cur[p];
  }
  return true;
}

export async function GET() {
  try {
    await connectDB();
    const viewer = await getCurrentUser();
    if (!viewer?._id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findById(viewer._id)
      .select("_id notificationSettings")
      .lean();

    const merged = deepMerge(DEFAULTS, user?.notificationSettings || {});

    // Lazy backfill any missing paths
    try {
      const desired = flattenLeaves(merged);
      const missingSet = {};
      for (const [path, val] of Object.entries(desired)) {
        if (!hasPath(user || {}, path)) missingSet[path] = val;
      }
      if (Object.keys(missingSet).length) {
        await User.updateOne(
          { _id: viewer._id },
          { $set: missingSet },
          { strict: false }
        );
      }
    } catch (e) {
      console.warn("[notifications GET] lazy backfill skipped:", e);
    }

    return NextResponse.json(
      { notificationSettings: merged },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error("GET /api/settings/notifications error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    await connectDB();
    const viewer = await getCurrentUser();
    if (!viewer?._id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const incoming = sanitizeSettings(body?.notificationSettings);

    const current = await User.findById(viewer._id)
      .select("_id notificationSettings")
      .lean();

    const next = deepMerge(current?.notificationSettings || {}, incoming);

    await User.findByIdAndUpdate(
      viewer._id,
      { $set: { notificationSettings: next } },
      { new: true, strict: false }
    );

    const merged = deepMerge(DEFAULTS, next);

    return NextResponse.json(
      { ok: true, notificationSettings: merged },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error("PATCH /api/settings/notifications error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
