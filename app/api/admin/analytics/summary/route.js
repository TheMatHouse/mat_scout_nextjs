"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function fmtDate(yyyymmdd) {
  if (!yyyymmdd || yyyymmdd.length !== 8) return yyyymmdd || "";
  const m = yyyymmdd.slice(4, 6);
  const d = yyyymmdd.slice(6, 8);
  return `${m}/${d}`;
}

export default function GAOverview({ initialDays = 7 }) {
  const [days, setDays] = useState(initialDays);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [errText, setErrText] = useState("");

  async function load(d) {
    setLoading(true);
    setErrText("");
    try {
      const res = await fetch(`/api/admin/analytics/summary?days=${d}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok || json?.error) {
        const msg = json?.error || "Failed to load analytics";
        setErrText(msg);
        toast.error(msg);
        setData(null);
      } else {
        setData(json);
      }
    } catch (e) {
      const msg = e?.message || "Failed to load analytics";
      setErrText(msg);
      toast.error(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const k = data?.kpis;

  return (
    <div className="space-y-6">
      {/* Header + range buttons */}
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold">Google Analytics</h2>
        <div className="ml-auto flex items-center gap-2">
          {[7, 28, 90].map((d) => (
            <button
              key={d}
              onClick={() => {
                setDays(d);
                load(d);
              }}
              className={`px-3 py-1 rounded border ${
                days === d ? "bg-gray-200 dark:bg-gray-800" : ""
              }`}
            >
              Last {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Error / Loading / Empty */}
      {errText ? (
        <div className="rounded border p-4 text-sm text-red-600 dark:text-red-400">
          {errText}
        </div>
      ) : !data ? (
        <div className="rounded border p-4 text-sm text-gray-600 dark:text-gray-300">
          {loading ? "Loading…" : "No analytics yet."}
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded border p-4 bg-white dark:bg-gray-900">
              <div className="text-sm text-gray-500">Users</div>
              <div className="text-2xl font-bold">{k?.totalUsers ?? 0}</div>
            </div>
            <div className="rounded border p-4 bg-white dark:bg-gray-900">
              <div className="text-sm text-gray-500">Sessions</div>
              <div className="text-2xl font-bold">{k?.sessions ?? 0}</div>
            </div>
            <div className="rounded border p-4 bg-white dark:bg-gray-900">
              <div className="text-sm text-gray-500">Views</div>
              <div className="text-2xl font-bold">{k?.views ?? 0}</div>
            </div>
            <div className="rounded border p-4 bg-white dark:bg-gray-900">
              <div className="text-sm text-gray-500">Events</div>
              <div className="text-2xl font-bold">{k?.eventCount ?? 0}</div>
            </div>
          </div>

          {/* Sessions time series */}
          <div className="rounded border p-4 bg-white dark:bg-gray-900">
            <div className="text-sm mb-2 text-gray-600">Sessions per day</div>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <LineChart
                  data={(data.timeseries || []).map((r) => ({
                    ...r,
                    label: fmtDate(r.date),
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="sessions"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top pages & events */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top pages */}
            <div className="rounded border p-4 bg-white dark:bg-gray-900">
              <div className="text-sm mb-2 text-gray-600">
                Top pages (views)
              </div>
              <div className="overflow-auto">
                <table className="min-w-[400px] w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="text-left p-2">Path</th>
                      <th className="text-right p-2">Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.topPages || []).map((p) => (
                      <tr
                        key={`${p.path}-${p.views}`}
                        className="border-t dark:border-gray-800"
                      >
                        <td className="p-2 font-mono truncate max-w-[320px]">
                          {p.path}
                        </td>
                        <td className="p-2 text-right">{p.views}</td>
                      </tr>
                    ))}
                    {(data.topPages || []).length === 0 ? (
                      <tr>
                        <td
                          className="p-2 text-gray-500"
                          colSpan={2}
                        >
                          No data
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top events */}
            <div className="rounded border p-4 bg-white dark:bg-gray-900">
              <div className="text-sm mb-2 text-gray-600">Top events</div>
              <div className="overflow-auto">
                <table className="min-w-[320px] w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="text-left p-2">Event</th>
                      <th className="text-right p-2">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.topEvents || []).map((e) => (
                      <tr
                        key={`${e.event}-${e.count}`}
                        className="border-t dark:border-gray-800"
                      >
                        <td className="p-2">{e.event}</td>
                        <td className="p-2 text-right">{e.count}</td>
                      </tr>
                    ))}
                    {(data.topEvents || []).length === 0 ? (
                      <tr>
                        <td
                          className="p-2 text-gray-500"
                          colSpan={2}
                        >
                          No data
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
