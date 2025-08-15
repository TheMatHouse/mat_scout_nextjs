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

  const fetchNotifications = async () => {
    if (!user || loading) return;
    try {
      const res = await fetch(`/api/notifications?limit=20&ts=${Date.now()}`, {
        method: "GET",
        credentials: "include",
      });

      if (res.status === 404) {
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

  useEffect(() => {
    if (user && !loading) fetchNotifications();
  }, [user, loading]);

  useEffect(() => {
    if (!user || loading) return;
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user, loading]);

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
    if (!isOpen && user && !loading) await fetchNotifications();
    setIsOpen((prev) => !prev);
  };

  return (
    <div
      className="relative"
      ref={bellRef}
    >
      <button
        onClick={toggleDropdown}
        // FIX: force light icon color to match dark header always
        className="relative p-2 rounded-full text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40 transition"
        aria-label={
          unreadCount > 0
            ? `${unreadCount} unread notifications`
            : "Notifications"
        }
      >
        {/* Bell inherits text color from button */}
        <Bell
          className="h-6 w-6"
          aria-hidden="true"
        />

        {unreadCount > 0 && (
          <motion.span
            key={unreadCount}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full ring-2"
            // ring color to separate from the dark header (use your header hex if you prefer)
            style={{ ringColor: "#2b2d42" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
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
              onMarkAsRead={async (id, isDelete = false) => {
                try {
                  if (isDelete) {
                    await fetch(`/api/notifications/${id}`, {
                      method: "DELETE",
                    });
                    setNotifications((prev) =>
                      prev.filter((n) => n._id !== id)
                    );
                  } else {
                    await fetch(`/api/notifications/mark-read`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ notificationIds: [id] }),
                    });
                    setNotifications((prev) =>
                      prev.map((n) =>
                        n._id === id ? { ...n, viewed: true } : n
                      )
                    );
                  }
                  setUnreadCount((c) => Math.max(0, c - 1));
                } catch (err) {
                  console.error("Failed to mark notification:", err);
                }
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
