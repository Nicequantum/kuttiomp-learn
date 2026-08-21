import { ScrollText } from "lucide-react";
import { getCorpusLoadState, getCorpusMeta } from "@/lib/content/corpus";
import { isLivingForm } from "@/components/content/WordAuthority";
import type { LexicalWord } from "@/lib/content/types";
import { cn } from "@/lib/utils";

export function HistoricalBanner({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const meta = getCorpusMeta();
  const state = getCorpusLoadState();

  if (!meta.isDemo) return null;

  const livingDown = state.apiConfigured && state.apiOk === false;
  const mixed = state.source === "seed+api";

  const title = livingDown
    ? "Living corpus unreachable — historical seed only"
    : mixed
      ? "Mixed corpus — each form is labeled"
      : "Demo scaffold — historical record only";

  const compactBody = livingDown
    ? "Williams 1643 stand-in until Keepers' service is reachable"
    : mixed
      ? "Living Keeper forms first · Williams rows stay labeled Historical"
      : "Williams 1643 record · living speakers hold final word";

  const fullBody = livingDown
    ? "The public lexicon is configured but the living corpus cannot be reached. You are hearing the historical demo seed — colonial phonetic approximations, not living tribal authority. No Williams rows are shown when this app is in keeper_only mode."
    : mixed
      ? "Approved living forms from Knowledge Keepers sit beside the Williams 1643 seed. Living rows name a speaker. Historical rows never claim living authority."
      : "Drawn from Roger Williams' 1643 A Key into the Language of America. Colonial phonetic approximations — not living tribal authority. When Keepers approve real voices, this seed is removed from production.";

  return (
    <aside
      role="note"
      aria-label={
        livingDown
          ? "Living corpus unavailable"
          : "Historical demo content notice"
      }
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
          <p className="font-medium leading-snug">{title}</p>
          {!compact && (
            <p className="text-[length:calc(var(--mode-font-body)*0.92)] leading-relaxed opacity-90">
              {fullBody}
            </p>
          )}
          {compact && (
            <p className="text-[length:calc(var(--mode-font-body)*0.88)] leading-snug opacity-90">
              {compactBody}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}

export function HistoricalInlineNote({ word }: { word?: LexicalWord }) {
  if (word && isLivingForm(word)) {
    const who = word.speakerAttribution?.trim() || "Living speaker";
    return (
      <p className="text-[length:calc(var(--mode-font-body)*0.85)] text-[var(--color-muted)] leading-snug">
        Living form · {who} · speakers hold authority
      </p>
    );
  }
  const meta = getCorpusMeta();
  if (!meta.isDemo && !word) return null;
  return (
    <p className="text-[length:calc(var(--mode-font-body)*0.85)] text-[var(--color-muted)] leading-snug">
      Source: historical seed · {meta.sourceWork.title} ({meta.sourceWork.year})
      — not living tribal authority
    </p>
  );
}
