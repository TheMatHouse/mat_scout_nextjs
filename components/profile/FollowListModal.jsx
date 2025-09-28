// components/profile/FollowListModal.jsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const DEFAULT_AVATAR =
  "https://res.cloudinary.com/matscout/image/upload/v1747956346/default_user_rval6s.jpg";

/**
 * Props:
 * - open: boolean
 * - onClose: fn
 * - username: string
 * - targetType: "user" | "family"   (whose profile we're viewing)
 * - list: "followers" | "following" (which list to show)
 *
 * This component expects API responses shaped as:
 * Followers endpoint: { ok, total, results: [ { follower: <User> } ] }
 * Following endpoint: { ok, total, results: [ { following: <User> } | { family: <FamilyMember> } ] }
 */
export default function FollowListModal({
  open,
  onClose,
  username,
  targetType = "user",
  list = "followers",
}) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function load(p = 1) {
      setLoading(true);
      try {
        const prefix = targetType === "family" ? "/api/family" : "/api/users";
        const base = `${prefix}/${encodeURIComponent(username)}/${list}`;

        const res = await fetch(`${base}?page=${p}&limit=20`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const results = Array.isArray(data?.results) ? data.results : [];
        if (!cancelled) {
          setRows(results);
          setTotal(Number(data?.total || results.length || 0));
          setPage(p);
        }
      } catch {
        if (!cancelled) {
          setRows([]);
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
  }, [open, username, targetType, list]);

  if (!open) return null;

  const titleNoun = list === "following" ? "Following" : "Followers";

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
            {titleNoun} of @{username} {total ? `(${total})` : ""}
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
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground px-1 py-2">
              No {titleNoun.toLowerCase()} yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((row) => {
                // Followers endpoint returns { follower: User }
                // Following endpoint may return:
                //   { following: User } OR { family: FamilyMember }
                const isFamily = !!row?.family && !row?.following;
                const u =
                  row?.follower ||
                  row?.following ||
                  row?.family ||
                  row?.user ||
                  null;
                if (!u) return null;

                const uname = u?.username || "";
                const display =
                  u?.displayName || u?.firstName
                    ? `${u?.firstName ?? ""} ${u?.lastName ?? ""}`.trim() ||
                      uname ||
                      "Unknown"
                    : uname || "Unknown";

                // Avatar selection logic (google/facebook aware)
                let avatar = DEFAULT_AVATAR;
                if (u?.avatarType === "google" && u?.googleAvatar) {
                  avatar = u.googleAvatar;
                } else if (u?.avatarType === "facebook" && u?.facebookAvatar) {
                  avatar = u.facebookAvatar;
                } else if (u?.avatarUrl) {
                  avatar = u.avatarUrl;
                } else if (u?.avatar) {
                  avatar = u.avatar;
                }

                const key = row.id || u?._id || u?.id || uname;

                // Link: users -> /username, family -> /family/username
                const href = isFamily
                  ? `/family/${encodeURIComponent(uname)}`
                  : `/${encodeURIComponent(uname)}`;

                return (
                  <li key={key}>
                    <Link
                      href={href}
                      onClick={onClose}
                      className="py-2 px-1 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                    >
                      <img
                        src={avatar}
                        alt={display || "Avatar"}
                        className="h-8 w-8 rounded-full object-cover border border-border"
                        loading="lazy"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {display || "Unknown"}
                        </div>
                        {uname && (
                          <div className="text-xs text-muted-foreground truncate">
                            @{uname}
                            {isFamily ? " (family)" : ""}
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

        {/* (Optional) pagination controls could go here */}
      </div>
    </div>
  );
}
