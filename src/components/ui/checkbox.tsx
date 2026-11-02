"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
  id?: string;
}

export function Checkbox({
  checked,
  onCheckedChange,
  label,
  description,
  className,
  id,
}: CheckboxProps) {
  return (
    <button
      type="button"
      id={id}
      role="checkbox"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl border border-line bg-raised px-3.5 py-3 text-left transition-all duration-150 hover:bg-hover focus-visible:ring-2 focus-visible:ring-gold/30",
        checked && "border-gold/40 bg-gold/[0.06]",
        className,
      )}
    >
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-md border border-line bg-bg transition-colors duration-150",
          checked && "border-gold bg-gold text-[#151006]",
        )}
      >
        <Check className={cn("size-3.5 transition-opacity", checked ? "opacity-100" : "opacity-0")} strokeWidth={3} />
      </span>
      {(label || description) && (
        <span className="flex flex-col">
          {label && <span className="text-sm font-medium text-ink">{label}</span>}
          {description && <span className="text-xs text-muted">{description}</span>}
        </span>
      )}
    </button>
  );
}
