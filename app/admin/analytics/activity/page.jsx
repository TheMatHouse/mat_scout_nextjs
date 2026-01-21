"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";

/* ---------------- helpers ---------------- */

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getIntensityClass(count, max) {
  if (!count || max === 0) return "bg-gray-200 dark:bg-gray-800";

  const ratio = count / max;

  if (ratio > 0.75) return "bg-red-600";
  if (ratio > 0.5) return "bg-orange-500";
  if (ratio > 0.25) return "bg-yellow-500";
  return "bg-green-500";
}

/* ---------------- component ---------------- */

const ActivityHeatmapPage = () => {
  const [grid, setGrid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState("day"); // "day" | "hour"

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/analytics/activity-heatmap", {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load heatmap");
        setGrid(data.grid || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-gray-900 dark:text-gray-100">
        Loading activity heatmap…
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-red-600 dark:text-red-400">{error}</div>;
  }

  /* ---------------- derived data ---------------- */

  let globalMax = 0;
  for (const row of grid) {
    for (const v of row) {
      if (v > globalMax) globalMax = v;
    }
  }

  const hourlyTotals = Array.from({ length: 24 }, () => 0);
  for (const row of grid) {
    row.forEach((count, hour) => {
      hourlyTotals[hour] += count;
    });
  }

  const hourlyMax = Math.max(...hourlyTotals);

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            User Activity Heatmap
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Activity from users active in the last 30 days
          </p>
        </div>

        {/* Toggle */}
        <div className="inline-flex rounded-md border border-gray-300 dark:border-gray-700 overflow-hidden">
          <button
            onClick={() => setView("day")}
            className={`px-4 py-2 text-sm font-medium ${
              view === "day"
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            By Day
          </button>
          <button
            onClick={() => setView("hour")}
            className={`px-4 py-2 text-sm font-medium ${
              view === "hour"
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            By Hour
          </button>
        </div>
      </div>

      {/* ---------------- Day × Hour Heatmap ---------------- */}
      {view === "day" && (
        <div className="overflow-x-auto">
          <div className="inline-grid grid-cols-[80px_repeat(24,_minmax(28px,_1fr))] gap-1">
            <div></div>
            {Array.from({ length: 24 }).map((_, h) => (
              <div
                key={h}
                className="text-xs text-center text-gray-600 dark:text-gray-400"
              >
                {h}
              </div>
            ))}

            {grid.map((row, dayIdx) => (
              <div
                key={dayIdx}
                className="contents"
              >
                <div className="flex items-center text-sm font-medium text-gray-900 dark:text-gray-100">
                  {DAYS[dayIdx]}
                </div>

                {row.map((count, hourIdx) => (
                  <div
                    key={hourIdx}
                    title={`${DAYS[dayIdx]} @ ${hourIdx}:00 — ${count} active`}
                    className={`h-7 w-7 rounded-md ${getIntensityClass(
                      count,
                      globalMax
                    )}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------- Hour-only Heatmap ---------------- */}
      {view === "hour" && (
        <div className="overflow-x-auto">
          <div className="inline-grid grid-cols-[repeat(24,_minmax(28px,_1fr))] gap-1">
            {hourlyTotals.map((count, hour) => (
              <div
                key={hour}
                title={`${hour}:00 — ${count} active`}
                className={`h-8 w-8 rounded-md ${getIntensityClass(
                  count,
                  hourlyMax
                )}`}
              />
            ))}

            {hourlyTotals.map((_, hour) => (
              <div
                key={`label-${hour}`}
                className="text-xs text-center text-gray-600 dark:text-gray-400"
              >
                {hour}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="h-4 w-4 rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-4 w-4 rounded bg-green-500" />
          <div className="h-4 w-4 rounded bg-yellow-500" />
          <div className="h-4 w-4 rounded bg-orange-500" />
          <div className="h-4 w-4 rounded bg-red-600" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
};

export default ActivityHeatmapPage;
