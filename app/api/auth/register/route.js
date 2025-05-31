import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import { verifyToken } from "@/lib/jwt";

export async function GET() {
  const token = cookies().get("token");

  if (!token) {
    return NextResponse.json({ error: "No token provided" }, { status: 401 });
  }

  const payload = verifyToken(token.value);

  if (!payload || !payload.userId) {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
    );
  }

  await connectDB();

  const user = await User.findById(payload.userId).select("-password");

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}
