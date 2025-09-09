"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

/* ---------- helpers ---------- */
function yyyymmddToLabel(yyyymmdd) {
  if (!yyyymmdd || yyyymmdd.length !== 8) return yyyymmdd || "";
  const m = yyyymmdd.slice(4, 6);
  const d = yyyymmdd.slice(6, 8);
  return `${m}/${d}`;
}
function truncate(str, n = 28) {
  if (!str) return "";
  return str.length > n ? str.slice(0, n - 1) + "…" : str;
}
function Segmented({ value, onChange }) {
  return (
    <div className="inline-flex rounded-full border border-neutral-200 dark:border-neutral-800 p-1 bg-neutral-100/60 dark:bg-neutral-900/60 backdrop-blur">
      {["charts", "tables"].map((v) => {
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
            {v === "charts" ? "Charts" : "Tables"}
          </button>
        );
      })}
    </div>
  );
}
function Card({ title, children, className = "" }) {
  return (
    <section className={"space-y-3 " + className}>
      {title && <h2 className="text-lg sm:text-xl font-semibold">{title}</h2>}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        {children}
      </div>
    </section>
  );
}

/* ---------- Error Boundary to isolate chart crashes ---------- */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }
  static getDerivedStateFromError(err) {
    return { err: err?.message || "Unknown error" };
  }
  componentDidCatch(err, info) {
    // Hook up Sentry here if you want
  }
  render() {
    if (this.state.err) {
      return (
        <div className="rounded-2xl border border-red-300 dark:border-red-800 p-4 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300">
          Chart failed to render. Open DevTools → Console for details.
          <div className="mt-2 text-xs opacity-80">
            {String(this.state.err)}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ---------- Client-only charts ---------- */
const Charts = dynamic(() => import("./_AnalyticsCharts"), { ssr: false });

export default function AdminAnalyticsPage() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [view, setView] = useState("charts"); // "charts" | "tables"

  // remember the selected tab
  useEffect(() => {
    const saved =
      typeof window !== "undefined"
        ? localStorage.getItem("adminAnalyticsView")
        : null;
    if (saved === "charts" || saved === "tables") setView(saved);
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined")
      localStorage.setItem("adminAnalyticsView", view);
  }, [view]);

  // fetch analytics data
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/analytics", {
          cache: "no-store",
          credentials: "include",
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "Failed");
        setData(json);
      } catch (e) {
        setErr(e.message || "Error");
      }
    })();
  }, []);

  // ✅ Always define defaults so hooks run on every render
  const dataset = data ?? {
    totals: { users: 0, views: 0 },
    traffic: [],
    topPages: [],
    devices: [],
    referrers: [],
  };
  const loading = !data && !err;

  // ✅ Hooks (useMemo) are called unconditionally — no early returns above this line
  const trafficChartData = useMemo(
    () =>
      dataset.traffic.map((t) => ({
        date: yyyymmddToLabel(t.date),
        users: t.users,
        views: t.views,
      })),
    [dataset.traffic]
  );
  const pagesChartData = useMemo(
    () => dataset.topPages.map((r) => ({ name: r.path, views: r.views })),
    [dataset.topPages]
  );
  const devicesChartData = useMemo(
    () => dataset.devices.map((d) => ({ name: d.device, users: d.users })),
    [dataset.devices]
  );
  const refChartData = useMemo(
    () =>
      dataset.referrers.map((r) => ({
        name: r.sourceMedium,
        sessions: r.sessions,
      })),
    [dataset.referrers]
  );

  return (
    <div className="p-6 space-y-8">
      <div className="sticky top-0 z-10 -mx-6 px-6 py-3 bg-white/80 dark:bg-neutral-950/80 backdrop-blur border-b border-neutral-200/60 dark:border-neutral-800/60 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <Segmented
          value={view}
          onChange={setView}
        />
      </div>

      {/* KPI cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-neutral-900">
          <div className="text-sm text-neutral-500 dark:text-neutral-400">
            Users (28d)
          </div>
          <div className="text-3xl font-bold">
            {(dataset.totals?.users || 0).toLocaleString()}
          </div>
        </div>
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-neutral-900">
          <div className="text-sm text-neutral-500 dark:text-neutral-400">
            Page Views (28d)
          </div>
          <div className="text-3xl font-bold">
            {(dataset.totals?.views || 0).toLocaleString()}
          </div>
        </div>
      </section>

      {err ? (
        <p className="text-red-600 dark:text-red-400">Error: {err}</p>
      ) : loading ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 animate-pulse"
              />
            ))}
          </div>
          <div className="h-72 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 animate-pulse" />
        </>
      ) : view === "charts" ? (
        <ErrorBoundary>
          <Charts
            trafficChartData={trafficChartData}
            pagesChartData={pagesChartData}
            devicesChartData={devicesChartData}
            refChartData={refChartData}
            truncate={truncate}
          />
        </ErrorBoundary>
      ) : (
        <>
          {/* Tables view */}
          <Card title="Traffic (last 28 days)">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-50 dark:bg-neutral-900/60">
                  <tr>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Users</th>
                    <th className="text-left p-2">Views</th>
                  </tr>
                </thead>
                <tbody>
                  {trafficChartData.map((d) => (
                    <tr
                      key={d.date}
                      className="border-t border-neutral-200 dark:border-neutral-800"
                    >
                      <td className="p-2">{d.date}</td>
                      <td className="p-2">{d.users.toLocaleString()}</td>
                      <td className="p-2">{d.views.toLocaleString()}</td>
                    </tr>
                  ))}
                  {trafficChartData.length === 0 && (
                    <tr>
                      <td
                        className="p-2 text-neutral-500"
                        colSpan={3}
                      >
                        No data
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Top Pages (7d)">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-neutral-50 dark:bg-neutral-900/60">
                    <tr>
                      <th className="text-left p-2">Path</th>
                      <th className="text-left p-2">Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(pagesChartData || []).map((r) => (
                      <tr
                        key={r.name}
                        className="border-t border-neutral-200 dark:border-neutral-800"
                      >
                        <td className="p-2">{r.name}</td>
                        <td className="p-2">{r.views.toLocaleString()}</td>
                      </tr>
                    ))}
                    {(!pagesChartData || pagesChartData.length === 0) && (
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
            </Card>

            <Card title="Devices (7d)">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-neutral-50 dark:bg-neutral-900/60">
                    <tr>
                      <th className="text-left p-2">Device</th>
                      <th className="text-left p-2">Users</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(devicesChartData || []).map((r) => (
                      <tr
                        key={r.name}
                        className="border-t border-neutral-200 dark:border-neutral-800"
                      >
                        <td className="p-2">{r.name}</td>
                        <td className="p-2">{r.users.toLocaleString()}</td>
                      </tr>
                    ))}
                    {(!devicesChartData || devicesChartData.length === 0) && (
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
            </Card>
          </div>

          <Card title="Top Referrers (7d)">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-50 dark:bg-neutral-900/60">
                  <tr>
                    <th className="text-left p-2">Source / Medium</th>
                    <th className="text-left p-2">Sessions</th>
                  </tr>
                </thead>
                <tbody>
                  {(refChartData || []).map((r) => (
                    <tr
                      key={r.name}
                      className="border-t border-neutral-200 dark:border-neutral-800"
                    >
                      <td className="p-2">{r.name}</td>
                      <td className="p-2">{r.sessions.toLocaleString()}</td>
                    </tr>
                  ))}
                  {(!refChartData || refChartData.length === 0) && (
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
          </Card>
        </>
      )}
    </div>
  );
}
