"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-150 ease-premium disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-gold/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-gold text-[#151006] shadow-[0_1px_0_rgba(255,255,255,0.18)_inset,0_8px_24px_-12px_rgba(212,168,83,0.7)] hover:bg-gold-soft active:translate-y-px",
        secondary:
          "border border-line bg-raised text-ink shadow-soft hover:border-line hover:bg-hover active:translate-y-px",
        outline:
          "border border-line bg-transparent text-ink hover:bg-hover active:translate-y-px",
        ghost: "text-muted hover:bg-hover hover:text-ink",
        danger:
          "border border-danger/25 bg-danger/10 text-danger hover:bg-danger/15 active:translate-y-px",
        link: "text-azure underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-[13px] [&_svg]:size-3.5",
        default: "h-10 px-4 [&_svg]:size-4",
        lg: "h-11 px-5 text-[15px] [&_svg]:size-4",
        icon: "size-10 [&_svg]:size-4",
        "icon-sm": "size-8 [&_svg]:size-4",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
