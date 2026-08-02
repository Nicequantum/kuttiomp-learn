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
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
