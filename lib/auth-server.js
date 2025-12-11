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
 * Decode token from Authorization header or cookie → user
 */
async function readUserFromRequest() {
  await connectDB();

  let token = null;

  // 1) Authorization header
  try {
    const h = headers(); // ❗ synchronous
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
      const c = cookies(); // ❗ synchronous
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

  // Fast lookup
  const user = await User.findById(userId).lean();
  if (!user) return null;

  return normalizeUserShape(user);
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
