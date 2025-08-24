"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
} from "recharts";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ReportsDashboard({ data }) {
  const {
    rangeDays,
    kpis: {
      newUsers7,
      newMatches7,
      newScouts7,
      totalTeams,
      pctWithin7,
      medianDays,
    },
    series: { matchSeries, scoutSeries },
    tables: { winLossByStyle, topOpponents, topTags },
    funnels,
  } = data || {};

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Reports</h1>
        <RangeTabs current={rangeDays} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <KPI
          title={`New Users (${rangeDays}d)`}
          value={newUsers7}
        />
        <KPI
          title={`Match Reports (${rangeDays}d)`}
          value={newMatches7}
        />
        <KPI
          title={`Scouting Reports (${rangeDays}d)`}
          value={newScouts7}
        />
        <KPI
          title="Teams"
          value={totalTeams}
        />
        <KPI
          title="Signup → First ≤7d"
          value={`${pctWithin7}%`}
        />
        <KPI
          title="Median Days to First"
          value={medianDays}
        />
      </div>

      {/* Activity over time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Match Reports (Last {rangeDays} days)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <LineChart data={matchSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Total"
                />
                <Line
                  type="monotone"
                  dataKey="public"
                  name="Public"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scouting Reports (Last {rangeDays} days)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <LineChart data={scoutSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Total"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Mini Funnels */}
      <Card>
        <CardHeader>
          <CardTitle>Mini Funnels</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Funnel
            title={funnels?.signupToFirstReport?.title}
            steps={funnels?.signupToFirstReport?.steps}
            footer={`Conversion: ${
              funnels?.signupToFirstReport?.conversion ?? 0
            }% · Median days: ${funnels?.signupToFirstReport?.medianDays ?? 0}`}
          />
          <Funnel
            title={funnels?.styleToMatchReport?.title}
            steps={funnels?.styleToMatchReport?.steps}
            footer={`Conversion: ${
              funnels?.styleToMatchReport?.conversion ?? 0
            }%`}
          />
        </CardContent>
      </Card>

      {/* Win/Loss by Style */}
      <Card>
        <CardHeader>
          <CardTitle>Win / Loss by Style</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart data={winLossByStyle}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="styleName"
                tick={{ fontSize: 12 }}
              />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="wins"
                name="Wins"
              />
              <Bar
                dataKey="losses"
                name="Losses"
              />
            </BarChart>
          </ResponsiveContainer>

          {/* Compact scrollable summary */}
          <div className="mt-3 max-h-40 overflow-y-auto pr-2">
            <ul className="text-sm grid grid-cols-1 md:grid-cols-2 gap-2">
              {winLossByStyle?.map((row) => (
                <li
                  key={row.styleName}
                  className="flex justify-between"
                >
                  <span className="truncate pr-2">{row.styleName}</span>
                  <span className="text-gray-600 dark:text-gray-300">
                    {row.wins}/{row.total} wins (
                    {Math.round((row.winRate || 0) * 100)}%)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Top Opponents & Top Tags */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Most-Scouted Opponents ({rangeDays}d)</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                downloadCSV(
                  topOpponents,
                  ["opponent", "reports"],
                  "top_opponents.csv"
                )
              }
            >
              Export CSV
            </Button>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart data={topOpponents}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="opponent"
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={60}
                  tick={{ fontSize: 11 }}
                />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar
                  dataKey="reports"
                  name="Reports"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Top Technique Tags ({rangeDays}d)</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                downloadCSV(topTags, ["tag", "count"], "top_tags.csv")
              }
            >
              Export CSV
            </Button>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart data={topTags}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="tag"
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={60}
                  tick={{ fontSize: 11 }}
                />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar
                  dataKey="count"
                  name="Mentions"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ---------- UI bits ---------- */
function KPI({ title, value }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-gray-600 dark:text-gray-300">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value ?? "-"}</div>
      </CardContent>
    </Card>
  );
}

function Funnel({ title, steps = [], footer }) {
  const step1 = steps?.[0]?.count ?? 0;
  const step2 = steps?.[1]?.count ?? 0;
  const pct = step1 ? Math.round((step2 / step1) * 100) : 0;

  return (
    <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
      <div className="text-lg font-semibold mb-3">{title}</div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-300">
              {steps?.[0]?.label || "Step 1"}
            </span>
            <span className="font-mono">{step1}</span>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full" />
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-300">
              {steps?.[1]?.label || "Step 2"}
            </span>
            <span className="font-mono">{step2}</span>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-3 bg-[var(--ms-light-red)]"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-3 text-sm text-gray-700 dark:text-gray-300">
        {footer || `Conversion: ${pct}%`}
      </div>
    </div>
  );
}

function RangeTabs({ current }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const setRange = (d) => {
    const next = new URLSearchParams(params?.toString() || "");
    next.set("range", String(d));
    router.push(`${pathname}?${next.toString()}`);
  };

  const Tab = ({ d }) => (
    <button
      onClick={() => setRange(d)}
      className={[
        "px-3 py-1 rounded-md border text-sm",
        d === current
          ? "bg-[var(--ms-light-red)] text-white border-transparent"
          : "bg-transparent border-gray-600 text-gray-200 hover:bg-gray-800",
      ].join(" ")}
    >
      {d}d
    </button>
  );

  return (
    <div className="flex gap-2">
      <Tab d={7} />
      <Tab d={30} />
      <Tab d={90} />
    </div>
  );
}

/* ---------- CSV helpers ---------- */
function toCSV(rows, headers) {
  const escape = (v) =>
    String(v ?? "")
      .replace(/"/g, '""')
      .replace(/\n/g, " ");
  const header = headers.join(",");
  const body = rows
    .map((r) => headers.map((h) => `"${escape(r[h])}"`).join(","))
    .join("\n");
  return `${header}\n${body}`;
}

function downloadCSV(rows, headers, filename) {
  try {
    const csv = toCSV(rows || [], headers);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch {}
}
