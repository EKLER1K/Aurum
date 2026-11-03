"use client";

import { useEffect, useState } from "react";
import { BellRing, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { createReminderId, isReminderTime } from "@/lib/reminders";
import { useAppStore } from "@/lib/store";
import type { ReminderRule } from "@/lib/types";

interface ReminderEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null — создание нового правила, иначе правка выбранного. */
  rule: ReminderRule | null;
  onSaved?: () => void;
}

export function ReminderEditorDialog({
  open,
  onOpenChange,
  rule,
  onSaved,
}: ReminderEditorDialogProps) {
  const saveReminder = useAppStore((state) => state.saveReminder);
  const deleteReminder = useAppStore((state) => state.deleteReminder);

  const [time, setTime] = useState("12:00");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTime(rule?.time ?? "12:00");
    setTitle(rule?.title ?? "");
    setBody(rule?.body ?? "");
    setEnabled(rule?.enabled ?? true);
    setError(null);
  }, [open, rule]);

  const handleSave = () => {
    if (!isReminderTime(time)) {
      setError("Укажи время в формате ЧЧ:ММ.");
      return;
    }

    saveReminder({
      id: rule?.id ?? createReminderId(),
      time,
      title: title.trim().slice(0, 60) || "Напоминание",
      body: body.trim().slice(0, 200),
      enabled,
    });

    toast.success(rule ? "Напоминание обновлено" : "Напоминание добавлено");
    onOpenChange(false);
    onSaved?.();
  };

  const handleDelete = () => {
    if (!rule) return;
    deleteReminder(rule.id);
    toast.success("Напоминание удалено");
    onOpenChange(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px] overflow-hidden p-0">
        <div className="flex max-h-[92dvh] flex-col">
          <div className="shrink-0 border-b border-line/60 px-4 pb-4 pt-5 sm:px-5">
            <div className="label-micro mb-1.5">Локальные напоминания</div>
            <DialogTitle className="text-[22px] font-semibold tracking-tight">
              {rule ? "Изменить напоминание" : "Новое напоминание"}
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs">
              Уведомление повторяется каждый день в указанное время. Работает в Android-приложении.
            </DialogDescription>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            <div className="flex items-center gap-3 rounded-xl border border-line/60 bg-raised/30 p-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-gold/25 bg-gold/10">
                <BellRing className="size-4 text-gold" strokeWidth={1.6} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="num text-[18px] font-semibold leading-none text-gold">
                  {isReminderTime(time) ? time : "--:--"}
                </div>
                <div className="mt-1 truncate text-[11px] text-muted">
                  {title.trim() || "Напоминание"} · каждый день
                </div>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={setEnabled}
                label="Правило включено"
                size="sm"
              />
            </div>

            <div className="mt-4 flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reminder-time">Время</Label>
                <Input
                  id="reminder-time"
                  type="time"
                  step={60}
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  className="num"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reminder-title">Заголовок</Label>
                <Input
                  id="reminder-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Например, Итоги дня"
                  maxLength={60}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reminder-body">Текст уведомления</Label>
                <Textarea
                  id="reminder-body"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Короткая фраза, которая появится на экране"
                  maxLength={200}
                  className="min-h-[64px]"
                />
              </div>

              {error && <p className="text-xs text-danger">{error}</p>}
            </div>
          </div>

          <DialogFooter className="shrink-0 justify-between px-4 sm:justify-between sm:px-5">
            {rule ? (
              <Button type="button" variant="ghost" size="sm" onClick={handleDelete}>
                <Trash2 className="size-3.5" />
                Удалить
              </Button>
            ) : (
              <span className="hidden text-[10px] text-muted sm:block">
                Правило сохраняется на устройстве
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
