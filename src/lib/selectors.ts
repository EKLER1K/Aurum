import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  getDaysInMonth,
  isAfter,
  isBefore,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import { ru } from "date-fns/locale";
import type { AppData, DayEntry, GoalDef, MonthGoal } from "./types";
import { fromISO, monthOf, monthShort, toISO, todayISO } from "./format";
import { isHourGoal } from "./goals";

export type Period = "week" | "month" | "year" | "all";

export interface Totals {
  income: number;
  workIncome: number;
  youtubeIncome: number;
  workHours: number;
  studyHours: number;
  youtubeHours: number;
  totalHours: number;
  sportDays: number;
  filledDays: number;
}

export const EMPTY_TOTALS: Totals = {
  income: 0,
  workIncome: 0,
  youtubeIncome: 0,
  workHours: 0,
  studyHours: 0,
  youtubeHours: 0,
  totalHours: 0,
  sportDays: 0,
  filledDays: 0,
};

export function entryIncome(entry: DayEntry) {
  return (entry.workIncome || 0) + (entry.youtubeIncome || 0);
}

export function entryHours(entry: DayEntry) {
  return (entry.workHours || 0) + (entry.studyHours || 0) + (entry.youtubeHours || 0);
}

export function getTotals(entries: DayEntry[]): Totals {
  return entries.reduce<Totals>(
    (acc, entry) => {
      acc.income += entryIncome(entry);
      acc.workIncome += entry.workIncome || 0;
      acc.youtubeIncome += entry.youtubeIncome || 0;
      acc.workHours += entry.workHours || 0;
      acc.studyHours += entry.studyHours || 0;
      acc.youtubeHours += entry.youtubeHours || 0;
      acc.totalHours += entryHours(entry);
      acc.sportDays += entry.sportDone ? 1 : 0;
      acc.filledDays += 1;
      return acc;
    },
    { ...EMPTY_TOTALS },
  );
}

export function entriesList(entries: Record<string, DayEntry>) {
  return Object.values(entries).sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function entriesInRange(
  entries: Record<string, DayEntry>,
  start: string,
  end: string,
): DayEntry[] {
  return entriesList(entries).filter((entry) => entry.date >= start && entry.date <= end);
}

export function getMonthEntries(entries: Record<string, DayEntry>, month: string) {
  return entriesList(entries).filter((entry) => entry.date.startsWith(month));
}

export function monthTotals(entries: Record<string, DayEntry>, month: string) {
  return getTotals(getMonthEntries(entries, month));
}

/** Number of consecutive filled days ending today or yesterday. */
export function calcStreak(
  entries: Record<string, DayEntry>,
  today = todayISO(),
): number {
  let cursor = fromISO(today);
  if (!entries[toISO(cursor)]) {
    cursor = subDays(cursor, 1);
    if (!entries[toISO(cursor)]) return 0;
  }
  let streak = 0;
  while (entries[toISO(cursor)]) {
    streak += 1;
    cursor = subDays(cursor, 1);
  }
  return streak;
}

/** Longest streak that ever happened. */
export function calcMaxStreak(entries: Record<string, DayEntry>): number {
  const dates = Object.keys(entries).sort();
  let best = 0;
  let current = 0;
  let previous: Date | null = null;

  for (const date of dates) {
    const parsed = parseISO(date);
    if (!previous) {
      current = 1;
    } else {
      const diff = differenceInCalendarDays(parsed, previous);
      current = diff === 1 ? current + 1 : 1;
    }
    best = Math.max(best, current);
    previous = parsed;
  }
  return best;
}

/** Streak value displayed on a historical row. */
export function streakAt(entries: Record<string, DayEntry>, date: string): number {
  if (!entries[date]) return 0;
  let cursor = parseISO(date);
  let streak = 0;
  while (entries[toISO(cursor)]) {
    streak += 1;
    cursor = subDays(cursor, 1);
  }
  return streak;
}

export function bestDay(entries: Record<string, DayEntry>): DayEntry | null {
  let best: DayEntry | null = null;
  for (const entry of Object.values(entries)) {
    if (!best || entryIncome(entry) > entryIncome(best)) best = entry;
  }
  return best && entryIncome(best) > 0 ? best : null;
}

export function perfectMonths(
  entries: Record<string, DayEntry>,
  trackingStart: string,
  today = todayISO(),
): string[] {
  const todayDate = fromISO(today);
  const startDate = fromISO(trackingStart);
  if (isAfter(startDate, todayDate)) return [];
  const months = eachMonthOfInterval({ start: startOfMonth(startDate), end: todayDate });
  const result: string[] = [];

  for (const monthDate of months) {
    const monthEnd = endOfMonth(monthDate);
    if (isAfter(monthEnd, todayDate)) continue;
    const monthStart = startOfMonth(monthDate);
    const from = isAfter(startDate, monthStart) ? startDate : monthStart;
    const days = eachDayOfInterval({ start: from, end: monthEnd });
    if (days.every((day) => entries[toISO(day)])) {
      result.push(format(monthDate, "yyyy-MM"));
    }
  }
  return result;
}

export function daysFilledSoFar(
  entries: Record<string, DayEntry>,
  start: string,
  end: string,
  today = todayISO(),
): number {
  return Object.keys(entries).filter((date) => date >= start && date <= end && date <= today)
    .length;
}

export function daysElapsed(start: string, end: string, today = todayISO()): number {
  const last = today < end ? today : end;
  if (last < start) return 0;
  return differenceInCalendarDays(parseISO(last), parseISO(start)) + 1;
}

export function missedDays(
  entries: Record<string, DayEntry>,
  start: string,
  end: string,
  today = todayISO(),
): number {
  const elapsed = daysElapsed(start, end, today);
  const filled = daysFilledSoFar(entries, start, end, today);
  return Math.max(elapsed - filled, 0);
}

export function getGoal(data: AppData, month: string): MonthGoal | null {
  return data.goals[month] ?? null;
}

export interface Snapshot {
  firstEntryDate: string | null;
  filledDays: number;
  totalIncome: number;
  workIncome: number;
  youtubeIncome: number;
  workHours: number;
  studyHours: number;
  youtubeHours: number;
  totalHours: number;
  sportDays: number;
  currentStreak: number;
  maxStreak: number;
  perfectMonths: number;
  earlyBird: boolean;
  bestDayIncome: number;
}

export function buildSnapshot(data: AppData, today = todayISO()): Snapshot {
  const list = entriesList(data.entries);
  const totals = getTotals(list);
  const best = bestDay(data.entries);
  return {
    firstEntryDate: list[0]?.date ?? null,
    filledDays: totals.filledDays,
    totalIncome: totals.income,
    workIncome: totals.workIncome,
    youtubeIncome: totals.youtubeIncome,
    workHours: totals.workHours,
    studyHours: totals.studyHours,
    youtubeHours: totals.youtubeHours,
    totalHours: totals.totalHours,
    sportDays: totals.sportDays,
    currentStreak: calcStreak(data.entries, today),
    maxStreak: calcMaxStreak(data.entries),
    perfectMonths: perfectMonths(data.entries, data.settings.trackingStartDate, today).length,
    earlyBird: list.some((entry) => {
      if (!entry.createdAt) return false;
      const created = new Date(entry.createdAt);
      return created.getHours() < 9;
    }),
    bestDayIncome: best ? entryIncome(best) : 0,
  };
}

/* ------------------------------------------------------------------ */
/* Goal progress & forecast                                            */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Dynamic goals                                                       */
/* ------------------------------------------------------------------ */

/** Значение цели за конкретный день. Встроенные цели читают старые поля записи. */
export function goalDailyValue(
  data: AppData,
  goal: GoalDef,
  date: string,
): number | boolean {
  const entry = data.entries[date];

  if (goal.preset) {
    switch (goal.preset) {
      case "income":
        return entry ? entryIncome(entry) : 0;
      case "work":
        return entry?.workHours ?? 0;
      case "study":
        return entry?.studyHours ?? 0;
      case "youtube":
        return entry?.youtubeHours ?? 0;
      case "sport":
        return Boolean(entry?.sportDone);
    }
  }

  const raw = data.dayValues[date]?.[goal.id];
  if (goal.type === "check") return Boolean(raw);
  return typeof raw === "number" && Number.isFinite(raw) ? Math.round(raw * 100) / 100 : 0;
}

/** Сумма факта за месяц: для галочки — количество отмеченных дней. */
export function goalMonthValue(data: AppData, goal: GoalDef, month: string): number {
  const dates = new Set([
    ...Object.keys(data.entries),
    ...Object.keys(data.dayValues),
  ]);
  let total = 0;
  let days = 0;

  for (const date of dates) {
    if (!date.startsWith(month)) continue;
    const value = goalDailyValue(data, goal, date);
    if (goal.type === "check") {
      if (value) days += 1;
    } else {
      total += typeof value === "number" ? value : 0;
    }
  }

  return goal.type === "check" ? days : Math.round(total * 100) / 100;
}

export function goalPlan(data: AppData, goalId: string, month: string): number {
  const value = data.goalPlans[month]?.[goalId];
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

export interface DynamicGoalRow {
  goal: GoalDef;
  current: number;
  target: number;
  percent: number;
}

export function monthGoalRows(data: AppData, month: string): DynamicGoalRow[] {
  return data.monthGoals.map((goal) => {
    const current = goalMonthValue(data, goal, month);
    const target = goalPlan(data, goal.id, month);
    return {
      goal,
      current,
      target,
      percent: target > 0 ? Math.round((current / target) * 100) : 0,
    };
  });
}

/** Главная денежная цель месяца: встроенный «Доход», иначе первая денежная цель. */
export function primaryIncomeGoal(data: AppData): GoalDef | null {
  return (
    data.monthGoals.find((goal) => goal.preset === "income") ??
    data.monthGoals.find((goal) => goal.type === "number" && goal.unit === "money") ??
    null
  );
}

export function monthIncomeGoal(data: AppData, month: string) {
  const goal = primaryIncomeGoal(data);
  if (!goal) return { goal: null, current: 0, target: 0, percent: 0 };
  const current = goalMonthValue(data, goal, month);
  const target = goalPlan(data, goal.id, month);
  return {
    goal,
    current,
    target,
    percent: target > 0 ? Math.round((current / target) * 100) : 0,
  };
}

export interface Forecast {
  projectedIncome: number;
  projectedDay: number | null;
  paceDelta: number;
  onTrack: boolean;
  hasGoal: boolean;
  daysLeft: number;
}

export function monthForecast(
  totals: Totals,
  incomeTarget: number,
  month: string,
  today = todayISO(),
): Forecast {
  const monthStart = `${month}-01`;
  const monthEnd = toISO(endOfMonth(parseISO(monthStart)));
  const daysInMonth = getDaysInMonth(fromISO(monthStart));
  const elapsed = daysElapsed(monthStart, monthEnd, today);
  // Сегодняшний день ещё можно использовать, поэтому он входит в остаток.
  const daysLeft =
    today > monthEnd
      ? 0
      : today < monthStart
        ? daysInMonth
        : Math.max(daysInMonth - elapsed + 1, 0);
  const target = incomeTarget > 0 ? incomeTarget : 0;

  if (!target) {
    return { projectedIncome: 0, projectedDay: null, paceDelta: 0, onTrack: false, hasGoal: false, daysLeft };
  }

  const dailyRate = elapsed > 0 ? totals.income / elapsed : 0;
  const projectedIncome = dailyRate * daysInMonth;
  const projectedDay =
    totals.income > 0 ? Math.ceil((target / totals.income) * elapsed) : null;
  const expected = (target / daysInMonth) * elapsed;
  const paceDelta = expected > 0 ? ((totals.income - expected) / expected) * 100 : 0;

  return {
    projectedIncome,
    projectedDay: projectedDay && projectedDay <= daysInMonth ? projectedDay : null,
    paceDelta,
    onTrack: totals.income >= expected,
    hasGoal: true,
    daysLeft,
  };
}

/* ------------------------------------------------------------------ */
/* Chart series                                                        */
/* ------------------------------------------------------------------ */

export interface Bucket {
  key: string;
  label: string;
  income: number;
  hours: number;
  work: number;
  study: number;
  youtube: number;
  sport: number;
}

function bucketFromEntries(key: string, label: string, entries: DayEntry[]): Bucket {
  const totals = getTotals(entries);
  return {
    key,
    label,
    income: totals.income,
    hours: totals.totalHours,
    work: totals.workHours,
    study: totals.studyHours,
    youtube: totals.youtubeHours,
    sport: totals.sportDays,
  };
}

export function weeklyIncomeSeries(
  entries: Record<string, DayEntry>,
  count = 8,
  today = todayISO(),
): Bucket[] {
  const currentWeekStart = startOfWeek(fromISO(today), { weekStartsOn: 1 });
  const buckets: Bucket[] = [];
  for (let index = count - 1; index >= 0; index -= 1) {
    const weekStart = subWeeks(currentWeekStart, index);
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const start = toISO(weekStart);
    const end = toISO(weekEnd);
    const label = format(weekStart, "d MMM", { locale: ru }).replace(".", "");
    buckets.push(
      bucketFromEntries(start, label, entriesInRange(entries, start, end)),
    );
  }
  return buckets;
}

export function monthlyIncomeSeries(
  entries: Record<string, DayEntry>,
  count = 8,
  today = todayISO(),
): Bucket[] {
  const current = startOfMonth(fromISO(today));
  const buckets: Bucket[] = [];
  for (let index = count - 1; index >= 0; index -= 1) {
    const monthStart = subMonths(current, index);
    const monthKey = format(monthStart, "yyyy-MM");
    const label = format(monthStart, "LLL", { locale: ru }).replace(".", "");
    buckets.push(
      bucketFromEntries(
        monthKey,
        label,
        getMonthEntries(entries, monthKey),
      ),
    );
  }
  return buckets;
}

export function allTimeSeries(
  entries: Record<string, DayEntry>,
  trackingStart: string,
  today = todayISO(),
): Bucket[] {
  const start = startOfMonth(fromISO(trackingStart));
  const end = startOfMonth(fromISO(today));
  if (isAfter(start, end)) return [];
  const months = eachMonthOfInterval({ start, end });
  return months.map((monthDate) => {
    const monthKey = format(monthDate, "yyyy-MM");
    return bucketFromEntries(
      monthKey,
      format(monthDate, "LLL yy", { locale: ru }).replace(".", ""),
      getMonthEntries(entries, monthKey),
    );
  });
}

export function dashboardSeries(
  data: AppData,
  mode: "week" | "month" | "all",
  today = todayISO(),
): Bucket[] {
  if (mode === "week") return weeklyIncomeSeries(data.entries, 8, today);
  if (mode === "month") return monthlyIncomeSeries(data.entries, 8, today);
  return allTimeSeries(data.entries, data.settings.trackingStartDate, today);
}

export function weekSparkline(entries: Record<string, DayEntry>, today = todayISO()) {
  const start = startOfWeek(fromISO(today), { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, index) => {
    const day = addDays(start, index);
    const key = toISO(day);
    const entry = entries[key];
    return {
      key,
      label: format(day, "EEEEE", { locale: ru }),
      date: key,
      hours: entry ? entryHours(entry) : 0,
      future: isAfter(day, fromISO(today)),
    };
  });
}

export function weekTotals(entries: Record<string, DayEntry>, today = todayISO()) {
  const start = toISO(startOfWeek(fromISO(today), { weekStartsOn: 1 }));
  const end = toISO(endOfWeek(fromISO(today), { weekStartsOn: 1 }));
  return getTotals(entriesInRange(entries, start, end));
}

/* ------------------------------------------------------------------ */
/* Weekly hours (dynamic hour goals)                                   */
/* ------------------------------------------------------------------ */

export interface HourGoalEntry {
  goal: GoalDef;
  scope: "month" | "day";
}

export interface WeekHoursDay {
  key: string;
  date: string;
  label: string;
  hours: number;
  future: boolean;
}

export interface WeekHoursSummary {
  days: WeekHoursDay[];
  totalHours: number;
  prevTotalHours: number;
  averageHours: number;
  elapsedDays: number;
  countedGoals: number;
  hasGoals: boolean;
}

/** Все числовые цели в часах: сначала цели месяца, потом цели на день. */
export function hourGoalList(data: AppData): HourGoalEntry[] {
  return [
    ...data.monthGoals
      .filter(isHourGoal)
      .map((goal) => ({ goal, scope: "month" as const })),
    ...data.dayGoals
      .filter(isHourGoal)
      .map((goal) => ({ goal, scope: "day" as const })),
  ];
}

function sumHoursForGoals(
  data: AppData,
  goals: GoalDef[],
  start: Date,
  end: Date,
): number {
  let total = 0;
  for (const day of eachDayOfInterval({ start, end })) {
    const date = toISO(day);
    for (const goal of goals) {
      const value = goalDailyValue(data, goal, date);
      if (typeof value === "number") total += value;
    }
  }
  return Math.round(total * 100) / 100;
}

/** Часы по одной цели за текущую неделю — для строк фильтра. */
export function goalWeekHours(data: AppData, goalId: string, today = todayISO()) {
  const goal =
    data.monthGoals.find((item) => item.id === goalId) ??
    data.dayGoals.find((item) => item.id === goalId);
  if (!goal || !isHourGoal(goal)) return 0;
  const start = startOfWeek(fromISO(today), { weekStartsOn: 1 });
  const end = endOfWeek(start, { weekStartsOn: 1 });
  return sumHoursForGoals(data, [goal], start, end);
}

/**
 * Часы текущей недели по выбранным целям.
 * selected === null — все цели в часах.
 */
export function weekHoursSummary(
  data: AppData,
  selected: string[] | null,
  today = todayISO(),
): WeekHoursSummary {
  const all = hourGoalList(data);
  const goals = all
    .filter((item) => selected === null || selected.includes(item.goal.id))
    .map((item) => item.goal);

  const start = startOfWeek(fromISO(today), { weekStartsOn: 1 });
  const end = endOfWeek(start, { weekStartsOn: 1 });
  const todayDate = fromISO(today);

  const days: WeekHoursDay[] = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(start, index);
    const key = toISO(day);
    const hours = goals.reduce((sum, goal) => {
      const value = goalDailyValue(data, goal, key);
      return sum + (typeof value === "number" ? value : 0);
    }, 0);
    return {
      key,
      date: key,
      label: format(day, "EEEEE", { locale: ru }),
      hours: Math.round(hours * 100) / 100,
      future: isAfter(day, todayDate),
    };
  });

  const totalHours = Math.round(days.reduce((sum, day) => sum + day.hours, 0) * 100) / 100;
  const prevTotalHours = sumHoursForGoals(
    data,
    goals,
    subWeeks(start, 1),
    subDays(start, 1),
  );
  const elapsedDays = Math.min(
    Math.max(differenceInCalendarDays(todayDate, start) + 1, 1),
    7,
  );
  const averageHours =
    elapsedDays > 0 ? Math.round((totalHours / elapsedDays) * 100) / 100 : 0;

  return {
    days,
    totalHours,
    prevTotalHours,
    averageHours,
    elapsedDays,
    countedGoals: goals.length,
    hasGoals: all.length > 0,
  };
}

/* ------------------------------------------------------------------ */
/* Period ranges (stats page)                                          */
/* ------------------------------------------------------------------ */

export interface PeriodRange {
  start: string;
  end: string;
  prevStart: string | null;
  prevEnd: string | null;
  label: string;
}

export function periodRange(
  period: Period,
  trackingStart: string,
  today = todayISO(),
): PeriodRange {
  const todayDate = fromISO(today);

  if (period === "week") {
    const start = startOfWeek(todayDate, { weekStartsOn: 1 });
    const end = endOfWeek(todayDate, { weekStartsOn: 1 });
    return {
      start: toISO(start),
      end: toISO(end),
      prevStart: toISO(subWeeks(start, 1)),
      prevEnd: toISO(subDays(start, 1)),
      label: `${format(start, "d MMM", { locale: ru })} — ${format(end, "d MMM", { locale: ru })}`,
    };
  }

  if (period === "month") {
    const start = startOfMonth(todayDate);
    const end = endOfMonth(todayDate);
    const prevStart = startOfMonth(subMonths(start, 1));
    const prevEnd = endOfMonth(subMonths(start, 1));
    return {
      start: toISO(start),
      end: toISO(end),
      prevStart: toISO(prevStart),
      prevEnd: toISO(prevEnd),
      label: format(start, "LLLL yyyy", { locale: ru }),
    };
  }

  if (period === "year") {
    const start = startOfYear(todayDate);
    const end = endOfYear(todayDate);
    const prevStart = startOfYear(subMonths(start, 12));
    const prevEnd = endOfYear(subMonths(start, 12));
    return {
      start: toISO(start),
      end: toISO(end),
      prevStart: toISO(prevStart),
      prevEnd: toISO(prevEnd),
      label: format(start, "yyyy"),
    };
  }

  return {
    start: trackingStart,
    end: today,
    prevStart: null,
    prevEnd: null,
    label: "Всё время",
  };
}

export interface SeriesPoint {
  key: string;
  label: string;
  income: number;
  work: number;
  study: number;
  youtube: number;
  hours: number;
  sport: number;
}

export function statsSeries(
  entries: Record<string, DayEntry>,
  period: Period,
  range: PeriodRange,
  today = todayISO(),
): SeriesPoint[] {
  const cap = today < range.end ? today : range.end;

  if (period === "week" || period === "month") {
    const from = fromISO(range.start);
    const to = fromISO(cap);
    if (isAfter(from, to)) return [];
    const days = eachDayOfInterval({ start: from, end: to });
    return days.map((day) => {
      const key = toISO(day);
      const entry = entries[key];
      return {
        key,
        label: format(day, period === "week" ? "EE\n d" : "d", { locale: ru }),
        income: entry ? entryIncome(entry) : 0,
        work: entry?.workHours ?? 0,
        study: entry?.studyHours ?? 0,
        youtube: entry?.youtubeHours ?? 0,
        hours: entry ? entryHours(entry) : 0,
        sport: entry?.sportDone ? 1 : 0,
      };
    });
  }

  const from = startOfMonth(fromISO(range.start));
  const to = startOfMonth(fromISO(cap));
  if (isAfter(from, to)) return [];
  const months = eachMonthOfInterval({ start: from, end: to });
  return months.map((monthDate) => {
    const monthKey = format(monthDate, "yyyy-MM");
    const totals = monthTotals(entries, monthKey);
    return {
      key: monthKey,
      label: format(monthDate, "LLL", { locale: ru }).replace(".", ""),
      income: totals.income,
      work: totals.workHours,
      study: totals.studyHours,
      youtube: totals.youtubeHours,
      hours: totals.totalHours,
      sport: totals.sportDays,
    };
  });
}

export function averageIncomePerHour(totals: Totals) {
  const paidHours = totals.workHours + totals.youtubeHours;
  if (paidHours > 0) return totals.income / paidHours;
  if (totals.totalHours > 0) return totals.income / totals.totalHours;
  return 0;
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export function monthOptions(trackingStart: string, today = todayISO()): string[] {
  const start = startOfMonth(fromISO(trackingStart));
  const end = startOfMonth(fromISO(today));
  const months = isAfter(start, end) ? [end] : eachMonthOfInterval({ start, end });
  return months.map((month) => format(month, "yyyy-MM")).reverse();
}

export function goalHistory(data: AppData, today = todayISO()) {
  const currentMonth = monthOf(today);
  return Object.values(data.goals)
    .filter((goal) => goal.month < currentMonth)
    .sort((a, b) => (a.month < b.month ? 1 : -1))
    .map((goal) => {
      const totals = monthTotals(data.entries, goal.month);
      return {
        goal,
        totals,
        incomePercent:
          goal.incomeGoal > 0 ? Math.round((totals.income / goal.incomeGoal) * 100) : 0,
        complete:
          goal.incomeGoal > 0
            ? totals.income >= goal.incomeGoal
            : totals.filledDays > 0,
      };
    });
}

export function isCurrentMonth(month: string, today = todayISO()) {
  return isSameMonth(fromISO(`${month}-01`), fromISO(today));
}

export function monthLabelShort(month: string) {
  return monthShort(month);
}

export function recentUnlocked(data: AppData, limit = 5) {
  return Object.entries(data.achievements)
    .map(([id, unlock]) => ({ id, ...unlock }))
    .sort((a, b) => (a.unlockedAt < b.unlockedAt ? 1 : -1))
    .slice(0, limit);
}

export function monthBounds(month: string) {
  const start = parseISO(`${month}-01`);
  return { start: toISO(start), end: toISO(endOfMonth(start)) };
}

export function isPast(date: string, today = todayISO()) {
  return isBefore(parseISO(date), parseISO(today));
}
