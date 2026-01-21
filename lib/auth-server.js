// lib/auth-server.js
export const dynamic = "force-dynamic";

import { cookies, headers } from "next/headers";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";

/**
 * Ensure consistent user shape
 */
function normalizeUserShape(u) {
  if (!u) return null;

  const rawId =
    (u._id && u._id.toString ? u._id.toString() : u._id) ||
    (u.id && u.id.toString ? u.id.toString() : u.id) ||
    "";

  return {
    ...u,
    _id: rawId,
    id: rawId,
  };
}

function getJwtSecret() {
  return (
    process.env.JWT_SECRET ||
    process.env.NEXT_PUBLIC_JWT_SECRET ||
    "CHANGE_ME_IN_ENV"
  );
}

/**
 * Throttle window for activity updates (10 minutes)
 */
const LAST_ACTIVE_THROTTLE_MS = 10 * 60 * 1000;

/**
 * Decode token from Authorization header or cookie → user
 * ⚠️ MUST NEVER THROW
 */
async function readUserFromRequest() {
  let token = null;

  // 1) Authorization header
  try {
    const h = await headers();
    const auth = h.get("authorization") || h.get("Authorization");
    if (auth && auth.startsWith("Bearer ")) {
      token = auth.slice("Bearer ".length).trim();
    }
  } catch {
    // ignore
  }

  // 2) Cookie fallback
  if (!token) {
    try {
      const c = await cookies();
      token = c.get("token")?.value;
    } catch {
      // ignore
    }
  }

  if (!token) return null;

  let payload;
  try {
    payload = jwt.verify(token, getJwtSecret());
  } catch {
    return null;
  }

  const userId =
    payload?.userId || payload?.sub || payload?.id || payload?._id || null;

  if (!userId) return null;

  // 🔒 CRITICAL HARDENING:
  // DB failures MUST degrade to unauthenticated, never crash render
  try {
    await connectDB();

    // Fetch user (lean for read)
    const user = await User.findById(userId).lean();
    if (!user) return null;

    // --- activity tracking (throttled) ---
    try {
      const now = Date.now();
      const last =
        user.lastActiveAt instanceof Date ? user.lastActiveAt.getTime() : 0;

      if (now - last > LAST_ACTIVE_THROTTLE_MS) {
        await User.updateOne(
          { _id: userId },
          { $set: { lastActiveAt: new Date(now) } }
        );
      }
    } catch {
      // NEVER allow activity tracking to break auth
    }

    return normalizeUserShape(user);
  } catch (err) {
    console.error("getCurrentUser DB failure:", err.message);
    return null;
  }
}

/**
 * Public helpers
 */
export async function getCurrentUser() {
  return readUserFromRequest();
}

export async function getCurrentUserFromCookies() {
  return readUserFromRequest();
}
