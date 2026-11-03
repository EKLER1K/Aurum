"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Подпись для скринридеров. */
  label: string;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}

/** Переключатель в стиле карточек Aurum: золото вместо системного синего. */
export function Switch({
  checked,
  onCheckedChange,
  label,
  disabled = false,
  size = "md",
  className,
}: SwitchProps) {
  const md = size === "md";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative flex shrink-0 items-center rounded-full border px-0.5 transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        md ? "h-7 w-12" : "h-6 w-10",
        checked
          ? "border-gold/40 bg-gold/25"
          : "border-line bg-raised/60 hover:border-line",
        className,
      )}
    >
      <span
        className={cn(
          "rounded-full transition-transform duration-200 ease-premium",
          md ? "size-5" : "size-4",
          checked
            ? "bg-gold shadow-[0_0_12px_-2px_rgba(212,168,83,0.8)]"
            : "bg-muted/70",
          checked ? (md ? "translate-x-[22px]" : "translate-x-[18px]") : "translate-x-0",
        )}
      />
    </button>
  );
}
