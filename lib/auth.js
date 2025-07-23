import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import User from "@/models/userModel";
import { connectDB } from "./mongo";

const JWT_SECRET = process.env.JWT_SECRET || "your-default-dev-secret";

export function verifyToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) return reject(err);
      resolve(decoded);
    });
  });
}

export async function getCurrentUserFromCookies() {
  await connectDB();

  const cookieStore = await cookies(); // ✅ Required for Next.js 15+
  const token = cookieStore.get("token")?.value;

  if (!token) return null;

  try {
    const decoded = await verifyToken(token);
    if (!decoded?.userId) return null;

    const user = await User.findById(decoded.userId).select("-password"); // ✅ Remove sensitive data
    return user || null;
  } catch (err) {
    console.error("Error decoding token:", err.message);
    return null;
  }
}
