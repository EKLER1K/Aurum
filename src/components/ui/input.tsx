import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-xl border border-line bg-raised px-3 py-2 text-sm text-ink shadow-soft transition-colors duration-150 placeholder:text-muted/70 focus:border-gold/50 focus:outline-none focus:ring-4 focus:ring-gold/10 disabled:cursor-not-allowed disabled:opacity-50",
        "[color-scheme:dark]",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
