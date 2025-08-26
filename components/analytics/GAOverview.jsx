// components/analytics/GAOverview.jsx
"use client";

import { useEffect, useMemo, useState } from "react";

const RANGES = [
  { label: "Last 7d", value: "7d" },
  { label: "Last 28d", value: "28d" },
  { label: "Last 90d", value: "90d" },
];

// Safely parse JSON, even if the response is empty or text/html.
async function safeJson(res) {
  // If not ok, try to read text for error message; still return an object.
  const contentType = res.headers.get("content-type") || "";
  const contentLength = Number(res.headers.get("content-length") || "0");

  // Some runtimes don't set content-length for chunked responses. Read text defensively.
  const raw = await res.text(); // always read the body exactly once

  if (!res.ok) {
    // If server included JSON, try to parse it for a better error; otherwise use raw
    try {
      const parsed = raw ? JSON.parse(raw) : null;
      return {
        ok: false,
        status: res.status,
        error: parsed?.error || parsed?.message || raw || `HTTP ${res.status}`,
        data: null,
      };
    } catch {
      return {
        ok: false,
        status: res.status,
        error: raw || `HTTP ${res.status}`,
        data: null,
      };
    }
  }

  // OK response: if empty, normalize to {}
  if (!raw || contentLength === 0) {
    return { ok: true, status: res.status, data: {}, error: null };
  }

  // If not JSON, return as text in a data wrapper (don’t crash UI)
  if (!contentType.includes("application/json")) {
    return { ok: true, status: res.status, data: { _raw: raw }, error: null };
  }

  // Parse JSON safely
  try {
    return { ok: true, status: res.status, data: JSON.parse(raw), error: null };
  } catch (e) {
    return {
      ok: false,
      status: res.status,
      error: `Bad JSON from server: ${e?.message || e}`,
      data: null,
    };
  }
}

export default function GAOverview() {
  const [range, setRange] = useState("7d");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const endpoint = useMemo(
    () => `/api/analytics/summary?range=${encodeURIComponent(range)}`,
    [range]
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(endpoint, { cache: "no-store" });
        const payload = await safeJson(res);

        if (cancelled) return;

        if (!payload.ok) {
          setErr(payload.error || "Failed to load analytics.");
          setData(null);
        } else {
          // Normalize shape to avoid "undefined" pathing
          const d = payload.data || {};
          setData({
            summary: d.summary || null,
            topPages: d.topPages || [],
            topEvents: d.topEvents || [],
            _raw: d._raw, // present if server responded with text/html
          });
        }
      } catch (e) {
        if (!cancelled) {
          setErr(e?.message || "Network error loading analytics.");
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Google Analytics</h2>
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-3 py-1 rounded border ${
                range === r.value
                  ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                  : "bg-white dark:bg-gray-800"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="rounded border p-4">Loading GA4 summary…</div>
      )}

      {err && (
        <div className="rounded border border-red-300 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          <div className="font-medium mb-1">Analytics error</div>
          <div className="text-sm">{String(err)}</div>
          <div className="text-xs mt-2 opacity-70">
            Tip: Ensure GA property ID, credentials, and scopes are correct. The
            API may return 204 No Content when there’s no data for the selected
            period.
          </div>
        </div>
      )}

      {!loading && !err && data && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Summary */}
          <div className="rounded border p-4">
            <h3 className="font-medium mb-3">Summary</h3>
            {!data.summary && (
              <div className="text-sm text-gray-500">No summary data.</div>
            )}
            {data.summary && (
              <ul className="text-sm space-y-2">
                <li className="flex justify-between">
                  <span>Total Users</span>
                  <span className="font-semibold">{data.summary.users}</span>
                </li>
                <li className="flex justify-between">
                  <span>Sessions</span>
                  <span className="font-semibold">{data.summary.sessions}</span>
                </li>
                <li className="flex justify-between">
                  <span>Avg. Engagement (s)</span>
                  <span className="font-semibold">
                    {data.summary.avgEngagementSeconds}
                  </span>
                </li>
              </ul>
            )}
          </div>

          {/* Top Pages */}
          <div className="rounded border p-4">
            <h3 className="font-medium mb-3">Top Pages</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="p-2">Page</th>
                  <th className="p-2 w-24 text-right">Views</th>
                </tr>
              </thead>
              <tbody>
                {(data.topPages || []).map((r, i) => (
                  <tr
                    key={`${r.page || "row"}-${i}`}
                    className="border-t"
                  >
                    <td className="p-2 truncate max-w-[340px]">{r.page}</td>
                    <td className="p-2 text-right">{r.views}</td>
                  </tr>
                ))}
                {(data.topPages || []).length === 0 && (
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

          {/* Top Events */}
          <div className="rounded border p-4 lg:col-span-2">
            <h3 className="font-medium mb-3">Top Events</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="p-2">Event</th>
                  <th className="p-2 w-24 text-right">Count</th>
                </tr>
              </thead>
              <tbody>
                {(data.topEvents || []).map((r, i) => (
                  <tr
                    key={`${r.event || "evt"}-${i}`}
                    className="border-t"
                  >
                    <td className="p-2">{r.event}</td>
                    <td className="p-2 text-right">{r.count}</td>
                  </tr>
                ))}
                {(data.topEvents || []).length === 0 && (
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

            {/* If server sent raw (e.g., HTML error page), show a hint for debugging */}
            {data._raw && (
              <pre className="mt-3 whitespace-pre-wrap break-words text-xs opacity-70 p-2 rounded border">
                {_shorten(data._raw)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Trim long raw text blobs so the UI doesn’t explode
function _shorten(s, max = 1200) {
  if (!s) return "";
  return s.length > max ? s.slice(0, max) + "… (truncated)" : s;
}
