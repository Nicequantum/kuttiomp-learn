import { cn } from "@/lib/utils";

export function Badge({
  className,
  children,
  tone = "neutral",
}: {
  className?: string;
  children: React.ReactNode;
  tone?: "neutral" | "primary" | "warn" | "land";
}) {
  const tones = {
    neutral:
      "bg-[color-mix(in_oklab,var(--color-fg)_6%,transparent)] text-[var(--color-muted)]",
    primary:
      "bg-[color-mix(in_oklab,var(--color-primary)_14%,transparent)] text-[var(--color-primary)]",
    warn: "bg-[var(--color-warn-soft)] text-[var(--color-warn-fg)]",
    land: "bg-[color-mix(in_oklab,var(--color-land)_16%,transparent)] text-[var(--color-land)]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide [[data-mode=elder]_&]:px-3 [[data-mode=elder]_&]:py-1 [[data-mode=elder]_&]:text-sm [[data-mode=elder]_&]:font-bold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
