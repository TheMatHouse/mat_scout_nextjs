// app/api/check-username/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  let username = searchParams.get("username");
  console.log("🔍 check-username triggered");

  if (!username) {
    return NextResponse.json(
      { available: false, message: "Username is required" },
      { status: 400 }
    );
  }

  username = username.trim().toLowerCase();

  try {
    await connectDB();

    // Find with exact match and log what is found
    const user = await User.findOne({ username });
    console.log(`Checking username: "${username}", found user:`, user);

    return NextResponse.json({ available: !user });
  } catch (err) {
    console.error("Error checking username:", err);
    return NextResponse.json(
      { available: false, message: "Server error" },
      { status: 500 }
    );
  }
}
