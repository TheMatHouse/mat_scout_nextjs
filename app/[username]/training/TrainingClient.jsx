"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Spinner from "@/components/shared/Spinner";

function badgeForCount(count) {
  if (count >= 25)
    return { label: "High Volume", color: "bg-yellow-400 text-black" };
  if (count >= 15)
    return { label: "Dedicated", color: "bg-purple-600 text-white" };
  if (count >= 8)
    return { label: "Consistent", color: "bg-blue-600 text-white" };

  return null;
}

function TrainingClient({ username, isOwner }) {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({});
  const [filters, setFilters] = useState({ showPrivate: false });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);

      const res = await fetch(
        `/api/users/${encodeURIComponent(username)}/attendance`,
        { cache: "no-store" }
      );

      if (!res.ok) {
        if (!cancelled) setLoading(false);
        return;
      }

      const data = await res.json();

      if (!cancelled) {
        console.log("ATTENDANCE API STATS:", data.stats);
        setRecords(data.records || []);
        setStats(data.stats || {});
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [username]);

  const visibleRecords = useMemo(() => {
    return records.filter(
      (r) => filters.showPrivate || r.visibility === "public"
    );
  }, [records, filters.showPrivate]);

  const disciplineStats = useMemo(() => {
    const out = Object.create(null);

    const now = Date.now();
    const cutoff = now - 30 * 24 * 60 * 60 * 1000;

    for (const r of records) {
      if (!filters.showPrivate && r.visibility !== "public") continue;

      const ts = new Date(r.attendedAt).getTime();
      if (!Number.isFinite(ts) || ts < cutoff) continue;

      const key = String(r.discipline || "Training").trim() || "Training";
      out[key] = (out[key] || 0) + 1;
    }

    return out;
  }, [records, filters.showPrivate]);

  function formatDateShort(d) {
    try {
      return new Date(d).toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      });
    } catch {
      return "";
    }
  }

  // ✅ FIX: use the actual API key
  const sincePromotion = stats?.sincePromotion || {};

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/${username}`}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← Back to profile
        </Link>

        <h1 className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">
          Training History
        </h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* LEFT */}
        <div className="w-full lg:w-96 shrink-0 space-y-6">
          <div className="rounded-xl bg-gray-900 border border-border p-5">
            <h3 className="font-semibold text-white mb-4">Last 30 Days</h3>

            {Object.keys(disciplineStats).length === 0 ? (
              <p className="text-sm text-gray-400">No recent training.</p>
            ) : (
              <ul className="space-y-3">
                {Object.entries(disciplineStats).map(([disc, count]) => {
                  const badge = badgeForCount(count);

                  return (
                    <li
                      key={disc}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="capitalize text-gray-200">{disc}</span>

                      {badge ? (
                        <span
                          className={`text-xs px-3 py-1 rounded-full font-semibold ${badge.color}`}
                        >
                          {count} · {badge.label}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">
                          {count} sessions
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* ✅ ONLY CHANGE AREA START: Promotions section */}
          {Object.keys(sincePromotion).length > 0 && (
            <div className="rounded-xl bg-gray-900 border border-border p-5">
              <h3 className="font-semibold text-white mb-4">
                Since Last Promotion
              </h3>

              <ul className="space-y-4">
                {Object.entries(sincePromotion).map(([discipline, count]) => (
                  <li key={discipline}>
                    <div className="text-gray-200 font-medium">
                      {discipline}
                    </div>

                    <div className="text-sm text-gray-300 mt-1">
                      <span className="font-semibold">{count}</span> sessions
                      since last promotion
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* ✅ ONLY CHANGE AREA END */}

          {isOwner && (
            <div className="rounded-xl bg-gray-900 border border-border p-5">
              <h3 className="font-semibold text-white mb-3">Visibility</h3>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={filters.showPrivate}
                  onChange={() =>
                    setFilters((f) => ({
                      ...f,
                      showPrivate: !f.showPrivate,
                    }))
                  }
                />
                Show private sessions
              </label>
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="flex-1">
          {loading ? (
            <div className="flex justify-center py-20">
              <Spinner size={48} />
            </div>
          ) : visibleRecords.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">
              No training sessions to show.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {visibleRecords.map((r) => (
                <div
                  key={r._id}
                  className="rounded-xl border border-border bg-white dark:bg-gray-900 p-4 shadow-sm"
                >
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {r.discipline || "Training"}
                  </p>

                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {new Date(r.attendedAt).toLocaleDateString()}
                  </p>

                  {r.team?.teamName ? (
                    <Link
                      href={`/teams/${r.team.teamSlug}`}
                      className="text-sm mt-2 inline-block text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {r.team.teamName}
                    </Link>
                  ) : r.clubNameFallback ? (
                    <p className="text-sm mt-2 text-gray-700 dark:text-gray-300">
                      {r.clubNameFallback}
                    </p>
                  ) : null}

                  {r.visibility === "private" && (
                    <span className="inline-block mt-3 text-xs px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-700">
                      Private
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TrainingClient;
