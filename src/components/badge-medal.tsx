import { cn } from "@/lib/utils";
import type { BadgeDef } from "@/lib/achievements";
import { BADGE_ICONS } from "@/components/badge-icon";

interface BadgeMedalProps {
  badge: BadgeDef;
  unlocked?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: { wrap: "size-9 rounded-lg", icon: "size-4" },
  md: { wrap: "size-12 rounded-xl", icon: "size-5" },
  lg: { wrap: "size-20 rounded-2xl", icon: "size-8" },
};

export function BadgeMedal({ badge, unlocked = false, size = "md", className }: BadgeMedalProps) {
  const Icon = BADGE_ICONS[badge.icon];
  const dims = SIZES[size];

  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center border transition-colors",
        dims.wrap,
        unlocked
          ? "border-gold/35 bg-gradient-to-br from-gold/20 via-gold/[0.07] to-transparent text-gold shadow-[0_0_20px_-8px_rgba(212,168,83,0.5)]"
          : "border-line bg-raised text-muted/70",
        className,
      )}
    >
      <Icon className={dims.icon} strokeWidth={1.5} />
    </span>
  );
}
