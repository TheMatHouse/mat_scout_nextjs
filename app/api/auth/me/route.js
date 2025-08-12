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
    const cookieStore = await cookies(); // ✅ must await
    const token =
      cookieStore.get("token")?.value ||
      cookieStore.get("authToken")?.value ||
      null;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      const res = NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
      // clear bad cookies (both names, just in case)
      res.cookies.set("token", "", { path: "/", maxAge: 0 });
      res.cookies.set("authToken", "", { path: "/", maxAge: 0 });
      return res;
    }

    const userId = decoded.userId || decoded._id;

    let user = await User.findById(userId)
      .select("-password")
      .populate("userStyles")
      .populate("matchReports")
      .populate("scoutingReports");

    if (!user) {
      const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      res.cookies.set("token", "", { path: "/", maxAge: 0 });
      res.cookies.set("authToken", "", { path: "/", maxAge: 0 });
      return res;
    }

    // Populate familyMembers.userStyles if present
    if (user.familyMembers?.length) {
      const familyWithStyles = await Promise.all(
        user.familyMembers.map(async (member) => {
          const populatedStyles = await UserStyle.find({
            _id: { $in: member.userStyles || [] },
          });
          return {
            ...member.toObject(),
            userStyles: populatedStyles,
          };
        })
      );
      user = user.toObject();
      user.familyMembers = familyWithStyles;
    }

    return NextResponse.json({ user });
  } catch (err) {
    console.error("🔥 /api/auth/me error:", err?.message || err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
