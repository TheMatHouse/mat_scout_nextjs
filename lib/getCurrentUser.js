// lib/getCurrentUser.js
import jwt from "jsonwebtoken";
import User from "@/models/userModel";
import { connectDB } from "@/lib/mongo";
import { headers } from "next/headers";

export async function getCurrentUser() {
  const headerList = headers();
  const cookieHeader = headerList.get("cookie") || "";
  const match = cookieHeader.match(/token=([^;]+)/);
  const token = match ? match[1] : null;

  if (!token) {
    console.log("No token found in headers");
    return null;
  }

  try {
    await connectDB();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded._id || decoded.userId;
    if (!userId) return null;

    const user = await User.findById(userId).select("-password");
    return user || null;
  } catch (error) {
    console.error("getCurrentUser error:", error);
    return null;
  }
}
