"use client";

import Link from "next/link";
import { Check, Clock3, ListChecks, RotateCcw, Sparkles, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatHours } from "@/lib/format";
import { goalWeekHours, hourGoalList } from "@/lib/selectors";
import { useAppStore } from "@/lib/store";

interface HoursFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: string[] | null;
  onSelectedChange: (ids: string[] | null) => void;
}

export function HoursFilterDialog({
  open,
  onOpenChange,
  selected,
  onSelectedChange,
}: HoursFilterDialogProps) {
  const data = useAppStore();
  const goals = hourGoalList(data);
  const monthIds = goals.filter((item) => item.scope === "month").map((item) => item.goal.id);
  const allIds = goals.map((item) => item.goal.id);

  const isAll = selected === null;
  const isMonth =
    !isAll &&
    monthIds.length > 0 &&
    selected.length === monthIds.length &&
    monthIds.every((id) => selected.includes(id));

  const toggle = (id: string) => {
    const current = selected ?? allIds;
    const next = current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id];
    onSelectedChange(next);
  };

  const counted = goals.filter(
    (item) => selected === null || selected.includes(item.goal.id),
  );
  const totalHours = counted.reduce(
    (sum, item) => sum + goalWeekHours(data, item.goal.id),
    0,
  );
  const filtered = selected !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px] overflow-hidden p-0">
        <div className="flex max-h-[90dvh] flex-col">
          <div className="shrink-0 border-b border-line/60 px-5 pb-4 pt-5">
            <div className="label-micro mb-1.5 flex items-center gap-2">
              <Sparkles className="size-3 text-gold" strokeWidth={1.6} />
              Фильтр недели
            </div>
            <DialogTitle className="text-[22px] font-semibold tracking-tight">
              Часы на этой неделе
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs">
              Выбери, какие цели в часах считать. Цифра и график пересчитаются сразу.
            </DialogDescription>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                size="sm"
                variant={isAll ? "primary" : "secondary"}
                onClick={() => onSelectedChange(null)}
              >
                <ListChecks className="size-3.5" />
                Все цели
              </Button>
              <Button
                type="button"
                size="sm"
                variant={isMonth ? "primary" : "secondary"}
                onClick={() => onSelectedChange(monthIds)}
                disabled={monthIds.length === 0}
              >
                <Target className="size-3.5" />
                Только цели месяца
              </Button>
              <Button
                type="button"
                size="sm"
                variant={!isAll && !isMonth ? "primary" : "secondary"}
                onClick={() =>
                  onSelectedChange(selected === null ? allIds : selected)
                }
                disabled={goals.length === 0}
              >
                <Check className="size-3.5" />
                Выбрать вручную
              </Button>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {goals.length === 0 ? (
                <div className="rounded-xl border border-dashed border-line/70 bg-raised/20 px-4 py-4 text-center">
                  <p className="text-[12px] text-ink">Нет целей в часах</p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    Добавь числовую цель с единицей «часы» на вкладке «Цели» — и она
                    появится здесь.
                  </p>
                  <Button asChild variant="outline" size="sm" className="mt-3">
                    <Link href="/goals" onClick={() => onOpenChange(false)}>
                      Перейти к целям
                    </Link>
                  </Button>
                </div>
              ) : (
                goals.map(({ goal, scope }) => {
                  const checked = selected === null || selected.includes(goal.id);
                  const hours = goalWeekHours(data, goal.id);
                  return (
                    <Checkbox
                      key={goal.id}
                      checked={checked}
                      onCheckedChange={() => toggle(goal.id)}
                      label={
                        <span className="flex min-w-0 flex-1 items-center gap-2">
                          <span className="truncate text-[12px] font-medium text-ink">
                            {goal.title}
                          </span>
                          <Badge
                            variant={scope === "month" ? "gold" : "outline"}
                            className="ml-auto shrink-0"
                          >
                            {scope === "month" ? "месяц" : "день"}
                          </Badge>
                        </span>
                      }
                      description={
                        <span className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1">
                            <Clock3 className="size-3" strokeWidth={1.6} />
                            за неделю
                          </span>
                          <span className="num shrink-0">
                            {hours > 0 ? `${formatHours(hours)} ч` : "нет часов"}
                          </span>
                        </span>
                      }
                    />
                  );
                })
              )}
            </div>

            {goals.length > 0 && (
              <div className="mt-4 flex items-center justify-between rounded-xl border border-line/60 bg-raised/30 px-3.5 py-2.5">
                <span className="text-[11px] text-muted">
                  Учтено целей: <span className="num text-ink">{counted.length}</span> из{" "}
                  <span className="num">{goals.length}</span>
                </span>
                <span className="num text-[13px] font-semibold text-gold">
                  {formatHours(totalHours)} ч
                </span>
              </div>
            )}

            <p className="mt-3 text-[10px] leading-relaxed text-muted/80">
              В недельную сумму попадают только числовые цели с единицей «часы».
              Галочки и деньги не влияют на эту карточку.
            </p>
          </div>

          <DialogFooter className="shrink-0 justify-between sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!filtered}
              onClick={() => onSelectedChange(null)}
            >
              <RotateCcw className="size-3.5" />
              Сбросить
            </Button>
            <Button type="button" variant="primary" onClick={() => onOpenChange(false)}>
              Готово
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
