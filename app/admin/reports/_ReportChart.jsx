"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export default function ReportChart({ rows }) {
  const axisTick = { fill: "currentColor", fontSize: 12 };
  const gridStroke = "currentColor";

  // recharts expects array of { date, count }
  return (
    <ResponsiveContainer
      width="100%"
      height="100%"
    >
      <LineChart
        data={rows}
        margin={{ left: 8, right: 8 }}
      >
        <CartesianGrid
          stroke={gridStroke}
          strokeOpacity={0.15}
        />
        <XAxis
          dataKey="date"
          tick={axisTick}
          minTickGap={16}
          tickMargin={8}
        />
        <YAxis
          tick={axisTick}
          width={40}
        />
        <Tooltip
          contentStyle={{ background: "var(--tooltip-bg, #fff)" }}
          formatter={(v) => Number(v).toLocaleString()}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="count"
          name="Count"
          stroke="currentColor"
          strokeWidth={2.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
