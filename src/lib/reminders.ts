import type { DayEntry, ReminderRule } from "./types";

/** Больше правил — больше шансов, что пользователь запутается в расписании. */
export const MAX_REMINDERS = 16;

export const REMINDER_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Три правила по умолчанию: утро, середина дня и вечер. */
export const DEFAULT_REMINDERS: ReminderRule[] = [
  {
    id: "reminder_morning",
    time: "09:30",
    title: "План на день",
    body: "Загляни в Aurum: отметь, что важно сделать сегодня.",
    enabled: true,
  },
  {
    id: "reminder_midday",
    time: "15:30",
    title: "Проверь прогресс",
    body: "Половина дня прошла — запиши часы и доход.",
    enabled: true,
  },
  {
    id: "reminder_evening",
    time: "19:00",
    title: "Итоги дня",
    body: "Закрой день: часы, доход и спорт.",
    enabled: true,
  },
];

export function defaultReminders(): ReminderRule[] {
  return DEFAULT_REMINDERS.map((rule) => ({ ...rule }));
}

export function isReminderTime(value: unknown): value is string {
  return typeof value === "string" && REMINDER_TIME_PATTERN.test(value);
}

export function parseReminderTime(time: string): { hour: number; minute: number } | null {
  if (!isReminderTime(time)) return null;
  const [hour, minute] = time.split(":").map(Number);
  return { hour, minute };
}

export function createReminderId(): string {
  return `reminder_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/** Сортировка по времени — так правила читаются как расписание дня. */
export function sortReminders(rules: ReminderRule[]): ReminderRule[] {
  return [...rules].sort((a, b) =>
    a.time === b.time ? a.id.localeCompare(b.id) : a.time.localeCompare(b.time),
  );
}

/**
 * День считается записанным, если в нём есть хоть какие-то данные.
 * Нужно, чтобы после заполнения дня оставшиеся напоминания на сегодня не срабатывали.
 */
export function isDayLogged(entry: DayEntry | undefined): boolean {
  if (!entry) return false;
  return (
    entry.workHours > 0 ||
    entry.workIncome > 0 ||
    entry.studyHours > 0 ||
    entry.youtubeHours > 0 ||
    entry.youtubeIncome > 0 ||
    entry.sportDone ||
    Boolean(entry.note?.trim())
  );
}

/**
 * Приводит правила из localStorage или резервной копии к безопасному виду.
 * Если поля нет вовсе (старый JSON) — возвращается fallback, по умолчанию три правила.
 */
export function sanitizeReminderRules(
  input: unknown,
  fallback: ReminderRule[] = defaultReminders(),
): ReminderRule[] {
  if (!Array.isArray(input)) return fallback.map((rule) => ({ ...rule }));

  const result: ReminderRule[] = [];
  const seen = new Set<string>();

  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    if (!isReminderTime(item.time)) continue;

    let id = typeof item.id === "string" ? item.id.trim().slice(0, 64) : "";
    if (!id || seen.has(id)) id = createReminderId();

    const title =
      typeof item.title === "string" && item.title.trim()
        ? item.title.trim().slice(0, 60)
        : "Напоминание";
    const body = typeof item.body === "string" ? item.body.trim().slice(0, 200) : "";

    seen.add(id);
    result.push({
      id,
      time: item.time,
      title,
      body,
      enabled: item.enabled === undefined ? true : Boolean(item.enabled),
    });

    if (result.length >= MAX_REMINDERS) break;
  }

  return sortReminders(result);
}
