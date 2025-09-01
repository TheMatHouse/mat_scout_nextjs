// lib/auth-server.js
export const dynamic = "force-dynamic";

import { cookies, headers } from "next/headers";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";

/**
 * Ensure we always return both id and _id as the same string,
 * so client & server code can use either safely.
 */
function normalizeUserShape(u) {
  if (!u) return null;

  const rawId =
    (u._id && u._id.toString ? u._id.toString() : u._id) ||
    (u.id && u.id.toString ? u.id.toString() : u.id) ||
    "";

  // Pick avatar without changing your existing UI rules:
  // We keep all avatar fields; pages like DashboardSettings decide which to use.
  return {
    ...u,
    _id: rawId, // force string
    id: rawId, // add stable alias
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
 * Decode token (Authorization header or cookie) → userId → DB user
 */
async function readUserFromRequest() {
  await connectDB();

  let token;

  // 1) Authorization: Bearer <token>
  try {
    const h = await headers();
    const auth = h.get("authorization") || h.get("Authorization");
    if (auth && auth.startsWith("Bearer ")) {
      token = auth.slice("Bearer ".length).trim();
    }
  } catch {
    // headers() may not be available in all contexts — ignore
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

  // Use lean for speed; we’ll normalize shape ourselves
  const user = await User.findById(userId).lean();
  if (!user) return null;

  return normalizeUserShape(user);
}

/**
 * Public helpers used across the app
 */
export async function getCurrentUser() {
  return readUserFromRequest();
}

export async function getCurrentUserFromCookies() {
  // Kept for backwards compat (same as getCurrentUser)
  return readUserFromRequest();
}
