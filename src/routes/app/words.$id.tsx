import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, MapPin, User } from "lucide-react";
import { HistoricalBanner, HistoricalInlineNote } from "@/components/content/HistoricalBanner";
import { OrthographyGuide } from "@/components/content/OrthographyGuide";
import { OralPlayer } from "@/components/content/OralPlayer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getWordById } from "@/lib/content/corpus";
import { useProgressStore } from "@/lib/progress/store";
import { useState } from "react";

export const Route = createFileRoute("/app/words/$id")({
  component: WordDetailPage,
});

function WordDetailPage() {
  const { id } = Route.useParams();
  const word = getWordById(id);
  const markPracticed = useProgressStore((s) => s.markPracticed);
  const markRevealed = useProgressStore((s) => s.markRevealed);
  const practiced = useProgressStore((s) => s.practicedIds.includes(id));
  const [showHistorical, setShowHistorical] = useState(false);

  if (!word) {
    return (
      <div className="space-y-4">
        <p className="text-[var(--color-muted)]">Word not found.</p>
        <Button asChild variant="secondary">
          <Link to="/app/words">Back to words</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link
        to="/app/words"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-fg)]"
      >
        <ArrowLeft className="h-4 w-4" />
        All words
      </Link>

      <HistoricalBanner compact />

      <header className="space-y-3">
        <p
          className="narr-word text-display text-[var(--color-fg)]"
          lang="nax"
        >
          {word.wordNarragansett}
        </p>
        <p className="text-content text-[var(--color-muted)] leading-relaxed">
          {word.englishGloss}
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge tone={word.source === "keeper_approved" ? "land" : "warn"}>
            {word.source === "keeper_approved" ? "Living form" : "Historical seed"}
          </Badge>
          {word.isPhrase && <Badge>Phrase</Badge>}
          <Badge tone="neutral">{word.chapter}</Badge>
          <Badge tone="land">{word.semanticDomain}</Badge>
        </div>
      </header>

      {word.source === "historical_seed" && (
        <OrthographyGuide compact />
      )}

      <OralPlayer
        wordId={word.id}
        narragansett={word.wordNarragansett}
        english={word.englishGloss}
        primaryAudioUrl={word.primaryAudioUrl}
        size="hero"
      />

      <section className="surface-card pad-mode space-y-3">
        <h2 className="font-display text-lg">Living authority</h2>
        <div className="flex gap-3">
          <User className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-primary)]" />
          <div>
            <p className="font-medium">Attribution</p>
            <p className="text-[var(--color-muted)] leading-snug">
              {word.speakerAttribution}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-land)]" />
          <div>
            <p className="font-medium">Orthography note</p>
            <p className="text-[var(--color-muted)] leading-snug">
              {word.orthographyNote}
            </p>
          </div>
        </div>
        <HistoricalInlineNote />
      </section>

      {word.englishHistorical &&
        word.englishHistorical !== word.englishGloss && (
          <section className="surface-card pad-mode space-y-2">
            <button
              type="button"
              className="text-sm font-medium text-[var(--color-primary)]"
              onClick={() => {
                setShowHistorical((v) => !v);
                markRevealed(word.id);
              }}
            >
              {showHistorical ? "Hide" : "Show"} 1643 English wording
            </button>
            {showHistorical && (
              <p className="text-[var(--color-muted)] italic leading-relaxed">
                “{word.englishHistorical}”
              </p>
            )}
          </section>
        )}

      <Button
        type="button"
        variant={practiced ? "soft" : "primary"}
        className="w-full"
        onClick={() => markPracticed(word.id)}
      >
        {practiced ? "Practiced" : "Mark as practiced"}
      </Button>
    </div>
  );
}
