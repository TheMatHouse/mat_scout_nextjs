"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function SearchBox({ value, onChange, onSubmit }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
      className="flex gap-2"
    >
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search name, email, phone, relation…"
        className="px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-sm w-full"
      />
      <button
        type="submit"
        className="btn-submit"
      >
        Search
      </button>
    </form>
  );
}

export default function FamilyMembersListPage() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({
    page: 1,
    pageSize: 20,
    pages: 1,
    total: 0,
    q: "",
    sort: "-createdAt",
  });
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const qs = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("page", String(meta.page));
    sp.set("pageSize", String(meta.pageSize));
    sp.set("sort", meta.sort || "-createdAt");
    if (meta.q) sp.set("q", meta.q);
    return sp.toString();
  }, [meta.page, meta.pageSize, meta.sort, meta.q]);

  async function load() {
    try {
      setLoading(true);
      setErr("");
      const res = await fetch(`/api/admin/family-members?${qs}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed");
      setRows(json.rows || []);
      setMeta((m) => ({ ...m, ...json.meta }));
    } catch (e) {
      setErr(e.message || "Error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs]);

  async function onDelete(id) {
    const yes = confirm("Delete this family member? This cannot be undone.");
    if (!yes) return;
    try {
      const res = await fetch(`/api/admin/family-members/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Delete failed");
      // reload current page
      load();
    } catch (e) {
      alert(e.message || "Delete failed");
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="sticky top-0 z-10 -mx-6 px-6 py-3 bg-white/80 dark:bg-neutral-950/80 backdrop-blur border-b border-neutral-200/60 dark:border-neutral-800/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-semibold">Family Members</h1>
        <div className="w-full sm:w-96">
          <SearchBox
            value={q}
            onChange={setQ}
            onSubmit={() => setMeta((m) => ({ ...m, page: 1, q }))}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 sm:p-4 flex flex-wrap items-center gap-3">
        <div className="text-sm text-neutral-600 dark:text-neutral-300">
          {meta.total.toLocaleString()} total • Page {meta.page} of {meta.pages}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <select
            className="px-2 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-sm"
            value={meta.pageSize}
            onChange={(e) =>
              setMeta((m) => ({
                ...m,
                page: 1,
                pageSize: Number(e.target.value),
              }))
            }
          >
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
          </select>
          <select
            className="px-2 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-sm"
            value={meta.sort}
            onChange={(e) =>
              setMeta((m) => ({ ...m, page: 1, sort: e.target.value }))
            }
          >
            <option value="-createdAt">Newest first</option>
            <option value="createdAt">Oldest first</option>
            <option value="lastName">Last name A–Z</option>
            <option value="-lastName">Last name Z–A</option>
          </select>
          <button
            className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 text-sm"
            onClick={() =>
              setMeta((m) => ({ ...m, page: Math.max(1, m.page - 1) }))
            }
            disabled={meta.page <= 1}
          >
            ‹ Prev
          </button>
          <button
            className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 text-sm"
            onClick={() =>
              setMeta((m) => ({ ...m, page: Math.min(m.pages, m.page + 1) }))
            }
            disabled={meta.page >= meta.pages}
          >
            Next ›
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-900/60">
            <tr>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Email</th>
              <th className="text-left p-2">Phone</th>
              <th className="text-left p-2">Relation</th>
              <th className="text-left p-2">Created</th>
              <th className="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-t border-neutral-200 dark:border-neutral-800"
              >
                <td className="p-2">
                  {[r.firstName, r.lastName].filter(Boolean).join(" ") || "—"}
                </td>
                <td className="p-2">{r.email || "—"}</td>
                <td className="p-2">{r.phone || "—"}</td>
                <td className="p-2">{r.relation || "—"}</td>
                <td className="p-2">
                  {r.createdAt
                    ? new Date(r.createdAt).toLocaleDateString()
                    : "—"}
                </td>
                <td className="p-2">
                  <div className="flex gap-2">
                    <Link
                      className="px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                      href={`/admin/family-members/${r.id}`}
                    >
                      View
                    </Link>
                    <button
                      className="btn-delete"
                      onClick={() => onDelete(r.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr>
                <td
                  className="p-2 text-neutral-500"
                  colSpan={6}
                >
                  No results
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {loading && <div className="p-6 text-neutral-500">Loading…</div>}
        {err && (
          <div className="p-6 text-rose-600 dark:text-rose-400">
            Error: {err}
          </div>
        )}
      </div>
    </div>
  );
}
