import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/userModel";

export const GET = async (request, { params }) => {
  const { clerkId } = params;
  if (!clerkId) {
    return NextResponse.json({ message: "Missing clerkId" }, { status: 400 });
  }

  try {
    await connectDB();
    const user = await User.findOne({ clerkId }).select("_id");
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ user }, { status: 200 });
  } catch (err) {
    console.error("User fetch error:", err.message);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
};
