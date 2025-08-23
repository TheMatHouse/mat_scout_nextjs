// app/api/auth/me/route.js
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import UserStyle from "@/models/userStyleModel";
import "@/models/matchReportModel";
import "@/models/scoutingReportModel";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();

    const cookieStore = await cookies(); // your runtime requires await
    const token =
      cookieStore.get("token")?.value ||
      cookieStore.get("authToken")?.value ||
      null;

    // No token = not logged in
    if (!token) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    // Verify JWT defensively
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      // Missing secret? Treat as logged out and clear cookie.
      const res = NextResponse.json({ user: null }, { status: 200 });
      res.cookies.set("token", "", { path: "/", maxAge: 0 });
      res.cookies.set("authToken", "", { path: "/", maxAge: 0 });
      return res;
    }

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch {
      const res = NextResponse.json({ user: null }, { status: 200 });
      res.cookies.set("token", "", { path: "/", maxAge: 0 });
      res.cookies.set("authToken", "", { path: "/", maxAge: 0 });
      return res;
    }

    const userId = decoded.userId || decoded._id;

    // Load user as a plain object
    let user = await User.findById(userId)
      .select("-password")
      .populate("userStyles")
      .populate("matchReports")
      .populate("scoutingReports")
      .lean();

    if (!user) {
      const res = NextResponse.json({ user: null }, { status: 200 });
      res.cookies.set("token", "", { path: "/", maxAge: 0 });
      res.cookies.set("authToken", "", { path: "/", maxAge: 0 });
      return res;
    }

    // Populate familyMembers.userStyles safely
    if (Array.isArray(user.familyMembers) && user.familyMembers.length) {
      const populatedFamily = await Promise.all(
        user.familyMembers.map(async (member) => {
          const styleIds = Array.isArray(member?.userStyles)
            ? member.userStyles
            : [];
          let populatedStyles = [];
          if (styleIds.length) {
            populatedStyles = await UserStyle.find({
              _id: { $in: styleIds },
            }).lean();
          }
          return { ...member, userStyles: populatedStyles };
        })
      );
      user.familyMembers = populatedFamily;
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (err) {
    console.error("🔥 /api/auth/me error:", err?.message || err);
    // Fail-safe: never block UI; treat as logged-out on unexpected errors
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
