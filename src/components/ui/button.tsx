import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45 active:scale-[0.98] rounded-mode min-target px-4",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--color-primary)] text-[var(--color-primary-fg)] hover:brightness-110",
        secondary:
          "bg-[var(--color-surface-elevated)] text-[var(--color-fg)] border border-[var(--color-border-strong)] hover:bg-[var(--color-surface)]",
        ghost:
          "bg-transparent text-[var(--color-fg)] hover:bg-[color-mix(in_oklab,var(--color-fg)_6%,transparent)]",
        soft: "bg-[color-mix(in_oklab,var(--color-primary)_12%,transparent)] text-[var(--color-primary)] hover:bg-[color-mix(in_oklab,var(--color-primary)_18%,transparent)]",
        land: "bg-[var(--color-land)] text-white hover:brightness-110",
      },
      size: {
        default: "text-[length:var(--mode-font-body)] h-[var(--mode-target)]",
        lg: "text-[length:calc(var(--mode-font-body)*1.05)] h-[calc(var(--mode-target)+0.35rem)] px-6",
        sm: "text-sm h-10 px-3 min-h-10",
        icon: "h-[var(--mode-target)] w-[var(--mode-target)] p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
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
