// components/admin/reports/ReportsDashboard.jsx
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

/**
 * Reports dashboard: charts, funnels, tables, exports, and deep-links.
 */
export default function ReportsDashboard({ data }) {
  const router = useRouter();

  const {
    generatedAt,
    rangeDays,
    kpis: {
      newUsers7,
      newMatches7,
      newScouts7,
      totalTeams,
      pctWithin7,
      medianDays,
    },
    series: { matchSeries = [], scoutSeries = [] },
    tables: { winLossByStyle = [], topOpponents = [], topTags = [] },
    funnels,
  } = data || {};

  const lastUpdatedLocal = generatedAt
    ? new Date(generatedAt).toLocaleString()
    : "";

  // --- Transform series so we get a thin baseline for Total, and no double baseline for Public ---
  const matchSeriesForChart = matchSeries.map((d) => ({
    ...d,
    count: d.count ?? 0, // draw zeros -> thin baseline
    public: (d.public ?? 0) > 0 ? d.public : null, // hide public when zero so it doesn't overlap baseline
  }));
  const scoutSeriesForChart = scoutSeries.map((d) => ({
    ...d,
    count: d.count ?? 0, // thin baseline
  }));
  const hasPublic = matchSeries.some((d) => (d.public ?? 0) > 0);

  // --- Deep-link helpers ---
  const goToMatchesForStyle = (styleName) =>
    styleName &&
    router.push(
      `/admin/reports/matches?style=${encodeURIComponent(styleName)}`
    );
  const goToScoutingForOpponent = (opponent) =>
    opponent &&
    router.push(
      `/admin/reports/scouting?opponent=${encodeURIComponent(opponent)}`
    );
  const goToScoutingForTag = (tag) =>
    tag &&
    router.push(`/admin/reports/scouting?tag=${encodeURIComponent(tag)}`);

  const onStyleBarClick = (arg) => goToMatchesForStyle(arg?.payload?.styleName);
  const onOpponentBarClick = (arg) =>
    goToScoutingForOpponent(arg?.payload?.opponent);
  const onTagBarClick = (arg) => goToScoutingForTag(arg?.payload?.tag);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          {lastUpdatedLocal && (
            <p className="text-xs text-gray-500 mt-1">
              Last updated: {lastUpdatedLocal} (cached up to 60s)
            </p>
          )}
        </div>
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
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart data={matchSeriesForChart}>
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
                    connectNulls={false}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 4 }}
                  />
                  {hasPublic && (
                    <Line
                      type="monotone"
                      dataKey="public"
                      name="Public"
                      // public is null when zero, so it won't sit on baseline
                      connectNulls={false}
                      strokeWidth={2}
                      strokeDasharray="4 3"
                      dot={{ r: 0 }}
                      activeDot={{ r: 3 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scouting Reports (Last {rangeDays} days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart data={scoutSeriesForChart}>
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
                    connectNulls={false}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
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
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Win / Loss by Style</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              downloadCSV(
                winLossByStyle,
                ["styleName", "wins", "losses", "total", "winRate"],
                "win_loss_by_style.csv"
              )
            }
          >
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={winLossByStyle}
                margin={{ top: 8, right: 8, left: 0, bottom: 16 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="styleName"
                  tick={{ fontSize: 12 }}
                  interval={0}
                  tickMargin={10}
                />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="wins"
                  name="Wins"
                  onClick={onStyleBarClick}
                  style={{ cursor: "pointer" }}
                />
                <Bar
                  dataKey="losses"
                  name="Losses"
                  onClick={onStyleBarClick}
                  style={{ cursor: "pointer" }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Inline, wrapable summary pairs */}
          <div className="mt-3 text-sm">
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {winLossByStyle.map((row) => {
                const pct = Math.round((row.winRate || 0) * 100);
                return (
                  <button
                    key={row.styleName}
                    onClick={() => goToMatchesForStyle(row.styleName)}
                    className="inline-flex items-center gap-2 hover:underline"
                    title="View matches with this style"
                  >
                    <span className="font-medium">{row.styleName}</span>
                    <span className="text-gray-600 dark:text-gray-300">
                      {row.wins}/{row.total} wins ({pct}%)
                    </span>
                  </button>
                );
              })}
            </div>
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
                  onClick={onOpponentBarClick}
                  style={{ cursor: "pointer" }}
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
                  onClick={onTagBarClick}
                  style={{ cursor: "pointer" }}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ======================= UI bits ======================= */

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
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`);
  };

  const Opt = ({ d }) => {
    const active = d === current;
    return (
      <button
        onClick={() => setRange(d)}
        className={[
          "px-3 py-1 rounded-md border text-sm",
          active
            ? "bg-[var(--ms-light-red)] text-white border-transparent"
            : "bg-transparent border-gray-600 text-gray-200 hover:bg-gray-800",
        ].join(" ")}
        aria-pressed={active}
      >
        {d}d
      </button>
    );
  };

  return (
    <div className="flex gap-2">
      <Opt d={7} />
      <Opt d={30} />
      <Opt d={90} />
      <Opt d={180} />
      <Opt d={365} />
    </div>
  );
}

/* ======================= CSV helpers ======================= */

function toCSV(rows, headers) {
  const escape = (v) =>
    String(v ?? "")
      .replace(/"/g, '""')
      .replace(/\n/g, " ");
  const header = headers.join(",");
  const body = (rows || [])
    .map((r) => headers.map((h) => `"${escape(r[h])}"`).join(","))
    .join("\n");
  return `${header}\n${body}`;
}

function downloadCSV(rows, headers, filename) {
  try {
    const csv = toCSV(rows, headers);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    // no-op
  }
}
