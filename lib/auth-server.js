// lib/auth-server.js
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";

/**
 * Reads the JWT from cookies (await cookies()), verifies it,
 * and returns a lean user object or null.
 */
export async function getCurrentUserFromCookies() {
  // IMPORTANT: await cookies() per Next.js sync dynamic APIs rule
  const cookieStore = await cookies();
  const token =
    cookieStore.get("token")?.value || cookieStore.get("authToken")?.value;

  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    await connectDB();
    const userId = payload.userId || payload._id;
    if (!userId) return null;

    const user = await User.findById(userId)
      .select("_id firstName lastName username email isAdmin")
      .lean();

    return user || null;
  } catch {
    return null;
  }
}

/**
 * Alias used in server components/route handlers.
 * Keep one codepath so behavior stays consistent.
 */
export async function getCurrentUser() {
  return getCurrentUserFromCookies();
}
