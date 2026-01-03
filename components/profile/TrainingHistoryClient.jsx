"use client";

import { useEffect, useState } from "react";

function groupByMonth(records) {
  const map = {};
  records.forEach((r) => {
    const d = new Date(r.attendedAt);
    const key = d.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
    if (!map[key]) map[key] = [];
    map[key].push(r);
  });
  return map;
}

const TrainingHistoryClient = ({ username }) => {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      try {
        const res = await fetch(
          `/api/users/${encodeURIComponent(username)}/attendance`,
          { cache: "no-store" }
        );

        if (!res.ok) return;

        const data = await res.json();
        if (!cancelled) {
          setRecords(Array.isArray(data.records) ? data.records : []);
        }
      } catch {
        if (!cancelled) setRecords([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [username]);

  if (loading) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Loading training history…
      </p>
    );
  }

  if (records.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No training history yet.
      </p>
    );
  }

  const grouped = groupByMonth(records);

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([month, rows]) => (
        <div key={month}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            {month}
          </h2>

          <ul className="space-y-3">
            {rows.map((r) => {
              const d = new Date(r.attendedAt);
              const dateLabel = d.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              });

              return (
                <li
                  key={r._id}
                  className="flex items-start justify-between border-b border-border pb-2 last:border-b-0"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {dateLabel} —{" "}
                      <span className="capitalize">
                        {r.discipline || "Training"}
                      </span>
                    </p>

                    {(r.team?.teamName || r.teamNameFallback) && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        @ {r.team?.teamName || r.teamNameFallback}
                      </p>
                    )}
                  </div>

                  {r.visibility === "private" && (
                    <span className="text-xs text-gray-500">Private</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default TrainingHistoryClient;
