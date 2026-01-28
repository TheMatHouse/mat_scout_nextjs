"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Trash2, ShieldCheck, Eye, Download } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/* ---------------- activity helpers (MATCH DETAIL PAGE) ---------------- */

function getLastActivityDate(u) {
  return u.lastActiveAt || u.lastLogin || null;
}

function getLastActivityTs(u) {
  const d = getLastActivityDate(u);
  if (!d) return 0;
  const ts = new Date(d).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

function daysSince(date) {
  if (!date) return Infinity;
  const ms = Date.now() - new Date(date).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function formatRelativeTime(date) {
  if (!date) return "Never";

  const ts = new Date(date).getTime();
  if (!ts) return "Never";

  const diffMin = Math.floor((Date.now() - ts) / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr${diffHr === 1 ? "" : "s"} ago`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "Yesterday";

  return `${diffDay} days ago`;
}

function getActivityBadge(date) {
  const d = daysSince(date);

  if (d < 1) {
    return {
      label: "Active today",
      className: "bg-green-600 text-white",
    };
  }

  if (d < 30) {
    return {
      label: "Recently active",
      className: "bg-yellow-500 text-black",
    };
  }

  return {
    label: "Inactive 30+ days",
    className: "bg-red-600 text-white",
  };
}

/* ---------------- CSV export ---------------- */

function exportUsersCsv(users) {
  const headers = [
    "First Name",
    "Last Name",
    "Email",
    "Username",
    "Role",
    "Last Active (ISO)",
    "Inactivity (days)",
  ];

  const rows = users.map((u) => {
    const lastActive = getLastActivityDate(u);
    const d = daysSince(lastActive);

    return [
      u.firstName || "",
      u.lastName || "",
      u.email || "",
      u.username || "",
      u.isAdmin ? "Admin" : "User",
      lastActive ? new Date(lastActive).toISOString() : "",
      Number.isFinite(d) ? d : "never",
    ];
  });

  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "matscout-users.csv";
  a.click();

  URL.revokeObjectURL(url);
}

/* ---------------- component ---------------- */

const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  async function fetchUsers(search = "") {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/users?q=${encodeURIComponent(search)}`,
        {
          cache: "no-store",
        },
      );
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error("Error fetching users:", err);
      toast.error("Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchUsers(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  async function toggleAdmin(userId) {
    setActionLoadingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/toggle-role`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to update role");
      toast.success("User role updated successfully!");
      await fetchUsers(query);
    } catch (err) {
      console.error("Error toggling admin role:", err);
      toast.error("Failed to update role");
    } finally {
      setActionLoadingId(null);
    }
  }

  const sortedUsers = useMemo(() => {
    return [...users].sort(
      (a, b) => getLastActivityTs(b) - getLastActivityTs(a),
    );
  }, [users]);

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1 text-gray-900 dark:text-gray-100">
            Manage Users
          </h1>
          <p className="text-sm text-gray-900 dark:text-gray-100">
            Activity status based on today / recent / 30+ days inactive.
          </p>
        </div>

        <button
          onClick={() => exportUsersCsv(sortedUsers)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      <div className="mb-6 flex gap-3">
        <input
          type="text"
          placeholder="Search users…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full max-w-sm px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-800 text-white"
          >
            Clear
          </button>
        )}
      </div>

      {/* ---------------- DESKTOP TABLE ---------------- */}
      <div className="hidden md:block overflow-x-auto rounded-md border border-gray-300 dark:border-gray-700">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100 dark:bg-[hsl(222_47%_12%)] text-gray-900 dark:text-gray-100">
              <th className="border border-gray-300 dark:border-gray-700 px-2 py-2 text-left">
                Name
              </th>
              <th className="border border-gray-300 dark:border-gray-700 px-2 py-2 text-left">
                Email
              </th>
              <th className="border border-gray-300 dark:border-gray-700 px-2 py-2 text-left">
                Username
              </th>
              <th className="border border-gray-300 dark:border-gray-700 px-2 py-2 text-left">
                Last Active
              </th>
              <th className="border border-gray-300 dark:border-gray-700 px-2 py-2 text-left">
                Status
              </th>
              <th className="border border-gray-300 dark:border-gray-700 px-2 py-2 text-center w-[320px]">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-6 text-center text-gray-900 dark:text-gray-100"
                >
                  Loading users…
                </td>
              </tr>
            ) : sortedUsers.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-6 text-center text-gray-900 dark:text-gray-100"
                >
                  No users found.
                </td>
              </tr>
            ) : (
              sortedUsers.map((u) => {
                const lastActive = getLastActivityDate(u);
                const badge = getActivityBadge(lastActive);

                return (
                  <tr
                    key={u._id}
                    className="hover:bg-gray-50 dark:hover:bg-[hsl(222_47%_10%)] transition"
                  >
                    <td className="border border-gray-300 dark:border-gray-700 px-2 py-2">
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-700 px-2 py-2">
                      {u.email}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-700 px-2 py-2">
                      {u.username}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-700 px-2 py-2">
                      {formatRelativeTime(lastActive)}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-700 px-2 py-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>

                    <td className="border border-gray-300 dark:border-gray-700 px-2 py-2">
                      <div className="flex flex-col sm:flex-row gap-2 justify-center">
                        <Link
                          href={`/admin/users/${u._id}`}
                          className="w-full sm:w-auto px-3 py-2 rounded bg-gray-600 hover:bg-gray-700 text-white flex items-center justify-center gap-2"
                        >
                          <Eye size={16} />
                          View
                        </Link>

                        <button
                          onClick={() => toggleAdmin(u._id)}
                          disabled={actionLoadingId === u._id}
                          className={`w-full sm:w-auto px-3 py-2 rounded text-white font-medium flex items-center justify-center gap-2 transition ${
                            u.isAdmin
                              ? "bg-yellow-600 hover:bg-yellow-700"
                              : "bg-blue-600 hover:bg-blue-700"
                          } ${
                            actionLoadingId === u._id
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                        >
                          <ShieldCheck size={16} />
                          {actionLoadingId === u._id
                            ? "Updating…"
                            : u.isAdmin
                              ? "Revoke Admin"
                              : "Make Admin"}
                        </button>

                        <button
                          disabled
                          className="w-full sm:w-auto px-3 py-2 rounded bg-red-600/70 text-white flex items-center justify-center gap-2 opacity-60 cursor-not-allowed"
                          title="Delete coming soon"
                        >
                          <Trash2 size={16} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ---------------- MOBILE CARDS ---------------- */}
      <div className="block md:hidden space-y-4">
        {loading ? (
          <div className="text-center text-gray-900 dark:text-gray-100 py-6">
            Loading users…
          </div>
        ) : sortedUsers.length === 0 ? (
          <div className="text-center text-gray-900 dark:text-gray-100 py-6">
            No users found.
          </div>
        ) : (
          sortedUsers.map((u) => {
            const lastActive = getLastActivityDate(u);
            const badge = getActivityBadge(lastActive);

            return (
              <div
                key={u._id}
                className="rounded-lg border border-gray-300 dark:border-gray-700 p-4 bg-white dark:bg-[hsl(222_47%_8%)] text-gray-900 dark:text-gray-100 shadow-sm"
              >
                <div className="font-semibold text-lg mb-1">
                  {u.firstName} {u.lastName}
                </div>

                <div className="text-sm text-gray-900 dark:text-gray-100 mb-1">
                  <span className="font-semibold">Email:</span> {u.email}
                </div>

                <div className="text-sm text-gray-900 dark:text-gray-100 mb-2">
                  <span className="font-semibold">Username:</span> @{u.username}
                </div>

                <div className="text-sm text-gray-900 dark:text-gray-100 mb-2">
                  <span className="font-semibold">Last Active:</span>{" "}
                  {formatRelativeTime(lastActive)}
                </div>

                <div className="text-sm mb-3">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    Status:
                  </span>{" "}
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Link
                    href={`/admin/users/${u._id}`}
                    className="w-full sm:w-auto px-3 py-2 rounded bg-gray-600 hover:bg-gray-700 text-white flex items-center justify-center gap-2"
                  >
                    <Eye size={16} />
                    View
                  </Link>

                  <button
                    onClick={() => toggleAdmin(u._id)}
                    disabled={actionLoadingId === u._id}
                    className={`w-full sm:w-auto px-3 py-2 rounded text-white font-medium flex items-center justify-center gap-2 transition ${
                      u.isAdmin
                        ? "bg-yellow-600 hover:bg-yellow-700"
                        : "bg-blue-600 hover:bg-blue-700"
                    } ${
                      actionLoadingId === u._id
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    <ShieldCheck size={16} />
                    {actionLoadingId === u._id
                      ? "Updating…"
                      : u.isAdmin
                        ? "Revoke Admin"
                        : "Make Admin"}
                  </button>

                  <button
                    disabled
                    className="w-full btn-delete"
                    title="Delete coming soon"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
};

export default AdminUsersPage;
