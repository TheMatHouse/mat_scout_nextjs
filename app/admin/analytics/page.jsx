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
function Card({ title, actions, children, className = "" }) {
  return (
    <section className={"space-y-3 " + className}>
      <div className="flex items-center justify-between gap-3">
        {title && <h2 className="text-lg sm:text-xl font-semibold">{title}</h2>}
        {actions}
      </div>
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        {children}
      </div>
    </section>
  );
}

/* ---------- Error Boundary (isolates any chart crash) ---------- */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }
  static getDerivedStateFromError(err) {
    return { err: err?.message || "Unknown error" };
  }
  componentDidCatch(err, info) {
    // hook Sentry here if desired
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

/* ---------- build query string from controls ---------- */
function buildParams({ mode, range, startDate, endDate, compare, limit }) {
  const sp = new URLSearchParams();
  if (mode === "preset") {
    sp.set("range", range); // "7d" | "28d" | "90d"
  } else {
    if (startDate) sp.set("startDate", startDate);
    if (endDate) sp.set("endDate", endDate);
  }
  if (compare) sp.set("compare", "true");
  sp.set("limit", String(limit));
  return sp.toString();
}

export default function AdminAnalyticsPage() {
  /* ---------- state ---------- */
  const [view, setView] = useState("charts"); // 'charts' | 'tables'
  const [mode, setMode] = useState("preset"); // 'preset' | 'custom'
  const [range, setRange] = useState("28d"); // '7d' | '28d' | '90d'
  const [startDate, setStartDate] = useState(""); // 'YYYY-MM-DD'
  const [endDate, setEndDate] = useState(""); // 'YYYY-MM-DD'
  const [compare, setCompare] = useState(false);
  const [limit, setLimit] = useState(10); // 10/25/50

  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  // remember UI preferences locally
  useEffect(() => {
    const savedView = localStorage.getItem("adminAnalyticsView");
    if (savedView === "charts" || savedView === "tables") setView(savedView);
    const savedRange = localStorage.getItem("adminAnalyticsRange");
    if (savedRange && ["7d", "28d", "90d"].includes(savedRange))
      setRange(savedRange);
    const savedMode = localStorage.getItem("adminAnalyticsMode");
    if (savedMode && ["preset", "custom"].includes(savedMode))
      setMode(savedMode);
    const savedCompare = localStorage.getItem("adminAnalyticsCompare");
    if (savedCompare === "true") setCompare(true);
    const savedLimit = localStorage.getItem("adminAnalyticsLimit");
    if (savedLimit && [10, 25, 50].includes(Number(savedLimit)))
      setLimit(Number(savedLimit));
  }, []);
  useEffect(() => localStorage.setItem("adminAnalyticsView", view), [view]);
  useEffect(() => localStorage.setItem("adminAnalyticsRange", range), [range]);
  useEffect(() => localStorage.setItem("adminAnalyticsMode", mode), [mode]);
  useEffect(
    () => localStorage.setItem("adminAnalyticsCompare", String(compare)),
    [compare]
  );
  useEffect(
    () => localStorage.setItem("adminAnalyticsLimit", String(limit)),
    [limit]
  );

  // fetch data whenever controls change
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const qs = buildParams({
          mode,
          range,
          startDate,
          endDate,
          compare,
          limit,
        });
        const res = await fetch(`/api/admin/analytics?${qs}`, {
          cache: "no-store",
          credentials: "include",
          signal: controller.signal,
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "Failed");
        setData(json);
      } catch (e) {
        if (e.name !== "AbortError") {
          setErr(e.message || "Error");
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [mode, range, startDate, endDate, compare, limit]);

  // defaults to keep hooks stable
  const dataset = data ?? {
    meta: { range: { startDate: "", endDate: "" }, compare: null, limit },
    totals: { users: 0, views: 0 },
    totalsPrev: { users: 0, views: 0 },
    deltas: { users: 0, views: 0, usersPct: null, viewsPct: null },
    traffic: [],
    trafficPrev: [],
    topPages: [],
    devices: [],
    referrers: [],
    geo: [],
  };

  // build traffic series for charts (align prev by index for overlay)
  const trafficChartData = useMemo(() => {
    return dataset.traffic.map((t, i) => ({
      date: yyyymmddToLabel(t.date),
      users: t.users,
      views: t.views,
      usersPrev: dataset.trafficPrev[i]?.users ?? null,
      viewsPrev: dataset.trafficPrev[i]?.views ?? null,
    }));
  }, [dataset.traffic, dataset.trafficPrev]);

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
  const geoChartData = useMemo(
    () => dataset.geo.map((g) => ({ name: g.country, users: g.users })),
    [dataset.geo]
  );

  // CSV links (same query string + dataset + format=csv)
  const baseQS = buildParams({
    mode,
    range,
    startDate,
    endDate,
    compare,
    limit,
  });
  const csv = {
    traffic: `/api/admin/analytics?${baseQS}&format=csv&dataset=traffic`,
    topPages: `/api/admin/analytics?${baseQS}&format=csv&dataset=topPages`,
    devices: `/api/admin/analytics?${baseQS}&format=csv&dataset=devices`,
    referrers: `/api/admin/analytics?${baseQS}&format=csv&dataset=referrers`,
    geo: `/api/admin/analytics?${baseQS}&format=csv&dataset=geo`,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Sticky header with tabs */}
      <div className="sticky top-0 z-10 -mx-6 px-6 py-3 bg-white/80 dark:bg-neutral-950/80 backdrop-blur border-b border-neutral-200/60 dark:border-neutral-800/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <Segmented
          value={view}
          onChange={setView}
        />
      </div>

      {/* Controls toolbar */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 sm:p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Range */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-neutral-600 dark:text-neutral-300">
              Range:
            </span>
            <select
              className="px-2 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-sm"
              value={mode === "preset" ? range : "custom"}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "custom") setMode("custom");
                else {
                  setMode("preset");
                  setRange(v);
                }
              }}
            >
              <option value="7d">Last 7 days</option>
              <option value="28d">Last 28 days</option>
              <option value="90d">Last 90 days</option>
              <option value="custom">Custom…</option>
            </select>

            {mode === "custom" && (
              <div className="flex flex-wrap items-center gap-2">
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
                <button
                  type="button"
                  className="px-2 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 text-sm"
                  onClick={() => {
                    if (!startDate || !endDate) return;
                    setMode("custom"); // no-op; ensures fetch triggers
                  }}
                >
                  Apply
                </button>
              </div>
            )}
          </div>

          {/* Compare + Limit */}
          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-neutral-900 dark:accent-white"
                checked={compare}
                onChange={(e) => setCompare(e.target.checked)}
              />
              Compare to previous period
            </label>

            <label className="inline-flex items-center gap-2 text-sm">
              <span className="text-neutral-600 dark:text-neutral-300">
                Top list size:
              </span>
              <select
                className="px-2 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-sm"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
              >
                <option value={10}>Top 10</option>
                <option value={25}>Top 25</option>
                <option value={50}>Top 50</option>
              </select>
            </label>
          </div>

          {/* CSV shortcuts */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-neutral-600 dark:text-neutral-300">
              Export CSV:
            </span>
            <a
              className="px-2 py-1.5 rounded-lg border text-sm border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              href={csv.traffic}
            >
              Traffic
            </a>
            <a
              className="px-2 py-1.5 rounded-lg border text-sm border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              href={csv.topPages}
            >
              Top Pages
            </a>
            <a
              className="px-2 py-1.5 rounded-lg border text-sm border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              href={csv.devices}
            >
              Devices
            </a>
            <a
              className="px-2 py-1.5 rounded-lg border text-sm border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              href={csv.referrers}
            >
              Referrers
            </a>
            <a
              className="px-2 py-1.5 rounded-lg border text-sm border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              href={csv.geo}
            >
              Countries
            </a>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-neutral-900">
          <div className="text-sm text-neutral-500 dark:text-neutral-400">
            Users ({dataset.meta?.range?.startDate} →{" "}
            {dataset.meta?.range?.endDate})
          </div>
          <div className="text-3xl font-bold">
            {(dataset.totals?.users || 0).toLocaleString()}
          </div>
          {compare && dataset.deltas?.usersPct != null && (
            <div
              className={`text-sm mt-1 ${
                dataset.deltas.users >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {dataset.deltas.users >= 0 ? "▲" : "▼"}{" "}
              {Math.abs(dataset.deltas.users).toLocaleString()} (
              {Math.round(dataset.deltas.usersPct)}%)
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-neutral-900">
          <div className="text-sm text-neutral-500 dark:text-neutral-400">
            Page Views ({dataset.meta?.range?.startDate} →{" "}
            {dataset.meta?.range?.endDate})
          </div>
          <div className="text-3xl font-bold">
            {(dataset.totals?.views || 0).toLocaleString()}
          </div>
          {compare && dataset.deltas?.viewsPct != null && (
            <div
              className={`text-sm mt-1 ${
                dataset.deltas.views >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {dataset.deltas.views >= 0 ? "▲" : "▼"}{" "}
              {Math.abs(dataset.deltas.views).toLocaleString()} (
              {Math.round(dataset.deltas.viewsPct)}%)
            </div>
          )}
        </div>
      </section>

      {/* Loading skeletons */}
      {loading && !err && (
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
      )}

      {/* Error */}
      {err && <p className="text-red-600 dark:text-red-400">Error: {err}</p>}

      {/* Views */}
      {!loading &&
        !err &&
        (view === "charts" ? (
          <ErrorBoundary>
            <Charts
              compare={compare}
              trafficChartData={trafficChartData}
              pagesChartData={pagesChartData}
              devicesChartData={devicesChartData}
              refChartData={refChartData}
              geoChartData={geoChartData}
              truncate={truncate}
            />
          </ErrorBoundary>
        ) : (
          <>
            {/* Tables view */}
            <Card title="Traffic">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-neutral-50 dark:bg-neutral-900/60">
                    <tr>
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Users</th>
                      <th className="text-left p-2">Views</th>
                      {compare && (
                        <th className="text-left p-2">Users (prev)</th>
                      )}
                      {compare && (
                        <th className="text-left p-2">Views (prev)</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {trafficChartData.map((d) => (
                      <tr
                        key={d.date}
                        className="border-t border-neutral-200 dark:border-neutral-800"
                      >
                        <td className="p-2">{d.date}</td>
                        <td className="p-2">
                          {(d.users ?? 0).toLocaleString()}
                        </td>
                        <td className="p-2">
                          {(d.views ?? 0).toLocaleString()}
                        </td>
                        {compare && (
                          <td className="p-2">
                            {(d.usersPrev ?? 0).toLocaleString()}
                          </td>
                        )}
                        {compare && (
                          <td className="p-2">
                            {(d.viewsPrev ?? 0).toLocaleString()}
                          </td>
                        )}
                      </tr>
                    ))}
                    {trafficChartData.length === 0 && (
                      <tr>
                        <td
                          className="p-2 text-neutral-500"
                          colSpan={compare ? 5 : 3}
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
              <Card title="Top Pages">
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

              <Card title="Devices">
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Top Referrers">
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

              <Card title="Top Countries">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-neutral-50 dark:bg-neutral-900/60">
                      <tr>
                        <th className="text-left p-2">Country</th>
                        <th className="text-left p-2">Users</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(geoChartData || []).map((r) => (
                        <tr
                          key={r.name}
                          className="border-t border-neutral-200 dark:border-neutral-800"
                        >
                          <td className="p-2">{r.name}</td>
                          <td className="p-2">{r.users.toLocaleString()}</td>
                        </tr>
                      ))}
                      {(!geoChartData || geoChartData.length === 0) && (
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
          </>
        ))}
    </div>
  );
}
