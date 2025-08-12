// app/admin/teams/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

export default function AdminTeamsPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [fetching, setFetching] = useState(true);
  const pages = useMemo(
    () => Math.max(Math.ceil(total / limit), 1),
    [total, limit]
  );

  useEffect(() => {
    const load = async () => {
      setFetching(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (q.trim()) params.set("q", q.trim());
      try {
        const res = await fetch(`/api/admin/teams?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to fetch teams");
        const data = await res.json();
        setRows(data.teams || []);
        setTotal(data.total || 0);
      } catch (e) {
        console.error(e);
        setRows([]);
        setTotal(0);
      } finally {
        setFetching(false);
      }
    };
    load();
  }, [q, page, limit]);

  return (
    <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow">
      <header className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="font-semibold">Teams</h2>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Search teams…"
            className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
          />
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {fetching ? "Loading…" : `${total} total`}
          </div>
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <Th>Team</Th>
              <Th>Slug</Th>
              <Th>Owner</Th>
              <Th className="text-right">Active</Th>
              <Th className="text-right">Pending</Th>
              <Th className="text-right">Invites</Th>
              <Th>Created</Th>
              <Th className="text-right pr-4">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !fetching ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-6 text-center text-gray-500"
                >
                  No teams found.
                </td>
              </tr>
            ) : null}
            {rows.map((t) => (
              <tr
                key={t._id}
                className="border-t border-gray-100 dark:border-gray-800"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {t.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={t.logo}
                        alt=""
                        className="h-6 w-6 rounded object-cover"
                      />
                    ) : (
                      <div className="h-6 w-6 rounded bg-gray-200 dark:bg-gray-700" />
                    )}
                    <span>{t.teamName}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">
                    {t.teamSlug}
                  </code>
                </td>
                <td className="px-4 py-3">{t.owner ? t.owner.name : "—"}</td>
                <td className="px-4 py-3 text-right">{t.activeMembers ?? 0}</td>
                <td className="px-4 py-3 text-right">
                  {t.pendingMembers ?? 0}
                </td>
                <td className="px-4 py-3 text-right">
                  {t.pendingInvites ?? 0}
                </td>
                <td className="px-4 py-3">
                  {t.createdAt
                    ? new Date(t.createdAt).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right pr-4">
                  <div className="flex items-center gap-2 justify-end">
                    <Link
                      href={`/teams/${t.teamSlug}`}
                      className="btn-white-sm"
                    >
                      View
                    </Link>
                    <Link
                      href={`/admin/teams/${t._id}`}
                      className="btn-white-sm"
                    >
                      Manage
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <button
          className="btn btn-white-sm"
          onClick={() => setPage((p) => Math.max(p - 1, 1))}
          disabled={page <= 1}
        >
          Prev
        </button>
        <div className="text-sm">
          {page} / {pages}
        </div>
        <button
          className="btn btn-white-sm"
          onClick={() => setPage((p) => Math.min(p + 1, pages))}
          disabled={page >= pages}
        >
          Next
        </button>
      </div>
    </section>
  );
}

function Th({ children, className = "" }) {
  return (
    <th
      className={`px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300 ${className}`}
    >
      {children}
    </th>
  );
}
