"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarCheck,
  CalendarX,
  Clock3,
  Crown,
  Dumbbell,
  Minus,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { PageHeader } from "@/components/page-header";
import { CategoryDonut, HoursStacked, IncomeArea } from "@/components/stats-charts";
import { capitalize, dayLabel, formatHours, formatMoney, formatPercent, todayISO } from "@/lib/format";
import {
  averageIncomePerHour,
  bestDay,
  daysElapsed,
  entryIncome,
  entriesInRange,
  getTotals,
  missedDays,
  percentChange,
  periodRange,
  statsSeries,
  type Period,
} from "@/lib/selectors";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

function Delta({ value, className }: { value: number | null; className?: string }) {
  if (value === null) {
    return <span className={cn("text-[10px] text-muted", className)}>новое</span>;
  }
  if (Math.abs(value) < 0.5) {
    return (
      <span className={cn("inline-flex items-center gap-0.5 text-[10px] text-muted", className)}>
        <Minus className="size-3" strokeWidth={1.8} /> 0%
      </span>
    );
  }
  const positive = value > 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[10px] font-medium",
        positive ? "text-success" : "text-danger",
        className,
      )}
    >
      <Icon className="size-3" strokeWidth={2} />
      {formatPercent(Math.abs(value), 0)}
    </span>
  );
}

function MetricCard({
  label,
  value,
  sub,
  icon,
  delta,
  tone = "default",
  delay,
}: {
  label: string;
  value: string;
  sub: React.ReactNode;
  icon: React.ReactNode;
  delta?: number | null;
  tone?: "default" | "gold" | "azure";
  delay?: number;
}) {
  return (
    <Card
      className="animate-fade-up p-4"
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="label-micro truncate">{label}</span>
        <span className="shrink-0 text-muted">{icon}</span>
      </div>
      <div
        className={cn(
          "num mt-2 truncate text-[23px] font-semibold leading-none tracking-tight",
          tone === "gold" ? "text-gold" : tone === "azure" ? "text-azure" : "text-ink",
        )}
      >
        {value}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted">
        {delta !== undefined && <Delta value={delta} />}
        <span className="truncate">{sub}</span>
      </div>
    </Card>
  );
}

function CompareItem({
  label,
  current,
  previous,
  format,
}: {
  label: string;
  current: number;
  previous: number | null;
  format: (value: number) => string;
}) {
  const change = previous === null ? null : percentChange(current, previous);
  return (
    <div className="flex min-w-[120px] flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wide text-muted">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="num text-[17px] font-medium text-ink">{format(current)}</span>
        <Delta value={change} />
      </div>
      <span className="text-[10px] text-muted/70">
        {previous === null ? "нет прошлого периода" : `было ${format(previous)}`}
      </span>
    </div>
  );
}

export default function StatsPage() {
  const entries = useAppStore((state) => state.entries);
  const settings = useAppStore((state) => state.settings);

  const [period, setPeriod] = useState<Period>("month");
  const today = todayISO();

  const range = useMemo(
    () => periodRange(period, settings.trackingStartDate, today),
    [period, settings.trackingStartDate, today],
  );

  const currentEntries = useMemo(
    () => entriesInRange(entries, range.start, today < range.end ? today : range.end),
    [entries, range.start, range.end, today],
  );
  const previousEntries = useMemo(
    () =>
      range.prevStart && range.prevEnd
        ? entriesInRange(entries, range.prevStart, range.prevEnd)
        : [],
    [entries, range.prevStart, range.prevEnd],
  );

  const current = useMemo(() => getTotals(currentEntries), [currentEntries]);
  const previous = range.prevStart ? getTotals(previousEntries) : null;
  const series = useMemo(() => statsSeries(entries, period, range, today), [entries, period, range, today]);

  const best = useMemo(
    () => bestDay(Object.fromEntries(currentEntries.map((entry) => [entry.date, entry]))),
    [currentEntries],
  );

  const elapsed = daysElapsed(range.start, range.end, today);
  const missed = missedDays(entries, range.start, range.end, today);
  const avgIncomePerDay = current.filledDays > 0 ? current.income / current.filledDays : 0;
  const avgPerHour = averageIncomePerHour(current);

  const goal = useAppStore((state) => state.goals[range.start.slice(0, 7)]);
  const goalPercent =
    goal && goal.incomeGoal > 0 ? Math.round((current.income / goal.incomeGoal) * 100) : 0;

  const currency = settings.currency;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Аналитика"
        title="Цифры без самообмана"
        description="Доход, часы и дисциплина за выбранный период — с сравнением к прошлому."
        actions={
          <Segmented
            size="md"
            value={period}
            onChange={(value) => setPeriod(value)}
            options={[
              { value: "week", label: "Неделя" },
              { value: "month", label: "Месяц" },
              { value: "year", label: "Год" },
              { value: "all", label: "Всё время" },
            ]}
            className="w-full justify-between sm:w-auto"
          />
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <MetricCard
          label="Заполнено"
          value={String(current.filledDays)}
          icon={<CalendarCheck className="size-3.5" strokeWidth={1.5} />}
          delta={previous ? percentChange(current.filledDays, previous.filledDays) : undefined}
          sub={`из ${elapsed} дней периода`}
          delay={0}
        />
        <MetricCard
          label="Пропущено"
          value={String(missed)}
          icon={<CalendarX className="size-3.5" strokeWidth={1.5} />}
          sub="дней без записи"
          delay={30}
        />
        <MetricCard
          label="Средний / день"
          value={formatMoney(avgIncomePerDay, currency)}
          icon={<Wallet className="size-3.5" strokeWidth={1.5} />}
          delta={previous ? percentChange(avgIncomePerDay, previous.filledDays > 0 ? previous.income / previous.filledDays : 0) : undefined}
          sub="по заполненным дням"
          delay={60}
        />
        <MetricCard
          label="Средний / час"
          value={formatMoney(avgPerHour, currency)}
          icon={<Clock3 className="size-3.5" strokeWidth={1.5} />}
          sub={`${formatHours(current.workHours + current.youtubeHours)} оплаченных ч`}
          delay={90}
        />
        <MetricCard
          label="Лучший день"
          value={best ? formatMoney(entryIncome(best), currency) : "—"}
          icon={<Crown className="size-3.5 text-gold" strokeWidth={1.5} />}
          tone="gold"
          sub={best ? `${capitalize(dayLabel(best.date, "d MMMM"))} · ${formatHours(best.workHours + best.studyHours + best.youtubeHours)} ч` : "пока нет данных"}
          delay={120}
        />
      </div>

      <Card className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-3.5 text-azure" strokeWidth={1.5} />
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
            Сравнение с прошлым периодом
          </span>
        </div>

        {previous ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-7">
            <CompareItem
              label="Доход"
              current={current.income}
              previous={previous.income}
              format={(value) => formatMoney(value, currency)}
            />
            <CompareItem
              label="Часы"
              current={current.totalHours}
              previous={previous.totalHours}
              format={(value) => `${formatHours(value)} ч`}
            />
            <CompareItem
              label="Спорт"
              current={current.sportDays}
              previous={previous.sportDays}
              format={(value) => `${value} дн.`}
            />
            <CompareItem
              label="Дней заполнено"
              current={current.filledDays}
              previous={previous.filledDays}
              format={(value) => String(value)}
            />
          </div>
        ) : (
          <div className="text-[11px] text-muted">
            {period === "all"
              ? "Для «Всё время» сравнение не нужно — это вся история."
              : "За прошлый период пока нет данных."}
          </div>
        )}
      </Card>

      <Card className="animate-fade-up overflow-hidden">
        <div className="flex flex-col gap-2 px-5 pb-1 pt-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Wallet className="size-4 text-gold" strokeWidth={1.5} />
              <h2 className="text-[15px] font-medium tracking-tight">Доход</h2>
            </div>
            <p className="mt-0.5 text-[11px] text-muted">
              {capitalize(range.label)} ·{" "}
              <span className="num text-gold">{formatMoney(current.income, currency)}</span> всего
            </p>
          </div>
          {period === "month" && goal && goal.incomeGoal > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-line/70 bg-raised/50 px-3 py-1.5">
              <Target className="size-3.5 text-muted" strokeWidth={1.5} />
              <span className="text-[10px] text-muted">Цель</span>
              <span className="num text-[11px] text-ink">{goalPercent}%</span>
            </div>
          )}
        </div>
        <div className="px-3 pb-4 pt-3 sm:px-4">
          <IncomeArea data={series} currency={currency} />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card className="animate-fade-up overflow-hidden">
          <div className="flex flex-col gap-2 px-5 pb-0 pt-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-[15px] font-medium tracking-tight">Часы по категориям</h2>
              <p className="mt-0.5 text-[11px] text-muted">
                Работа, учёба и YouTube ·{" "}
                <span className="num text-ink">{formatHours(current.totalHours)} ч</span>
              </p>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted">
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-gold" /> работа
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-azure" /> учёба
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-[#8FB8A8]" /> youtube
              </span>
            </div>
          </div>
          <div className="px-3 pb-4 pt-3 sm:px-4">
            <HoursStacked data={series} currency={currency} />
          </div>
        </Card>

        <Card className="animate-fade-up overflow-hidden">
          <div className="px-5 pb-0 pt-5">
            <h2 className="text-[15px] font-medium tracking-tight">Распределение времени</h2>
            <p className="mt-0.5 text-[11px] text-muted">
              Спорт: <span className="num text-ink">{current.sportDays}</span> дн. за период
            </p>
          </div>
          <div className="px-5 pb-5 pt-2">
            <CategoryDonut totals={current} />
          </div>
        </Card>
      </div>

      {current.filledDays === 0 && (
        <Card className="flex flex-col items-center gap-2 p-8 text-center">
          <Dumbbell className="size-5 text-muted" strokeWidth={1.5} />
          <p className="text-[13px] text-ink">За этот период нет записей</p>
          <p className="max-w-sm text-[11px] leading-relaxed text-muted">
            Выбери другой период или заполни день — аналитика построится автоматически.
          </p>
        </Card>
      )}
    </div>
  );
}
