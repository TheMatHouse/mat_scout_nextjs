import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import UserStyle from "@/models/userStyleModel";
import "@/models/matchReportModel";
import "@/models/scoutingReportModel";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const cookieStore = cookies();
    const token =
      cookieStore.get("token")?.value || cookieStore.get("authToken")?.value;

    // console.log(
    //   "🔍 Cookie keys found:",
    //   cookieStore.getAll().map((c) => c.name)
    // );

    if (!token) {
      console.warn("⚠️ No token found in cookies.");
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    await connectDB();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded._id;

    if (!userId) {
      console.warn("⚠️ Token decoded but missing user ID.");
      return NextResponse.json(
        { error: "Invalid token payload" },
        { status: 401 }
      );
    }

    let user = await User.findById(userId)
      .select("-password")
      .populate("userStyles")
      .populate("matchReports")
      .populate("scoutingReports");

    if (!user) {
      console.warn("❌ No user found for ID:", userId);
      const res = NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
      res.cookies.set("token", "", { path: "/", maxAge: 0 });
      return res;
    }

    // ✅ Manually populate userStyles for each family member
    if (user.familyMembers?.length) {
      const familyWithStyles = await Promise.all(
        user.familyMembers.map(async (member) => {
          const populatedStyles = await UserStyle.find({
            _id: { $in: member.userStyles || [] },
          });
          return {
            ...member.toObject(), // Convert from Mongoose doc to plain object
            userStyles: populatedStyles,
          };
        })
      );

      user = user.toObject(); // Convert main user to plain object too
      user.familyMembers = familyWithStyles;
    }

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
