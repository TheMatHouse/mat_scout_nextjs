import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Notification from "@/models/notification";
import { getCurrentUserFromCookies } from "@/lib/auth";

export async function GET() {
  await connectDB();
  const user = await getCurrentUserFromCookies();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notifications = await Notification.find({ user: user._id })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json(notifications);
}

export async function POST(req) {
  await connectDB();
  const user = await getCurrentUserFromCookies();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const notification = await Notification.create({
    ...body,
    user: user._id, // ✅ Attach current user
  });

  return NextResponse.json(notification);
}
