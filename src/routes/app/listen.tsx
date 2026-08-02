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
  const queue = useMemo(() => getListenQueue(meta.id === "little_ones" ? 8 : 12), [meta.id]);
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
        <p className="text-sm font-medium uppercase tracking-wide text-[var(--color-subtle)]">
          Oral practice
        </p>
        <h1 className="font-display text-display">Listen</h1>
        <p className="text-content text-[var(--color-muted)]">
          Hear the form first. Reveal meaning when you are ready.
        </p>
      </header>

      <HistoricalBanner compact />

      <div className="flex items-center justify-between text-sm text-[var(--color-muted)]">
        <span className="tabular-nums">
          {index + 1} of {queue.length}
        </span>
        {practiced && <Badge tone="land">Practiced</Badge>}
      </div>

      <div className="surface-card pad-mode space-y-5">
        <p
          className="narr-word text-center text-[length:calc(var(--mode-font-display)*1.05)] text-[var(--color-fg)]"
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
            <div className="rounded-mode border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-content leading-relaxed">{word.englishGloss}</p>
                <button
                  type="button"
                  className="text-[var(--color-subtle)]"
                  aria-label="Hide meaning"
                  onClick={() => setShowMeaning(false)}
                >
                  <EyeOff className="h-4 w-4" />
                </button>
              </div>
              <HistoricalInlineNote />
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge tone="warn">Historical seed</Badge>
          <Badge>{word.chapter}</Badge>
          {word.isPhrase && <Badge>Phrase</Badge>}
        </div>

        <Button
          type="button"
          variant={practiced ? "soft" : "land"}
          className="w-full"
          onClick={() => markPracticed(word.id)}
        >
          <Check className="h-4 w-4" aria-hidden />
          {practiced ? "Marked practiced" : "I practiced this"}
        </Button>
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="secondary"
          className="flex-1"
          disabled={index === 0}
          onClick={prev}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button
          type="button"
          variant="primary"
          className="flex-1"
          disabled={index >= queue.length - 1}
          onClick={next}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
