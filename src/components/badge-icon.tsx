import {
  Banknote,
  CalendarCheck,
  Clock,
  Coins,
  Crown,
  Dumbbell,
  Flame,
  GraduationCap,
  Sparkles,
  Sunrise,
  Wallet,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import type { BadgeIcon } from "@/lib/achievements";

export const BADGE_ICONS: Record<BadgeIcon, LucideIcon> = {
  spark: Sparkles,
  flame: Flame,
  coins: Coins,
  wallet: Wallet,
  banknote: Banknote,
  clock: Clock,
  study: GraduationCap,
  youtube: Youtube,
  sport: Dumbbell,
  calendar: CalendarCheck,
  sunrise: Sunrise,
  crown: Crown,
};
