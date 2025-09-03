// app/api/notifications/mark-read/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Notification from "@/models/notification";
import { getCurrentUserFromCookies } from "@/lib/auth-server";

export async function PATCH(req) {
  await connectDB();

  const user = await getCurrentUserFromCookies();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body.notificationIds) ? body.notificationIds : [];

  if (!ids.length) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const res = await Notification.updateMany(
    { _id: { $in: ids }, user: user._id }, // ensure field matches your model
    { $set: { viewed: true, viewedAt: new Date() } }
  );

  return NextResponse.json({ success: true, modified: res.modifiedCount });
}
