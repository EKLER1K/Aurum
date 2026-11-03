import { Capacitor } from "@capacitor/core";
import { parseReminderTime } from "./reminders";
import type { ReminderRule } from "./types";

/** Канал уведомлений в Android: один на все правила. */
export const REMINDER_CHANNEL_ID = "aurum-reminders";

/** Свой диапазон id, чтобы не пересечься с чужими уведомлениями. */
const REMINDER_ID_BASE = 8300;
const REMINDER_ID_SPAN = 64;

export type ReminderPermission = "granted" | "denied" | "prompt" | "unsupported";

export type ReminderSyncStatus =
  | "scheduled"
  | "disabled"
  | "unsupported"
  | "permission"
  | "error";

export interface ReminderSyncResult {
  status: ReminderSyncStatus;
  /** Сколько правил реально поставлено в расписание. */
  count: number;
  /** false, если Android не разрешил точные будильники и сработает неточно. */
  exact: boolean;
  message?: string;
}

export interface ReminderSyncOptions {
  /** День уже записан: сегодняшние напоминания не нужны, стартуем с завтрашнего дня. */
  skipToday?: boolean;
}

/**
 * Напоминания живут только в Android-сборке.
 * В браузере и Windows-приложении все вызовы — no-op.
 */
export function isReminderPlatform(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

function loadPlugin() {
  return import("@capacitor/local-notifications");
}

async function ensureChannel(
  notifications: Awaited<ReturnType<typeof loadPlugin>>["LocalNotifications"],
) {
  await notifications.createChannel({
    id: REMINDER_CHANNEL_ID,
    name: "Напоминания Aurum",
    description: "Ежедневные напоминания записать день",
    importance: 4,
    visibility: 1,
    vibration: true,
    lights: true,
    lightColor: "#D4A853",
  });
}

async function cancelOwnNotifications(
  notifications: Awaited<ReturnType<typeof loadPlugin>>["LocalNotifications"],
) {
  const pending = await notifications.getPending();
  const mine = pending.notifications
    .filter(
      (item) =>
        item.id >= REMINDER_ID_BASE && item.id < REMINDER_ID_BASE + REMINDER_ID_SPAN,
    )
    .map((item) => ({ id: item.id }));

  if (mine.length > 0) {
    await notifications.cancel({ notifications: mine });
  }
}

export async function checkReminderPermission(): Promise<ReminderPermission> {
  if (!isReminderPlatform()) return "unsupported";

  try {
    const { LocalNotifications } = await loadPlugin();
    const status = await LocalNotifications.checkPermissions();
    if (status.display === "granted") return "granted";
    if (status.display === "denied") return "denied";
    return "prompt";
  } catch {
    return "denied";
  }
}

/** Явный запрос разрешения — только по действию пользователя. */
export async function requestReminderPermission(): Promise<ReminderPermission> {
  if (!isReminderPlatform()) return "unsupported";

  try {
    const { LocalNotifications } = await loadPlugin();
    const current = await LocalNotifications.checkPermissions();
    if (current.display === "granted") return "granted";

    const result = await LocalNotifications.requestPermissions();
    if (result.display === "granted") return "granted";
    if (result.display === "denied") return "denied";
    return "prompt";
  } catch {
    return "denied";
  }
}

/**
 * Пересобирает расписание целиком: снимает все прошлые правила и ставит
 * включённые заново. Вызовы сериализуются, чтобы быстрые правки не гонялись.
 */
let queue: Promise<void> = Promise.resolve();

export function syncReminders(
  rules: ReminderRule[],
  enabled: boolean,
  options: ReminderSyncOptions = {},
): Promise<ReminderSyncResult> {
  const task = queue.then(
    () => runSync(rules, enabled, options),
    () => runSync(rules, enabled, options),
  );
  queue = task.then(
    () => undefined,
    () => undefined,
  );
  return task;
}

async function runSync(
  rules: ReminderRule[],
  enabled: boolean,
  options: ReminderSyncOptions = {},
): Promise<ReminderSyncResult> {
  if (!isReminderPlatform()) {
    return { status: "unsupported", count: 0, exact: true };
  }

  try {
    const { LocalNotifications } = await loadPlugin();

    await ensureChannel(LocalNotifications);
    await cancelOwnNotifications(LocalNotifications);

    if (!enabled) {
      return { status: "disabled", count: 0, exact: true };
    }

    const permission = await LocalNotifications.checkPermissions();
    if (permission.display !== "granted") {
      return { status: "permission", count: 0, exact: true };
    }

    const active = rules.filter((rule) => rule.enabled && parseReminderTime(rule.time));
    if (active.length === 0) {
      return { status: "disabled", count: 0, exact: true };
    }

    const now = new Date();
    const skipToday = Boolean(options.skipToday);

    const result = await LocalNotifications.schedule({
      notifications: active.map((rule, index) => {
        const time = parseReminderTime(rule.time)!;
        const todayAt = new Date(now);
        todayAt.setHours(time.hour, time.minute, 0, 0);

        // День уже записан — сегодняшнее напоминание пропускаем, но повтор оставляем.
        const pushToTomorrow = skipToday && todayAt.getTime() > now.getTime();
        const schedule = pushToTomorrow
          ? {
              at: new Date(todayAt.getTime() + 24 * 60 * 60 * 1000),
              every: "day" as const,
              repeats: true,
              allowWhileIdle: true,
            }
          : {
              on: { hour: time.hour, minute: time.minute },
              repeats: true,
              allowWhileIdle: true,
            };

        return {
          id: REMINDER_ID_BASE + index,
          title: rule.title,
          body: rule.body,
          channelId: REMINDER_CHANNEL_ID,
          smallIcon: "ic_stat_aurum",
          iconColor: "#D4A853",
          schedule,
          extra: { reminderId: rule.id },
        };
      }),
    });

    return {
      status: "scheduled",
      count: active.length,
      exact: !result.warning,
      message: result.warning?.message,
    };
  } catch (error) {
    return {
      status: "error",
      count: 0,
      exact: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
