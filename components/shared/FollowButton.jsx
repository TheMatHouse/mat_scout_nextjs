// components/shared/FollowButton.jsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";

/**
 * Props:
 * - username (string, required)
 * - targetType ("user" | "family") default "user"
 * - className (string)
 * - onChange?: (isFollowing: boolean) => void   // <-- NEW: notify parent after success
 */
export default function FollowButton({
  username,
  targetType = "user",
  className = "",
  onChange,
}) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  // fetch follow status on mount
  useEffect(() => {
    if (!username) return;
    let cancelled = false;
    (async () => {
      try {
        const url =
          targetType === "family"
            ? `/api/family/${encodeURIComponent(username)}/follow`
            : `/api/users/${encodeURIComponent(username)}/follow`;

        const res = await fetch(url, { method: "GET", cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setReady(true);
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setIsFollowing(!!data.isFollowing);
          setReady(true);
        }
      } catch (err) {
        console.error("Error fetching follow status:", err);
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username, targetType]);

  const toggleFollow = useCallback(async () => {
    if (!ready || loading) return;

    setLoading(true);
    const wasFollowing = isFollowing;

    try {
      const url =
        targetType === "family"
          ? `/api/family/${encodeURIComponent(username)}/follow`
          : `/api/users/${encodeURIComponent(username)}/follow`;

      const method = wasFollowing ? "DELETE" : "POST";
      const res = await fetch(url, { method, cache: "no-store" });

      if (!res.ok) {
        // do not change UI on failure
        const txt = await res.text().catch(() => "");
        console.error("Follow toggle failed:", res.status, txt);
        toast.error("Could not update follow. Try again.");
        return;
      }

      const data = await res.json().catch(() => ({}));
      const serverIsFollowing =
        typeof data.isFollowing === "boolean"
          ? data.isFollowing
          : !wasFollowing;

      setIsFollowing(serverIsFollowing);

      // Notify parent so it can update counts or lists
      try {
        onChange?.(serverIsFollowing);
        // Also broadcast a DOM event if someone else wants to listen
        window.dispatchEvent(
          new CustomEvent("follow:changed", {
            detail: {
              targetType,
              username,
              isFollowing: serverIsFollowing,
            },
          })
        );
      } catch (_) {
        // no-op
      }

      if (serverIsFollowing && !wasFollowing) toast.success("Following");
      if (!serverIsFollowing && wasFollowing) toast.info("Unfollowed");
    } catch (err) {
      console.error("Error toggling follow:", err);
      toast.error("Could not update follow. Try again.");
    } finally {
      setLoading(false);
    }
  }, [username, targetType, ready, loading, isFollowing, onChange]);

  if (!ready) {
    return (
      <Button
        disabled
        className={`min-w-24 ${className}`}
      >
        Loading…
      </Button>
    );
  }

  return (
    <Button
      onClick={toggleFollow}
      disabled={loading}
      className={`min-w-24 ${
        isFollowing
          ? "bg-gray-300 text-gray-900 hover:bg-gray-400 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
          : "bg-blue-600 text-white hover:bg-blue-700"
      } ${className}`}
    >
      {loading ? "Working…" : isFollowing ? "Following" : "Follow"}
    </Button>
  );
}
