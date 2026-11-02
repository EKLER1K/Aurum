"use client";

import { useState } from "react";
import {
  Check,
  CheckSquare,
  Hash,
  Pencil,
  Plus,
  Target,
  Trash2,
  Wallet,
  X,
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
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import {
  createGoalId,
  goalTypeText,
  goalValueText,
} from "@/lib/goals";
import { goalDailyValue } from "@/lib/selectors";
import { useAppStore } from "@/lib/store";
import { todayISO } from "@/lib/format";
import type { GoalDef, GoalType, GoalUnit } from "@/lib/types";
import { cn } from "@/lib/utils";

export function GoalsManager() {
  const data = useAppStore();
  const saveDayGoals = useAppStore((state) => state.saveDayGoals);
  const dayGoals = data.dayGoals;
  const currency = data.settings.currency;
  const today = todayISO();

  const [title, setTitle] = useState("");
  const [type, setType] = useState<GoalType>("number");
  const [unit, setUnit] = useState<GoalUnit>("hours");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editType, setEditType] = useState<GoalType>("number");
  const [editUnit, setEditUnit] = useState<GoalUnit>("hours");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmTypeChange, setConfirmTypeChange] = useState(false);

  const add = () => {
    const clean = title.trim();
    if (!clean) return;
    const goal: GoalDef = {
      id: createGoalId(),
      title: clean,
      type,
      ...(type === "number" ? { unit } : {}),
      createdAt: new Date().toISOString(),
    };
    saveDayGoals([...dayGoals, goal]);
    setTitle("");
    toast.success("Цель на день добавлена", {
      description: "Она сразу появится в ежедневной записи.",
      icon: <Target className="size-4 text-gold" strokeWidth={1.8} />,
    });
  };

  const startEdit = (goal: GoalDef) => {
    setEditingId(goal.id);
    setEditTitle(goal.title);
    setEditType(goal.type);
    setEditUnit(goal.unit ?? "hours");
    setConfirmId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
  };

  const commitEdit = (id: string, force = false) => {
    const clean = editTitle.trim();
    if (!clean) return;
    const goal = dayGoals.find((item) => item.id === id);
    const changesType =
      goal &&
      (goal.type !== editType ||
        (editType === "number" && goal.unit !== editUnit));
    if (!force && changesType) {
      setConfirmTypeChange(true);
      return;
    }
    saveDayGoals(
      dayGoals.map((item) =>
        item.id === id
          ? {
              ...item,
              title: clean,
              type: editType,
              ...(editType === "number" ? { unit: editUnit } : {}),
            }
          : item,
      ),
    );
    setEditingId(null);
    setConfirmTypeChange(false);
    toast.success("Цель обновлена");
  };

  const remove = (id: string) => {
    if (confirmId !== id) {
      setConfirmId(id);
      return;
    }
    const goal = dayGoals.find((item) => item.id === id);
    saveDayGoals(dayGoals.filter((item) => item.id !== id));
    setConfirmId(null);
    if (editingId === id) setEditingId(null);
    toast.success("Цель удалена", {
      description: goal ? `${goal.title} убрана из ежедневки.` : undefined,
    });
  };

  return (
    <Card className="animate-fade-up overflow-hidden" style={{ animationDelay: "120ms" }}>
      <div className="flex flex-col gap-3 border-b border-line/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[15px] font-medium tracking-tight">Цели на день</h2>
          <p className="mt-0.5 text-[11px] text-muted">
            Отдельный список для ежедневных фактов. Без месячного плана — только то,
            что важно отметить сегодня.
          </p>
        </div>
        <Badge variant="gold">{dayGoals.length} целей</Badge>
      </div>

      <div className="border-b border-line/40 bg-raised/20 px-5 py-4">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-end">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="new-day-goal-title">Новая цель на день</Label>
            <Input
              id="new-day-goal-title"
              value={title}
              maxLength={60}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  add();
                }
              }}
              placeholder="Например: чтение, английский, вода"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-ink">Тип</span>
            <Segmented
              value={type}
              onChange={setType}
              options={[
                { value: "number", label: "Число" },
                { value: "check", label: "Галочка" },
              ]}
            />
          </div>
          {type === "number" && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-ink">Единица</span>
              <Select
                value={unit}
                onChange={(event) => setUnit(event.target.value as GoalUnit)}
                className="h-10 w-full lg:w-[120px]"
                aria-label="Единица цели"
              >
                <option value="hours">Часы</option>
                <option value="money">Деньги</option>
              </Select>
            </div>
          )}
          <Button variant="primary" onClick={add} disabled={!title.trim()} className="shrink-0">
            <Plus className="size-4" strokeWidth={2} />
            Добавить
          </Button>
        </div>
      </div>

      {dayGoals.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <span className="flex size-10 items-center justify-center rounded-xl border border-gold/20 bg-gold/[0.06]">
            <Target className="size-5 text-gold" strokeWidth={1.5} />
          </span>
          <p className="text-[12px] text-ink">Добавьте цели — они появятся в ежедневной записи</p>
          <p className="max-w-sm text-[11px] leading-relaxed text-muted">
            Например, «Английский — 1 час» или «Без сахара» с галочкой. Эти цели не
            смешиваются с планом месяца.
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {dayGoals.map((goal) => {
            const editing = editingId === goal.id;
            const value = goalDailyValue(data, goal, today);
            const fact =
              goal.type === "check"
                ? value
                  ? "выполнено"
                  : "не отмечено"
                : goalValueText(goal, typeof value === "number" ? value : 0, currency);

            if (editing) {
              return (
                <div
                  key={goal.id}
                  className="flex flex-col gap-3 border-b border-line/40 px-5 py-4 last:border-0"
                >
                  <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
                    <Input
                      value={editTitle}
                      maxLength={60}
                      autoFocus
                      onChange={(event) => setEditTitle(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          commitEdit(goal.id);
                        }
                        if (event.key === "Escape") cancelEdit();
                      }}
                      className="h-9 flex-1"
                      aria-label="Название цели"
                    />
                    <Segmented
                      value={editType}
                      onChange={setEditType}
                      options={[
                        { value: "number", label: "Число" },
                        { value: "check", label: "Галочка" },
                      ]}
                    />
                    {editType === "number" && (
                      <Select
                        value={editUnit}
                        onChange={(event) => setEditUnit(event.target.value as GoalUnit)}
                        className="h-9 w-full lg:w-[120px]"
                        aria-label="Единица цели"
                      >
                        <option value="hours">Часы</option>
                        <option value="money">Деньги</option>
                      </Select>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[10px] leading-relaxed text-muted">
                      При смене типа прошлые факты не конвертируются. Они останутся в
                      истории как были.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => commitEdit(goal.id)}
                        disabled={!editTitle.trim()}
                      >
                        <Check className="size-3.5" />
                        Сохранить
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelEdit}>
                        <X className="size-3.5" />
                        Отмена
                      </Button>
                    </div>
                  </div>
                </div>
              );
            }

            const Icon = goal.type === "check" ? CheckSquare : goal.unit === "money" ? Wallet : Hash;

            return (
              <div
                key={goal.id}
                className="group flex flex-col gap-3 border-b border-line/40 px-5 py-3.5 transition-colors last:border-0 hover:bg-hover/20 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-xl border",
                      goal.type === "check"
                        ? "border-success/25 bg-success/[0.06]"
                        : "border-gold/25 bg-gold/[0.07]",
                    )}
                    aria-hidden
                  >
                    <Icon
                      className={cn(
                        "size-4",
                        goal.type === "check" ? "text-success" : "text-gold",
                      )}
                      strokeWidth={1.6}
                    />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-ink">{goal.title}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted">
                      <span>{goalTypeText(goal)}</span>
                      <span className="text-muted/40">·</span>
                      <span>сегодня: {fact}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:justify-end">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => startEdit(goal)}
                    aria-label={`Редактировать ${goal.title}`}
                  >
                    <Pencil className="size-3.5" strokeWidth={1.6} />
                  </Button>
                  <Button
                    size="sm"
                    variant={confirmId === goal.id ? "danger" : "ghost"}
                    onClick={() => remove(goal.id)}
                    onBlur={() => setConfirmId(null)}
                    aria-label={`Удалить ${goal.title}`}
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.6} />
                    {confirmId === goal.id && <span className="text-[11px]">Точно?</span>}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={confirmTypeChange} onOpenChange={setConfirmTypeChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Изменить тип цели?</DialogTitle>
            <DialogDescription>
              Настройки «{editTitle || "цель"}» изменятся. Старые факты за дни не будут
              конвертированы — история останется как была.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmTypeChange(false)}>
              Отмена
            </Button>
            <Button
              variant="primary"
              onClick={() => editingId && commitEdit(editingId, true)}
            >
              Продолжить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
