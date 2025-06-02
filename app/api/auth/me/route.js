import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const token =
    cookieStore.get("token")?.value || cookieStore.get("authToken")?.value;

  if (!token) {
    return NextResponse.json({ error: "No token provided" }, { status: 401 });
  }

  try {
    await connectDB();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId || decoded._id).select(
      "-password"
    );

    if (!user) {
      // Clear invalid cookie
      const res = NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
      res.cookies.set("token", "", { path: "/", maxAge: 0 });
      return res;
    }

    return NextResponse.json({ user });
  } catch (err) {
    console.error("GET /api/auth/me error:", err.message);

    const res = NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
    );
    res.cookies.set("token", "", { path: "/", maxAge: 0 });
    return res;
  }
}
