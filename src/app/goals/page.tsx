"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Briefcase,
  CheckCircle2,
  Dumbbell,
  Flag,
  GraduationCap,
  Pencil,
  Plus,
  Rocket,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { GoalsManager } from "@/components/goals-manager";
import {
  capitalize,
  daysWord,
  formatHours,
  formatMoney,
  monthLabel,
  monthOf,
  todayISO,
} from "@/lib/format";
import {
  createGoalId,
  goalPlanText,
  goalValueText,
  parseGoalNumber,
  presetMatchesGoal,
} from "@/lib/goals";
import {
  goalMonthValue,
  goalPlan,
  monthForecast,
  monthGoalRows,
  monthIncomeGoal,
  monthTotals,
} from "@/lib/selectors";
import { useAppStore } from "@/lib/store";
import type { GoalDef, GoalPreset, GoalType, GoalUnit } from "@/lib/types";
import { clamp, cn } from "@/lib/utils";

const PRESET_ICONS: Record<GoalPreset, typeof Target> = {
  income: Wallet,
  work: Briefcase,
  study: GraduationCap,
  youtube: Youtube,
  sport: Dumbbell,
};

interface GoalDraft {
  id: string;
  title: string;
  type: GoalType;
  unit: GoalUnit;
  plan: string;
  preset?: GoalPreset;
  createdAt?: string;
  isNew: boolean;
}

interface PendingChange {
  id: string;
  title: string;
  label: string;
  patch: Partial<GoalDraft>;
}

function Ring({ percent }: { percent: number }) {
  const size = 112;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const capped = clamp(percent, 0, 100);
  const dash = (capped / 100) * circumference;

  return (
    <div className="relative size-[112px] shrink-0">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#242427"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#goal-ring)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          className="transition-[stroke-dasharray] duration-700 ease-premium"
        />
        <defs>
          <linearGradient id="goal-ring" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#EBD08F" />
            <stop offset="1" stopColor="#B48839" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="num text-[24px] font-semibold leading-none text-ink">{percent}%</span>
        <span className="mt-1 text-[9px] uppercase tracking-[0.12em] text-muted">доход</span>
      </div>
    </div>
  );
}

function toDrafts(goals: GoalDef[], plans: Record<string, number>): GoalDraft[] {
  return goals.map((goal) => ({
    id: goal.id,
    title: goal.title,
    type: goal.type,
    unit: goal.unit ?? "hours",
    plan: plans[goal.id] ? String(plans[goal.id]) : "",
    preset: goal.preset,
    createdAt: goal.createdAt,
    isNew: false,
  }));
}

export default function GoalsPage() {
  const data = useAppStore();
  const saveMonthGoals = useAppStore((state) => state.saveMonthGoals);

  const today = todayISO();
  const month = monthOf(today);
  const currency = data.settings.currency;
  const totals = monthTotals(data.entries, month);
  const income = monthIncomeGoal(data, month);
  const forecastTotals = { ...totals, income: income.current };
  const forecast = monthForecast(forecastTotals, income.target, month, today);
  const rows = monthGoalRows(data, month);

  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<GoalDraft[]>([]);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);

  const monthPlans = data.goalPlans[month] ?? {};

  const startEdit = () => {
    setDrafts(toDrafts(data.monthGoals, monthPlans));
    setEditing(true);
    setConfirmId(null);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDrafts([]);
    setConfirmId(null);
  };

  const updateDraft = (id: string, patch: Partial<GoalDraft>) => {
    setDrafts((prev) =>
      prev.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)),
    );
  };

  const applyChange = (change: PendingChange) => {
    setDrafts((prev) =>
      prev.map((draft) => (draft.id === change.id ? { ...draft, ...change.patch } : draft)),
    );
    setPendingChange(null);
  };

  const requestTypeChange = (draft: GoalDraft, type: GoalType) => {
    if (draft.type === type) return;
    const patch: Partial<GoalDraft> = { type };
    const label = `Тип: ${type === "check" ? "галочка" : `число · ${draft.unit === "money" ? "деньги" : "часы"}`}`;
    if (draft.isNew) {
      updateDraft(draft.id, patch);
      return;
    }
    setPendingChange({ id: draft.id, title: draft.title, label, patch });
  };

  const requestUnitChange = (draft: GoalDraft, unit: GoalUnit) => {
    if (draft.unit === unit) return;
    const patch: Partial<GoalDraft> = { unit };
    const label = `Единица: ${unit === "money" ? "деньги" : "часы"}`;
    if (draft.isNew) {
      updateDraft(draft.id, patch);
      return;
    }
    setPendingChange({ id: draft.id, title: draft.title, label, patch });
  };

  const addGoal = () => {
    setDrafts((prev) => [
      ...prev,
      {
        id: createGoalId(),
        title: "",
        type: "number",
        unit: "hours",
        plan: "",
        isNew: true,
      },
    ]);
  };

  const removeDraft = (id: string) => {
    if (confirmId !== id) {
      setConfirmId(id);
      return;
    }
    setDrafts((prev) => prev.filter((draft) => draft.id !== id));
    setConfirmId(null);
  };

  const moveDraft = (id: string, direction: -1 | 1) => {
    setDrafts((prev) => {
      const index = prev.findIndex((draft) => draft.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  };

  const save = () => {
    const empty = drafts.find((draft) => !draft.title.trim());
    if (empty) {
      toast.error("У каждой цели должно быть название");
      return;
    }

    const goals: GoalDef[] = drafts.map((draft) => ({
      id: draft.id,
      title: draft.title.trim(),
      type: draft.type,
      ...(draft.type === "number" ? { unit: draft.unit } : {}),
      ...(draft.preset ? { preset: draft.preset } : {}),
      ...(draft.createdAt ? { createdAt: draft.createdAt } : {}),
    }));

    const plans = Object.fromEntries(
      drafts.map((draft) => [draft.id, parseGoalNumber(draft.plan)]),
    );

    saveMonthGoals(goals, plans, month);
    setEditing(false);
    setDrafts([]);
    toast.success("Цели месяца обновлены", {
      description: `Порядок и планы на ${monthLabel(month)} сохранены.`,
      icon: <Target className="size-4 text-gold" strokeWidth={1.8} />,
    });
  };

  const remaining = Math.max(income.target - income.current, 0);
  const perDayLeft = forecast.daysLeft > 0 ? remaining / forecast.daysLeft : remaining;

  const months = new Set([...Object.keys(data.goals), ...Object.keys(data.goalPlans)]);
  const history = [...months]
    .filter((item) => item < month)
    .sort((a, b) => (a < b ? 1 : -1))
    .map((item) => {
      const monthData = monthTotals(data.entries, item);
      const target =
        (income.goal ? goalPlan(data, income.goal.id, item) : 0) ||
        data.goals[item]?.incomeGoal ||
        0;
      const current = income.goal
        ? goalMonthValue(data, income.goal, item)
        : monthData.income;
      return {
        month: item,
        filledDays: monthData.filledDays,
        current,
        target,
        percent: target > 0 ? Math.round((current / target) * 100) : 0,
        done: target > 0 && current >= target,
      };
    });

  const forecastTone = !forecast.hasGoal
    ? "muted"
    : income.current >= income.target && income.target > 0
      ? "done"
      : forecast.onTrack
        ? "good"
        : "bad";

  const plansEmpty = rows.every((row) => row.target <= 0);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Цели"
        title="Планка на месяц"
        description="Собери свой список целей: план на месяц и факт каждый день. Порядок цели задаёт порядок в ежедневке и обзоре."
        actions={
          !editing ? (
            <Button variant="secondary" onClick={startEdit}>
              <Pencil className="size-3.5" strokeWidth={1.5} />
              Редактировать
            </Button>
          ) : (
            <Button variant="ghost" onClick={cancelEdit}>
              <X className="size-3.5" />
              Отмена
            </Button>
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <Card className="gold-edge animate-fade-up overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-line/50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="label-micro">Текущий месяц</div>
              <h2 className="mt-1 text-[21px] font-semibold capitalize tracking-tight">
                {monthLabel(month)}
              </h2>
              <p className="mt-1 text-[11px] text-muted">
                Осталось <span className="num text-ink">{forecast.daysLeft}</span>{" "}
                {daysWord(forecast.daysLeft)} · заполнено{" "}
                <span className="num text-ink">{totals.filledDays}</span> дн.
              </p>
            </div>
            <Ring percent={income.percent} />
          </div>

          {editing ? (
            <div className="px-5 py-5">
              <div className="mb-1 text-[13px] font-medium">Цели на {monthLabel(month)}</div>
              <p className="mb-4 text-[11px] leading-relaxed text-muted">
                Название, тип, единица и план. Стрелки меняют порядок — он сразу
                применяется в ежедневной записи и обзоре.
              </p>

              <div className="flex flex-col gap-2.5">
                {drafts.map((draft, index) => {
                  const Icon = draft.preset ? PRESET_ICONS[draft.preset] : Target;
                  const suffix =
                    draft.type === "check"
                      ? "дн"
                      : draft.unit === "money"
                        ? currency
                        : "ч";
                  return (
                    <div
                      key={draft.id}
                      className="rounded-xl border border-line/70 bg-raised/20 p-3.5"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line/70 bg-card">
                            <Icon className="size-3.5 text-gold" strokeWidth={1.5} />
                          </span>
                          <Input
                            value={draft.title}
                            maxLength={60}
                            autoFocus={draft.isNew}
                            onChange={(event) =>
                              updateDraft(draft.id, { title: event.target.value })
                            }
                            placeholder="Название цели"
                            aria-label="Название цели"
                            className="h-9"
                          />
                        </div>

                        <Segmented
                          value={draft.type}
                          onChange={(value) => requestTypeChange(draft, value)}
                          options={[
                            { value: "number", label: "Число" },
                            { value: "check", label: "Галочка" },
                          ]}
                        />

                        {draft.type === "number" && (
                          <Select
                            value={draft.unit}
                            onChange={(event) =>
                              requestUnitChange(draft, event.target.value as GoalUnit)
                            }
                            className="h-9 w-full sm:w-[120px]"
                            aria-label="Единица цели"
                          >
                            <option value="hours">Часы</option>
                            <option value="money">Деньги</option>
                          </Select>
                        )}

                        <div className="relative w-full sm:w-[140px]">
                          <Input
                            inputMode="decimal"
                            value={draft.plan}
                            onChange={(event) =>
                              updateDraft(draft.id, { plan: event.target.value })
                            }
                            placeholder={draft.type === "check" ? "Дней" : "План"}
                            aria-label="План месяца"
                            className="num h-9 pr-10"
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted">
                            {suffix}
                          </span>
                        </div>

                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => moveDraft(draft.id, -1)}
                            disabled={index === 0}
                            aria-label={`Поднять ${draft.title || "цель"}`}
                          >
                            <ArrowUp className="size-3.5" strokeWidth={1.7} />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => moveDraft(draft.id, 1)}
                            disabled={index === drafts.length - 1}
                            aria-label={`Опустить ${draft.title || "цель"}`}
                          >
                            <ArrowDown className="size-3.5" strokeWidth={1.7} />
                          </Button>
                          <Button
                            size="sm"
                            variant={confirmId === draft.id ? "danger" : "ghost"}
                            onClick={() => removeDraft(draft.id)}
                            onBlur={() => setConfirmId(null)}
                            aria-label={`Удалить ${draft.title || "цель"}`}
                          >
                            <Trash2 className="size-3.5" strokeWidth={1.6} />
                            {confirmId === draft.id && (
                              <span className="text-[11px]">Точно?</span>
                            )}
                          </Button>
                        </div>
                      </div>

                      {draft.preset &&
                        (presetMatchesGoal(
                          draft.preset,
                          draft.type,
                          draft.type === "number" ? draft.unit : undefined,
                        ) ? (
                          <p className="mt-2 pl-10 text-[10px] leading-relaxed text-muted">
                            {draft.preset === "income"
                              ? "Авто: доход из журнала — работа по часам и ставке плюс доход YouTube."
                              : draft.preset === "sport"
                                ? "Галочка за день, прогресс месяца — количество дней."
                                : "Значения берутся из журнала и старой истории."}
                          </p>
                        ) : (
                          <p className="mt-2 pl-10 text-[10px] leading-relaxed text-gold/80">
                            Тип изменён. После сохранения цель станет обычной: старые
                            значения и план не конвертируются. Верни прежний тип, чтобы
                            сохранить привязку к журналу.
                          </p>
                        ))}
                    </div>
                  );
                })}
              </div>

              <Button variant="outline" size="sm" className="mt-3" onClick={addGoal}>
                <Plus className="size-3.5" />
                Добавить цель
              </Button>

              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="ghost" onClick={cancelEdit}>
                  Отмена
                </Button>
                <Button variant="primary" onClick={save}>
                  Сохранить цели
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1 px-5 py-4">
              {rows.map((row) => {
                const Icon = row.goal.preset ? PRESET_ICONS[row.goal.preset] : Target;
                const hasTarget = row.target > 0;
                return (
                  <div
                    key={row.goal.id}
                    className="rounded-xl px-2 py-3 transition-colors hover:bg-hover/30"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <Icon className="size-3.5 shrink-0 text-muted" strokeWidth={1.5} />
                        <span className="truncate text-[12px] font-medium text-ink">
                          {row.goal.title}
                        </span>
                        {row.percent >= 100 && hasTarget && (
                          <CheckCircle2 className="size-3.5 shrink-0 text-success" strokeWidth={2} />
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="num text-[12px] text-ink">
                          {goalValueText(row.goal, row.current, currency)}
                        </span>
                        <span className="text-[11px] text-muted">
                          {hasTarget ? ` / ${goalPlanText(row.goal, row.target, currency)}` : " / цель не задана"}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <Progress
                        value={hasTarget ? row.percent : 0}
                        size="sm"
                        tone={
                          row.goal.preset === "income"
                            ? "gold"
                            : row.goal.type === "check"
                              ? "success"
                              : "azure"
                        }
                      />
                      <span
                        className={cn(
                          "num w-9 shrink-0 text-right text-[10px]",
                          hasTarget ? "text-muted" : "text-muted/50",
                        )}
                      >
                        {hasTarget ? `${row.percent}%` : "—"}
                      </span>
                    </div>
                  </div>
                );
              })}

              {rows.length === 0 && (
                <div className="mt-2 rounded-xl border border-dashed border-line/70 bg-raised/20 px-4 py-6 text-center">
                  <p className="text-[12px] text-ink">В списке пока нет целей месяца</p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    Добавь доход, часы или свою цель — и она появится в ежедневке.
                  </p>
                  <Button variant="primary" size="sm" className="mt-3" onClick={startEdit}>
                    <Plus className="size-3.5" />
                    Добавить цель
                  </Button>
                </div>
              )}

              {rows.length > 0 && plansEmpty && (
                <div className="mt-2 rounded-xl border border-dashed border-line/70 bg-raised/20 px-4 py-4 text-center">
                  <p className="text-[12px] text-ink">Планы на этот месяц ещё не заданы</p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    Нажми «Редактировать» и укажи план по каждой цели.
                  </p>
                  <Button variant="primary" size="sm" className="mt-3" onClick={startEdit}>
                    <Target className="size-3.5" />
                    Задать планы
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <Card
            className={cn(
              "animate-fade-up overflow-hidden p-5",
              forecastTone === "bad" && "border-danger/25",
              forecastTone === "done" && "border-success/25",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="label-micro">Прогноз месяца</span>
              {forecastTone === "good" || forecastTone === "done" ? (
                <TrendingUp className="size-4 text-success" strokeWidth={1.5} />
              ) : forecastTone === "bad" ? (
                <TrendingDown className="size-4 text-danger" strokeWidth={1.5} />
              ) : (
                <Flag className="size-4 text-muted" strokeWidth={1.5} />
              )}
            </div>

            {!forecast.hasGoal ? (
              <div className="mt-3">
                <p className="text-[14px] font-medium leading-snug text-ink">
                  {income.goal ? "План по доходу не задан" : "Денежная цель не задана"}
                </p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
                  Поставь сумму в цели «Доход» — и здесь появится прогноз: успеешь к
                  концу месяца или нет.
                </p>
                <Button variant="outline" size="sm" className="mt-3" onClick={startEdit}>
                  Задать план
                </Button>
              </div>
            ) : income.current <= 0 ? (
              <div className="mt-3">
                <p className="text-[14px] font-medium leading-snug text-ink">
                  Пока нет дохода в этом месяце
                </p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
                  Заполни первый день — и прогноз посчитается по твоему темпу.
                </p>
              </div>
            ) : (
              <div className="mt-3">
                <p className="text-[15px] font-medium leading-snug text-ink">
                  {income.current >= income.target
                    ? "Цель месяца уже закрыта"
                    : forecast.projectedDay
                      ? `При текущем темпе закроешь цель к ${forecast.projectedDay} числу`
                      : "При текущем темпе цель не закроется"}
                </p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
                  {forecast.onTrack ? "Опережаешь график" : "Отстаёшь от графика"} на{" "}
                  <span className={cn("num", forecast.onTrack ? "text-success" : "text-danger")}>
                    {Math.abs(Math.round(forecast.paceDelta))}%
                  </span>
                  . Прогноз дохода к концу месяца —{" "}
                  <span className="num text-gold">
                    {formatMoney(forecast.projectedIncome, currency)}
                  </span>
                  .
                </p>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[10px] text-muted">
                    <span>Прогноз</span>
                    <span className="num">
                      {Math.round((forecast.projectedIncome / (income.target || 1)) * 100)}%
                    </span>
                  </div>
                  <Progress
                    value={(forecast.projectedIncome / (income.target || 1)) * 100}
                    size="sm"
                    tone={forecast.onTrack ? "gold" : "azure"}
                    className="mt-1.5"
                  />
                </div>
              </div>
            )}
          </Card>

          <Card className="animate-fade-up p-5" style={{ animationDelay: "60ms" }}>
            <div className="label-micro">
              {remaining <= 0 && income.target > 0 ? "Цель закрыта" : "До конца месяца"}
            </div>
            <div className="mt-3 flex flex-col gap-3">
              {remaining <= 0 && income.target > 0 ? (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted">Сверх цели</span>
                  <span className="num text-[13px] text-success">
                    +{formatMoney(income.current - income.target, currency)}
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted">Осталось</span>
                    <span className="num text-[13px] text-gold">
                      {formatMoney(remaining, currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted">Нужно в день</span>
                    <span className="num text-[13px] text-ink">
                      {formatMoney(perDayLeft, currency)}
                    </span>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted">Дней осталось</span>
                <span className="num text-[13px] text-ink">{forecast.daysLeft}</span>
              </div>
              <div className="flex items-center justify-between border-t border-line/50 pt-3">
                <span className="text-[11px] text-muted">Сейчас</span>
                <span className="num text-[13px] text-ink">
                  {formatMoney(income.current, currency)}
                </span>
              </div>
            </div>
            <div
              className={cn(
                "mt-4 flex items-center gap-2 rounded-lg border px-3 py-2.5",
                remaining <= 0 && income.target > 0
                  ? "border-success/20 bg-success/[0.05]"
                  : "border-gold/15 bg-gold/[0.05]",
              )}
            >
              <Rocket
                className={cn(
                  "size-3.5 shrink-0",
                  remaining <= 0 && income.target > 0 ? "text-success" : "text-gold",
                )}
                strokeWidth={1.5}
              />
              <span className="text-[10px] leading-relaxed text-muted">
                {remaining <= 0 && income.target > 0
                  ? "Цель месяца закрыта. Можно замахнуться выше."
                  : forecast.hasGoal && forecast.onTrack
                    ? "Темп хороший. Не сбавляй."
                    : forecast.hasGoal
                      ? "Ещё есть время выровнять темп."
                      : "Одна цель — один фокус."}
              </span>
            </div>
          </Card>
        </div>
      </div>

      <GoalsManager />

      <Card className="animate-fade-up overflow-hidden">
        <div className="flex items-center justify-between border-b border-line/50 px-5 py-4">
          <div>
            <h2 className="text-[15px] font-medium tracking-tight">История целей</h2>
            <p className="mt-0.5 text-[11px] text-muted">Прошлые месяцы: выполнено или нет</p>
          </div>
          <Badge variant="outline">{history.length} мес.</Badge>
        </div>

        {history.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <Flag className="size-5 text-muted" strokeWidth={1.5} />
            <p className="text-[12px] text-ink">История начнётся со следующего месяца</p>
            <p className="max-w-xs text-[11px] leading-relaxed text-muted">
              Здесь появятся месяцы, где были планы: сумма, процент выполнения и статус.
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {history.map((item) => (
              <div
                key={item.month}
                className="flex flex-col gap-2 border-b border-line/40 px-5 py-3.5 last:border-0 sm:flex-row sm:items-center sm:gap-5"
              >
                <div className="w-[150px] shrink-0">
                  <div className="text-[12px] font-medium capitalize text-ink">
                    {monthLabel(item.month)}
                  </div>
                  <div className="text-[10px] text-muted">
                    {item.filledDays} дн. заполнено
                  </div>
                </div>
                <div className="flex flex-1 items-center gap-3">
                  <Progress value={item.percent} size="sm" tone={item.done ? "success" : "gold"} />
                  <span className="num w-9 text-right text-[10px] text-muted">{item.percent}%</span>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <div className="num text-[11px] text-muted">
                    <span className={item.done ? "text-success" : "text-ink"}>
                      {formatMoney(item.current, currency)}
                    </span>{" "}
                    / {formatMoney(item.target, currency)}
                  </div>
                  <Badge variant={item.done ? "success" : "outline"}>
                    {item.done ? "выполнено" : "не выполнено"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog
        open={Boolean(pendingChange)}
        onOpenChange={(open) => {
          if (!open) setPendingChange(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Изменить тип цели?</DialogTitle>
            <DialogDescription>
              Настройки «{pendingChange?.title || "цель"}» изменятся на{" "}
              {pendingChange?.label.toLowerCase()}. Старые значения и план не будут
              конвертированы — история останется в прежнем виде.
            </DialogDescription>
          </DialogHeader>
          <div className="mx-6 mb-4 rounded-xl border border-gold/20 bg-gold/[0.05] px-3.5 py-3 text-[11px] leading-relaxed text-muted">
            Дальше цель будет считаться по новым правилам. Это действие применяется
            только после «Сохранить цели».
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingChange(null)}>
              Отмена
            </Button>
            <Button variant="primary" onClick={() => pendingChange && applyChange(pendingChange)}>
              Продолжить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
