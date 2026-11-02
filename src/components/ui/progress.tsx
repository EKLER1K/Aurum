import * as React from "react";
import { cn } from "@/lib/utils";
import { clamp } from "@/lib/utils";

interface ProgressProps {
  value: number;
  className?: string;
  barClassName?: string;
  tone?: "gold" | "azure" | "success";
  size?: "sm" | "md";
}

export function Progress({
  value,
  className,
  barClassName,
  tone = "gold",
  size = "md",
}: ProgressProps) {
  const percent = clamp(value, 0, 100);
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-full bg-[#202024]",
        size === "sm" ? "h-1.5" : "h-2",
        className,
      )}
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-premium",
          tone === "gold" &&
            "bg-gradient-to-r from-[#b78f3f] via-gold to-gold-soft shadow-[0_0_12px_rgba(212,168,83,0.35)]",
          tone === "azure" &&
            "bg-gradient-to-r from-[#3f5fd9] via-azure to-[#8AA4FF] shadow-[0_0_12px_rgba(91,127,255,0.3)]",
          tone === "success" && "bg-gradient-to-r from-[#2f9e5f] via-success to-[#86EFAC]",
          barClassName,
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
