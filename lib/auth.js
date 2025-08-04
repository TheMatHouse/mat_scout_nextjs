import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import User from "@/models/userModel";
import { connectDB } from "./mongo";

const JWT_SECRET = process.env.JWT_SECRET || "your-default-dev-secret";

/**
 * Verify the JWT token and return decoded payload
 */
export async function verifyToken(token) {
  const secret = new TextEncoder().encode(JWT_SECRET);
  const { payload } = await jwtVerify(token, secret);
  return payload;
}

/**
 * Get current user from cookies using the token
 */
export async function getCurrentUser() {
  await connectDB();
  const cookieStore = await cookies(); // ✅ Await required now
  const token = cookieStore.get("token")?.value;

  if (!token) return null;

  try {
    const decoded = await verifyToken(token);
    if (!decoded?.userId) return null;

    const user = await User.findById(decoded.userId).select("-password");
    return user || null;
  } catch (err) {
    console.error("Error decoding token:", err.message);
    return null;
  }
}

// ✅ Backward compatibility alias
export const getCurrentUserFromCookies = getCurrentUser;
