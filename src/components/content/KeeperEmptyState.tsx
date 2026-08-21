import { BookOpen } from "lucide-react";
import { getCorpusLoadState, getCorpusMeta } from "@/lib/content/corpus";
import { cn } from "@/lib/utils";

/**
 * Honest production empty state. Never mentions the historical demo seed.
 */
export function KeeperEmptyState({ className }: { className?: string }) {
  const meta = getCorpusMeta();
  const state = getCorpusLoadState();
  if (meta.isDemo) return null;
  if (state.wordCount > 0 && state.source !== "empty") return null;

  const unavailable = state.apiConfigured && state.apiOk === false;
  const unconfigured = !state.apiConfigured;

  const title = unavailable
    ? "Content temporarily unavailable"
    : unconfigured
      ? "Living corpus not connected"
      : "Keepers are building the living corpus";

  const body = unavailable
    ? "Approved public words will appear here when the Keeper service is reachable again."
    : unconfigured
      ? "This app is waiting for the public lexicon. Nothing from the demo scaffold is shown in production."
      : "Knowledge Keepers publish approved, public words from the portal. Sacred and restricted forms never appear here.";

  return (
    <aside
      role="status"
      aria-live="polite"
      className={cn(
        "rounded-mode-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] pad-mode space-y-2",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <BookOpen
          className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-primary)]"
          aria-hidden
        />
        <div className="min-w-0 space-y-1">
          <p className="font-medium text-[var(--color-fg)]">{title}</p>
          <p className="text-sm text-[var(--color-muted)] leading-relaxed">
            {body}
          </p>
        </div>
      </div>
    </aside>
  );
}
