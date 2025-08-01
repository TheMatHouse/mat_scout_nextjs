"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Trash2 } from "lucide-react";

export default function NotificationItem({ notification, onClick, onClose }) {
  const { _id, notificationBody, notificationLink, viewed, createdAt } =
    notification;

  const handleClick = async () => {
    try {
      await fetch("/api/notifications/mark-read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: [_id] }),
      });
      onClick(_id);
      if (onClose) onClose();
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleDelete = async (e) => {
    e.preventDefault(); // ✅ Prevent navigation
    e.stopPropagation(); // ✅ Stop row click
    try {
      await fetch(`/api/notifications/${_id}`, { method: "DELETE" });
      onClick(_id, true); // ✅ Pass second flag for delete handling in parent
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  return (
    <div
      className={`flex justify-between items-center px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition ${
        !viewed ? "bg-blue-50 dark:bg-gray-900" : ""
      }`}
    >
      <Link
        href={notificationLink || "#"}
        onClick={handleClick}
        className="flex-1"
      >
        <div className="text-sm text-gray-800 dark:text-gray-100">
          {notificationBody}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
        </div>
      </Link>
      <button
        onClick={handleDelete}
        className="ml-2 p-1 text-gray-400 hover:text-red-500 transition"
        aria-label="Delete notification"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
