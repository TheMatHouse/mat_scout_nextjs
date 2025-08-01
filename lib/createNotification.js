import { connectDB } from "@/lib/mongo";
import Notification from "@/models/notification";

export async function createNotification({ userId, type, body, link }) {
  await connectDB();
  return Notification.create({
    user: userId,
    notificationType: type,
    notificationBody: body,
    notificationLink: link,
    viewed: false,
  });
}
