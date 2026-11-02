import { formatHours, formatMoney } from "./format";
import type { GoalDef, GoalPreset, GoalType, GoalUnit } from "./types";

interface PresetRule {
  title: string;
  type: GoalType;
  unit?: GoalUnit;
}

export const GOAL_PRESET_RULES: Record<GoalPreset, PresetRule> = {
  income: { title: "Доход", type: "number", unit: "money" },
  work: { title: "Часы работы", type: "number", unit: "hours" },
  study: { title: "Учёба", type: "number", unit: "hours" },
  youtube: { title: "YouTube", type: "number", unit: "hours" },
  sport: { title: "Спорт", type: "check" },
};

export const DEFAULT_MONTH_GOALS: GoalDef[] = [
  { id: "income", title: "Доход", type: "number", unit: "money", preset: "income" },
  { id: "work", title: "Часы работы", type: "number", unit: "hours", preset: "work" },
  { id: "study", title: "Учёба", type: "number", unit: "hours", preset: "study" },
  { id: "youtube", title: "YouTube", type: "number", unit: "hours", preset: "youtube" },
  { id: "sport", title: "Спорт", type: "check", preset: "sport" },
];

/** Безопасные ярлыки для миграции старых планов. */
export const DEFAULT_PLAN_KEYS = {
  income: "income",
  work: "work",
  study: "study",
  youtube: "youtube",
  sport: "sport",
} as const;

export function defaultMonthGoals(): GoalDef[] {
  return DEFAULT_MONTH_GOALS.map((goal) => ({ ...goal }));
}

export function createGoalId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function isNumberGoal(goal: GoalDef): goal is GoalDef & { unit: GoalUnit } {
  return goal.type === "number";
}

export function isHourGoal(goal: GoalDef): boolean {
  return goal.type === "number" && goal.unit === "hours";
}

export function isMoneyGoal(goal: GoalDef): boolean {
  return goal.type === "number" && goal.unit === "money";
}

export function isCheckGoal(goal: GoalDef): boolean {
  return goal.type === "check";
}

function cleanTitle(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 60) : "";
}

function cleanType(value: unknown): GoalType {
  return value === "check" ? "check" : "number";
}

function cleanUnit(value: unknown): GoalUnit {
  return value === "money" ? "money" : "hours";
}

export function presetMatchesGoal(
  preset: GoalPreset | undefined,
  type: GoalType,
  unit?: GoalUnit,
): boolean {
  if (!preset) return true;
  const rule = GOAL_PRESET_RULES[preset];
  if (!rule) return false;
  if (rule.type !== type) return false;
  if (rule.type === "number" && rule.unit !== unit) return false;
  return true;
}

export function sanitizeGoalDef(input: Partial<GoalDef> | null | undefined): GoalDef | null {
  if (!input || typeof input !== "object") return null;

  const title = cleanTitle(input.title);
  if (!title) return null;

  const type = cleanType(input.type);
  const unit = type === "number" ? cleanUnit(input.unit) : undefined;
  const rawPreset = typeof input.preset === "string" ? (input.preset as GoalPreset) : undefined;
  const preset =
    rawPreset && GOAL_PRESET_RULES[rawPreset] && presetMatchesGoal(rawPreset, type, unit)
      ? rawPreset
      : undefined;

  const rawId = typeof input.id === "string" ? input.id.trim() : "";
  const id = /^[A-Za-z0-9_-]{1,64}$/.test(rawId) ? rawId : createGoalId();

  return {
    id,
    title,
    type,
    ...(unit ? { unit } : {}),
    ...(preset ? { preset } : {}),
    ...(typeof input.createdAt === "string" ? { createdAt: input.createdAt } : {}),
  };
}

/** Санитайзер списка: убирает пустые и повторяющиеся id. */
export function sanitizeGoalDefs(input: unknown, limit = 50): GoalDef[] {
  if (!Array.isArray(input)) return [];
  const result: GoalDef[] = [];
  const seen = new Set<string>();
  for (const raw of input) {
    if (result.length >= limit) break;
    const goal = sanitizeGoalDef(raw as Partial<GoalDef>);
    if (!goal || seen.has(goal.id)) continue;
    seen.add(goal.id);
    result.push(goal);
  }
  return result;
}

export function parseGoalNumber(value: string) {
  const parsed = Number.parseFloat(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100) / 100;
}

export function goalUnitSuffix(goal: GoalDef, currency: string) {
  if (goal.type === "check") return "дн";
  return goal.unit === "money" ? currency : "ч";
}

export function goalValueText(goal: GoalDef, value: number, currency: string) {
  if (goal.type === "check") {
    return `${Math.round(value)} дн.`;
  }
  if (goal.unit === "money") {
    return formatMoney(value, currency);
  }
  return `${formatHours(value)} ч`;
}

export function goalPlanText(goal: GoalDef, value: number, currency: string) {
  if (value <= 0) return "цель не задана";
  if (goal.type === "check") {
    return `${Math.round(value)} дн.`;
  }
  if (goal.unit === "money") {
    return formatMoney(value, currency);
  }
  return `${formatHours(value)} ч`;
}

/** Человеческое описание типа для предупреждений и бейджей. */
export function goalTypeText(goal: GoalDef) {
  if (goal.type === "check") return "галочка";
  return goal.unit === "money" ? "число · деньги" : "число · часы";
}
