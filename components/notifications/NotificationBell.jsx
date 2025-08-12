"use client";

import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import NotificationDropdown from "./NotificationDropdown";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/context/UserContext";

export default function NotificationBell() {
  const { user, loading } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const bellRef = useRef(null);
  const dropdownRef = useRef(null);

  // ✅ Fetch notifications only if user is logged in
  const fetchNotifications = async () => {
    if (!user || loading) return;

    try {
      const res = await fetch(`/api/notifications?limit=20&ts=${Date.now()}`, {
        method: "GET",
        credentials: "include",
      });

      if (res.status === 404) {
        // treat as empty
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      const text = await res.text();
      let payload;
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }

      // Normalize both old (array) and new (object) response shapes
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.notifications)
        ? payload.notifications
        : [];

      setNotifications(list);

      const unread =
        typeof payload?.unreadCount === "number"
          ? payload.unreadCount
          : list.filter((n) => !n.viewed).length;

      setUnreadCount(unread);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  // ✅ Fetch when user becomes available
  useEffect(() => {
    if (user && !loading) {
      fetchNotifications();
    }
  }, [user, loading]);

  // ✅ Poll every 30 seconds if logged in
  useEffect(() => {
    if (!user || loading) return;
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user, loading]);

  // ✅ Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        isOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        bellRef.current &&
        !bellRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const toggleDropdown = async () => {
    if (!isOpen && user && !loading) {
      await fetchNotifications();
    }
    setIsOpen((prev) => !prev);
  };

  const handleMarkAsRead = async (id, isDelete = false) => {
    try {
      if (isDelete) {
        await fetch(`/api/notifications/${id}`, { method: "DELETE" });
        setNotifications((prev) => prev.filter((n) => n._id !== id));
      } else {
        await fetch(`/api/notifications/mark-read`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationIds: [id] }),
        });
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, viewed: true } : n))
        );
      }
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (err) {
      console.error("Failed to mark notification:", err);
    }
  };

  return (
    <div
      className="relative"
      ref={bellRef}
    >
      <button
        onClick={toggleDropdown}
        className="relative p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
      >
        <Bell className="h-6 w-6 text-gray-800 dark:text-gray-100" />
        {unreadCount > 0 && (
          <motion.span
            key={unreadCount}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="absolute top-1 right-1 inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-red-500 rounded-full"
          >
            {unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="absolute right-0"
          >
            <NotificationDropdown
              notifications={notifications}
              onClose={() => setIsOpen(false)}
              onMarkAsRead={handleMarkAsRead}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
