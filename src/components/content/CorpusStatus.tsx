import { getCorpusLoadState } from "@/lib/content/corpus";
import { IS_DEMO_HISTORICAL } from "@/lib/content/config";
import { cn } from "@/lib/utils";

/**
 * Honest corpus banner for production (keeper_only) and API merge.
 * Historical demo keeps HistoricalBanner; this covers empty / live / error.
 */
export function CorpusStatus({ className }: { className?: string }) {
  const state = getCorpusLoadState();

  if (IS_DEMO_HISTORICAL && state.source !== "seed+api") {
    return null;
  }

  if (state.source === "empty") {
    const unavailable = state.apiOk === false;
    return (
      <aside
        role="status"
        className={cn(
          "rounded-mode-lg border px-4 py-3.5",
          unavailable
            ? "border-[var(--color-border-strong)] bg-[var(--color-warn-soft)] text-[var(--color-warn-fg)]"
            : "border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-fg)]",
          className,
        )}
      >
        <p className="font-medium leading-snug">
          {unavailable
            ? "Living corpus is temporarily unavailable"
            : "Keepers are building the living corpus"}
        </p>
        <p className="mt-1 text-[length:calc(var(--mode-font-body)*0.92)] leading-relaxed opacity-90">
          {unavailable
            ? "The learner app is ready. Language will return when the public lexicon can be reached."
            : "Nothing public yet. Approved, non-sacred forms appear here as Knowledge Keepers publish them."}
        </p>
      </aside>
    );
  }

  if (state.source === "api" || state.source === "seed+api") {
    return (
      <p
        className={cn(
          "text-sm text-[var(--color-subtle)]",
          className,
        )}
      >
        {state.message}
        {state.corpusVersion ? ` · ${state.corpusVersion}` : ""}
      </p>
    );
  }

  return null;
}
