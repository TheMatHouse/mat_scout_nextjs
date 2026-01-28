import mongoose from "mongoose";
import { connectDB } from "@/lib/mongo";
import Notification from "@/models/notification";

export async function createNotification({ userId, type, body, link }) {
  // Only connect if we are NOT already connected
  if (mongoose.connection.readyState === 0) {
    await connectDB();
  }

  return Notification.create({
    user: userId,
    notificationType: type,
    notificationBody: body,
    notificationLink: link,
    viewed: false,
  });
}
