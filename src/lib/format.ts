import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

export const ISO = "yyyy-MM-dd";

export function todayISO() {
  return format(new Date(), ISO);
}

export function toISO(date: Date) {
  return format(date, ISO);
}

export function fromISO(value: string) {
  return parseISO(value);
}

export function monthOf(date: string | Date) {
  return format(typeof date === "string" ? fromISO(date) : date, "yyyy-MM");
}

export function monthLabel(month: string, opts: { short?: boolean } = {}) {
  const date = fromISO(`${month}-01`);
  return format(date, opts.short ? "LLL" : "LLLL yyyy", { locale: ru });
}

export function monthShort(month: string) {
  return monthLabel(month, { short: true }).replace(".", "");
}

export function dayLabel(date: string, pattern = "d MMMM") {
  return format(fromISO(date), pattern, { locale: ru });
}

export function weekdayShort(date: string) {
  return format(fromISO(date), "EEEEE", { locale: ru });
}

export function weekdayLong(date: string) {
  return format(fromISO(date), "EEEE", { locale: ru });
}

export function plural(n: number, one: string, few: string, many: string) {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

export function daysWord(n: number) {
  return plural(n, "день", "дня", "дней");
}

export function hoursWord(n: number) {
  return plural(n, "час", "часа", "часов");
}

export function monthsWord(n: number) {
  return plural(n, "месяц", "месяца", "месяцев");
}

export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatHours(value: number) {
  if (!value) return "0";
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(1).replace(".", ",");
}

export function formatMoney(value: number, currency = "₽", withCurrency = true) {
  const rounded = Math.round(value);
  const formatted = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 })
    .format(rounded)
    .replace(/\u00a0/g, " ");
  return withCurrency ? `${formatted} ${currency}` : formatted;
}

export function formatCompactMoney(value: number, currency = "₽") {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1).replace(".", ",")} млн ${currency}`;
  }
  if (Math.abs(value) >= 100_000) {
    return `${Math.round(value / 1000)} тыс ${currency}`;
  }
  return formatMoney(value, currency);
}

export function formatPercent(value: number, digits = 0) {
  return `${value.toFixed(digits).replace(".", ",")}%`;
}
