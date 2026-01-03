"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Spinner from "@/components/shared/Spinner";

function formatDate(d) {
  try {
    return new Date(d).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function TrainingHistory({ username }) {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/users/${encodeURIComponent(username)}/attendance`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (!cancelled) {
          setRecords(Array.isArray(data?.records) ? data.records : []);
        }
      } catch {
        if (!cancelled) setRecords([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [username]);

  const recent = useMemo(() => records.slice(0, 6), [records]);

  const stats = useMemo(() => {
    const total = records.length;

    const last30 = records.filter((r) => {
      const d = new Date(r.attendedAt);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      return d >= cutoff;
    }).length;

    return { total, last30 };
  }, [records]);

  return (
    <section className="max-w-7xl mx-auto px-4 pb-10">
      <div className="rounded-2xl border border-border bg-white dark:bg-gray-900 shadow-md overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Training History
            </h2>
            <p className="text-sm text-gray-800 dark:text-gray-200 mt-1">
              Recent sessions
            </p>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
              <Spinner size="sm" />
              Loading…
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-4">
              {/* LEFT: Stats / Legend */}
              <div className="md:col-span-1 space-y-4">
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-border p-4">
                  <div className="text-sm text-gray-800 dark:text-gray-200">
                    <div className="flex justify-between">
                      <span>Total sessions</span>
                      <span className="font-semibold">{stats.total}</span>
                    </div>
                    <div className="flex justify-between mt-2">
                      <span>Last 30 days</span>
                      <span className="font-semibold">{stats.last30}</span>
                    </div>
                  </div>
                </div>

                <Link
                  href={`/${username}/training`}
                  className="inline-block text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View full training history →
                </Link>
              </div>

              {/* RIGHT: Wrapped sessions */}
              <div className="md:col-span-3">
                {recent.length === 0 ? (
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    No training sessions yet.
                  </p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {recent.map((r) => (
                      <div
                        key={r._id}
                        className="rounded-xl border border-border bg-gray-50 dark:bg-gray-800 p-4 hover:shadow-sm transition"
                      >
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {r.discipline || "Training"}
                        </div>

                        {r.team?.teamName ? (
                          <Link
                            href={`/teams/${r.team.teamSlug}`}
                            className="text-sm text-blue-600 dark:text-blue-400 mt-1 hover:underline"
                          >
                            {r.team.teamName}
                          </Link>
                        ) : r.clubNameFallback ? (
                          <div className="text-sm text-gray-800 dark:text-gray-200 mt-1">
                            {r.clubNameFallback}
                          </div>
                        ) : null}

                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                          {formatDate(r.attendedAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default TrainingHistory;
