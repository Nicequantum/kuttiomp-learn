import { ScrollText } from "lucide-react";
import { getCorpusMeta } from "@/lib/content/corpus";
import { cn } from "@/lib/utils";

export function HistoricalBanner({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const meta = getCorpusMeta();
  if (!meta.isDemo) return null;

  return (
    <aside
      role="note"
      aria-label="Historical demo content notice"
      className={cn(
        "rounded-mode-lg border border-[var(--color-border-strong)] bg-[var(--color-warn-soft)] text-[var(--color-warn-fg)]",
        compact ? "px-3 py-2.5" : "px-4 py-3.5",
        className,
      )}
    >
      <div className="flex gap-3">
        <ScrollText
          className="mt-0.5 h-5 w-5 shrink-0 opacity-80"
          aria-hidden
        />
        <div className="min-w-0 space-y-1">
          <p className="font-medium leading-snug">
            Demo scaffold — historical record only
          </p>
          {!compact && (
            <p className="text-[length:calc(var(--mode-font-body)*0.92)] leading-relaxed opacity-90">
              Drawn from Roger Williams’ 1643 <em>A Key into the Language of
              America</em>. Colonial phonetic approximations — not living
              tribal authority. When Keepers approve real voices, this seed is
              removed from production.
            </p>
          )}
          {compact && (
            <p className="text-[length:calc(var(--mode-font-body)*0.88)] leading-snug opacity-90">
              Williams 1643 record · living speakers hold final word
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}

export function HistoricalInlineNote() {
  const meta = getCorpusMeta();
  if (!meta.isDemo) return null;
  return (
    <p className="text-[length:calc(var(--mode-font-body)*0.85)] text-[var(--color-muted)] leading-snug">
      Source: historical seed · {meta.sourceWork.title} ({meta.sourceWork.year})
    </p>
  );
}
