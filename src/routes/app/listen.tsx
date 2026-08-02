import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";
import { OralPlayer } from "@/components/content/OralPlayer";
import { HistoricalBanner } from "@/components/content/HistoricalBanner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getListenQueue } from "@/lib/content/corpus";
import { useProgressStore } from "@/lib/progress/store";
import { useModeStore } from "@/lib/mode/store";
import { MODES } from "@/lib/mode/modes";
import { HistoricalInlineNote } from "@/components/content/HistoricalBanner";

export const Route = createFileRoute("/app/listen")({
  component: ListenPage,
});

function ListenPage() {
  const mode = useModeStore((s) => s.mode);
  const meta = mode ? MODES[mode] : MODES.core_adult;
  const queue = useMemo(
    () => getListenQueue(meta.id === "little_ones" ? 8 : 12),
    [meta.id],
  );
  const [index, setIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(meta.showGlossImmediately);
  const markPracticed = useProgressStore((s) => s.markPracticed);
  const markRevealed = useProgressStore((s) => s.markRevealed);
  const practicedIds = useProgressStore((s) => s.practicedIds);

  const word = queue[index];
  if (!word) {
    return <p className="text-[var(--color-muted)]">No content available.</p>;
  }

  const practiced = practicedIds.includes(word.id);

  function next() {
    setIndex((i) => Math.min(queue.length - 1, i + 1));
    setShowMeaning(meta.showGlossImmediately);
  }
  function prev() {
    setIndex((i) => Math.max(0, i - 1));
    setShowMeaning(meta.showGlossImmediately);
  }

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <p className="label-eyebrow text-[var(--color-primary)]">Focus mode</p>
        <h1 className="font-display text-display">Listen</h1>
        <p className="text-content text-[var(--color-muted)]">
          One form. Hear it. Then reveal meaning when you are ready.
        </p>
      </header>

      <HistoricalBanner compact />

      <div className="flex items-center justify-between text-sm text-[var(--color-muted)]">
        <span className="tabular-nums">
          {index + 1} of {queue.length}
        </span>
        {practiced && <Badge tone="land">Practiced</Badge>}
      </div>

      {/* Progress rail */}
      <div
        className="h-1 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--color-fg)_12%,transparent)]"
        aria-hidden
      >
        <div
          className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-300"
          style={{ width: `${((index + 1) / queue.length) * 100}%` }}
        />
      </div>

      <div className="focus-stage pad-mode space-y-6">
        <p
          className="narr-word text-center text-[length:calc(var(--mode-font-display)*1.12)] text-glow text-[var(--color-fg)]"
          lang="nax"
        >
          {word.wordNarragansett}
        </p>

        <OralPlayer
          wordId={word.id}
          narragansett={word.wordNarragansett}
          english={word.englishGloss}
          size="hero"
          showEnglishToggle={meta.id !== "little_ones"}
        />

        <div className="space-y-3">
          {!showMeaning ? (
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => {
                setShowMeaning(true);
                markRevealed(word.id);
              }}
            >
              <Eye className="h-4 w-4" aria-hidden />
              Reveal meaning
            </Button>
          ) : (
            <div className="rounded-mode border border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface-elevated)_90%,transparent)] p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-content leading-relaxed">{word.englishGloss}</p>
                <button
                  type="button"
                  className="shrink-0 text-[var(--color-subtle)] hover:text-[var(--color-fg)]"
                  onClick={() => setShowMeaning(false)}
                  aria-label="Hide meaning"
                >
                  <EyeOff className="h-4 w-4" />
                </button>
              </div>
              <HistoricalInlineNote />
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={prev}
            disabled={index === 0}
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            type="button"
            variant="soft"
            className="flex-1"
            onClick={() => markPracticed(word.id)}
          >
            <Check className="h-4 w-4" />
            Practiced
          </Button>
          <Button
            type="button"
            variant="primary"
            className="flex-1"
            onClick={next}
            disabled={index >= queue.length - 1}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
