"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SeriesPoint, Totals } from "@/lib/selectors";
import { ChartTooltip } from "@/components/chart-tooltip";
import { formatHours } from "@/lib/format";
import { CATEGORY_COLORS } from "@/lib/types";

export function IncomeArea({ data, currency }: { data: SeriesPoint[]; currency: string }) {
  return (
    <ResponsiveContainer width="100%" height={272}>
      <AreaChart data={data} margin={{ top: 12, right: 4, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="stats-income" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D4A853" stopOpacity={0.32} />
            <stop offset="70%" stopColor="#D4A853" stopOpacity={0.06} />
            <stop offset="100%" stopColor="#D4A853" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#262629" strokeOpacity={0.7} />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          dy={8}
          minTickGap={22}
          interval="preserveStartEnd"
          tick={{ fill: "#8A8A8E", fontSize: 10 }}
        />
        <YAxis hide domain={[0, "auto"]} />
        <Tooltip
          cursor={{ stroke: "#3A3A3F", strokeWidth: 1 }}
          content={<ChartTooltip currency={currency} />}
        />
        <Area
          type="monotone"
          dataKey="income"
          name="Доход"
          stroke="#D4A853"
          strokeWidth={1.7}
          fill="url(#stats-income)"
          dot={false}
          activeDot={{ r: 3.5, fill: "#D4A853", stroke: "#0A0A0B", strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function HoursStacked({ data, currency }: { data: SeriesPoint[]; currency: string }) {
  return (
    <ResponsiveContainer width="100%" height={244}>
      <BarChart data={data} margin={{ top: 10, right: 2, left: 2, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke="#262629" strokeOpacity={0.7} />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          dy={8}
          minTickGap={18}
          interval="preserveStartEnd"
          tick={{ fill: "#8A8A8E", fontSize: 10 }}
        />
        <YAxis hide />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.035)", radius: 6 }}
          content={<ChartTooltip currency={currency} />}
        />
        <Bar
          dataKey="work"
          name="Работа"
          stackId="hours"
          fill={CATEGORY_COLORS.work}
          maxBarSize={34}
          isAnimationActive={false}
        />
        <Bar
          dataKey="study"
          name="Учёба"
          stackId="hours"
          fill={CATEGORY_COLORS.study}
          maxBarSize={34}
          isAnimationActive={false}
        />
        <Bar
          dataKey="youtube"
          name="YouTube"
          stackId="hours"
          fill={CATEGORY_COLORS.youtube}
          radius={[4, 4, 0, 0]}
          maxBarSize={34}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryDonut({ totals }: { totals: Totals }) {
  const data = [
    { name: "Работа", value: totals.workHours, color: CATEGORY_COLORS.work },
    { name: "Учёба", value: totals.studyHours, color: CATEGORY_COLORS.study },
    { name: "YouTube", value: totals.youtubeHours, color: CATEGORY_COLORS.youtube },
  ].filter((item) => item.value > 0);

  const total = totals.totalHours;

  if (total <= 0) {
    return (
      <div className="flex h-[236px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-line/60">
        <span className="text-[12px] text-muted">Пока нет часов за период</span>
        <span className="text-[10px] text-muted/70">Заполни день, чтобы увидеть распределение</span>
      </div>
    );
  }

  return (
    <div>
      <div className="relative h-[196px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="64%"
              outerRadius="92%"
              paddingAngle={2}
              stroke="none"
              startAngle={90}
              endAngle={-270}
              isAnimationActive={false}
            >
              {data.map((item) => (
                <Cell key={item.name} fill={item.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="num text-[26px] font-semibold leading-none text-ink">
            {formatHours(total)}
          </span>
          <span className="mt-1 text-[10px] uppercase tracking-wide text-muted">часов</span>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {data.map((item) => {
          const percent = Math.round((item.value / total) * 100);
          return (
            <div key={item.name} className="flex items-center gap-2 text-[11px]">
              <span
                className="size-1.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-muted">{item.name}</span>
              <span className="num ml-auto text-ink">{formatHours(item.value)} ч</span>
              <span className="num w-8 text-right text-muted">{percent}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
