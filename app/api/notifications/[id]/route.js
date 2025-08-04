import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Notification from "@/models/notification";
import { getCurrentUserFromCookies } from "@/lib/auth-server";

export async function DELETE(req, { params }) {
  await connectDB();
  const user = await getCurrentUserFromCookies();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;

  await Notification.deleteOne({ _id: id, user: user._id });

  return NextResponse.json({ success: true });
}
