import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import User from "@/models/userModel";
import { connectDB } from "@/lib/mongo";

export async function getCurrentUser() {
  await connectDB();

  const cookieStore = cookies(); // ✅ Safe
  const tokenCookie = cookieStore.get("token"); // ✅ Safe as part of sync context

  if (!tokenCookie) return null;

  try {
    const decoded = jwt.verify(tokenCookie.value, process.env.JWT_SECRET);
    const userId = decoded._id || decoded.userId;

    if (!userId) return null;

    const user = await User.findById(userId).select("-password");
    return user || null;
  } catch (error) {
    console.error("getCurrentUser error:", error);
    return null;
  }
}
