import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative inline-flex w-full sm:w-auto">
      <select
        ref={ref}
        className={cn(
          "h-9 w-full cursor-pointer appearance-none rounded-lg border border-line bg-raised pl-3 pr-9 text-[13px] font-medium text-ink shadow-soft transition-colors duration-150 hover:bg-hover focus:border-gold/40 focus:outline-none focus:ring-4 focus:ring-gold/10",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
    </div>
  ),
);
Select.displayName = "Select";

export { Select };
