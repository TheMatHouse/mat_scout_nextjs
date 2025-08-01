import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Notification from "@/models/notification"; // ✅ lowercase is fine for your setup
import { getCurrentUserFromCookies } from "@/lib/auth"; // ✅ correct auth helper

export async function PATCH(req) {
  await connectDB();

  const user = await getCurrentUserFromCookies();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { notificationIds } = await req.json();
  if (!notificationIds || !Array.isArray(notificationIds)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await Notification.updateMany(
    { _id: { $in: notificationIds }, user: user._id },
    { $set: { viewed: true } }
  );

  return NextResponse.json({ success: true });
}
