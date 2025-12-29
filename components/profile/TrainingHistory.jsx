// components/profile/TrainingHistory.jsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Spinner from "@/components/shared/Spinner";

function formatDate(d) {
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return "";
  }
}

function labelDiscipline(discipline) {
  const s = String(discipline || "").trim();
  if (!s) return "Training";
  return s;
}

function TrainingHistory({ username }) {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr("");

      try {
        const res = await fetch(
          `/api/users/${encodeURIComponent(username)}/attendance`,
          { cache: "no-store" }
        );

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          console.error("GET /api/users/[username]/attendance failed:", txt);
          if (!cancelled) {
            setRecords([]);
            setErr("Couldn’t load training history right now.");
          }
          return;
        }

        const data = await res.json().catch(() => ({}));
        const rows = Array.isArray(data?.records) ? data.records : [];

        if (!cancelled) setRecords(rows);
      } catch (e) {
        console.error("Training history fetch error:", e);
        if (!cancelled) {
          setRecords([]);
          setErr("Couldn’t load training history right now.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [username]);

  const normalized = useMemo(() => {
    return (records || []).map((r) => {
      const discipline = labelDiscipline(r?.discipline);

      const team = r?.team && typeof r.team === "object" ? r.team : null;
      const teamName = team?.teamName ? String(team.teamName) : "";
      const teamSlug = team?.teamSlug ? String(team.teamSlug) : "";
      const clubFallback = r?.clubNameFallback
        ? String(r.clubNameFallback).trim()
        : "";

      const placeLabel = teamName || clubFallback || "Independent Training";

      const placeHref = teamSlug ? `/teams/${teamSlug}` : null;

      return {
        _id: String(r?._id || ""),
        attendedAt: r?.attendedAt,
        discipline,
        placeLabel,
        placeHref,
        visibility: r?.visibility || "public",
      };
    });
  }, [records]);

  return (
    <section className="max-w-7xl mx-auto px-4 pb-10">
      <div className="rounded-2xl border border-border bg-white dark:bg-gray-900 shadow-md overflow-hidden transition-transform duration-200 hover:shadow-lg hover:-translate-y-[1px]">
        <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

        <div className="p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Training History
              </h2>
              <p className="text-sm text-gray-800 dark:text-gray-200 mt-1">
                Recent check-ins
              </p>
            </div>

            {loading ? (
              <div className="flex items-center gap-2">
                <Spinner size="sm" />
                <span className="text-sm text-gray-800 dark:text-gray-200">
                  Loading…
                </span>
              </div>
            ) : null}
          </div>

          {!loading && err ? (
            <div className="rounded-xl border border-border bg-gray-50 dark:bg-gray-800 p-4">
              <p className="text-sm text-gray-900 dark:text-gray-100">{err}</p>
            </div>
          ) : null}

          {!loading && !err && normalized.length === 0 ? (
            <div className="rounded-xl border border-border bg-gray-50 dark:bg-gray-800 p-5">
              <p className="text-sm text-gray-900 dark:text-gray-100">
                No training history yet.
              </p>
              <p className="text-sm text-gray-800 dark:text-gray-200 mt-1">
                Use Practice Check-In from your dashboard to log a session.
              </p>
            </div>
          ) : null}

          {!loading && !err && normalized.length > 0 ? (
            <div className="divide-y divide-gray-200/60 dark:divide-gray-700/60">
              {normalized.map((r) => (
                <div
                  key={r._id}
                  className="py-4 flex items-start justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {r.discipline}
                      </span>

                      <span className="text-gray-700 dark:text-gray-300">
                        •
                      </span>

                      {r.placeHref ? (
                        <Link
                          href={r.placeHref}
                          className="text-gray-900 dark:text-gray-100 underline underline-offset-4 decoration-2 hover:opacity-90"
                        >
                          {r.placeLabel}
                        </Link>
                      ) : (
                        <span className="text-gray-900 dark:text-gray-100">
                          {r.placeLabel}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 text-sm text-gray-800 dark:text-gray-200">
                      {formatDate(r.attendedAt)}
                    </div>
                  </div>

                  {/* Optional visibility badge for owner view; harmless otherwise */}
                  <div className="shrink-0">
                    <span className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800">
                      {String(r.visibility || "public")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default TrainingHistory;
