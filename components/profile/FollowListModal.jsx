// components/profile/FollowListModal.jsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const DEFAULT_AVATAR =
  "https://res.cloudinary.com/matscout/image/upload/v1747956346/default_user_rval6s.jpg";

export default function FollowListModal({
  open,
  onClose,
  username,
  targetType = "user", // "user" | "family"
}) {
  const [loading, setLoading] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function load(p = 1) {
      setLoading(true);
      try {
        const base =
          targetType === "family"
            ? `/api/family/${encodeURIComponent(username)}/followers`
            : `/api/users/${encodeURIComponent(username)}/followers`;

        const res = await fetch(`${base}?page=${p}&limit=20`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const rows = Array.isArray(data?.results) ? data.results : [];
        if (!cancelled) {
          setFollowers(rows);
          setTotal(Number(data?.total || rows.length || 0));
          setPage(p);
        }
      } catch {
        if (!cancelled) {
          setFollowers([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load(1);
    return () => {
      cancelled = true;
    };
  }, [open, username, targetType]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative z-[101] w-full max-w-md rounded-xl border border-border bg-white dark:bg-gray-900 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-base font-semibold">
            Followers of @{username} {total ? `(${total})` : ""}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-muted-foreground hover:underline"
          >
            Close
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-3">
          {loading ? (
            <p className="text-sm text-muted-foreground px-1 py-2">Loading…</p>
          ) : followers.length === 0 ? (
            <p className="text-sm text-muted-foreground px-1 py-2">
              No followers yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {followers.map((row) => {
                // API returns { follower: User } for each row
                const f = row?.follower || row?.user || null;
                const uname = f?.username || "";
                const display = f?.displayName || uname || "Unknown";
                const avatar = f?.avatarUrl || f?.avatar || DEFAULT_AVATAR;

                return (
                  <li key={row.id || f?.id || uname}>
                    <Link
                      href={`/${encodeURIComponent(uname)}`}
                      onClick={onClose}
                      className="py-2 px-1 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                    >
                      <img
                        src={avatar}
                        alt={display}
                        className="h-8 w-8 rounded-full object-cover border border-border"
                        loading="lazy"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {display}
                        </div>
                        {uname && (
                          <div className="text-xs text-muted-foreground truncate">
                            @{uname}
                          </div>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Pagination area (ready for future use) */}
        {/* <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
          <button ...>Prev</button>
          <button ...>Next</button>
        </div> */}
      </div>
    </div>
  );
}
