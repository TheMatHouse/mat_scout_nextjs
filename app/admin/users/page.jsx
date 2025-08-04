"use client";

import { useState, useEffect } from "react";
import { Trash2, ShieldCheck } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Fetch users from API
  const fetchUsers = async (search = "") => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/users?q=${encodeURIComponent(search)}`
      );
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchUsers(query);
    }, 400); // Debounce typing

    return () => clearTimeout(delayDebounce);
  }, [query]);

  useEffect(() => {
    fetchUsers(); // Initial load
  }, []);

  const toggleAdmin = async (userId) => {
    setActionLoadingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/toggle-role`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Failed to update role");
      }

      toast.success("User role updated successfully!");
      await fetchUsers(query); // ✅ refresh list
    } catch (err) {
      console.error("Error toggling admin role:", err);
      toast.error("Failed to update role");
    } finally {
      setActionLoadingId(null);
    }
  };
  return (
    <>
      {/* Toast notifications */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
      />

      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">
        Manage Users
      </h1>

      {/* Search bar */}
      <div className="mb-6 flex gap-3">
        <input
          type="text"
          placeholder="Search users..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full max-w-sm px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="px-4 py-2 bg-gray-500 text-gray-100 rounded-md hover:bg-gray-600"
          >
            Clear
          </button>
        )}
      </div>

      {/* Loading state */}
      {loading ? (
        <p className="text-gray-600 dark:text-gray-300">Loading users...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300 dark:border-gray-700 text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                <th className="border px-2 py-2">Name</th>
                <th className="border px-2 py-2">Email</th>
                <th className="border px-2 py-2">Username</th>
                <th className="border px-2 py-2">Role</th>
                <th className="border px-2 py-2 text-center w-40">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="text-center py-4 text-gray-500 dark:text-gray-400"
                  >
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user._id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    <td className="border px-2 py-2">
                      {user.firstName} {user.lastName}
                    </td>
                    <td className="border px-2 py-2">{user.email}</td>
                    <td className="border px-2 py-2">{user.username}</td>
                    <td className="border px-2 py-2">
                      {user.isAdmin ? "Admin" : "User"}
                    </td>
                    <td className="border px-2 py-2 text-center">
                      <div className="flex flex-col gap-2">
                        {/* Toggle Admin Button */}
                        <button
                          onClick={() => toggleAdmin(user._id)}
                          disabled={actionLoadingId === user._id}
                          className={`w-full px-3 py-2 rounded text-gray-100 font-medium flex items-center justify-center gap-2 transition ${
                            user.isAdmin
                              ? "bg-yellow-600 hover:bg-yellow-700"
                              : "bg-blue-600 hover:bg-blue-700"
                          } ${
                            actionLoadingId === user._id
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                        >
                          <ShieldCheck size={16} />
                          {actionLoadingId === user._id
                            ? "Updating..."
                            : user.isAdmin
                            ? "Revoke Admin"
                            : "Make Admin"}
                        </button>

                        {/* Delete Button */}
                        <button
                          disabled
                          className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-gray-100 rounded flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
                        >
                          <Trash2 size={16} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
