import { Link } from "@tanstack/react-router";
import { ChevronRight, Play } from "lucide-react";
import type { LexicalWord } from "@/lib/content/types";
import { Badge } from "@/components/ui/badge";
import { speakWord } from "@/lib/audio/speak";
import { useProgressStore } from "@/lib/progress/store";
import { useModeStore } from "@/lib/mode/store";
import { MODES } from "@/lib/mode/modes";
import { cn } from "@/lib/utils";

export function WordCard({
  word,
  compact = false,
  showGloss,
}: {
  word: LexicalWord;
  compact?: boolean;
  showGloss?: boolean;
}) {
  const mode = useModeStore((s) => s.mode);
  const meta = mode ? MODES[mode] : null;
  const markHeard = useProgressStore((s) => s.markHeard);
  const practiced = useProgressStore((s) =>
    s.practicedIds.includes(word.id),
  );
  const revealDefault = showGloss ?? meta?.showGlossImmediately ?? true;

  async function quickPlay(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    markHeard(word.id);
    await speakWord({
      narragansett: word.wordNarragansett,
      primaryAudioUrl: word.primaryAudioUrl,
    });
  }

  return (
    <Link
      to="/app/words/$id"
      params={{ id: word.id }}
      className={cn(
        "surface-card group flex gap-3 pad-mode transition-colors duration-150 hover:border-[var(--color-border-strong)] focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
        compact && "p-3",
      )}
    >
      <button
        type="button"
        onClick={quickPlay}
        className="flex h-[var(--mode-target)] w-[var(--mode-target)] shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--color-primary)_12%,transparent)] text-[var(--color-primary)] hover:bg-[color-mix(in_oklab,var(--color-primary)_20%,transparent)]"
        aria-label={`Play ${word.wordNarragansett}`}
      >
        <Play className="h-5 w-5 translate-x-0.5" aria-hidden />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="narr-word text-title leading-snug" lang="nax">
            {word.wordNarragansett}
          </p>
          <ChevronRight
            className="mt-1 h-4 w-4 shrink-0 text-[var(--color-subtle)] opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden
          />
        </div>
        {revealDefault && (
          <p className="mt-1 text-[var(--color-muted)] leading-snug line-clamp-2">
            {word.englishGloss}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge tone={word.source === "keeper_approved" ? "land" : "warn"}>
            {word.source === "keeper_approved" ? "Living" : "Historical"}
          </Badge>
          {practiced && <Badge tone="neutral">Practiced</Badge>}
          {word.primaryAudioUrl && <Badge tone="land">Recording</Badge>}
        </div>
      </div>
    </Link>
  );
}
