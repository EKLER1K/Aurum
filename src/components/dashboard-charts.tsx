"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Bucket } from "@/lib/selectors";
import { ChartTooltip } from "@/components/chart-tooltip";

export function WeeklySparkline({
  data,
}: {
  data: Array<{ key: string; label: string; hours: number; future: boolean }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={54}>
      <AreaChart data={data} margin={{ top: 6, right: 2, left: 2, bottom: 0 }}>
        <defs>
          <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5B7FFF" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#5B7FFF" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="hours"
          stroke="#5B7FFF"
          strokeWidth={1.5}
          fill="url(#spark-fill)"
          dot={false}
          activeDot={{ r: 3, fill: "#5B7FFF", stroke: "#0A0A0B", strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function IncomeBars({
  data,
  currency,
}: {
  data: Bucket[];
  currency: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={248}>
      <BarChart data={data} margin={{ top: 12, right: 2, left: 2, bottom: 0 }} barCategoryGap="26%">
        <defs>
          <linearGradient id="income-bar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EBD08F" stopOpacity={0.98} />
            <stop offset="55%" stopColor="#D4A853" stopOpacity={0.72} />
            <stop offset="100%" stopColor="#8F6E2E" stopOpacity={0.22} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#262629" strokeOpacity={0.7} />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          dy={8}
          interval="preserveStartEnd"
          tick={{ fill: "#8A8A8E", fontSize: 10 }}
        />
        <YAxis hide domain={[0, "auto"]} />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.035)", radius: 6 }}
          content={<ChartTooltip currency={currency} />}
        />
        <Bar
          dataKey="income"
          name="Доход"
          fill="url(#income-bar)"
          radius={[5, 5, 2, 2]}
          maxBarSize={38}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
