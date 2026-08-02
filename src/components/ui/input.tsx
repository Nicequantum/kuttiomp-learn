import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex w-full rounded-mode border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 text-[length:var(--mode-font-body)] text-[var(--color-fg)] placeholder:text-[var(--color-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] min-h-[var(--mode-target)]",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";
