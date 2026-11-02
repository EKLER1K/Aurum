"use client";

import { useMemo, useState } from "react";
import {
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfMonth,
} from "date-fns";
import { ru } from "date-fns/locale";
import {
  ArrowDownUp,
  Check,
  Clock3,
  Dumbbell,
  Flame,
  GraduationCap,
  Plus,
  Wallet,
  Youtube,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import {
  capitalize,
  dayLabel,
  formatHours,
  formatMoney,
  monthLabel,
  monthOf,
  toISO,
  todayISO,
  weekdayLong,
} from "@/lib/format";
import {
  entryIncome,
  getMonthEntries,
  getTotals,
  monthOptions,
  monthTotals,
  streakAt,
} from "@/lib/selectors";
import { useAppStore } from "@/lib/store";
import { useUiStore } from "@/lib/ui-store";
import type { Category, DayEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

type SortMode = "date-desc" | "date-asc" | "income-desc" | "income-asc";
type CategoryFilter = "all" | Category;

interface Row {
  date: string;
  entry: DayEntry | null;
}

const CATEGORY_OPTIONS: Array<{ value: CategoryFilter; label: string }> = [
  { value: "all", label: "Все категории" },
  { value: "work", label: "Работа" },
  { value: "study", label: "Учёба" },
  { value: "youtube", label: "YouTube" },
  { value: "sport", label: "Спорт" },
];

const SORT_OPTIONS: Array<{ value: SortMode; label: string }> = [
  { value: "date-desc", label: "Сначала новые" },
  { value: "date-asc", label: "Сначала старые" },
  { value: "income-desc", label: "Доход ↓" },
  { value: "income-asc", label: "Доход ↑" },
];

function matchesCategory(entry: DayEntry, category: CategoryFilter) {
  if (category === "all") return true;
  if (category === "work") return entry.workHours > 0 || entry.workIncome > 0;
  if (category === "study") return entry.studyHours > 0;
  if (category === "youtube") return entry.youtubeHours > 0 || entry.youtubeIncome > 0;
  return entry.sportDone;
}

export default function LogPage() {
  const entries = useAppStore((state) => state.entries);
  const settings = useAppStore((state) => state.settings);
  const openEditor = useUiStore((state) => state.openEditor);

  const today = todayISO();
  const firstEntry = Object.keys(entries).sort()[0];
  const earliest = firstEntry && firstEntry < settings.trackingStartDate ? firstEntry : settings.trackingStartDate;
  const months = monthOptions(earliest, today);

  const [month, setMonth] = useState(() => monthOf(today));
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [sort, setSort] = useState<SortMode>("date-desc");

  const activeMonth = months.includes(month) ? month : months[0] ?? monthOf(today);
  const monthStart = startOfMonth(parseISO(`${activeMonth}-01`));
  const monthEnd = endOfMonth(monthStart);
  const todayDate = parseISO(today);
  const trackedStart = parseISO(earliest);

  const rows = useMemo<Row[]>(() => {
    const from = isAfter(trackedStart, monthStart) ? trackedStart : monthStart;
    const to = isBefore(monthEnd, todayDate) ? monthEnd : todayDate;
    if (isAfter(from, to)) return [];

    const days = eachDayOfInterval({ start: from, end: to });
    const list: Row[] = days.map((day) => {
      const date = toISO(day);
      return { date, entry: entries[date] ?? null };
    });

    const filtered = list.filter((row) => {
      if (category === "all") return true;
      return row.entry ? matchesCategory(row.entry, category) : false;
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sort === "date-desc") return a.date < b.date ? 1 : -1;
      if (sort === "date-asc") return a.date < b.date ? -1 : 1;
      const incomeA = a.entry ? entryIncome(a.entry) : 0;
      const incomeB = b.entry ? entryIncome(b.entry) : 0;
      return sort === "income-desc" ? incomeB - incomeA : incomeA - incomeB;
    });
    return sorted;
  }, [entries, activeMonth, monthStart, monthEnd, todayDate, trackedStart, category, sort]);

  const totals = monthTotals(entries, activeMonth);
  const monthEntries = getMonthEntries(entries, activeMonth);
  const daysTracked = monthEntries.length;
  const rangeStart = isAfter(trackedStart, monthStart) ? trackedStart : monthStart;
  const rangeEnd = isBefore(monthEnd, todayDate) ? monthEnd : todayDate;
  const daysInMonthSoFar = isAfter(rangeStart, rangeEnd)
    ? 0
    : differenceInCalendarDays(rangeEnd, rangeStart) + 1;

  const filledPercent =
    daysInMonthSoFar > 0 ? Math.round((daysTracked / daysInMonthSoFar) * 100) : 0;

  const sportMonth = getTotals(monthEntries).sportDays;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Журнал"
        title="Каждый день на виду"
        description="Все записи, часы и деньги. Пустые дни подсвечены — видно, где остались дыры."
        actions={
          <Button variant="primary" onClick={() => openEditor(today)}>
            <Plus className="size-4" />
            Добавить запись
          </Button>
        }
      />

      <Card className="grid grid-cols-2 divide-line/60 sm:grid-cols-4 sm:divide-x">
        <div className="p-4">
          <div className="label-micro flex items-center gap-1.5">
            <Wallet className="size-3 text-gold" strokeWidth={1.5} /> Доход месяца
          </div>
          <div className="num mt-1.5 text-[20px] font-semibold text-gold">
            {formatMoney(totals.income, settings.currency)}
          </div>
        </div>
        <div className="p-4">
          <div className="label-micro flex items-center gap-1.5">
            <Check className="size-3 text-success" strokeWidth={1.5} /> Заполнено
          </div>
          <div className="num mt-1.5 text-[20px] font-semibold text-ink">
            {daysTracked}
            <span className="text-[12px] font-normal text-muted"> / {daysInMonthSoFar}</span>
          </div>
        </div>
        <div className="p-4">
          <div className="label-micro flex items-center gap-1.5">
            <Clock3 className="size-3 text-azure" strokeWidth={1.5} /> Часов
          </div>
          <div className="num mt-1.5 text-[20px] font-semibold text-ink">
            {formatHours(totals.totalHours)}
          </div>
        </div>
        <div className="p-4">
          <div className="label-micro flex items-center gap-1.5">
            <Dumbbell className="size-3 text-success" strokeWidth={1.5} /> Спорт
          </div>
          <div className="num mt-1.5 text-[20px] font-semibold text-ink">
            {sportMonth}
            <span className="text-[12px] font-normal text-muted"> дн.</span>
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <Select
            value={activeMonth}
            onChange={(event) => setMonth(event.target.value)}
            className="w-full sm:w-[190px]"
            aria-label="Месяц"
          >
            {months.map((option) => (
              <option key={option} value={option}>
                {capitalize(monthLabel(option))}
              </option>
            ))}
          </Select>
          <Select
            value={category}
            onChange={(event) => setCategory(event.target.value as CategoryFilter)}
            className="w-full sm:w-[170px]"
            aria-label="Категория"
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortMode)}
            className="w-full sm:w-[160px]"
            aria-label="Сортировка"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted">
          <ArrowDownUp className="size-3.5" strokeWidth={1.5} />
          <span>
            Заполнено{" "}
            <span className={cn("num", filledPercent >= 70 ? "text-success" : "text-ink")}>
              {filledPercent}%
            </span>{" "}
            месяца
          </span>
        </div>
      </div>

      {/* Desktop table */}
      <Card className="hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-line/60 bg-raised/30">
                <th className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-wider text-muted">
                  Дата
                </th>
                <th className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-wider text-muted">
                  Работа
                </th>
                <th className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-wider text-muted">
                  Учёба
                </th>
                <th className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-wider text-muted">
                  YouTube
                </th>
                <th className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-wider text-muted">
                  Спорт
                </th>
                <th className="px-4 py-2.5 text-right text-[10px] font-medium uppercase tracking-wider text-muted">
                  Итого
                </th>
                <th className="px-4 py-2.5 text-right text-[10px] font-medium uppercase tracking-wider text-muted">
                  Стрик
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ date, entry }) => {
                const streak = entry ? streakAt(entries, date) : 0;
                const isToday = date === today;
                return (
                  <tr
                    key={date}
                    onClick={() => openEditor(date)}
                    className={cn(
                      "group cursor-pointer border-b border-line/40 transition-colors last:border-0 hover:bg-hover/40",
                      !entry && "bg-bg/20",
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex size-9 flex-col items-center justify-center rounded-lg border text-center",
                            entry
                              ? "border-line bg-raised"
                              : "border-dashed border-line/70 bg-transparent",
                          )}
                        >
                          <span
                            className={cn(
                              "num text-[13px] font-medium leading-none",
                              entry ? "text-ink" : "text-muted",
                            )}
                          >
                            {format(parseISO(date), "d")}
                          </span>
                        </div>
                        <div className="leading-tight">
                          <div className="text-[12px] font-medium text-ink">
                            {capitalize(dayLabel(date, "d MMMM"))}
                            {isToday && (
                              <span className="ml-2 text-[9px] uppercase tracking-wide text-gold">
                                сегодня
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] uppercase tracking-wide text-muted">
                            {weekdayLong(date)}
                          </div>
                        </div>
                      </div>
                    </td>

                    {entry ? (
                      <>
                        <td className="px-4 py-3">
                          <div className="num text-[12px] text-ink">{formatHours(entry.workHours)} ч</div>
                          <div className="num text-[10px] text-gold">
                            {formatMoney(entry.workIncome, settings.currency)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="num text-[12px] text-ink">{formatHours(entry.studyHours)} ч</div>
                          <div className="text-[10px] text-muted">учёба</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="num text-[12px] text-ink">{formatHours(entry.youtubeHours)} ч</div>
                          <div className="num text-[10px] text-gold">
                            {formatMoney(entry.youtubeIncome, settings.currency)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {entry.sportDone ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-success">
                              <Check className="size-3.5" strokeWidth={2} /> был
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted/60">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="num text-[13px] font-medium text-gold">
                            {formatMoney(entryIncome(entry), settings.currency)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {streak > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted">
                              <Flame className="size-3.5 text-gold" strokeWidth={1.5} />
                              <span className="num text-ink">{streak}</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted/50">—</span>
                          )}
                        </td>
                      </>
                    ) : (
                      <td colSpan={6} className="px-4 py-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted/70">не заполнено</span>
                          <span className="text-[11px] text-muted opacity-0 transition-opacity group-hover:opacity-100">
                            + Заполнить
                          </span>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <p className="text-[13px] text-ink">Нет дней по этому фильтру</p>
            <p className="text-[11px] text-muted">Смени месяц или категорию.</p>
          </div>
        )}
      </Card>

      {/* Mobile cards */}
      <div className="flex flex-col gap-2 md:hidden">
        {rows.map(({ date, entry }) => {
          const streak = entry ? streakAt(entries, date) : 0;
          return (
            <button
              key={date}
              type="button"
              onClick={() => openEditor(date)}
              className={cn(
                "w-full rounded-xl border p-3.5 text-left transition-colors",
                entry
                  ? "border-line/80 bg-card hover:bg-hover/40"
                  : "border-dashed border-line/60 bg-transparent",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[13px] font-medium text-ink">
                    {capitalize(dayLabel(date, "d MMMM"))}
                    {date === today && (
                      <span className="text-[9px] uppercase tracking-wide text-gold">сегодня</span>
                    )}
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-muted">
                    {weekdayLong(date)}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {entry ? (
                    <>
                      <div className="num text-[14px] font-medium text-gold">
                        {formatMoney(entryIncome(entry), settings.currency)}
                      </div>
                      {streak > 0 && (
                        <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-muted">
                          <Flame className="size-3 text-gold" strokeWidth={1.5} />
                          <span className="num">{streak}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-[11px] text-muted">не заполнено</span>
                  )}
                </div>
              </div>

              {entry && (
                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-line/40 pt-2.5 text-[11px] text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="size-3 text-gold" strokeWidth={1.5} />
                    <span className="num text-ink">{formatHours(entry.workHours)}</span> ч
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <GraduationCap className="size-3 text-azure" strokeWidth={1.5} />
                    <span className="num text-ink">{formatHours(entry.studyHours)}</span> ч
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Youtube className="size-3 text-[#8FB8A8]" strokeWidth={1.5} />
                    <span className="num text-ink">{formatHours(entry.youtubeHours)}</span> ч
                  </span>
                  {entry.sportDone && (
                    <span className="inline-flex items-center gap-1 text-success">
                      <Dumbbell className="size-3" strokeWidth={1.5} /> спорт
                    </span>
                  )}
                  {!entry.sportDone && !entry.workHours && !entry.studyHours && !entry.youtubeHours && (
                    <span className="text-muted/60">отметка без часов</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
        {rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-line py-10 text-center text-[12px] text-muted">
            Нет дней по этому фильтру
          </div>
        )}
      </div>

      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-[11px] text-muted">
          <Badge variant="outline">{rows.length} строк</Badge>
          <span>Клик по строке — редактирование записи</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted">Ключ быстрого заполнения</span>
          <kbd className="rounded border border-line bg-raised px-2 py-1 text-[10px]">N</kbd>
        </div>
      </Card>
    </div>
  );
}
