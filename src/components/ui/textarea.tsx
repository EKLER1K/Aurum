import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[72px] w-full resize-none rounded-xl border border-line bg-raised px-3 py-2.5 text-sm text-ink shadow-soft transition-colors duration-150 placeholder:text-muted/70 focus:border-gold/50 focus:outline-none focus:ring-4 focus:ring-gold/10 disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
