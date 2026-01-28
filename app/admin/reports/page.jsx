"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("./_ReportChart"), { ssr: false });

function Segmented({ value, onChange }) {
  return (
    <div className="inline-flex rounded-full border border-neutral-200 dark:border-neutral-800 p-1 bg-neutral-100/60 dark:bg-neutral-900/60">
      {["chart", "table"].map((v) => {
        const active = v === value;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={[
              "px-3 py-1.5 text-sm rounded-full transition whitespace-nowrap",
              active
                ? "bg-neutral-900 text-white dark:bg-white dark:text-black shadow"
                : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60",
            ].join(" ")}
            aria-pressed={active}
          >
            {v === "chart" ? "Chart" : "Table"}
          </button>
        );
      })}
    </div>
  );
}

function Card({ title, actions, children }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg sm:text-xl font-semibold">{title}</h2>
        {actions}
      </div>
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        {children}
      </div>
    </section>
  );
}

export default function AdminReportsPage() {
  const [view, setView] = useState("chart"); // 'chart' | 'table'
  const [report, setReport] = useState("usersByDay"); // 'usersByDay' | 'collectionByDay'
  const [collection, setCollection] = useState(""); // used by collectionByDay
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // defaults: last 28 days
  useEffect(() => {
    if (!startDate || !endDate) {
      const today = new Date();
      const toISO = (d) => d.toISOString().slice(0, 10);
      const end = toISO(today);
      const start = toISO(
        new Date(today.getFullYear(), today.getMonth(), today.getDate() - 27),
      );
      setStartDate(start);
      setEndDate(end);
    }
  }, [startDate, endDate]);

  const qs = useMemo(() => {
    const sp = new URLSearchParams({ report, startDate, endDate });
    if (report === "collectionByDay" && collection)
      sp.set("collection", collection);
    return sp.toString();
  }, [report, startDate, endDate, collection]);

  const csvHref = `/api/admin/reports?${qs}&format=csv`;

  async function run() {
    try {
      setLoading(true);
      setErr("");
      const res = await fetch(`/api/admin/reports?${qs}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed");
      setRows(json.rows || []);
      setMeta(json.meta || null);
    } catch (e) {
      setErr(e.message || "Error");
      setRows([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // auto-run on first ready
    if (startDate && endDate) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, report]);

  return (
    <div className="p-6 space-y-6">
      {/* header */}
      <div className="sticky top-0 z-10 -mx-6 px-6 py-3 bg-white/80 dark:bg-neutral-950/80 backdrop-blur border-b border-neutral-200/60 dark:border-neutral-800/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <Segmented
          value={view}
          onChange={setView}
        />
      </div>

      {/* controls */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 sm:p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-neutral-600 dark:text-neutral-300">
              Report:
            </span>
            <select
              className="px-2 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-sm"
              value={report}
              onChange={(e) => setReport(e.target.value)}
            >
              <option value="usersByDay">Users created per day</option>
              <option value="collectionByDay">
                Any collection per day (advanced)
              </option>
            </select>

            {report === "collectionByDay" && (
              <input
                placeholder="collection name (e.g., matches)"
                className="px-2 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-sm"
                value={collection}
                onChange={(e) => setCollection(e.target.value)}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-neutral-600 dark:text-neutral-300">
              Date range:
            </span>
            <input
              type="date"
              className="px-2 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-sm"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="text-sm text-neutral-600 dark:text-neutral-300">
              to
            </span>
            <input
              type="date"
              className="px-2 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-sm"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={run}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 text-sm disabled:opacity-60"
            >
              {loading ? "Running…" : "Run"}
            </button>
            <a
              href={csvHref}
              className="btn-file"
            >
              Export CSV
            </a>
          </div>
        </div>
      </div>

      {/* output */}
      <Card
        title={
          meta
            ? `${meta.report} (${meta.startDate} → ${meta.endDate})`
            : "Results"
        }
      >
        {view === "chart" ? (
          <div className="h-72 p-3 text-neutral-700 dark:text-neutral-300">
            <Chart rows={rows} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-900/60">
                <tr>
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Count</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.date}
                    className="border-t border-neutral-200 dark:border-neutral-800"
                  >
                    <td className="p-2">{r.date}</td>
                    <td className="p-2">{r.count.toLocaleString()}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td
                      className="p-2 text-neutral-500"
                      colSpan={2}
                    >
                      No data
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
