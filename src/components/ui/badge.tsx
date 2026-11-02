import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-wide",
  {
    variants: {
      variant: {
        default: "border-line bg-raised text-muted",
        gold: "border-gold/25 bg-gold/10 text-gold",
        azure: "border-azure/25 bg-azure/10 text-azure",
        success: "border-success/25 bg-success/10 text-success",
        danger: "border-danger/25 bg-danger/10 text-danger",
        outline: "border-line text-muted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
