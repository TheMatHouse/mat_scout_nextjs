"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from "recharts";

/* ---------- helpers ---------- */

function yyyymmddToLabel(yyyymmdd) {
  if (!yyyymmdd || yyyymmdd.length !== 8) return yyyymmdd || "";
  const y = yyyymmdd.slice(0, 4);
  const m = yyyymmdd.slice(4, 6);
  const d = yyyymmdd.slice(6, 8);
  return `${m}/${d}`;
}

function truncate(str, n = 28) {
  if (!str) return "";
  return str.length > n ? str.slice(0, n - 1) + "…" : str;
}

/* A small segmented control that looks good in light/dark + mobile */
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
              "px-3 py-1.5 text-sm rounded-full transition",
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

/* A simple card wrapper that adapts to theme */
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

  if (err) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Analytics</h1>
        </div>
        <p className="mt-4 text-red-600 dark:text-red-400">Error: {err}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <Segmented
            value={view}
            onChange={setView}
          />
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 animate-pulse"
            />
          ))}
        </div>
        <div className="mt-6 h-72 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 animate-pulse" />
      </div>
    );
  }

  const {
    totals,
    traffic = [],
    topPages = [],
    devices = [],
    referrers = [],
  } = data;

  const trafficChartData = useMemo(
    () =>
      (traffic || []).map((t) => ({
        date: yyyymmddToLabel(t.date),
        users: t.users,
        views: t.views,
      })),
    [traffic]
  );

  const pagesChartData = useMemo(
    () => (topPages || []).map((r) => ({ name: r.path, views: r.views })),
    [topPages]
  );

  const devicesChartData = useMemo(
    () => (devices || []).map((d) => ({ name: d.device, users: d.users })),
    [devices]
  );

  const refChartData = useMemo(
    () =>
      (referrers || []).map((r) => ({
        name: r.sourceMedium,
        sessions: r.sessions,
      })),
    [referrers]
  );

  /* Shared chart styles that adapt to dark/light:
     - We set the container's text color, then use 'currentColor' in Recharts for axes/grid/series.
     - To distinguish the two lines without relying on colors, we use different widths and dash. */
  const chartWrap = "h-72 p-3 text-neutral-700 dark:text-neutral-300";
  const axisTick = { fill: "currentColor", fontSize: 12 };
  const gridStroke = "currentColor";

  return (
    <div className="p-6 space-y-8">
      {/* Sticky header with tabs, so the toggle never overlaps content */}
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
            {(totals?.users || 0).toLocaleString()}
          </div>
        </div>
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-neutral-900">
          <div className="text-sm text-neutral-500 dark:text-neutral-400">
            Page Views (28d)
          </div>
          <div className="text-3xl font-bold">
            {(totals?.views || 0).toLocaleString()}
          </div>
        </div>
      </section>

      {/* Only render the active view to avoid layout clashes / unreadable overlap */}
      {view === "charts" ? (
        <>
          <Card title="Traffic (last 28 days)">
            <div className={`rounded-2xl ${chartWrap}`}>
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={trafficChartData}
                  margin={{ left: 8, right: 8 }}
                >
                  <CartesianGrid
                    stroke={gridStroke}
                    strokeOpacity={0.15}
                  />
                  <XAxis
                    dataKey="date"
                    tick={axisTick}
                    interval="preserveStartEnd"
                    minTickGap={16}
                    tickMargin={8}
                  />
                  <YAxis
                    tick={axisTick}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{ background: "var(--tooltip-bg, #fff)" }}
                    formatter={(v, n) => [Number(v).toLocaleString(), n]}
                  />
                  <Legend />
                  {/* Two lines: same 'currentColor' family; distinguish by width/dash so it reads in both themes */}
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="views"
                    stroke="currentColor"
                    strokeDasharray="4 3"
                    strokeWidth={1.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Top Pages (7d)">
              <div className={`rounded-2xl ${chartWrap}`}>
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart
                    data={pagesChartData}
                    margin={{ left: 8, right: 8 }}
                  >
                    <CartesianGrid
                      stroke={gridStroke}
                      strokeOpacity={0.15}
                    />
                    <XAxis
                      dataKey="name"
                      tick={axisTick}
                      interval={0}
                      angle={-20}
                      height={60}
                      tickFormatter={(v) => truncate(v, 24)}
                    />
                    <YAxis
                      tick={axisTick}
                      width={50}
                    />
                    <Tooltip
                      contentStyle={{ background: "var(--tooltip-bg, #fff)" }}
                      formatter={(v) => Number(v).toLocaleString()}
                      labelFormatter={(l) => l}
                    />
                    <Legend />
                    <Bar
                      dataKey="views"
                      fill="currentColor"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Devices (7d)">
              <div className={`rounded-2xl ${chartWrap}`}>
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  {/* vertical bars read better than a monochrome pie in dark mode */}
                  <BarChart
                    data={devicesChartData}
                    layout="vertical"
                    margin={{ left: 16, right: 8 }}
                  >
                    <CartesianGrid
                      stroke={gridStroke}
                      strokeOpacity={0.15}
                    />
                    <XAxis
                      type="number"
                      tick={axisTick}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={axisTick}
                      width={90}
                    />
                    <Tooltip
                      contentStyle={{ background: "var(--tooltip-bg, #fff)" }}
                      formatter={(v) => Number(v).toLocaleString()}
                    />
                    <Legend />
                    <Bar
                      dataKey="users"
                      fill="currentColor"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card title="Top Referrers (7d)">
            <div className={`rounded-2xl ${chartWrap}`}>
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={refChartData}
                  margin={{ left: 8, right: 8 }}
                >
                  <CartesianGrid
                    stroke={gridStroke}
                    strokeOpacity={0.15}
                  />
                  <XAxis
                    dataKey="name"
                    tick={axisTick}
                    interval={0}
                    angle={-20}
                    height={60}
                    tickFormatter={(v) => truncate(v, 28)}
                  />
                  <YAxis
                    tick={axisTick}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{ background: "var(--tooltip-bg, #fff)" }}
                    formatter={(v) => Number(v).toLocaleString()}
                    labelFormatter={(l) => l}
                  />
                  <Legend />
                  <Bar
                    dataKey="sessions"
                    fill="currentColor"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      ) : (
        <>
          {/* TABLES VIEW */}
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
                    {(topPages || []).map((r) => (
                      <tr
                        key={r.path}
                        className="border-t border-neutral-200 dark:border-neutral-800"
                      >
                        <td className="p-2">{r.path}</td>
                        <td className="p-2">{r.views.toLocaleString()}</td>
                      </tr>
                    ))}
                    {(!topPages || topPages.length === 0) && (
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
                    {(devices || []).map((r) => (
                      <tr
                        key={r.device}
                        className="border-t border-neutral-200 dark:border-neutral-800"
                      >
                        <td className="p-2">{r.device}</td>
                        <td className="p-2">{r.users.toLocaleString()}</td>
                      </tr>
                    ))}
                    {(!devices || devices.length === 0) && (
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
                  {(referrers || []).map((r) => (
                    <tr
                      key={r.sourceMedium}
                      className="border-t border-neutral-200 dark:border-neutral-800"
                    >
                      <td className="p-2">{r.sourceMedium}</td>
                      <td className="p-2">{r.sessions.toLocaleString()}</td>
                    </tr>
                  ))}
                  {(!referrers || referrers.length === 0) && (
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
