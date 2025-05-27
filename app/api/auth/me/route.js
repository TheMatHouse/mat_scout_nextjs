// app/api/auth/me/route.js
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { connectDB } from "@/config/mongo";
import User from "@/models/userModel";

export async function GET(request) {
  try {
    await connectDB();

    const cookieHeader = request.headers.get("cookie");
    const token = cookieHeader
      ?.split(";")
      ?.find((c) => c.trim().startsWith("token="))
      ?.split("=")[1];

    if (!token) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ user: null }, { status: 403 });
    }

    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return NextResponse.json({ user: null }, { status: 404 });
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (err) {
    console.error("Error in /api/auth/me:", err);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
