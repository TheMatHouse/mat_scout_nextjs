import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";
import User from "@/models/userModel";
import { connectDB } from "@/lib/mongo";

export async function GET() {
  try {
    const cookieStore = await cookies(); // ✅ AWAIT THIS
    const token = cookieStore.get("token")?.value;

    if (!token) {
      console.warn("🔒 No token found in cookies");
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      console.warn("❌ Invalid token");
      return NextResponse.json({ user: null }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return NextResponse.json({ user: null }, { status: 404 });
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (err) {
    console.error("❌ /api/auth/me error:", err);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
