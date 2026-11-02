"use client";

import { useEffect, useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { BADGE_ICONS } from "@/components/badge-icon";
import { BadgeMedal } from "@/components/badge-medal";
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
import { Segmented } from "@/components/ui/segmented";
import { Textarea } from "@/components/ui/textarea";
import {
  ACHIEVEMENT_UNITS,
  type AchievementUnit,
  type BadgeIcon,
  type ResolvedBadge,
  unitForBadge,
} from "@/lib/achievements";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface AchievementEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null — создание своего достижения, иначе правка выбранного. */
  badge: ResolvedBadge | null;
}

const ICON_KEYS = Object.keys(BADGE_ICONS) as BadgeIcon[];

export function AchievementEditorDialog({
  open,
  onOpenChange,
  badge,
}: AchievementEditorDialogProps) {
  const saveAchievement = useAppStore((state) => state.saveAchievement);
  const deleteAchievement = useAppStore((state) => state.deleteAchievement);
  const reconcileAchievements = useAppStore((state) => state.reconcileAchievements);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState("1");
  const [unit, setUnit] = useState<AchievementUnit>("days");
  const [icon, setIcon] = useState<BadgeIcon>("spark");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(badge?.title ?? "");
    setDescription(badge?.description ?? "");
    setTarget(badge ? String(badge.target) : "1");
    setUnit(badge ? unitForBadge(badge) : "days");
    setIcon(badge?.icon ?? "spark");
    setError(null);
  }, [open, badge]);

  const builtIn = Boolean(badge?.builtIn);
  const parsedTarget = Number(target.replace(",", "."));
  const validTarget = Number.isFinite(parsedTarget) && parsedTarget > 0;
  const canSave = title.trim().length > 0 && validTarget;

  const handleSave = () => {
    if (!title.trim()) {
      setError("Название не может быть пустым.");
      return;
    }
    if (!validTarget) {
      setError("Цель должна быть больше нуля.");
      return;
    }

    saveAchievement({
      id: badge?.id,
      title: title.trim(),
      description: description.trim(),
      target: parsedTarget,
      unit,
      icon,
    });
    reconcileAchievements();
    toast.success(badge ? "Достижение обновлено" : "Достижение создано");
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!badge) return;
    deleteAchievement(badge.id);
    toast.success("Достижение удалено");
    onOpenChange(false);
  };

  const preview: ResolvedBadge = {
    id: badge?.id ?? "preview",
    title: title.trim() || "Новое достижение",
    description: description.trim() || "Описание появится здесь",
    group: badge?.group ?? "Особые",
    icon,
    target: validTarget ? parsedTarget : 1,
    unit,
    builtIn,
    metric: badge?.metric ?? (() => 0),
    format: badge?.format ?? ((value: number) => String(value)),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px] overflow-hidden p-0">
        <div className="flex max-h-[92dvh] flex-col">
          <div className="shrink-0 border-b border-line/60 px-4 pb-4 pt-5 sm:px-5">
            <div className="label-micro mb-1.5">Режим администратора</div>
            <DialogTitle className="text-[22px] font-semibold tracking-tight">
              {badge ? (builtIn ? "Изменить встроенное" : "Изменить достижение") : "Новое достижение"}
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs">
              {builtIn
                ? "Название, описание, цель и иконку можно менять. Метрика остаётся встроенной."
                : "Своё достижение считается по выбранной единице и попадает в группу «Особые»."}
            </DialogDescription>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            <div className="flex items-center gap-3 rounded-xl border border-line/60 bg-raised/30 p-3">
              <BadgeMedal badge={preview} unlocked size="md" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-medium text-ink">{preview.title}</div>
                <div className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-muted">
                  {preview.description}
                </div>
              </div>
              <span className="num shrink-0 text-[11px] text-gold">
                {validTarget ? parsedTarget : "—"}
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="achievement-title">Название</Label>
                <Input
                  id="achievement-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Например, 100 дней дисциплины"
                  maxLength={60}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="achievement-description">Описание</Label>
                <Textarea
                  id="achievement-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Что нужно сделать, чтобы открыть бейдж"
                  maxLength={200}
                  className="min-h-[64px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="achievement-target">Цель</Label>
                  <Input
                    id="achievement-target"
                    type="number"
                    inputMode="decimal"
                    min={1}
                    value={target}
                    onChange={(event) => setTarget(event.target.value)}
                    className="num"
                  />
                </div>
                {builtIn ? (
                  <div className="flex flex-col gap-1.5">
                    <Label>Единица</Label>
                    <div className="flex h-10 items-center rounded-xl border border-line/60 bg-raised/20 px-3 text-[12px] text-muted">
                      Встроенная метрика
                    </div>
                  </div>
                ) : null}
              </div>

              {!builtIn && (
                <div className="flex flex-col gap-1.5">
                  <Label>Единица</Label>
                  <Segmented
                    value={unit}
                    onChange={setUnit}
                    options={ACHIEVEMENT_UNITS}
                    size="md"
                    className="w-full justify-between"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label>Иконка</Label>
                <div className="grid grid-cols-6 gap-1.5">
                  {ICON_KEYS.map((key) => {
                    const Icon = BADGE_ICONS[key];
                    const active = key === icon;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setIcon(key)}
                        aria-label={`Иконка ${key}`}
                        aria-pressed={active}
                        className={cn(
                          "flex h-9 items-center justify-center rounded-lg border transition-colors duration-150",
                          active
                            ? "border-gold/40 bg-gold/10 text-gold"
                            : "border-line/70 bg-raised/40 text-muted hover:text-ink",
                        )}
                      >
                        <Icon className="size-4" strokeWidth={1.6} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && <p className="text-xs text-danger">{error}</p>}
            </div>
          </div>

          <DialogFooter className="shrink-0 justify-between px-4 sm:justify-between sm:px-5">
            {badge ? (
              <Button type="button" variant="ghost" size="sm" onClick={handleDelete}>
                <Trash2 className="size-3.5" />
                Удалить
              </Button>
            ) : (
              <span className="hidden text-[10px] text-muted sm:block">
                Изменения сохраняются локально
              </span>
            )}
            <div className="flex w-full gap-2 sm:w-auto">
              <Button
                type="button"
                variant="secondary"
                className="flex-1 sm:flex-none"
                onClick={() => onOpenChange(false)}
              >
                Отмена
              </Button>
              <Button
                type="button"
                variant="primary"
                className="flex-1 sm:flex-none"
                onClick={handleSave}
                disabled={!canSave}
              >
                <Save className="size-3.5" />
                Сохранить
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
