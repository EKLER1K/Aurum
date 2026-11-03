"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BellOff,
  BellRing,
  Pencil,
  Plus,
  RefreshCw,
  Smartphone,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { ReminderEditorDialog } from "@/components/reminder-editor-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { plural, todayISO } from "@/lib/format";
import { MAX_REMINDERS, isDayLogged } from "@/lib/reminders";
import {
  type ReminderPermission,
  checkReminderPermission,
  isReminderPlatform,
  requestReminderPermission,
  syncReminders,
} from "@/lib/reminder-scheduler";
import { useAppStore } from "@/lib/store";
import type { ReminderRule } from "@/lib/types";
import { cn } from "@/lib/utils";

type Platform = "checking" | "android" | "other";

const EMPTY_PERMISSION: ReminderPermission = "unsupported";

export function RemindersCard() {
  const reminders = useAppStore((state) => state.settings.reminders);
  const enabled = useAppStore((state) => state.settings.remindersEnabled);
  const setRemindersEnabled = useAppStore((state) => state.setRemindersEnabled);
  const saveReminder = useAppStore((state) => state.saveReminder);
  const deleteReminder = useAppStore((state) => state.deleteReminder);

  const [platform, setPlatform] = useState<Platform>("checking");
  const [permission, setPermission] = useState<ReminderPermission>(EMPTY_PERMISSION);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ReminderRule | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    const android = isReminderPlatform();
    setPlatform(android ? "android" : "other");
    if (!android) return;
    void checkReminderPermission().then(setPermission);
  }, []);

  const refreshSchedule = useCallback(async (notify: boolean) => {
    const state = useAppStore.getState();
    const result = await syncReminders(
      state.settings.reminders,
      state.settings.remindersEnabled,
      { skipToday: isDayLogged(state.entries[todayISO()]) },
    );

    if (result.status === "scheduled") {
      if (notify) {
        toast.success("Расписание обновлено", {
          description: `${result.count} ${plural(result.count, "напоминание", "напоминания", "напоминаний")} в день${
            result.exact ? "" : " · Android ограничил точность"
          }`,
        });
      }
    } else if (result.status === "permission") {
      setPermission("denied");
      if (notify) {
        toast.error("Уведомления запрещены", {
          description: "Разреши их в настройках Android: Приложения → Aurum → Уведомления.",
        });
      }
    } else if (result.status === "error") {
      toast.error("Не удалось обновить расписание", {
        description: result.message,
      });
    }

    return result;
  }, []);

  const handleToggleMaster = async (next: boolean) => {
    setRemindersEnabled(next);

    if (!next) {
      await refreshSchedule(false);
      toast.success("Напоминания выключены");
      return;
    }

    if (!isReminderPlatform()) return;

    const nextPermission = await requestReminderPermission();
    setPermission(nextPermission);

    if (nextPermission === "granted") {
      await refreshSchedule(true);
    } else {
      toast.error("Нужно разрешение на уведомления", {
        description: "Без него Android не покажет напоминания. Разрешить можно в настройках системы.",
      });
    }
  };

  const handleToggleRule = (rule: ReminderRule, next: boolean) => {
    saveReminder({ ...rule, enabled: next });
    void refreshSchedule(false);
  };

  const handleDelete = (rule: ReminderRule) => {
    if (confirmDelete !== rule.id) {
      setConfirmDelete(rule.id);
      return;
    }

    setConfirmDelete(null);
    deleteReminder(rule.id);
    toast.success("Напоминание удалено");
    void refreshSchedule(false);
  };

  const handleRetryPermission = async () => {
    const next = await requestReminderPermission();
    setPermission(next);

    if (next === "granted") {
      await refreshSchedule(true);
      toast.success("Разрешение получено");
    } else {
      toast.error("Разрешение не выдано", {
        description: "Открой настройки Android: Приложения → Aurum → Уведомления.",
      });
    }
  };

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (rule: ReminderRule) => {
    setEditing(rule);
    setEditorOpen(true);
  };

  const activeCount = reminders.filter((rule) => rule.enabled).length;
  const android = platform === "android";
  const needsPermission =
    android && enabled && activeCount > 0 && permission !== "granted";

  return (
    <Card
      className="animate-fade-up overflow-hidden lg:col-span-2"
      style={{ animationDelay: "50ms" }}
    >
      <div className="flex items-start justify-between gap-3 border-b border-line/50 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-line/70 bg-raised/60">
            <BellRing className="size-4 text-muted" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-[14px] font-medium tracking-tight">Напоминания</h2>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
              Ежедневные уведомления на Android — локально, без сервера
            </p>
          </div>
        </div>
        <Badge variant={enabled ? "gold" : "outline"}>
          {enabled ? "включены" : "выключены"}
        </Badge>
      </div>

      <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-line/70 bg-raised/50">
            {enabled ? (
              <BellRing className="size-4 text-gold" strokeWidth={1.5} />
            ) : (
              <BellOff className="size-4 text-muted" strokeWidth={1.5} />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[12px] font-medium text-ink">
              {enabled ? "Расписание активно" : "Напоминания выключены"}
            </div>
            <p className="mt-1 max-w-md text-[10px] leading-relaxed text-muted">
              {enabled
                ? `${activeCount} ${plural(activeCount, "правило", "правила", "правил")} срабатывает каждый день`
                : "Правила остаются на месте — включи, когда будешь готов"}
            </p>
          </div>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={handleToggleMaster}
          label="Локальные напоминания"
        />
      </div>

      {reminders.length === 0 ? (
        <div className="flex flex-col items-center gap-2 border-t border-line/50 px-5 py-8 text-center">
          <BellOff className="size-5 text-muted" strokeWidth={1.4} />
          <p className="text-[11px] text-muted">Правил пока нет. Добавь первое — например, на 19:00.</p>
        </div>
      ) : (
        <div className="divide-y divide-line/40 border-t border-line/50">
          {reminders.map((rule) => (
            <div
              key={rule.id}
              className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:gap-3"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span
                  className={cn(
                    "num shrink-0 pt-0.5 text-[15px] font-semibold",
                    rule.enabled && enabled ? "text-gold" : "text-muted",
                  )}
                >
                  {rule.time}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-[12px] font-medium text-ink">
                      {rule.title}
                    </span>
                    {!rule.enabled && <Badge variant="outline">пауза</Badge>}
                  </div>
                  {rule.body && (
                    <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-muted">
                      {rule.body}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-1 sm:shrink-0">
                <Switch
                  checked={rule.enabled}
                  onCheckedChange={(next) => handleToggleRule(rule, next)}
                  label={`Правило ${rule.time}`}
                  size="sm"
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => openEdit(rule)}
                  aria-label={`Изменить напоминание ${rule.time}`}
                >
                  <Pencil className="size-3.5" strokeWidth={1.6} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(rule)}
                  aria-label={`Удалить напоминание ${rule.time}`}
                  title={confirmDelete === rule.id ? "Нажми ещё раз" : "Удалить"}
                  className={cn(confirmDelete === rule.id && "bg-danger/10 text-danger")}
                >
                  <Trash2 className="size-3.5" strokeWidth={1.6} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-line/50 px-5 py-3.5">
        <span className="text-[10px] text-muted">
          {activeCount} из {reminders.length} активны
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={openCreate}
          disabled={reminders.length >= MAX_REMINDERS}
        >
          <Plus className="size-3.5" strokeWidth={1.6} />
          Добавить
        </Button>
      </div>

      {platform === "other" && (
        <div className="flex items-start gap-2 border-t border-line/50 bg-raised/20 px-5 py-3">
          <Smartphone className="mt-0.5 size-3.5 shrink-0 text-muted" strokeWidth={1.5} />
          <p className="text-[10px] leading-relaxed text-muted">
            В браузере и Windows уведомления не отправляются. Правила сохраняются, попадают в
            резервную копию и заработают в Android-приложении.
          </p>
        </div>
      )}

      {android && needsPermission && (
        <div className="flex flex-col gap-2 border-t border-line/50 bg-danger/[0.045] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-danger" strokeWidth={1.6} />
            <p className="text-[10px] leading-relaxed text-muted">
              Android не разрешил уведомления. Без разрешения расписание не сработает.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0"
            onClick={handleRetryPermission}
          >
            <RefreshCw className="size-3.5" strokeWidth={1.6} />
            Проверить снова
          </Button>
        </div>
      )}

      {android && enabled && activeCount > 0 && permission === "granted" && (
        <div className="flex items-start gap-2 border-t border-line/50 bg-success/[0.04] px-5 py-3">
          <BellRing className="mt-0.5 size-3.5 shrink-0 text-success" strokeWidth={1.5} />
          <p className="text-[10px] leading-relaxed text-muted">
            Расписание активно. Уведомления приходят даже при закрытом приложении.
          </p>
        </div>
      )}

      <ReminderEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        rule={editing}
        onSaved={() => void refreshSchedule(false)}
      />
    </Card>
  );
}
