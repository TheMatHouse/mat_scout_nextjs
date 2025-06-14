import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import "@/models/userStyleModel"; // Force-load UserStyle model
import "@/models/matchReportModel"; // Same for matchReports if needed
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const cookieStore = cookies(); // ✅ no await
    const token =
      cookieStore.get("token")?.value || cookieStore.get("authToken")?.value;

    console.log(
      "🔍 Cookie keys found:",
      cookieStore.getAll().map((c) => c.name)
    );
    console.log("🔐 Raw token value:", token);

    if (!token) {
      console.warn("⚠️ No token found in cookies.");
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    await connectDB();

    // Optional decode for inspection — not used for auth
    const decodedRaw = jwt.decode(token);
    console.log("🧾 Decoded token (unsafe decode):", decodedRaw);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ Verified token:", decoded);

    const userId = decoded.userId || decoded._id;
    if (!userId) {
      console.warn("⚠️ Token decoded but missing user ID.");
      return NextResponse.json(
        { error: "Invalid token payload" },
        { status: 401 }
      );
    }

    const user = await User.findById(userId)
      .select("-password")
      .populate("userStyles")
      .populate("matchReports");

    if (!user) {
      console.warn("❌ No user found for ID:", userId);
      const res = NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
      res.cookies.set("token", "", { path: "/", maxAge: 0 });
      return res;
    }

    console.log("🎉 Returning populated user:", user._id);
    return NextResponse.json({ user });
  } catch (err) {
    console.error("🔥 GET /api/auth/me error:", err.message);
    const res = NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
    );
    res.cookies.set("token", "", { path: "/", maxAge: 0 });
    return res;
  }
}
