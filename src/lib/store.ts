"use client";

import { isValid, parseISO } from "date-fns";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { BADGE_MAP, achievedBadges, isAchievementUnit, isBadgeIcon } from "./achievements";
import type { AchievementConfig, AchievementDraft } from "./achievements";
import { monthOf, todayISO } from "./format";
import {
  createGoalId,
  defaultMonthGoals,
  sanitizeGoalDef,
  sanitizeGoalDefs,
} from "./goals";
import {
  buildSnapshot,
  calcMaxStreak,
  calcStreak,
  getMonthEntries,
  monthTotals,
} from "./selectors";
import type {
  AchievementOverride,
  AchievementUnit,
  AppData,
  DayEntry,
  GoalDef,
  GoalPreset,
  CustomAchievement,
  MonthGoal,
  Settings,
} from "./types";
import { useUiStore } from "./ui-store";

export const DATA_VERSION = 3;
// Ключ не меняем: так данные пользователей переживают обновление.
export const STORAGE_KEY = "aurum-state-v1";

function num(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.round(parsed * 100) / 100;
}

function isISODate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && isValid(parseISO(value));
}

function isMonthKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}$/.test(value);
}

/** Аватар хранится прямо в localStorage, поэтому держим его компактным. */
const AVATAR_PREFIX = "data:image/";
const AVATAR_MAX_LENGTH = 2_000_000;

function sanitizeAvatar(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith(AVATAR_PREFIX)) return null;
  if (value.length > AVATAR_MAX_LENGTH) return null;
  return value;
}

function sanitizeZoom(value: unknown, fallback = 1): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(4, Math.max(1, Math.round(parsed * 100) / 100));
}

export function defaultData(): AppData {
  return {
    version: DATA_VERSION,
    entries: {},
    goals: {},
    monthGoals: defaultMonthGoals(),
    dayGoals: [],
    goalPlans: {},
    dayValues: {},
    settings: {
      name: "",
      currency: "₽",
      defaultHourlyRate: 300,
      trackingStartDate: todayISO(),
      avatar: null,
      avatarZoom: 1,
      adminMode: false,
    },
    achievements: {},
    achievementOverrides: {},
    customAchievements: [],
    deletedAchievements: [],
    onboarded: false,
  };
}

function dataOf(state: AppData): AppData {
  return {
    version: state.version,
    entries: state.entries,
    goals: state.goals,
    monthGoals: state.monthGoals,
    dayGoals: state.dayGoals,
    goalPlans: state.goalPlans,
    dayValues: state.dayValues,
    settings: state.settings,
    achievements: state.achievements,
    achievementOverrides: state.achievementOverrides,
    customAchievements: state.customAchievements,
    deletedAchievements: state.deletedAchievements,
    onboarded: state.onboarded,
  };
}

/** Текущие правки достижений — для пересчёта открытых бейджей. */
function achievementConfig(state: AppData): AchievementConfig {
  return {
    overrides: state.achievementOverrides,
    custom: state.customAchievements,
    deleted: state.deletedAchievements,
  };
}

function sanitizeEntry(input: Partial<DayEntry>): DayEntry | null {
  if (!isISODate(input.date)) return null;
  const note = typeof input.note === "string" ? input.note.slice(0, 600) : undefined;
  return {
    date: input.date,
    workHours: num(input.workHours),
    workIncome: num(input.workIncome),
    studyHours: num(input.studyHours),
    youtubeHours: num(input.youtubeHours),
    youtubeIncome: num(input.youtubeIncome),
    sportDone: Boolean(input.sportDone),
    ...(note ? { note } : {}),
    ...(typeof input.createdAt === "string" ? { createdAt: input.createdAt } : {}),
  };
}

function sanitizeEntries(input: unknown): Record<string, DayEntry> {
  const entries: Record<string, DayEntry> = {};
  if (!input || typeof input !== "object") return entries;
  for (const [key, value] of Object.entries(input as Record<string, Partial<DayEntry>>)) {
    const clean = sanitizeEntry({ ...value, date: value?.date ?? key });
    if (clean) entries[clean.date] = clean;
  }
  return entries;
}

function sanitizeLegacyGoal(input: Partial<MonthGoal>): MonthGoal | null {
  if (!isMonthKey(input.month)) return null;
  return {
    month: input.month,
    incomeGoal: num(input.incomeGoal),
    workHoursGoal: num(input.workHoursGoal),
    studyHoursGoal: num(input.studyHoursGoal),
    youtubeHoursGoal: num(input.youtubeHoursGoal),
    sportDaysGoal: num(input.sportDaysGoal),
  };
}

function sanitizeSettings(
  input: unknown,
  firstEntry: string | undefined,
): Settings {
  const source =
    input && typeof input === "object" ? (input as Partial<Settings>) : {};
  const defaults = defaultData().settings;
  return {
    name: typeof source.name === "string" ? source.name.slice(0, 40) : defaults.name,
    currency:
      typeof source.currency === "string" && source.currency.length <= 4
        ? source.currency
        : defaults.currency,
    defaultHourlyRate: num(source.defaultHourlyRate, defaults.defaultHourlyRate),
    trackingStartDate: isISODate(source.trackingStartDate)
      ? source.trackingStartDate
      : firstEntry ?? defaults.trackingStartDate,
    avatar: sanitizeAvatar(source.avatar),
    avatarZoom: sanitizeZoom(source.avatarZoom, defaults.avatarZoom ?? 1),
    adminMode: Boolean(source.adminMode),
  };
}

/** Созданные вручную достижения: проверяем каждое поле и режем длину текстов. */
function sanitizeCustomAchievements(input: unknown): CustomAchievement[] {
  if (!Array.isArray(input)) return [];
  const result: CustomAchievement[] = [];
  const seen = new Set<string>();

  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const id = typeof item.id === "string" ? item.id.trim().slice(0, 64) : "";
    if (!id || seen.has(id) || BADGE_MAP.has(id)) continue;

    const title =
      typeof item.title === "string" && item.title.trim()
        ? item.title.trim().slice(0, 60)
        : "Своё достижение";
    const description =
      typeof item.description === "string" ? item.description.trim().slice(0, 200) : "";
    const target = num(item.target);
    const unit: AchievementUnit = isAchievementUnit(item.unit) ? item.unit : "days";
    const icon = isBadgeIcon(item.icon) ? item.icon : "spark";

    seen.add(id);
    result.push({
      id,
      title,
      description,
      target: target > 0 ? target : 1,
      unit,
      icon,
      group: "Особые",
      createdAt:
        typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
    });
  }

  return result;
}

/** Переопределения принимаются только для встроенных достижений. */
function sanitizeAchievementOverrides(input: unknown): Record<string, AchievementOverride> {
  const result: Record<string, AchievementOverride> = {};
  if (!input || typeof input !== "object") return result;

  for (const [id, raw] of Object.entries(input as Record<string, unknown>)) {
    if (!BADGE_MAP.has(id)) continue;
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const override: AchievementOverride = {};

    if (typeof item.title === "string" && item.title.trim()) {
      override.title = item.title.trim().slice(0, 60);
    }
    if (typeof item.description === "string") {
      override.description = item.description.trim().slice(0, 200);
    }
    if (item.target !== undefined) {
      const target = num(item.target);
      if (target > 0) override.target = target;
    }
    if (isBadgeIcon(item.icon)) override.icon = item.icon;

    if (Object.keys(override).length > 0) result[id] = override;
  }

  return result;
}

function sanitizeDeletedAchievements(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const result: string[] = [];
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const id = raw.trim().slice(0, 64);
    if (id && !result.includes(id)) result.push(id);
  }
  return result;
}

function sanitizeAchievements(
  input: unknown,
  allowed: Set<string>,
): AppData["achievements"] {
  const achievements: AppData["achievements"] = {};
  if (!input || typeof input !== "object") return achievements;
  for (const [key, value] of Object.entries(
    input as Record<string, { unlockedAt?: string }>,
  )) {
    if (!allowed.has(key)) continue;
    achievements[key] = {
      unlockedAt:
        typeof value?.unlockedAt === "string"
          ? value.unlockedAt
          : new Date().toISOString(),
    };
  }
  return achievements;
}

function sanitizePlanMap(
  input: unknown,
  goals: GoalDef[],
): Record<string, number> {
  const known = new Set(goals.map((goal) => goal.id));
  const plans: Record<string, number> = {};
  if (!input || typeof input !== "object") return plans;
  for (const [goalId, value] of Object.entries(input as Record<string, unknown>)) {
    if (!known.has(goalId)) continue;
    const parsed = num(value);
    if (parsed > 0) plans[goalId] = parsed;
  }
  return plans;
}

function sanitizeAllPlans(
  input: unknown,
  goals: GoalDef[],
): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};
  if (!input || typeof input !== "object") return result;
  for (const [month, value] of Object.entries(input as Record<string, unknown>)) {
    if (!isMonthKey(month)) continue;
    const plans = sanitizePlanMap(value, goals);
    if (Object.keys(plans).length > 0) result[month] = plans;
  }
  return result;
}

function sanitizeDayValues(
  input: unknown,
  monthGoals: GoalDef[],
  dayGoals: GoalDef[],
): Record<string, Record<string, number | boolean>> {
  const known = new Map<string, GoalDef>();
  for (const goal of [...monthGoals, ...dayGoals]) {
    if (!goal.preset) known.set(goal.id, goal);
  }

  const result: Record<string, Record<string, number | boolean>> = {};
  if (!input || typeof input !== "object") return result;

  for (const [date, value] of Object.entries(input as Record<string, unknown>)) {
    if (!isISODate(date) || !value || typeof value !== "object") continue;
    const values: Record<string, number | boolean> = {};
    for (const [goalId, raw] of Object.entries(value as Record<string, unknown>)) {
      const goal = known.get(goalId);
      if (!goal) continue;
      if (goal.type === "check") {
        if (Boolean(raw)) values[goalId] = true;
      } else {
        const parsed = num(raw);
        if (parsed > 0) values[goalId] = parsed;
      }
    }
    if (Object.keys(values).length > 0) result[date] = values;
  }
  return result;
}

function presetIdMap(monthGoals: GoalDef[]) {
  const map = new Map<GoalPreset, string>();
  for (const goal of monthGoals) {
    if (goal.preset) map.set(goal.preset, goal.id);
  }
  return map;
}

function mirrorMonthGoal(
  month: string,
  monthGoals: GoalDef[],
  plans: Record<string, number>,
): MonthGoal {
  const byPreset = presetIdMap(monthGoals);
  const value = (preset: GoalPreset) => {
    const id = byPreset.get(preset);
    return id ? plans[id] ?? 0 : 0;
  };
  return {
    month,
    incomeGoal: value("income"),
    workHoursGoal: value("work"),
    studyHoursGoal: value("study"),
    youtubeHoursGoal: value("youtube"),
    sportDaysGoal: value("sport"),
  };
}

function plansFromLegacy(
  source: Record<string, unknown>,
  monthGoals: GoalDef[],
): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};
  if (!source.goals || typeof source.goals !== "object") return result;
  const byPreset = presetIdMap(monthGoals);

  for (const [month, raw] of Object.entries(
    source.goals as Record<string, Partial<MonthGoal>>,
  )) {
    if (!isMonthKey(month) || !raw || typeof raw !== "object") continue;
    const add = (preset: GoalPreset, value: unknown) => {
      const id = byPreset.get(preset);
      const parsed = num(value);
      if (id && parsed > 0) {
        result[month] = { ...(result[month] ?? {}), [id]: parsed };
      }
    };
    add("income", raw.incomeGoal);
    add("work", raw.workHoursGoal);
    add("study", raw.studyHoursGoal);
    add("youtube", raw.youtubeHoursGoal);
    add("sport", raw.sportDaysGoal);
  }
  return result;
}

/** V1.01: пользовательские цели и активности → цели на день + факты. */
function migrateCustomGoals(source: Record<string, unknown>): {
  dayGoals: GoalDef[];
  dayValues: Record<string, Record<string, number | boolean>>;
} {
  const dayGoals: GoalDef[] = [];
  const seen = new Set<string>();

  if (Array.isArray(source.customGoals)) {
    for (const raw of source.customGoals) {
      if (!raw || typeof raw !== "object") continue;
      const item = raw as { id?: unknown; title?: unknown; createdAt?: unknown };
      const clean = sanitizeGoalDef({
        id: typeof item.id === "string" ? item.id : undefined,
        title: typeof item.title === "string" ? item.title : "",
        type: "number",
        unit: "hours",
        ...(typeof item.createdAt === "string" ? { createdAt: item.createdAt } : {}),
      });
      if (!clean || seen.has(clean.id)) continue;
      seen.add(clean.id);
      dayGoals.push({ ...clean, preset: undefined });
    }
  }

  const dayValues: Record<string, Record<string, number | boolean>> = {};
  if (source.activities && typeof source.activities === "object") {
    for (const [date, list] of Object.entries(
      source.activities as Record<string, unknown>,
    )) {
      if (!isISODate(date) || !Array.isArray(list)) continue;
      const values: Record<string, number | boolean> = {};
      for (const raw of list) {
        if (!raw || typeof raw !== "object") continue;
        const item = raw as { goalId?: unknown; minutes?: unknown };
        const goalId = typeof item.goalId === "string" ? item.goalId : "";
        if (!seen.has(goalId)) continue;
        const minutes = num(item.minutes);
        if (minutes <= 0) continue;
        const current = typeof values[goalId] === "number" ? (values[goalId] as number) : 0;
        values[goalId] = Math.round((current + minutes / 60) * 100) / 100;
      }
      if (Object.keys(values).length > 0) dayValues[date] = values;
    }
  }

  return { dayGoals, dayValues };
}

/** Импорт не должен давать целям месяца и целям на день одинаковые id. */
function dedupeDayGoalIds(
  monthGoals: GoalDef[],
  dayGoals: GoalDef[],
  dayValues: Record<string, Record<string, number | boolean>>,
) {
  const used = new Set(monthGoals.map((goal) => goal.id));
  const remap = new Map<string, string>();

  const cleaned = dayGoals.map((goal) => {
    if (!used.has(goal.id)) {
      used.add(goal.id);
      return goal;
    }
    const id = createGoalId();
    used.add(id);
    remap.set(goal.id, id);
    return { ...goal, id };
  });

  if (remap.size === 0) return { dayGoals, dayValues };

  const values: Record<string, Record<string, number | boolean>> = {};
  for (const [date, entries] of Object.entries(dayValues)) {
    const next: Record<string, number | boolean> = {};
    for (const [goalId, value] of Object.entries(entries)) {
      next[remap.get(goalId) ?? goalId] = value;
    }
    values[date] = next;
  }

  return { dayGoals: cleaned, dayValues: values };
}

function normalizeAppData(source: Record<string, unknown>, fallback: AppData): AppData {
  const entries = source.entries !== undefined ? sanitizeEntries(source.entries) : fallback.entries;

  const monthGoals = Array.isArray(source.monthGoals)
    ? sanitizeGoalDefs(source.monthGoals)
    : fallback.monthGoals.map((goal) => ({ ...goal }));

  const goalPlans =
    source.goalPlans !== undefined
      ? sanitizeAllPlans(source.goalPlans, monthGoals)
      : plansFromLegacy(source, monthGoals);

  let dayGoals: GoalDef[];
  let dayValues: Record<string, Record<string, number | boolean>>;

  if (Array.isArray(source.dayGoals)) {
    dayGoals = sanitizeGoalDefs(source.dayGoals);
    dayValues = sanitizeDayValues(source.dayValues, monthGoals, dayGoals);
  } else if (source.customGoals !== undefined || source.activities !== undefined) {
    const migrated = migrateCustomGoals(source);
    dayGoals = migrated.dayGoals;
    dayValues = migrated.dayValues;
  } else {
    dayGoals = fallback.dayGoals.map((goal) => ({ ...goal }));
    dayValues = sanitizeDayValues(source.dayValues, monthGoals, dayGoals);
  }

  const deduped = dedupeDayGoalIds(monthGoals, dayGoals, dayValues);
  dayGoals = deduped.dayGoals;
  dayValues = deduped.dayValues;

  const goals: Record<string, MonthGoal> = {};
  const months = new Set([
    ...Object.keys(goalPlans),
    ...(source.goals && typeof source.goals === "object"
      ? Object.keys(source.goals)
      : []),
  ]);
  for (const month of months) {
    if (isMonthKey(month)) {
      goals[month] = mirrorMonthGoal(month, monthGoals, goalPlans[month] ?? {});
    }
  }

  const firstEntry = Object.keys(entries).sort()[0];

  const customAchievements = sanitizeCustomAchievements(source.customAchievements);
  const achievementOverrides = sanitizeAchievementOverrides(source.achievementOverrides);
  const deletedAchievements = sanitizeDeletedAchievements(source.deletedAchievements);
  const removed = new Set(deletedAchievements);
  const allowedAchievements = new Set<string>([
    ...BADGE_MAP.keys(),
    ...customAchievements.map((item) => item.id),
  ]);
  for (const id of removed) allowedAchievements.delete(id);

  return {
    version: DATA_VERSION,
    entries,
    goals,
    monthGoals,
    dayGoals,
    goalPlans,
    dayValues,
    settings: sanitizeSettings(source.settings, firstEntry),
    achievements: sanitizeAchievements(source.achievements, allowedAchievements),
    achievementOverrides,
    customAchievements,
    deletedAchievements,
    onboarded: Boolean(source.onboarded),
  };
}

export interface SaveResult {
  streak: number;
  maxStreak: number;
  isNewRecord: boolean;
  goalClosed: boolean;
  unlocked: string[];
  entry: DayEntry;
}

interface AppActions {
  saveEntry: (entry: DayEntry, values?: Record<string, number | boolean>) => SaveResult;
  reconcileAchievements: () => void;
  deleteEntry: (date: string) => void;
  saveMonthGoals: (
    goals: GoalDef[],
    plans: Record<string, number>,
    month: string,
  ) => void;
  saveDayGoals: (goals: GoalDef[]) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  saveAchievement: (draft: AchievementDraft) => void;
  deleteAchievement: (id: string) => void;
  completeOnboarding: (input: {
    name: string;
    startDate: string;
    incomeGoal: number;
    hourlyRate: number;
    currency?: string;
  }) => void;
  importData: (raw: unknown) => { ok: boolean; error?: string };
  resetAll: () => void;
}

export type AppStore = AppData & AppActions;

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...defaultData(),

      saveEntry: (input, valueInput) => {
        const before = get();
        const existing = before.entries[input.date];
        const clean = sanitizeEntry({
          ...input,
          createdAt: existing?.createdAt ?? input.createdAt ?? new Date().toISOString(),
        });

        if (!clean) {
          throw new Error("Некорректная дата записи");
        }

        const entries = { ...before.entries, [clean.date]: clean };

        let dayValues = before.dayValues;
        if (valueInput !== undefined) {
          const known = new Map<string, GoalDef>();
          for (const goal of [...before.monthGoals, ...before.dayGoals]) {
            if (!goal.preset) known.set(goal.id, goal);
          }

          const values: Record<string, number | boolean> = {};
          for (const [goalId, raw] of Object.entries(valueInput)) {
            const goal = known.get(goalId);
            if (!goal) continue;
            if (goal.type === "check") {
              if (Boolean(raw)) values[goalId] = true;
            } else {
              const parsed = num(raw);
              if (parsed > 0) values[goalId] = parsed;
            }
          }

          dayValues = { ...before.dayValues };
          if (Object.keys(values).length > 0) {
            dayValues[clean.date] = values;
          } else {
            delete dayValues[clean.date];
          }
        }

        const afterState: AppData = { ...dataOf(before), entries, dayValues };
        const maxBefore = calcMaxStreak(before.entries);
        const afterSnapshot = buildSnapshot(afterState);

        const newly = achievedBadges(afterSnapshot, achievementConfig(before)).filter(
          (badge) => !before.achievements[badge.id],
        );
        const achievements = { ...before.achievements };
        for (const badge of newly) {
          achievements[badge.id] = { unlockedAt: new Date().toISOString() };
        }

        set({ entries, dayValues, achievements });

        if (newly.length > 0) {
          useUiStore.getState().enqueueUnlocks(newly.map((badge) => badge.id));
        }

        const month = monthOf(clean.date);
        const incomeGoal = before.monthGoals.find((goal) => goal.preset === "income");
        const incomeTarget = incomeGoal
          ? before.goalPlans[month]?.[incomeGoal.id] ?? 0
          : 0;
        const incomeBefore = monthTotals(before.entries, month).income;
        const incomeAfter = monthTotals(entries, month).income;
        const goalClosed =
          incomeTarget > 0 && incomeAfter >= incomeTarget && incomeBefore < incomeTarget;

        return {
          entry: clean,
          streak: calcStreak(entries),
          maxStreak: afterSnapshot.maxStreak,
          isNewRecord: afterSnapshot.maxStreak > maxBefore && afterSnapshot.maxStreak > 1,
          goalClosed,
          unlocked: newly.map((badge) => badge.id),
        };
      },

      reconcileAchievements: () => {
        const state = get();
        const earned = achievedBadges(buildSnapshot(state), achievementConfig(state));
        const missing = earned.filter((badge) => !state.achievements[badge.id]);
        if (missing.length === 0) return;
        const achievements = { ...state.achievements };
        for (const badge of missing) {
          achievements[badge.id] = { unlockedAt: new Date().toISOString() };
        }
        set({ achievements });
      },

      deleteEntry: (date) => {
        const entries = { ...get().entries };
        delete entries[date];
        const dayValues = { ...get().dayValues };
        delete dayValues[date];
        set({ entries, dayValues });
      },

      saveMonthGoals: (goals, plans, month) => {
        const cleanGoals = sanitizeGoalDefs(goals);
        const cleanPlans = sanitizePlanMap(plans, cleanGoals);

        set((state) => {
          const known = new Set(cleanGoals.map((goal) => goal.id));
          const goalPlans: Record<string, Record<string, number>> = {};

          for (const [key, value] of Object.entries(state.goalPlans)) {
            const filtered: Record<string, number> = {};
            for (const [goalId, amount] of Object.entries(value)) {
              if (known.has(goalId)) filtered[goalId] = amount;
            }
            if (Object.keys(filtered).length > 0) goalPlans[key] = filtered;
          }

          if (Object.keys(cleanPlans).length > 0) {
            goalPlans[month] = cleanPlans;
          } else {
            delete goalPlans[month];
          }

          const goalsMap = { ...state.goals };
          goalsMap[month] = mirrorMonthGoal(month, cleanGoals, cleanPlans);

          // Удалённая цель не должна оставлять за собой факты в ежедневных значениях.
          const allowed = new Set([
            ...cleanGoals.map((goal) => goal.id),
            ...state.dayGoals.map((goal) => goal.id),
          ]);
          const dayValues: Record<string, Record<string, number | boolean>> = {};
          for (const [date, values] of Object.entries(state.dayValues)) {
            const filtered: Record<string, number | boolean> = {};
            for (const [goalId, value] of Object.entries(values)) {
              if (allowed.has(goalId)) filtered[goalId] = value;
            }
            if (Object.keys(filtered).length > 0) dayValues[date] = filtered;
          }

          return { monthGoals: cleanGoals, goalPlans, goals: goalsMap, dayValues };
        });
      },

      saveDayGoals: (goals) => {
        const cleanGoals = sanitizeGoalDefs(goals);
        const known = new Set(cleanGoals.map((goal) => goal.id));

        set((state) => {
          const dayValues: Record<string, Record<string, number | boolean>> = {};
          for (const [date, values] of Object.entries(state.dayValues)) {
            const filtered: Record<string, number | boolean> = {};
            for (const [goalId, value] of Object.entries(values)) {
              if (known.has(goalId)) filtered[goalId] = value;
            }
            if (Object.keys(filtered).length > 0) dayValues[date] = filtered;
          }
          return { dayGoals: cleanGoals, dayValues };
        });
      },

      updateSettings: (patch) => {
        set((state) => {
          const avatar =
            patch.avatar === undefined
              ? (state.settings.avatar ?? null)
              : patch.avatar === null
                ? null
                : (sanitizeAvatar(patch.avatar) ?? state.settings.avatar ?? null);

          return {
            settings: {
              ...state.settings,
              ...patch,
              avatar,
              avatarZoom: sanitizeZoom(
                patch.avatarZoom ?? state.settings.avatarZoom,
                state.settings.avatarZoom ?? 1,
              ),
              defaultHourlyRate:
                patch.defaultHourlyRate !== undefined
                  ? num(patch.defaultHourlyRate, state.settings.defaultHourlyRate)
                  : state.settings.defaultHourlyRate,
              adminMode:
                patch.adminMode === undefined
                  ? Boolean(state.settings.adminMode)
                  : Boolean(patch.adminMode),
            },
          };
        });
      },

      saveAchievement: (draft) => {
        const title = draft.title.trim().slice(0, 60);
        if (!title) return;

        const description = draft.description.trim().slice(0, 200);
        const target = Math.max(1, num(draft.target, 1));
        const icon = isBadgeIcon(draft.icon) ? draft.icon : "spark";
        const unit: AchievementUnit = isAchievementUnit(draft.unit) ? draft.unit : "days";

        set((state) => {
          const id = draft.id;

          // Правка встроенного бейджа: сохраняем только переопределение,
          // метрика и группа остаются встроенными.
          if (id && BADGE_MAP.has(id)) {
            const override: AchievementOverride = { title, description, target, icon };
            return {
              achievementOverrides: {
                ...state.achievementOverrides,
                [id]: override,
              },
            };
          }

          // Правка своего достижения.
          if (id) {
            let found = false;
            const customAchievements = state.customAchievements.map((item) => {
              if (item.id !== id) return item;
              found = true;
              return { ...item, title, description, target, unit, icon };
            });
            if (!found) return {};
            return { customAchievements };
          }

          const created: CustomAchievement = {
            id: `custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
            title,
            description,
            target,
            unit,
            icon,
            group: "Особые",
            createdAt: new Date().toISOString(),
          };
          return { customAchievements: [...state.customAchievements, created] };
        });
      },

      deleteAchievement: (id) => {
        set((state) => {
          const achievements = { ...state.achievements };
          delete achievements[id];

          const achievementOverrides = { ...state.achievementOverrides };
          delete achievementOverrides[id];

          return {
            achievements,
            achievementOverrides,
            customAchievements: state.customAchievements.filter((item) => item.id !== id),
            deletedAchievements: state.deletedAchievements.includes(id)
              ? state.deletedAchievements
              : [...state.deletedAchievements, id],
          };
        });
      },

      completeOnboarding: ({ name, startDate, incomeGoal, hourlyRate, currency }) => {
        const date = isISODate(startDate) ? startDate : todayISO();
        const month = monthOf(todayISO());
        set((state) => {
          const monthGoals = state.monthGoals.length
            ? state.monthGoals
            : defaultMonthGoals();
          const income = monthGoals.find((goal) => goal.preset === "income");
          const goalPlans = { ...state.goalPlans };
          const plans = { ...(goalPlans[month] ?? {}) };
          const cleanIncome = num(incomeGoal);

          if (income && cleanIncome > 0) plans[income.id] = cleanIncome;

          if (Object.keys(plans).length > 0) goalPlans[month] = plans;
          else delete goalPlans[month];

          const goals = { ...state.goals };
          goals[month] = mirrorMonthGoal(month, monthGoals, plans);

          return {
            onboarded: true,
            monthGoals,
            goalPlans,
            goals,
            settings: {
              ...state.settings,
              name: name.trim().slice(0, 40),
              trackingStartDate: date,
              defaultHourlyRate: num(hourlyRate, 300),
              currency: currency || state.settings.currency,
            },
          };
        });
      },

      importData: (raw) => {
        try {
          let parsed: unknown = raw;
          if (typeof raw === "string") parsed = JSON.parse(raw);
          if (!parsed || typeof parsed !== "object") {
            return { ok: false, error: "Файл не похож на резервную копию Aurum." };
          }

          const container = parsed as Record<string, unknown>;
          const source =
            container.state && typeof container.state === "object"
              ? (container.state as Record<string, unknown>)
              : container;

          if (!source.entries || typeof source.entries !== "object") {
            return { ok: false, error: "В файле нет записей days/entries." };
          }

          const normalized = normalizeAppData(source, defaultData());

          set(normalized);

          // Quietly reconcile badges that are already earned but missing in an older backup.
          const restored = get();
          const earned = achievedBadges(buildSnapshot(restored), achievementConfig(restored));
          const missing = earned.filter((badge) => !restored.achievements[badge.id]);
          if (missing.length > 0) {
            const merged = { ...restored.achievements };
            for (const badge of missing) {
              merged[badge.id] = { unlockedAt: new Date().toISOString() };
            }
            set({ achievements: merged });
          }

          return { ok: true };
        } catch {
          return { ok: false, error: "Не удалось прочитать JSON. Проверьте файл." };
        }
      },

      resetAll: () => {
        set(defaultData());
        set({ onboarded: false });
        useUiStore.getState().clearUnlocks();
      },
    }),
    {
      name: STORAGE_KEY,
      version: DATA_VERSION,
      partialize: (state) => ({
        version: state.version,
        entries: state.entries,
        goals: state.goals,
        monthGoals: state.monthGoals,
        dayGoals: state.dayGoals,
        goalPlans: state.goalPlans,
        dayValues: state.dayValues,
        settings: state.settings,
        achievements: state.achievements,
        achievementOverrides: state.achievementOverrides,
        customAchievements: state.customAchievements,
        deletedAchievements: state.deletedAchievements,
        onboarded: state.onboarded,
      }),
      // v1/v2 → v3: старые данные раскладываются по новым целям без потери истории.
      migrate: (persisted) => persisted as AppData,
      merge: (persisted, current) => {
        const incoming = (persisted ?? {}) as Record<string, unknown>;
        const normalized = normalizeAppData(incoming, defaultData());
        return {
          ...current,
          ...normalized,
          settings: { ...current.settings, ...normalized.settings },
        };
      },
    },
  ),
);

export function exportPayload(state: AppData) {
  return JSON.stringify(
    {
      app: "aurum",
      exportedAt: new Date().toISOString(),
      ...dataOf(state),
    },
    null,
    2,
  );
}

export function useUnlockedBadges() {
  return useAppStore((state) => state.achievements);
}

export { getMonthEntries, calcStreak, calcMaxStreak };
