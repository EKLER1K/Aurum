"use client";

import { useEffect, useState } from "react";
import { isValid, parseISO } from "date-fns";
import Link from "next/link";
import {
  Briefcase,
  CalendarDays,
  Check,
  CheckSquare,
  Dumbbell,
  GraduationCap,
  Hash,
  Target,
  Trash2,
  Wallet,
  Wand2,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  capitalize,
  dayLabel,
  formatHours,
  formatMoney,
  todayISO,
  weekdayLong,
} from "@/lib/format";
import { goalUnitSuffix } from "@/lib/goals";
import { calcStreak, entryHours, entryIncome, goalDailyValue } from "@/lib/selectors";
import { useAppStore } from "@/lib/store";
import { useUiStore } from "@/lib/ui-store";
import { notifyError, notifySaved } from "@/lib/toast";
import { cn, round2 } from "@/lib/utils";
import type { DayEntry, GoalDef, GoalPreset } from "@/lib/types";

type IncomeMode = "auto" | "manual";
type GoalValue = string | boolean;

const PRESET_ICONS: Record<GoalPreset, typeof Target> = {
  income: Wallet,
  work: Briefcase,
  study: GraduationCap,
  youtube: Youtube,
  sport: Dumbbell,
};

function toNum(value: string) {
  const parsed = Number.parseFloat(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return round2(parsed);
}

function numValue(value: GoalValue | undefined) {
  return typeof value === "string" ? toNum(value) : 0;
}

function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
  action,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={htmlFor}>{label}</Label>
        {action ?? (hint && <span className="text-[11px] text-muted/70">{hint}</span>)}
      </div>
      {children}
    </div>
  );
}

function SuffixInput({
  suffix,
  gold,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { suffix?: string; gold?: boolean }) {
  return (
    <div className="relative">
      <Input
        inputMode="decimal"
        className={cn("num pr-12", gold && "text-gold", className)}
        {...props}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted">
          {suffix}
        </span>
      )}
    </div>
  );
}

export function QuickLogDialog() {
  const open = useUiStore((state) => state.editorOpen);
  const editorDate = useUiStore((state) => state.editorDate);
  const closeEditor = useUiStore((state) => state.closeEditor);

  const entries = useAppStore((state) => state.entries);
  const settings = useAppStore((state) => state.settings);
  const monthGoals = useAppStore((state) => state.monthGoals);
  const dayGoals = useAppStore((state) => state.dayGoals);
  const saveEntry = useAppStore((state) => state.saveEntry);
  const deleteEntry = useAppStore((state) => state.deleteEntry);

  const [date, setDate] = useState(editorDate);
  const [note, setNote] = useState("");
  const [values, setValues] = useState<Record<string, GoalValue>>({});
  const [mode, setMode] = useState<IncomeMode>("auto");
  const [youtubeIncome, setYoutubeIncome] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const rate = settings.defaultHourlyRate;
  const allGoals = [...monthGoals, ...dayGoals];
  const incomeGoal = monthGoals.find((goal) => goal.preset === "income");
  const workGoal = monthGoals.find((goal) => goal.preset === "work");
  const existing = entries[date];

  const hydrate = (target: string) => {
    const state = useAppStore.getState();
    const entry = state.entries[target];
    const goals = [...state.monthGoals, ...state.dayGoals];
    const next: Record<string, GoalValue> = {};

    for (const goal of goals) {
      const raw = goalDailyValue(state, goal, target);
      if (goal.type === "check") {
        next[goal.id] = Boolean(raw);
      } else {
        next[goal.id] = typeof raw === "number" && raw > 0 ? String(raw) : "";
      }
    }

    const income = state.monthGoals.find((goal) => goal.preset === "income");
    const work = state.monthGoals.find((goal) => goal.preset === "work");
    const ytIncome = entry?.youtubeIncome ?? 0;
    const auto = entry
      ? Math.abs(entry.workIncome - round2(entry.workHours * state.settings.defaultHourlyRate)) <
        0.01
      : true;

    if (income) {
      if (entry && auto) {
        const hours = work ? numValue(next[work.id]) : entry.workHours;
        next[income.id] = String(round2(hours * state.settings.defaultHourlyRate + ytIncome));
      } else if (!entry) {
        next[income.id] = "";
      }
    }

    setDate(target);
    setValues(next);
    setMode(auto ? "auto" : "manual");
    setYoutubeIncome(ytIncome);
    setNote(entry?.note ?? "");
    setError(null);
    setConfirmDelete(false);
  };

  useEffect(() => {
    if (!open) return;
    hydrate(editorDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editorDate]);

  const buildEntry = (): DayEntry => {
    const base: DayEntry = existing
      ? { ...existing, date }
      : {
          date,
          workHours: 0,
          workIncome: 0,
          studyHours: 0,
          youtubeHours: 0,
          youtubeIncome: 0,
          sportDone: false,
        };

    const work = monthGoals.find((goal) => goal.preset === "work");
    const study = monthGoals.find((goal) => goal.preset === "study");
    const youtube = monthGoals.find((goal) => goal.preset === "youtube");
    const sport = monthGoals.find((goal) => goal.preset === "sport");
    const income = monthGoals.find((goal) => goal.preset === "income");

    const hours = work ? numValue(values[work.id]) : base.workHours;

    if (work) base.workHours = hours;
    if (study) base.studyHours = numValue(values[study.id]);
    if (youtube) base.youtubeHours = numValue(values[youtube.id]);
    if (sport) base.sportDone = Boolean(values[sport.id]);

    if (income) {
      if (mode === "auto") {
        base.workIncome = round2(hours * rate);
        base.youtubeIncome = youtubeIncome;
      } else {
        base.workIncome = numValue(values[income.id]);
        base.youtubeIncome = 0;
      }
    }

    if (note.trim()) base.note = note.trim();
    else delete base.note;

    return base;
  };

  const previewEntry = buildEntry();
  const customValues: Record<string, number | boolean> = {};
  for (const goal of allGoals) {
    if (goal.preset) continue;
    const raw = values[goal.id];
    if (goal.type === "check") {
      if (raw) customValues[goal.id] = true;
    } else {
      const parsed = numValue(raw);
      if (parsed > 0) customValues[goal.id] = parsed;
    }
  }

  const moneyGoals = allGoals.filter(
    (goal) => goal.type === "number" && goal.unit === "money",
  );
  const hourGoals = allGoals.filter(
    (goal) => goal.type === "number" && goal.unit === "hours",
  );
  const previewIncome =
    moneyGoals.length > 0
      ? moneyGoals.reduce((sum, goal) => sum + numValue(values[goal.id]), 0)
      : entryIncome(previewEntry);
  const previewHours =
    hourGoals.length > 0
      ? hourGoals.reduce((sum, goal) => sum + numValue(values[goal.id]), 0)
      : entryHours(previewEntry);

  const previewStreak = isValid(parseISO(date))
    ? calcStreak({ ...entries, [date]: { ...previewEntry, date } })
    : calcStreak(entries);

  const autoIncome = round2(
    (workGoal ? numValue(values[workGoal.id]) : previewEntry.workHours) * rate + youtubeIncome,
  );

  const setValue = (id: string, value: GoalValue) => {
    setValues((prev) => ({ ...prev, [id]: value }));
    setError(null);
  };

  const handleNumber = (goal: GoalDef, value: string) => {
    setValues((prev) => {
      const next = { ...prev, [goal.id]: value };
      if (goal.preset === "work" && mode === "auto" && incomeGoal) {
        const hours = toNum(value);
        const total = round2(hours * rate + youtubeIncome);
        next[incomeGoal.id] = total > 0 ? String(total) : "";
      }
      return next;
    });
    setError(null);
  };

  const enableAuto = () => {
    setMode("auto");
    if (incomeGoal) {
      const hours = workGoal ? numValue(values[workGoal.id]) : 0;
      const total = round2(hours * rate + youtubeIncome);
      setValue(incomeGoal.id, total > 0 ? String(total) : "");
    }
  };

  const handleDate = (value: string) => {
    if (!value) return;
    hydrate(value);
  };

  const persist = (closeAfter: boolean) => {
    if (!isValid(parseISO(date))) {
      setError("Выбери корректную дату");
      return;
    }

    try {
      const result = saveEntry(previewEntry, customValues);
      notifySaved(result);
      if (closeAfter || result.unlocked.length > 0) {
        closeEditor();
      }
    } catch {
      notifyError("Не удалось сохранить запись");
    }
  };

  const handleDelete = () => {
    if (!existing) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    deleteEntry(date);
    closeEditor();
    toast.success("Запись удалена", {
      description: `${capitalize(dayLabel(date, "d MMMM"))} больше не в журнале.`,
    });
  };

  const isToday = date === todayISO();

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) closeEditor();
      }}
    >
      <DialogContent className="max-w-[640px] overflow-hidden p-0">
        <form
          className="flex max-h-[92dvh] min-w-0 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            persist(true);
          }}
        >
          <div className="relative shrink-0 border-b border-line/60 px-4 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
            <div className="label-micro mb-1.5 flex items-center gap-2">
              {existing ? "Редактирование записи" : "Новый день"}
              {existing && <Badge variant="gold">заполнено</Badge>}
            </div>
            <DialogTitle className="text-[24px] font-semibold tracking-tight">
              {isToday ? "Сегодня" : capitalize(dayLabel(date, "d MMMM"))}
              <span className="ml-2 text-[13px] font-normal text-muted">
                {capitalize(weekdayLong(date))}
              </span>
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs">
              Факты по целям и заметка. Всё сохраняется локально на устройстве.
            </DialogDescription>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="relative min-w-0 max-w-full">
                <CalendarDays
                  className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted"
                  strokeWidth={1.5}
                />
                <Input
                  type="date"
                  value={date}
                  onChange={(event) => handleDate(event.target.value)}
                  className="h-9 w-[168px] max-w-full pl-8 text-[12px]"
                  aria-label="Дата записи"
                />
              </div>
              {!isToday && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDate(todayISO())}
                >
                  Сегодня
                </Button>
              )}
              <span className="ml-auto hidden items-center gap-2 text-[11px] text-muted sm:flex">
                <kbd className="rounded border border-line bg-raised px-1.5 py-0.5 text-[10px]">Enter</kbd>
                сохранить
                <kbd className="ml-1 rounded border border-line bg-raised px-1.5 py-0.5 text-[10px]">Esc</kbd>
                закрыть
              </span>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
            {allGoals.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line/70 bg-raised/20 px-4 py-6 text-center">
                <span className="mx-auto flex size-10 items-center justify-center rounded-xl border border-gold/20 bg-gold/[0.06]">
                  <Target className="size-5 text-gold" strokeWidth={1.5} />
                </span>
                <p className="mt-3 text-[13px] font-medium text-ink">
                  Добавьте цели на вкладке{" "}
                  <Link
                    href="/goals"
                    onClick={closeEditor}
                    className="text-azure transition-colors hover:text-ink"
                  >
                    Цели
                  </Link>
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">
                  Цели месяца и цели на день появятся здесь отдельными строками.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  {allGoals.map((goal) => {
                    const isMonthly = monthGoals.some((item) => item.id === goal.id);
                    const isIncome = goal.preset === "income";
                    const money = goal.type === "number" && goal.unit === "money";
                    const Icon = goal.preset
                      ? PRESET_ICONS[goal.preset]
                      : goal.type === "check"
                        ? CheckSquare
                        : Hash;
                    const suffix = goalUnitSuffix(goal, settings.currency);
                    const rawValue = values[goal.id];
                    const value = typeof rawValue === "string" ? rawValue : "";
                    const checked = Boolean(values[goal.id]);
                    const scope = isMonthly ? "цель месяца" : "цель на день";

                    return (
                      <div
                        key={goal.id}
                        className="flex items-center gap-3 rounded-xl border border-line/60 bg-raised/30 px-3.5 py-3 transition-colors hover:bg-raised/50"
                      >
                        <span
                          className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded-lg border",
                            goal.type === "check"
                              ? "border-success/25 bg-success/[0.06]"
                              : "border-gold/25 bg-gold/[0.06]",
                          )}
                        >
                          <Icon
                            className={cn(
                              "size-3.5",
                              goal.type === "check" ? "text-success" : "text-gold",
                            )}
                            strokeWidth={1.5}
                          />
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[12px] font-medium text-ink">
                            {goal.title}
                          </div>
                          <div className="mt-0.5 truncate text-[10px] text-muted">
                            {isIncome
                              ? mode === "auto"
                                ? `Авто: часы работы × ${formatMoney(rate)}/ч${
                                    youtubeIncome > 0
                                      ? ` + YouTube ${formatMoney(youtubeIncome, settings.currency)}`
                                      : ""
                                  }`
                                : "Ручная сумма за день"
                              : scope}
                          </div>
                        </div>

                        {goal.type === "number" ? (
                          <div className="flex shrink-0 items-center gap-1.5">
                            {isIncome && (
                              <button
                                type="button"
                                onClick={enableAuto}
                                className={cn(
                                  "flex size-9 items-center justify-center rounded-lg border transition-colors",
                                  mode === "auto"
                                    ? "border-gold/25 bg-gold/10 text-gold"
                                    : "border-line bg-card text-muted hover:text-ink",
                                )}
                                title={
                                  mode === "auto"
                                    ? "Доход считается автоматически"
                                    : "Вернуть автоподсчёт"
                                }
                                aria-label={
                                  mode === "auto"
                                    ? "Автоподсчёт включён"
                                    : "Вернуть автоподсчёт"
                                }
                              >
                                <Wand2 className="size-3.5" strokeWidth={1.7} />
                              </button>
                            )}
                            <div className="w-[124px] max-w-full">
                              <SuffixInput
                                id={`entry-${goal.id}`}
                                suffix={suffix}
                                placeholder="0"
                                gold={money}
                                value={value}
                                onChange={(event) => {
                                  if (isIncome) setMode("manual");
                                  handleNumber(goal, event.target.value);
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={checked}
                            onClick={() => setValue(goal.id, !checked)}
                            className={cn(
                              "flex h-9 shrink-0 items-center gap-2 rounded-lg border px-2.5 text-[11px] font-medium transition-colors",
                              checked
                                ? "border-success/30 bg-success/10 text-success"
                                : "border-line bg-card text-muted hover:text-ink",
                            )}
                          >
                            <span
                              className={cn(
                                "flex size-4 items-center justify-center rounded border transition-colors",
                                checked
                                  ? "border-success bg-success text-[#08120c]"
                                  : "border-line",
                              )}
                            >
                              {checked && <Check className="size-3" strokeWidth={3} />}
                            </span>
                            {checked ? "Выполнено" : "Отметить"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <Field label="Заметка" htmlFor="note" hint="необязательно">
                  <Textarea
                    id="note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Что важного было за день?"
                    maxLength={600}
                  />
                </Field>
              </div>
            )}

            {allGoals.length === 0 && (
              <div className="mt-5 flex justify-center">
                <Button asChild variant="outline" size="sm">
                  <Link href="/goals" onClick={closeEditor}>
                    <Target className="size-3.5" />
                    Перейти к целям
                  </Link>
                </Button>
              </div>
            )}

            {error && <p className="mt-3 text-xs text-danger">{error}</p>}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line/60 bg-raised/40 px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <div>
                  <div className="label-micro">Доход дня</div>
                  <div className="num text-lg font-semibold text-gold">
                    {formatMoney(previewIncome, settings.currency)}
                  </div>
                </div>
                <div>
                  <div className="label-micro">Часов</div>
                  <div className="num text-lg font-semibold text-ink">
                    {formatHours(previewHours)}
                  </div>
                </div>
                <div>
                  <div className="label-micro">Целей</div>
                  <div className="num text-lg font-semibold text-azure">{allGoals.length}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="label-micro">Стрик после</div>
                <div className="num flex items-center justify-end gap-1.5 text-lg font-semibold text-ink">
                  {previewStreak}
                  <span className="text-[11px] font-normal text-muted">дн.</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 justify-between px-4 sm:justify-between sm:px-6">
            {existing ? (
              <Button
                type="button"
                variant={confirmDelete ? "danger" : "ghost"}
                size="sm"
                onClick={handleDelete}
                onBlur={() => setConfirmDelete(false)}
              >
                <Trash2 className="size-4" />
                {confirmDelete ? "Точно удалить?" : "Удалить"}
              </Button>
            ) : (
              <span className="hidden text-[11px] text-muted sm:block">
                N — открыть с любого экрана
              </span>
            )}

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => persist(false)}
              >
                Сохранить
              </Button>
              <Button type="submit" variant="primary" className="w-full sm:w-auto sm:min-w-[170px]">
                Сохранить и закрыть
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
