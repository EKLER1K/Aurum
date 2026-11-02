import type { Snapshot } from "./selectors";
import type {
  AchievementGroup,
  AchievementOverride,
  AchievementUnit,
  BadgeIcon,
  CustomAchievement,
} from "./types";

export type { BadgeIcon };
export type { AchievementGroup, AchievementUnit };

export interface BadgeDef {
  id: string;
  title: string;
  description: string;
  group: AchievementGroup;
  icon: BadgeIcon;
  target: number;
  metric: (snapshot: Snapshot) => number;
  format: (value: number) => string;
}

/** Встроенное достижение после применения переопределений. */
export interface ResolvedBadge extends BadgeDef {
  builtIn: boolean;
  unit: AchievementUnit;
}

const money = (value: number) =>
  `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value).replace(/\u00a0/g, " ")} ₽`;

const hours = (value: number) =>
  `${Math.round(value * 10) / 10} ${value === 1 ? "час" : value < 5 ? "часа" : "часов"}`;

const days = (value: number) => `${Math.round(value)} дней`;

export const BADGES: BadgeDef[] = [
  {
    id: "first_spark",
    title: "Первая искра",
    description: "Заполни самый первый день",
    group: "Путь",
    icon: "spark",
    target: 1,
    metric: (s) => s.filledDays,
    format: days,
  },
  {
    id: "streak_7",
    title: "Неделя без пропусков",
    description: "Стрик 7 дней подряд",
    group: "Путь",
    icon: "flame",
    target: 7,
    metric: (s) => s.maxStreak,
    format: days,
  },
  {
    id: "streak_30",
    title: "Месяц дисциплины",
    description: "Стрик 30 дней подряд",
    group: "Путь",
    icon: "flame",
    target: 30,
    metric: (s) => s.maxStreak,
    format: days,
  },
  {
    id: "streak_100",
    title: "Сто дней огня",
    description: "Стрик 100 дней подряд",
    group: "Путь",
    icon: "crown",
    target: 100,
    metric: (s) => s.maxStreak,
    format: days,
  },
  {
    id: "income_1000",
    title: "Первая тысяча",
    description: "Заработай 1 000 ₽ всего",
    group: "Деньги",
    icon: "coins",
    target: 1000,
    metric: (s) => s.totalIncome,
    format: money,
  },
  {
    id: "income_10000",
    title: "Пять цифр",
    description: "Заработай 10 000 ₽ всего",
    group: "Деньги",
    icon: "coins",
    target: 10000,
    metric: (s) => s.totalIncome,
    format: money,
  },
  {
    id: "income_50000",
    title: "Полсотни",
    description: "Заработай 50 000 ₽ всего",
    group: "Деньги",
    icon: "wallet",
    target: 50000,
    metric: (s) => s.totalIncome,
    format: money,
  },
  {
    id: "income_100000",
    title: "Шесть цифр",
    description: "Заработай 100 000 ₽ всего",
    group: "Деньги",
    icon: "banknote",
    target: 100000,
    metric: (s) => s.totalIncome,
    format: money,
  },
  {
    id: "work_10",
    title: "Первый десяток",
    description: "10 часов работы",
    group: "Часы",
    icon: "clock",
    target: 10,
    metric: (s) => s.workHours,
    format: hours,
  },
  {
    id: "work_50",
    title: "Полтинник",
    description: "50 часов работы",
    group: "Часы",
    icon: "clock",
    target: 50,
    metric: (s) => s.workHours,
    format: hours,
  },
  {
    id: "work_100",
    title: "Сотка",
    description: "100 часов работы",
    group: "Часы",
    icon: "clock",
    target: 100,
    metric: (s) => s.workHours,
    format: hours,
  },
  {
    id: "work_500",
    title: "Полтысячи",
    description: "500 часов работы",
    group: "Часы",
    icon: "clock",
    target: 500,
    metric: (s) => s.workHours,
    format: hours,
  },
  {
    id: "study_10",
    title: "Ученик",
    description: "10 часов учёбы",
    group: "Часы",
    icon: "study",
    target: 10,
    metric: (s) => s.studyHours,
    format: hours,
  },
  {
    id: "study_50",
    title: "Студент",
    description: "50 часов учёбы",
    group: "Часы",
    icon: "study",
    target: 50,
    metric: (s) => s.studyHours,
    format: hours,
  },
  {
    id: "youtube_1",
    title: "Первый рубль",
    description: "Заработай 1 ₽ на YouTube",
    group: "YouTube",
    icon: "youtube",
    target: 1,
    metric: (s) => s.youtubeIncome,
    format: money,
  },
  {
    id: "youtube_1000",
    title: "Монетизация",
    description: "1 000 ₽ с YouTube",
    group: "YouTube",
    icon: "youtube",
    target: 1000,
    metric: (s) => s.youtubeIncome,
    format: money,
  },
  {
    id: "youtube_10000",
    title: "Канал растёт",
    description: "10 000 ₽ с YouTube",
    group: "YouTube",
    icon: "youtube",
    target: 10000,
    metric: (s) => s.youtubeIncome,
    format: money,
  },
  {
    id: "sport_10",
    title: "В ритме",
    description: "10 дней спорта",
    group: "Спорт",
    icon: "sport",
    target: 10,
    metric: (s) => s.sportDays,
    format: days,
  },
  {
    id: "sport_30",
    title: "Форма",
    description: "30 дней спорта",
    group: "Спорт",
    icon: "sport",
    target: 30,
    metric: (s) => s.sportDays,
    format: days,
  },
  {
    id: "sport_100",
    title: "Атлет",
    description: "100 дней спорта",
    group: "Спорт",
    icon: "sport",
    target: 100,
    metric: (s) => s.sportDays,
    format: days,
  },
  {
    id: "perfect_month",
    title: "Идеальный месяц",
    description: "Заполни каждый день месяца",
    group: "Особые",
    icon: "calendar",
    target: 1,
    metric: (s) => s.perfectMonths,
    format: (value) => `${value} мес.`,
  },
  {
    id: "early_bird",
    title: "Ранняя пташка",
    description: "Заполни запись до 9:00",
    group: "Особые",
    icon: "sunrise",
    target: 1,
    metric: (s) => (s.earlyBird ? 1 : 0),
    format: (value) => (value >= 1 ? "готово" : "0 / 1"),
  },
];

export const BADGE_MAP = new Map(BADGES.map((badge) => [badge.id, badge]));

export const BADGE_ICON_KEYS: BadgeIcon[] = [
  "spark",
  "flame",
  "coins",
  "wallet",
  "banknote",
  "clock",
  "study",
  "youtube",
  "sport",
  "calendar",
  "sunrise",
  "crown",
];

export function isBadgeIcon(value: unknown): value is BadgeIcon {
  return typeof value === "string" && BADGE_ICON_KEYS.includes(value as BadgeIcon);
}

export const ACHIEVEMENT_GROUPS: AchievementGroup[] = [
  "Путь",
  "Деньги",
  "Часы",
  "YouTube",
  "Спорт",
  "Особые",
];

export function isAchievementUnit(value: unknown): value is AchievementUnit {
  return value === "money" || value === "hours" || value === "days";
}

export const ACHIEVEMENT_UNITS: Array<{ value: AchievementUnit; label: string }> = [
  { value: "money", label: "Деньги" },
  { value: "hours", label: "Часы" },
  { value: "days", label: "Дни" },
];

export function achievementUnitLabel(unit: AchievementUnit): string {
  return ACHIEVEMENT_UNITS.find((item) => item.value === unit)?.label ?? "Дни";
}

/** Единица встроенного достижения выводится из его группы. */
export function unitForBadge(badge: Pick<BadgeDef, "group">): AchievementUnit {
  if (badge.group === "Деньги" || badge.group === "YouTube") return "money";
  if (badge.group === "Часы") return "hours";
  return "days";
}

export function formatAchievementValue(value: number, unit: AchievementUnit): string {
  if (unit === "money") return money(value);
  if (unit === "hours") return hours(value);
  return days(value);
}

function customMetric(unit: AchievementUnit): (snapshot: Snapshot) => number {
  if (unit === "money") return (snapshot) => snapshot.totalIncome;
  if (unit === "hours") return (snapshot) => snapshot.totalHours;
  return (snapshot) => snapshot.filledDays;
}

export interface AchievementConfig {
  overrides?: Record<string, AchievementOverride>;
  custom?: CustomAchievement[];
  deleted?: string[];
}

/** Данные из модалки создания/редактирования достижения. */
export interface AchievementDraft {
  id?: string;
  title: string;
  description: string;
  target: number;
  unit: AchievementUnit;
  icon: BadgeIcon;
}

/**
 * Собирает актуальный список достижений: встроенные 22 бейджа с наложенными
 * переопределениями, затем созданные вручную. Удалённые скрываются.
 */
export function resolveBadges({
  overrides = {},
  custom = [],
  deleted = [],
}: AchievementConfig = {}): ResolvedBadge[] {
  const removed = new Set(deleted);
  const result: ResolvedBadge[] = [];

  for (const base of BADGES) {
    if (removed.has(base.id)) continue;
    const override = overrides[base.id];
    const target =
      typeof override?.target === "number" && override.target > 0
        ? override.target
        : base.target;
    result.push({
      ...base,
      title: override?.title?.trim() ? override.title.trim() : base.title,
      description: override?.description?.trim()
        ? override.description.trim()
        : base.description,
      target,
      icon: override?.icon ?? base.icon,
      builtIn: true,
      unit: unitForBadge(base),
    });
  }

  for (const item of custom) {
    if (removed.has(item.id)) continue;
    const unit = item.unit;
    result.push({
      id: item.id,
      title: item.title,
      description: item.description,
      group: item.group ?? "Особые",
      icon: item.icon,
      target: Math.max(1, item.target),
      unit,
      builtIn: false,
      metric: customMetric(unit),
      format: (value) => formatAchievementValue(value, unit),
    });
  }

  return result;
}

export function resolveBadgeMap(config: AchievementConfig = {}): Map<string, ResolvedBadge> {
  return new Map(resolveBadges(config).map((badge) => [badge.id, badge]));
}

export function badgeProgress(badge: BadgeDef, snapshot: Snapshot) {
  const current = Math.max(0, badge.metric(snapshot));
  const percent = badge.target > 0 ? Math.min(100, Math.round((current / badge.target) * 100)) : 0;
  return { current, percent, complete: current >= badge.target };
}

export function achievedBadges(snapshot: Snapshot, config: AchievementConfig = {}) {
  return resolveBadges(config).filter((badge) => badgeProgress(badge, snapshot).complete);
}
