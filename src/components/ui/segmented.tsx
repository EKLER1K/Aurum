"use client";

import { cn } from "@/lib/utils";

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
  className?: string;
  size?: "sm" | "md";
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "sm",
}: SegmentedProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-line/70 bg-raised/60 p-0.5",
        className,
      )}
      role="tablist"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-[7px] font-medium transition-all duration-150",
              size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3.5 py-1.5 text-[12px]",
              active
                ? "bg-card text-ink shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
                : "text-muted hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
