"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO, subDays } from "date-fns";
import { ru } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Briefcase,
  Check,
  CheckSquare,
  Clock3,
  Dumbbell,
  Flame,
  GraduationCap,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trophy,
  Wallet,
  Youtube,
} from "lucide-react";
import { BADGES, resolveBadgeMap, resolveBadges } from "@/lib/achievements";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Segmented } from "@/components/ui/segmented";
import { BadgeMedal } from "@/components/badge-medal";
import { IncomeBars, WeeklySparkline } from "@/components/dashboard-charts";
import { HoursFilterDialog } from "@/components/hours-filter-dialog";
import { PageHeader } from "@/components/page-header";
import {
  capitalize,
  dayLabel,
  daysWord,
  formatHours,
  formatMoney,
  monthOf,
  toISO,
  todayISO,
} from "@/lib/format";
import {
  calcMaxStreak,
  calcStreak,
  dashboardSeries,
  entryHours,
  entryIncome,
  goalDailyValue,
  goalPlan,
  hourGoalList,
  monthIncomeGoal,
  monthTotals,
  weekHoursSummary,
  weekSparkline,
} from "@/lib/selectors";
import { goalPlanText, goalValueText } from "@/lib/goals";
import { useAppStore } from "@/lib/store";
import { useUiStore } from "@/lib/ui-store";
import { cn } from "@/lib/utils";
import type { GoalPreset } from "@/lib/types";

type ChartMode = "week" | "month" | "all";

const GOAL_ICONS: Record<GoalPreset, typeof Target> = {
  income: Wallet,
  work: Briefcase,
  study: GraduationCap,
  youtube: Youtube,
  sport: Dumbbell,
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return "Доброй ночи";
  if (hour < 12) return "Доброе утро";
  if (hour < 18) return "Добрый день";
  return "Добрый вечер";
}

export default function DashboardPage() {
  const data = useAppStore();
  const entries = data.entries;
  const settings = data.settings;
  const achievements = data.achievements;
  const openEditor = useUiStore((state) => state.openEditor);

  const [chartMode, setChartMode] = useState<ChartMode>("week");
  const [hoursFilterOpen, setHoursFilterOpen] = useState(false);
  const [selectedGoals, setSelectedGoals] = useState<string[] | null>(null);

  const today = todayISO();
  const month = monthOf(today);
  const todayEntry = entries[today];
  const yesterday = toISO(subDays(parseISO(today), 1));
  const missedYesterday = !entries[yesterday] && yesterday >= settings.trackingStartDate;

  const streak = calcStreak(entries);
  const record = calcMaxStreak(entries);
  const monthData = monthTotals(entries, month);
  const income = monthIncomeGoal(data, month);
  const earned = income.goal ? income.current : monthData.income;
  const goalPercent = income.goal ? income.percent : 0;
  const spark = weekSparkline(entries);
  const weekHours = weekHoursSummary(data, selectedGoals);
  const hourGoals = hourGoalList(data);
  const moneyGoals = data.monthGoals.filter(
    (goal) => goal.type === "number" && goal.unit === "money",
  );
  const monthHourGoals = data.monthGoals.filter(
    (goal) => goal.type === "number" && goal.unit === "hours",
  );
  const todayIncome =
    moneyGoals.length > 0
      ? moneyGoals.reduce((sum, goal) => {
          const value = goalDailyValue(data, goal, today);
          return sum + (typeof value === "number" ? value : 0);
        }, 0)
      : todayEntry
        ? entryIncome(todayEntry)
        : 0;
  const todayHours =
    monthHourGoals.length > 0
      ? monthHourGoals.reduce((sum, goal) => {
          const value = goalDailyValue(data, goal, today);
          return sum + (typeof value === "number" ? value : 0);
        }, 0)
      : todayEntry
        ? entryHours(todayEntry)
        : 0;

  const sportGoal = data.monthGoals.find((goal) => goal.preset === "sport");
  const sportDoneToday = sportGoal
    ? Boolean(goalDailyValue(data, sportGoal, today))
    : false;

  const selectedHourCount =
    selectedGoals === null
      ? hourGoals.length
      : selectedGoals.filter((id) => hourGoals.some((item) => item.goal.id === id)).length;
  const weekDelta =
    weekHours.prevTotalHours > 0
      ? Math.round(((weekHours.totalHours - weekHours.prevTotalHours) / weekHours.prevTotalHours) * 100)
      : null;

  const series = useMemo(
    () => dashboardSeries(data, chartMode),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, data.goals, data.monthGoals, data.dayGoals, data.goalPlans, data.dayValues, settings, chartMode],
  );
  const seriesTotal = series.reduce((sum, bucket) => sum + bucket.income, 0);

  const unlockedIds = Object.keys(achievements);
  const achievementConfig = {
    overrides: data.achievementOverrides,
    custom: data.customAchievements,
    deleted: data.deletedAchievements,
  };
  const allBadges = resolveBadges(achievementConfig);
  const badgeMap = resolveBadgeMap(achievementConfig);
  const recent = Object.entries(achievements)
    .map(([id, value]) => ({ badge: badgeMap.get(id), unlockedAt: value.unlockedAt }))
    .filter((item) => Boolean(item.badge))
    .sort((a, b) => (a.unlockedAt < b.unlockedAt ? 1 : -1))
    .slice(0, 4);

  const unlockedPercent =
    allBadges.length > 0 ? Math.round((unlockedIds.length / allBadges.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow={capitalize(format(new Date(), "EEEE, d MMMM", { locale: ru }))}
        title={`${greeting()}${settings.name ? `, ${settings.name}` : ""}`}
        description="Один взгляд — и понятно, как идут деньги, часы и дисциплина."
        actions={
          <Button variant="primary" onClick={() => openEditor(today)}>
            <Plus className="size-4" />
            Заполнить день
            <kbd className="ml-1 hidden rounded border border-black/20 bg-black/10 px-1.5 py-0.5 text-[10px] text-[#151006]/70 sm:inline">
              N
            </kbd>
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="animate-fade-up relative overflow-hidden p-5">
          <div className="flex items-center justify-between">
            <span className="label-micro">Стрик</span>
            <Flame className="size-4 text-gold" strokeWidth={1.5} />
          </div>
          <div className="mt-3 flex items-end gap-2">
            <span className="num text-[40px] font-semibold leading-none tracking-tight text-ink">
              {streak}
            </span>
            <span className="pb-1 text-xs text-muted">
              {daysWord(streak)} подряд
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-muted">
            <span>
              Личный рекорд: <span className="num text-gold">{record}</span>
            </span>
            {streak >= record && streak > 0 && (
              <Badge variant="gold" className="text-[9px] uppercase">
                рекорд
              </Badge>
            )}
          </div>
          <div className="mt-4 flex items-center gap-1.5">
            {spark.map((day) => {
              const filled = Boolean(entries[day.date]);
              return (
                <div key={day.date} className="flex flex-1 flex-col items-center gap-1.5">
                  <span
                    className={cn(
                      "h-6 w-full rounded-[4px] border transition-colors",
                      filled
                        ? "border-gold/40 bg-gradient-to-t from-gold/15 to-gold/45"
                        : "border-line/70 bg-raised/60",
                      day.date === today && "ring-1 ring-gold/40 ring-offset-1 ring-offset-card",
                    )}
                    title={`${dayLabel(day.date, "d MMMM")}${filled ? "" : " — не заполнено"}`}
                  />
                  <span
                    className={cn(
                      "text-[9px] uppercase",
                      day.date === today ? "text-gold" : "text-muted/60",
                    )}
                  >
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="animate-fade-up relative overflow-hidden p-5" style={{ animationDelay: "40ms" }}>
          <div className="flex items-center justify-between">
            <span className="label-micro">Заработано в этом месяце</span>
            <Wallet className="size-4 text-gold" strokeWidth={1.5} />
          </div>
          <div className="num mt-3 truncate text-[32px] font-semibold leading-none tracking-tight text-gold">
            {formatMoney(earned, settings.currency)}
          </div>
          <div className="mt-4 flex items-center justify-between text-[11px]">
            <span className="text-muted">
              {income.target > 0
                ? `Цель ${formatMoney(income.target, settings.currency)}`
                : "Цель не задана"}
            </span>
            <span className="num text-ink">{goalPercent}%</span>
          </div>
          <Progress value={goalPercent} className="mt-2" />
          <div className="mt-3 flex items-center justify-between text-[11px]">
            {income.target > 0 ? (
              earned >= income.target ? (
                <span className="flex items-center gap-1 text-success">
                  <Check className="size-3" strokeWidth={2.2} />
                  Цель закрыта
                </span>
              ) : (
                <span className="text-muted">
                  Осталось{" "}
                  <span className="num text-ink">
                    {formatMoney(Math.max(income.target - earned, 0), settings.currency)}
                  </span>
                </span>
              )
            ) : (
              <Link href="/goals" className="text-azure transition-colors hover:text-ink">
                Задать цель месяца
              </Link>
            )}
            <span className="num text-muted">{monthData.filledDays} дн.</span>
          </div>
        </Card>

        <Card
          role="button"
          tabIndex={0}
          aria-label="Открыть фильтр часов на этой неделе"
          onClick={() => setHoursFilterOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setHoursFilterOpen(true);
            }
          }}
          className="group animate-fade-up relative cursor-pointer overflow-hidden p-5 transition-colors hover:border-gold/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30"
          style={{ animationDelay: "80ms" }}
        >
          <div className="flex items-center justify-between">
            <span className="label-micro">Часов на этой неделе</span>
            <span className="flex items-center gap-1.5">
              <span className="hidden text-[10px] text-muted transition-colors group-hover:text-ink sm:inline">
                фильтр
              </span>
              <span className="flex size-7 items-center justify-center rounded-lg border border-line/70 bg-raised/60 transition-colors group-hover:border-gold/30 group-hover:bg-gold/10">
                <Clock3
                  className="size-4 text-azure transition-colors group-hover:text-gold"
                  strokeWidth={1.5}
                />
              </span>
            </span>
          </div>
          <div className="mt-3 flex items-end gap-2">
            <span className="num text-[40px] font-semibold leading-none tracking-tight text-ink">
              {formatHours(weekHours.totalHours)}
            </span>
            <span className="pb-1 text-xs text-muted">часов</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted">
            <span className="flex items-center gap-1">
              <SlidersHorizontal className="size-3" strokeWidth={1.6} />
              {selectedGoals === null
                ? `Все цели · ${hourGoals.length}`
                : `${selectedHourCount} из ${hourGoals.length}`}
            </span>
            <span className="text-muted/40">·</span>
            <span>≈ {formatHours(weekHours.averageHours)} ч/день</span>
            {weekDelta !== null && (
              <>
                <span className="text-muted/40">·</span>
                <span className={cn("num", weekDelta >= 0 ? "text-success" : "text-danger")}>
                  {weekDelta >= 0 ? "+" : ""}
                  {weekDelta}% к прошлой
                </span>
              </>
            )}
          </div>
          <div className="mt-2">
            <WeeklySparkline data={weekHours.days} />
          </div>
          <div className="grid grid-cols-7 text-center">
            {weekHours.days.map((day) => (
              <span
                key={day.date}
                className={cn(
                  "text-[9px] uppercase",
                  day.date === today ? "text-azure" : "text-muted/60",
                )}
              >
                {day.label}
              </span>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-4">
          {missedYesterday && (
            <div className="flex flex-col gap-3 rounded-xl border border-danger/25 bg-danger/[0.055] px-4 py-3 sm:flex-row sm:items-center">
              <AlertTriangle className="hidden size-4 shrink-0 text-danger sm:block" strokeWidth={1.6} />
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-ink">Ты пропустил вчера</div>
                <div className="text-[11px] text-muted">
                  {capitalize(dayLabel(yesterday, "d MMMM"))} пустой. Заполни сейчас — стрик не
                  должен умирать.
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto shrink-0 border-danger/25 text-danger hover:bg-danger/10"
                onClick={() => openEditor(yesterday)}
              >
                Заполнить вчера
              </Button>
            </div>
          )}

          {/* Today */}
          <Card className="gold-edge animate-fade-up overflow-hidden">
            <div className="flex items-center justify-between border-b border-line/50 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-gold shadow-[0_0_8px_rgba(212,168,83,0.6)]" />
                <span className="label-micro !text-ink">Сегодня</span>
                <span className="text-[11px] text-muted">· {dayLabel(today, "d MMMM")}</span>
              </div>
              {todayEntry ? (
                <Badge variant="success">заполнено</Badge>
              ) : (
                <Badge variant="outline">не заполнено</Badge>
              )}
            </div>

            <div className="p-5">
              {todayEntry ? (
                data.monthGoals.length + data.dayGoals.length === 0 ? (
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-gold/25 bg-gold/10">
                        <Target className="size-5 text-gold" strokeWidth={1.5} />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-ink">Целей пока нет</div>
                        <div className="mt-0.5 text-[12px] text-muted">
                          Добавьте цели на вкладке «Цели» — и обзор покажет факты за день.
                        </div>
                      </div>
                    </div>
                    <Button asChild variant="primary">
                      <Link href="/goals">
                        Перейти к целям
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-5 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                      <div>
                        <div className="label-micro">Доход дня</div>
                        <div className="num mt-1.5 text-[38px] font-semibold leading-none tracking-tight text-gold">
                          {formatMoney(todayIncome, settings.currency)}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
                            <Clock3 className="size-3.5" strokeWidth={1.5} />
                            <span className="num text-ink">{formatHours(todayHours)}</span> ч
                          </span>
                          {sportDoneToday && <Badge variant="success">спорт</Badge>}
                          <Badge variant="gold">стрик {streak}</Badge>
                        </div>
                        {todayEntry.note && (
                          <p className="mt-4 border-l border-line pl-3 text-[12px] leading-relaxed text-muted">
                            {todayEntry.note}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {data.monthGoals.map((goal) => {
                          const Icon = goal.preset ? GOAL_ICONS[goal.preset] : Target;
                          const value = goalDailyValue(data, goal, today);
                          const target = goalPlan(data, goal.id, month);
                          const isCheck = goal.type === "check";
                          const display = isCheck
                            ? value
                              ? "Выполнено"
                              : "Нет"
                            : goalValueText(
                                goal,
                                typeof value === "number" ? value : 0,
                                settings.currency,
                              );
                          const hint = isCheck
                            ? target > 0
                              ? `план ${Math.round(target)} дн.`
                              : "отметка факта"
                            : target > 0
                              ? `план ${goalPlanText(goal, target, settings.currency)}`
                              : "без плана";

                          return (
                            <div
                              key={goal.id}
                              className="rounded-xl border border-line/60 bg-raised/50 p-3"
                            >
                              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted">
                                <Icon
                                  className={cn(
                                    "size-3",
                                    isCheck ? "text-success" : "text-gold",
                                  )}
                                  strokeWidth={1.5}
                                />
                                <span className="truncate">{goal.title}</span>
                              </div>
                              <div
                                className={cn(
                                  "mt-1.5 truncate text-[15px]",
                                  isCheck && value ? "text-success" : "text-ink",
                                )}
                              >
                                {display}
                              </div>
                              <div className="truncate text-[10px] text-muted">{hint}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {data.dayGoals.length > 0 && (
                      <div className="mt-4 rounded-xl border border-line/60 bg-raised/30 px-3.5 py-3">
                        <div className="label-micro mb-2 flex items-center gap-1.5">
                          <CheckSquare className="size-3 text-azure" strokeWidth={1.5} />
                          Цели на день
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {data.dayGoals.map((goal) => {
                            const value = goalDailyValue(data, goal, today);
                            const display =
                              goal.type === "check"
                                ? value
                                  ? "✓"
                                  : "—"
                                : goalValueText(
                                    goal,
                                    typeof value === "number" ? value : 0,
                                    settings.currency,
                                  );
                            return (
                              <span
                                key={goal.id}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-line/60 bg-card/60 px-2.5 py-1 text-[10px] text-muted"
                              >
                                <span className="truncate">{goal.title}</span>
                                <span
                                  className={cn(
                                    "num",
                                    goal.type === "check" && value
                                      ? "text-success"
                                      : "text-ink",
                                  )}
                                >
                                  {display}
                                </span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="mt-5 flex items-center justify-between border-t border-line/50 pt-4">
                      <span className="text-[11px] text-muted">
                        Запись сохранена · {formatMoney(todayIncome, settings.currency)}
                      </span>
                      <Button variant="secondary" size="sm" onClick={() => openEditor(today)}>
                        Редактировать
                      </Button>
                    </div>
                  </>
                )
              ) : (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-gold/25 bg-gold/10">
                      <Plus className="size-5 text-gold" strokeWidth={1.5} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-ink">День ещё не заполнен</div>
                      <div className="mt-0.5 text-[12px] text-muted">
                        Одна минута — и стрик жив. Дальше будет только легче.
                      </div>
                    </div>
                  </div>
                  <Button variant="primary" onClick={() => openEditor(today)}>
                    Заполнить день
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Income chart */}
          <Card className="animate-fade-up overflow-hidden">
            <div className="flex flex-col gap-3 px-5 pb-1 pt-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-[15px] font-medium tracking-tight">Динамика дохода</h2>
                <p className="mt-0.5 text-[11px] text-muted">
                  {chartMode === "week" && "Последние 8 недель"}
                  {chartMode === "month" && "Последние 8 месяцев"}
                  {chartMode === "all" && "С момента старта трекинга"}
                  {seriesTotal > 0 && (
                    <>
                      {" · "}
                      <span className="num text-gold">{formatMoney(seriesTotal, settings.currency)}</span>
                    </>
                  )}
                </p>
              </div>
              <Segmented
                value={chartMode}
                onChange={setChartMode}
                options={[
                  { value: "week", label: "Неделя" },
                  { value: "month", label: "Месяц" },
                  { value: "all", label: "Всё время" },
                ]}
              />
            </div>
            <div className="px-3 pb-4 pt-3 sm:px-4">
              {seriesTotal > 0 ? (
                <IncomeBars data={series} currency={settings.currency} />
              ) : (
                <div className="flex h-[220px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line/70 bg-raised/20">
                  <Sparkles className="size-5 text-gold/70" strokeWidth={1.5} />
                  <p className="text-[13px] text-ink">График появится после первой записи</p>
                  <p className="text-[11px] text-muted">Заполни день, чтобы увидеть динамику</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Achievements */}
        <Card className="h-fit animate-fade-up overflow-hidden lg:sticky lg:top-6">
          <div className="flex items-center justify-between border-b border-line/50 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Trophy className="size-4 text-gold" strokeWidth={1.5} />
              <h2 className="text-[13px] font-medium">Последние достижения</h2>
            </div>
            <span className="num text-[11px] text-muted">
              {unlockedIds.length}/{allBadges.length}
            </span>
          </div>

          <div className="p-2">
            {recent.length > 0 ? (
              recent.map(({ badge, unlockedAt }) => {
                if (!badge) return null;
                return (
                  <div
                    key={badge.id}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-hover/50"
                  >
                    <BadgeMedal badge={badge} unlocked size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-medium text-ink">{badge.title}</div>
                      <div className="text-[10px] text-muted">
                        Открыто {dayLabel(unlockedAt.slice(0, 10), "d MMM")}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center gap-2 px-4 py-7 text-center">
                <BadgeMedal badge={allBadges[0] ?? BADGES[0]} size="md" />
                <div className="text-[12px] font-medium text-ink">Первый бейдж уже близко</div>
                <div className="text-[11px] leading-relaxed text-muted">
                  Заполни сегодняшний день и забери «Первую искру».
                </div>
                <Button variant="outline" size="sm" className="mt-1" onClick={() => openEditor(today)}>
                  Заполнить день
                </Button>
              </div>
            )}
          </div>

          <div className="border-t border-line/50 px-5 py-4">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted">Открыто</span>
              <span className="num text-ink">{unlockedPercent}%</span>
            </div>
            <Progress value={unlockedPercent} size="sm" className="mt-2" />
            <Link
              href="/achievements"
              className="mt-3 flex items-center justify-between rounded-lg px-1 py-1 text-[12px] text-muted transition-colors hover:text-gold"
            >
              Все достижения
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-line/60 bg-raised/30 px-4 py-3 text-[11px] text-muted">
        <div className="flex items-center gap-2">
          <BookOpen className="size-3.5" strokeWidth={1.5} />
          <span>
            Всего записей: <span className="num text-ink">{Object.keys(entries).length}</span>
          </span>
        </div>
        <Link href="/log" className="transition-colors hover:text-ink">
          Открыть журнал →
        </Link>
      </div>

      <HoursFilterDialog
        open={hoursFilterOpen}
        onOpenChange={setHoursFilterOpen}
        selected={selectedGoals}
        onSelectedChange={setSelectedGoals}
      />
    </div>
  );
}
