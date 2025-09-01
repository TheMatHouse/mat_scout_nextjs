// components/admin/TechniquesAdmin.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import FormField from "@/components/shared/FormField";
import Spinner from "@/components/shared/Spinner";
import { Check, X, RefreshCw, Plus } from "lucide-react";
import { useUser } from "@/context/UserContext";

const TABS = ["pending", "approved", "all"];

export default function TechniquesAdmin() {
  const { user } = useUser();
  const [status, setStatus] = useState("pending");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [newName, setNewName] = useState("");

  const pages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  const load = async () => {
    setLoading(true);
    try {
      const url = `/api/admin/techniques?status=${encodeURIComponent(
        status
      )}&q=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}`;
      const res = await fetch(url, {
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load techniques");
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(Number(data?.pagination?.total || 0));
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Error loading techniques");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page, pageSize]);

  const approve = async (id) => {
    try {
      const res = await fetch(`/api/admin/techniques/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to approve");
      toast.success(`Approved: ${data.name}`);
      setItems((prev) => prev.filter((x) => x._id !== id));
      if (status !== "pending") load();
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Error approving technique");
    }
  };

  const decline = async (id) => {
    if (!confirm("Decline (delete) this technique? This cannot be undone."))
      return;
    try {
      const res = await fetch(`/api/admin/techniques/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to decline");
      toast.success("Declined (deleted).");
      setItems((prev) => prev.filter((x) => x._id !== id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Error declining technique");
    }
  };

  const seedOne = async () => {
    const nm = newName.trim();
    if (!nm) return;
    try {
      const res = await fetch(`/api/admin/techniques`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nm, approved: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to add");
      setNewName("");
      toast.success(data.created ? "Added (pending)" : "Already existed");
      load();
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Error adding technique");
    }
  };

  // Optional: guard
  if (user && user.isAdmin === false) {
    return (
      <p className="text-sm text-muted-foreground">
        You don’t have permission to manage techniques.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">Techniques (Admin)</h1>
        <Button
          onClick={load}
          title="Reload"
          // Force visible colors (no white-on-white)
          className="bg-gray-900 hover:bg-gray-800 text-white dark:bg-gray-200 dark:hover:bg-gray-300 dark:text-gray-900"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Reload
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex gap-1 rounded-md border p-1">
          {TABS.map((s) => (
            <button
              key={s}
              className={`px-3 py-1 rounded transition ${
                s === status
                  ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                  : "hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
              onClick={() => {
                setStatus(s);
                setPage(1);
              }}
            >
              {s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex-1 min-w-[220px] max-w-sm">
          <FormField
            label="Search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search techniques…"
          />
        </div>

        <Button
          onClick={() => {
            setPage(1);
            load();
          }}
          className="bg-gray-900 hover:bg-gray-800 text-white dark:bg-gray-200 dark:hover:bg-gray-300 dark:text-gray-900"
        >
          Apply
        </Button>
      </div>

      {/* Quick add */}
      <div className="flex items-end gap-2 max-w-md">
        <FormField
          label="Add technique (pending)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="e.g., Hiza Guruma"
        />
        <Button
          onClick={seedOne}
          className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="min-w-[720px] w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Created</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={4}
                  className="p-6"
                >
                  <div className="flex items-center justify-center">
                    <Spinner size={28} />
                  </div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="p-6 text-center text-muted-foreground"
                >
                  No techniques found.
                </td>
              </tr>
            ) : (
              items.map((t) => (
                <tr
                  key={t._id}
                  className="border-t"
                >
                  <td className="p-3">{t.name}</td>
                  <td className="p-3">
                    {t.approved ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        Approved
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    {t.createdAt ? new Date(t.createdAt).toLocaleString() : "—"}
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      {!t.approved && (
                        <Button
                          size="sm"
                          onClick={() => approve(t._id)}
                          title="Approve"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => decline(t._id)}
                        title="Decline (delete)"
                        className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-500 dark:hover:bg-red-600"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Decline
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Page {page} of {pages} • {total} total
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
          >
            Prev
          </Button>
          <Button
            variant="outline"
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
            className="border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
