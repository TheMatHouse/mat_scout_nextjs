// app/admin/analytics/page.jsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/analytics/overview", {
          cache: "no-store",
        });
        const json = await res.json();
        if (alive) setOverview(json?.data || null);
      } catch (e) {
        if (alive) setOverview(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) return <div className="p-6">Loading analytics…</div>;
  if (!overview) return <div className="p-6">No analytics data yet.</div>;

  const { timeseries = [], pages = [], events = [] } = overview;

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Active Users & Sessions (Last 7d)</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <LineChart data={timeseries}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="users"
              />
              <Line
                type="monotone"
                dataKey="sessions"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Pages</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart data={pages}>
                <XAxis
                  dataKey="path"
                  hide
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="views" />
              </BarChart>
            </ResponsiveContainer>
            <ul className="mt-3 space-y-1 text-sm">
              {pages.map((p) => (
                <li
                  key={p.path}
                  className="truncate"
                >
                  <span className="font-mono">{p.views.toLocaleString()}</span>{" "}
                  — <span title={p.path}>{p.path}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Events</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart data={events}>
                <XAxis
                  dataKey="name"
                  hide
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" />
              </BarChart>
            </ResponsiveContainer>
            <ul className="mt-3 space-y-1 text-sm">
              {events.map((e) => (
                <li
                  key={e.name}
                  className="truncate"
                >
                  <span className="font-mono">{e.count.toLocaleString()}</span>{" "}
                  — {e.name} ({e.users} users)
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
