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
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

function yyyymmddToLabel(yyyymmdd) {
  if (!yyyymmdd || yyyymmdd.length !== 8) return yyyymmdd || "";
  const y = yyyymmdd.slice(0, 4);
  const m = yyyymmdd.slice(4, 6);
  const d = yyyymmdd.slice(6, 8);
  return `${y}-${m}-${d}`;
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [view, setView] = useState("charts"); // "charts" | "tables"

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/analytics", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "Failed");
        setData(json);
      } catch (e) {
        setErr(e.message || "Error");
      }
    })();
  }, []);

  const {
    totals,
    traffic = [],
    topPages = [],
    devices = [],
    referrers = [],
  } = data || {};

  const trafficChartData = useMemo(
    () =>
      (traffic || []).map((t) => ({
        date: yyyymmddToLabel(t.date),
        users: t.users,
        views: t.views,
      })),
    [traffic]
  );

  const deviceChartData = useMemo(
    () => (devices || []).map((d) => ({ name: d.device, value: d.users })),
    [devices]
  );

  const refChartData = useMemo(
    () =>
      (referrers || []).map((r) => ({
        name: r.sourceMedium, // e.g. "google / organic"
        sessions: r.sessions,
      })),
    [referrers]
  );

  if (err) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Analytics</h1>
        <div className="text-red-600">Error: {err}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Analytics</h1>
        <div>Loading…</div>
      </div>
    );
  }

  const Toggle = () => (
    <div className="inline-flex rounded-2xl border overflow-hidden">
      <button
        className={`px-3 py-1 text-sm ${
          view === "charts" ? "bg-gray-900 text-white" : "bg-white"
        }`}
        onClick={() => setView("charts")}
      >
        Charts
      </button>
      <button
        className={`px-3 py-1 text-sm ${
          view === "tables" ? "bg-gray-900 text-white" : "bg-white"
        }`}
        onClick={() => setView("tables")}
      >
        Tables
      </button>
    </div>
  );

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <Toggle />
      </div>

      {/* KPI cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border p-4">
          <div className="text-sm text-gray-500">Users (28d)</div>
          <div className="text-3xl font-bold">
            {(totals?.users || 0).toLocaleString()}
          </div>
        </div>
        <div className="rounded-2xl border p-4">
          <div className="text-sm text-gray-500">Page Views (28d)</div>
          <div className="text-3xl font-bold">
            {(totals?.views || 0).toLocaleString()}
          </div>
        </div>
      </section>

      {view === "charts" ? (
        <>
          {/* Traffic line chart */}
          <section>
            <h2 className="text-xl font-semibold mb-3">
              Traffic (last 28 days)
            </h2>
            <div className="h-72 rounded-2xl border p-3">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart data={trafficChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="users"
                  />
                  <Line
                    type="monotone"
                    dataKey="views"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Top pages bar chart + Devices pie chart */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xl font-semibold mb-3">Top Pages (7d)</h2>
              <div className="h-72 rounded-2xl border p-3">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart
                    data={topPages.map((r) => ({
                      name: r.path,
                      views: r.views,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      interval={0}
                      angle={-20}
                      height={60}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="views" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-3">Devices (7d)</h2>
              <div className="h-72 rounded-2xl border p-3">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <PieChart>
                    <Pie
                      data={deviceChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label
                    >
                      {deviceChartData.map((_, i) => (
                        <Cell key={i} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Referrers bar chart */}
          <section>
            <h2 className="text-xl font-semibold mb-3">Top Referrers (7d)</h2>
            <div className="h-72 rounded-2xl border p-3">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart data={refChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    interval={0}
                    angle={-20}
                    height={60}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="sessions" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      ) : (
        <>
          {/* Tables view */}
          <section>
            <h2 className="text-xl font-semibold mb-3">
              Traffic (last 28 days)
            </h2>
            <div className="overflow-x-auto rounded-2xl border">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
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
                      className="border-t"
                    >
                      <td className="p-2">{d.date}</td>
                      <td className="p-2">{d.users.toLocaleString()}</td>
                      <td className="p-2">{d.views.toLocaleString()}</td>
                    </tr>
                  ))}
                  {trafficChartData.length === 0 && (
                    <tr>
                      <td
                        className="p-2 text-gray-500"
                        colSpan={3}
                      >
                        No data
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xl font-semibold mb-3">Top Pages (7d)</h2>
              <div className="overflow-x-auto rounded-2xl border">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-2">Path</th>
                      <th className="text-left p-2">Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(topPages || []).map((r) => (
                      <tr
                        key={r.path}
                        className="border-t"
                      >
                        <td className="p-2">{r.path}</td>
                        <td className="p-2">{r.views.toLocaleString()}</td>
                      </tr>
                    ))}
                    {(!topPages || topPages.length === 0) && (
                      <tr>
                        <td
                          className="p-2 text-gray-500"
                          colSpan={2}
                        >
                          No data
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-3">Devices (7d)</h2>
              <div className="overflow-x-auto rounded-2xl border">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-2">Device</th>
                      <th className="text-left p-2">Users</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(devices || []).map((r) => (
                      <tr
                        key={r.device}
                        className="border-t"
                      >
                        <td className="p-2">{r.device}</td>
                        <td className="p-2">{r.users.toLocaleString()}</td>
                      </tr>
                    ))}
                    {(!devices || devices.length === 0) && (
                      <tr>
                        <td
                          className="p-2 text-gray-500"
                          colSpan={2}
                        >
                          No data
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Top Referrers (7d)</h2>
            <div className="overflow-x-auto rounded-2xl border">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-2">Source / Medium</th>
                    <th className="text-left p-2">Sessions</th>
                  </tr>
                </thead>
                <tbody>
                  {(referrers || []).map((r) => (
                    <tr
                      key={r.sourceMedium}
                      className="border-t"
                    >
                      <td className="p-2">{r.sourceMedium}</td>
                      <td className="p-2">{r.sessions.toLocaleString()}</td>
                    </tr>
                  ))}
                  {(!referrers || referrers.length === 0) && (
                    <tr>
                      <td
                        className="p-2 text-gray-500"
                        colSpan={2}
                      >
                        No data
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
