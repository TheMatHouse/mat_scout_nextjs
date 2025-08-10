"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Trash2, ShieldCheck, Eye } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function AdminUsersPage() {
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
        }
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

  // Initial load
  useEffect(() => {
    fetchUsers();
  }, []);

  // Debounced search
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
      await fetchUsers(query); // refresh list
    } catch (err) {
      console.error("Error toggling admin role:", err);
      toast.error("Failed to update role");
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
      />

      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">
          Manage Users
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Search users, view details, and manage roles.
        </p>
      </div>

      {/* Search */}
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
            className="px-4 py-2 rounded-md bg-gray-500 text-gray-100 hover:bg-gray-600"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-gray-300 dark:border-gray-700">
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
                Role
              </th>
              <th className="border border-gray-300 dark:border-gray-700 px-2 py-2 text-center w-[260px]">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  className="py-6 text-center text-gray-600 dark:text-gray-300"
                >
                  Loading users…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="py-6 text-center text-gray-500 dark:text-gray-400"
                >
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((u) => (
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
                    {u.isAdmin ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                        Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-200">
                        User
                      </span>
                    )}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-700 px-2 py-2">
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      {/* View */}
                      <Link
                        href={`/admin/users/${u._id}`}
                        className="w-full sm:w-auto px-3 py-2 rounded bg-gray-600 hover:bg-gray-700 text-white flex items-center justify-center gap-2"
                      >
                        <Eye size={16} />
                        View
                      </Link>

                      {/* Toggle Admin */}
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

                      {/* Delete (disabled placeholder) */}
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
