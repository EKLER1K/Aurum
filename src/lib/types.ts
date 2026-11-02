export type Category = "work" | "study" | "youtube" | "sport";

export interface DayEntry {
  /** ISO date "2026-10-26" */
  date: string;
  workHours: number;
  workIncome: number;
  studyHours: number;
  youtubeHours: number;
  youtubeIncome: number;
  sportDone: boolean;
  note?: string;
  /** ISO timestamp when the entry was first created (used for the early bird badge) */
  createdAt?: string;
}

/**
 * Совместимый слепок месячных целей.
 * Нужен для статистики, достижений и старых резервных копий.
 */
export interface MonthGoal {
  /** "2026-10" */
  month: string;
  incomeGoal: number;
  workHoursGoal: number;
  studyHoursGoal: number;
  youtubeHoursGoal: number;
  sportDaysGoal: number;
}

export interface Settings {
  name: string;
  currency: string;
  defaultHourlyRate: number;
  trackingStartDate: string;
  /** Готовый квадратный кроп аватара в виде data:image/...;base64,... */
  avatar?: string | null;
  /** Масштаб, с которым аватар был выбран в кроппере (для истории). */
  avatarZoom?: number;
  /** Полный контроль над достижениями: создание, правка и удаление. */
  adminMode?: boolean;
}

/** Иконка достижения — ключ из BADGE_ICONS. */
export type BadgeIcon =
  | "spark"
  | "flame"
  | "coins"
  | "wallet"
  | "banknote"
  | "clock"
  | "study"
  | "youtube"
  | "sport"
  | "calendar"
  | "sunrise"
  | "crown";

/** В чём измеряется цель достижения. */
export type AchievementUnit = "money" | "hours" | "days";

/** Группа достижения — совпадает с фильтрами на странице «Достижения». */
export type AchievementGroup = "Путь" | "Деньги" | "Часы" | "YouTube" | "Спорт" | "Особые";

/**
 * Правка встроенного достижения в режиме администратора.
 * Метрика и группа остаются встроенными, меняются только тексты, цель и иконка.
 */
export interface AchievementOverride {
  title?: string;
  description?: string;
  target?: number;
  icon?: BadgeIcon;
}

/** Достижение, созданное пользователем в режиме администратора. */
export interface CustomAchievement {
  id: string;
  title: string;
  description: string;
  target: number;
  unit: AchievementUnit;
  icon: BadgeIcon;
  group: AchievementGroup;
  createdAt: string;
}

export interface BadgeUnlock {
  unlockedAt: string;
}

/** Как вводится цель: числом или галочкой «выполнено». */
export type GoalType = "number" | "check";

/** Единица числовой цели. */
export type GoalUnit = "hours" | "money";

/**
 * Привязка к встроенным данным Aurum.
 * Нужна, чтобы старые записи (работа, учёба, YouTube, спорт, доход)
 * продолжали считаться без конвертации истории.
 */
export type GoalPreset = "income" | "work" | "study" | "youtube" | "sport";

export interface GoalDef {
  id: string;
  title: string;
  type: GoalType;
  /** Только для type === "number". */
  unit?: GoalUnit;
  /** Только у дефолтных целей. Пользовательские цели идут без preset. */
  preset?: GoalPreset;
  /** ISO timestamp создания — для стабильной сортировки. */
  createdAt?: string;
}

export interface AppData {
  version: number;
  entries: Record<string, DayEntry>;
  /** Совместимый слепок: заполняется из планов месячных целей. */
  goals: Record<string, MonthGoal>;
  /** Цели месяца — порядок массива задаёт порядок везде. */
  monthGoals: GoalDef[];
  /** Цели на день — отдельный список, без месячного плана. */
  dayGoals: GoalDef[];
  /** Планы по целям месяца: goalPlans["2026-10"][goalId] = 60000 */
  goalPlans: Record<string, Record<string, number>>;
  /** Факты по дням: dayValues["2026-10-26"][goalId] = 2 | true */
  dayValues: Record<string, Record<string, number | boolean>>;
  settings: Settings;
  achievements: Record<string, BadgeUnlock>;
  /** Переопределения встроенных достижений (режим администратора). */
  achievementOverrides: Record<string, AchievementOverride>;
  /** Достижения, созданные в режиме администратора. */
  customAchievements: CustomAchievement[];
  /** ID удалённых достижений — встроенные скрываются, кастомные тоже. */
  deletedAchievements: string[];
  onboarded: boolean;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  work: "Работа",
  study: "Учёба",
  youtube: "YouTube",
  sport: "Спорт",
};

export const CATEGORY_COLORS: Record<Category, string> = {
  work: "#D4A853",
  study: "#5B7FFF",
  youtube: "#8FB8A8",
  sport: "#8A8A8E",
};

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  number: "Число",
  check: "Галочка",
};

export const GOAL_UNIT_LABELS: Record<GoalUnit, string> = {
  hours: "Часы",
  money: "Деньги",
};

export const GOAL_PRESET_LABELS: Record<GoalPreset, string> = {
  income: "Доход",
  work: "Работа",
  study: "Учёба",
  youtube: "YouTube",
  sport: "Спорт",
};
