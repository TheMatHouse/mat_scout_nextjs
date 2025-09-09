"use client";

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

export default function AnalyticsCharts({
  compare,
  trafficChartData,
  pagesChartData,
  devicesChartData,
  refChartData,
  geoChartData,
  truncate,
}) {
  // Container text color drives all chart strokes via 'currentColor'
  const chartWrap = "h-72 p-3 text-neutral-700 dark:text-neutral-300";
  const axisTick = { fill: "currentColor", fontSize: 12 };
  const gridStroke = "currentColor";

  return (
    <>
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold">Traffic</h2>
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
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
                {/* current period */}
                <Line
                  type="monotone"
                  dataKey="users"
                  name="Users"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="views"
                  name="Views"
                  stroke="currentColor"
                  strokeDasharray="4 3"
                  strokeWidth={1.5}
                  dot={false}
                />
                {/* previous period (faded + different dash) */}
                {compare && (
                  <>
                    <Line
                      type="monotone"
                      dataKey="usersPrev"
                      name="Users (prev)"
                      stroke="currentColor"
                      strokeOpacity={0.5}
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="viewsPrev"
                      name="Views (prev)"
                      stroke="currentColor"
                      strokeOpacity={0.5}
                      strokeDasharray="2 4"
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-semibold">Top Pages</h2>
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
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
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-semibold">Devices</h2>
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <div className={`rounded-2xl ${chartWrap}`}>
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
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
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-semibold">Top Referrers</h2>
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
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
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-semibold">Top Countries</h2>
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <div className={`rounded-2xl ${chartWrap}`}>
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={geoChartData}
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
                    width={110}
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
          </div>
        </section>
      </div>
    </>
  );
}
