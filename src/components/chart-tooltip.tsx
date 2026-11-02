"use client";

import { formatHours, formatMoney } from "@/lib/format";

interface TooltipRow {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipRow[];
  label?: string | number;
  currency?: string;
  moneyKeys?: string[];
}

function formatValue(key: string, value: number, currency: string) {
  if (key === "income") return formatMoney(value, currency);
  if (key === "sport") return `${Math.round(value)} дн.`;
  return `${formatHours(value)} ч`;
}

export function ChartTooltip({
  active,
  payload,
  label,
  currency = "₽",
  moneyKeys = ["income"],
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="min-w-[148px] rounded-xl border border-line bg-[#17171A]/95 px-3 py-2.5 shadow-lift backdrop-blur">
      {label !== undefined && (
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
          {label}
        </div>
      )}
      <div className="flex flex-col gap-1">
        {payload.map((row, index) => {
          const key = String(row.dataKey ?? row.name ?? index);
          const raw = typeof row.value === "number" ? row.value : Number(row.value ?? 0);
          const color = row.color?.startsWith("url") ? "#D4A853" : row.color || "#D4A853";
          return (
            <div key={`${key}-${index}`} className="flex items-center gap-2 text-[12px]">
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-muted">{row.name}</span>
              <span className="num ml-auto pl-3 text-ink">
                {moneyKeys.includes(key)
                  ? formatMoney(raw, currency)
                  : formatValue(key, raw, currency)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
