import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized - no token" },
        { status: 401 }
      );
    }

    const decoded = await verifyToken(token);

    await connectDB(); // Ensure DB connection

    const user = await User.findById(decoded._id).select("-password");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (err) {
    console.error("Error in /api/auth/me:", err);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
