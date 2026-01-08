// components/admin/TechniquesAdmin.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import FormField from "@/components/shared/FormField";
import Spinner from "@/components/shared/Spinner";
import { Check, X, RefreshCw, Plus, Pencil, Save } from "lucide-react";
import { useUser } from "@/context/UserContext";

const TABS = ["pending", "approved", "all"];

const TechniquesAdmin = () => {
  const { user } = useUser();

  const [status, setStatus] = useState("pending");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");

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

  const save = async (id, nameOverride, approveToo = false) => {
    try {
      const res = await fetch(`/api/admin/techniques/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          name: nameOverride,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save");

      toast.success(
        approveToo ? `Approved: ${data.name}` : `Updated: ${data.name}`
      );
      setEditingId(null);
      load();
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Error saving technique");
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
      toast.success(data.created ? "Added (pending)" : "Already exists");
      load();
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Error adding technique");
    }
  };

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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Techniques
          </h1>
          <p className="text-sm text-gray-900/70 dark:text-gray-100/70 mt-1">
            Canonical technique list used across scouting reports and match
            data.
          </p>
        </div>
        <Button
          onClick={load}
          className="btn btn-primary"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Reload
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex gap-1 border-b">
          {TABS.map((s) => (
            <button
              key={s}
              className={`px-3 py-2 text-sm transition border-b-2 ${
                s === status
                  ? "border-[var(--ms-light-red,#ef4444)] font-semibold"
                  : "border-transparent opacity-70 hover:opacity-100"
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
          onClick={load}
          className="btn btn-primary"
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
          placeholder="e.g., Ippon Seoi Nage"
        />
        <Button
          onClick={seedOne}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="min-w-[720px] w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="text-left p-3">Technique</th>
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
                  className="p-6 text-center"
                >
                  <Spinner size={28} />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="p-6 text-center"
                >
                  No techniques found.
                </td>
              </tr>
            ) : (
              items.map((t) => {
                const isEditing = editingId === t._id;
                const isApproved = t.approved;

                return (
                  <tr
                    key={t._id}
                    className={`border-t even:bg-gray-50/50 dark:even:bg-gray-800/40 ${
                      isEditing ? "bg-blue-50/60 dark:bg-blue-900/20" : ""
                    }`}
                  >
                    <td className="p-3">
                      {isEditing ? (
                        <input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="w-full px-2 py-1 rounded border"
                        />
                      ) : (
                        <span className="font-semibold">{t.name}</span>
                      )}
                    </td>

                    <td className="p-3">
                      {isApproved ? (
                        <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                          Approved
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                          Pending
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-gray-900/80 dark:text-gray-100/80">
                      {t.createdAt
                        ? new Date(t.createdAt).toLocaleDateString()
                        : "—"}
                    </td>

                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        {!isEditing && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingId(t._id);
                              setEditingName(t.name);
                            }}
                          >
                            <Pencil className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        )}

                        {isEditing && isApproved && (
                          <Button
                            size="sm"
                            onClick={() => save(t._id, editingName, false)}
                            className="btn btn-primary"
                          >
                            <Save className="w-4 h-4 mr-1" />
                            Save
                          </Button>
                        )}

                        {isEditing && !isApproved && (
                          <Button
                            size="sm"
                            onClick={() => save(t._id, editingName, true)}
                            className="bg-emerald-600 text-white"
                          >
                            <Save className="w-4 h-4 mr-1" />
                            Save & Approve
                          </Button>
                        )}

                        {!isApproved && !isEditing && (
                          <Button
                            size="sm"
                            onClick={() => save(t._id)}
                            className="bg-emerald-600 text-white"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                        )}

                        <Button
                          size="sm"
                          onClick={() => decline(t._id)}
                          className="bg-red-600 text-white"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Decline
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-900/70 dark:text-gray-100/70">
          Page {page} of {pages} • {total} total
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Prev
          </Button>
          <Button
            variant="outline"
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TechniquesAdmin;
