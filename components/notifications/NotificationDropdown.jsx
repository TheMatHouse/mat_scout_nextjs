"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export default function NotificationDropdown({
  notifications,
  onClose,
  onMarkAsRead,
}) {
  const newNotifications = notifications.filter((n) => !n.viewed);
  const earlierNotifications = notifications.filter((n) => n.viewed);

  const renderNotification = (n) => (
    <motion.div
      key={n._id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ duration: 0.2 }}
      className={`flex justify-between items-center px-4 py-3 group cursor-pointer ${
        !n.viewed ? "bg-blue-50 dark:bg-gray-700" : "bg-transparent"
      } hover:bg-gray-100 dark:hover:bg-gray-600`}
      onClick={() => {
        onMarkAsRead(n._id);
        window.location.href = n.notificationLink;
        onClose();
      }}
    >
      <div className="flex items-start gap-2">
        {!n.viewed && (
          <span className="w-2 h-2 mt-2 rounded-full bg-blue-500 flex-shrink-0"></span>
        )}
        <div>
          <p
            className={`text-sm ${
              !n.viewed
                ? "font-semibold text-gray-900 dark:text-white"
                : "text-gray-800 dark:text-gray-200"
            }`}
          >
            {n.notificationBody}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {new Date(n.createdAt).toLocaleString()}
          </p>
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation(); // prevent navigation
          onMarkAsRead(n._id, true); // true = delete
        }}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
      >
        <X size={16} />
      </button>
    </motion.div>
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden z-50"
      >
        <div className="flex justify-between items-center px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <span className="font-semibold text-gray-800 dark:text-gray-100">
            Notifications
          </span>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {newNotifications.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                New
              </div>
              <AnimatePresence>
                {newNotifications.map(renderNotification)}
              </AnimatePresence>
            </div>
          )}

          {earlierNotifications.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                Earlier
              </div>
              <AnimatePresence>
                {earlierNotifications.map(renderNotification)}
              </AnimatePresence>
            </div>
          )}

          {notifications.length === 0 && (
            <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
              No notifications
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
