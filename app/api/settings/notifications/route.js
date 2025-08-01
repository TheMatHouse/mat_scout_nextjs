import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import { getCurrentUserFromCookies } from "@/lib/auth";

export async function GET() {
  try {
    await connectDB();
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      notificationSettings: user.notificationSettings || {},
    });
  } catch (err) {
    console.error("GET Notification Settings Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    await connectDB();
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    if (!body.notificationSettings) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    user.notificationSettings = {
      ...user.notificationSettings,
      ...body.notificationSettings,
    };

    await user.save();

    return NextResponse.json({
      success: true,
      notificationSettings: user.notificationSettings,
    });
  } catch (err) {
    console.error("PATCH Notification Settings Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
