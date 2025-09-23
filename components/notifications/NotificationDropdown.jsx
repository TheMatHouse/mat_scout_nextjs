"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NotificationDropdown({
  notifications,
  onClose,
  onMarkAsRead, // should return a Promise
}) {
  const router = useRouter();

  const newNotifications = notifications.filter((n) => !n.viewed);
  const earlierNotifications = notifications.filter((n) => n.viewed);

  const renderNotification = (n) => (
    <motion.div
      key={n._id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ duration: 0.2 }}
      className={`flex justify-between items-start gap-2 px-4 py-3 group cursor-pointer ${
        !n.viewed ? "bg-blue-50 dark:bg-gray-700/60" : "bg-transparent"
      } hover:bg-gray-100 dark:hover:bg-gray-700`}
      onClick={async () => {
        try {
          await onMarkAsRead?.(n._id);
        } finally {
          if (n.notificationLink) {
            router.push(n.notificationLink);
          }
          onClose?.();
        }
      }}
    >
      <div className="flex items-start gap-2 min-w-0">
        {!n.viewed && (
          <span className="mt-2 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
        )}
        <div className="min-w-0">
          <p
            className={`text-sm leading-5 break-words ${
              !n.viewed
                ? "font-semibold text-gray-900 dark:text-white"
                : "text-gray-800 dark:text-gray-200"
            }`}
          >
            {n.notificationType === "family_followed" ? "👪 " : "👤 "}
            {n.notificationBody}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {new Date(n.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      <button
        onClick={async (e) => {
          e.stopPropagation();
          await onMarkAsRead?.(n._id, true); // dismiss/delete
        }}
        className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
        aria-label="Dismiss notification"
        title="Dismiss"
      >
        <X size={16} />
      </button>
    </motion.div>
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -8 }}
        transition={{ duration: 0.18, ease: "easeInOut" }}
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
        className="
          fixed z-[60]
          left-2 right-2 sm:right-4 sm:left-auto
          top-16 bottom-3
          max-w-full sm:w-[420px]
          bg-white dark:bg-gray-800
          border border-gray-200 dark:border-gray-700
          shadow-2xl rounded-xl
          flex flex-col
          overflow-hidden
        "
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 border-b border-gray-200 dark:border-gray-700">
          <span className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100">
            Notifications
          </span>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            aria-label="Close notifications"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scroll area */}
        <div
          className="
            flex-1
            overflow-y-auto overflow-x-hidden overscroll-contain
            pr-1 sm:pr-2 pb-2
          "
          style={{
            WebkitOverflowScrolling: "touch",
            scrollbarGutter: "stable",
          }}
        >
          {newNotifications.length > 0 && (
            <div>
              <div className="sticky top-0 z-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                New
              </div>
              <AnimatePresence>
                {newNotifications.map(renderNotification)}
              </AnimatePresence>
            </div>
          )}

          {earlierNotifications.length > 0 && (
            <div className="mt-1">
              <div className="sticky top-0 z-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                Earlier
              </div>
              <AnimatePresence>
                {earlierNotifications.map(renderNotification)}
              </AnimatePresence>
            </div>
          )}

          {notifications.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              No notifications
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
