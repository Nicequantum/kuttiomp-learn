import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Check, ChevronRight } from "lucide-react";
import { HistoricalBanner } from "@/components/content/HistoricalBanner";
import { OralPlayer } from "@/components/content/OralPlayer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getPathById, getPathWords } from "@/lib/content/corpus";
import { useProgressStore } from "@/lib/progress/store";

export const Route = createFileRoute("/app/paths/$id")({
  component: PathSessionPage,
});

function PathSessionPage() {
  const { id } = Route.useParams();
  const path = getPathById(id);
  const words = useMemo(() => (path ? getPathWords(path) : []), [path]);
  const [step, setStep] = useState(0);
  const [showGloss, setShowGloss] = useState(true);
  const markPracticed = useProgressStore((s) => s.markPracticed);
  const completePath = useProgressStore((s) => s.completePath);
  const completed = useProgressStore((s) => s.completedPaths.includes(id));

  if (!path || words.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-[var(--color-muted)]">Path not found.</p>
        <Button asChild variant="secondary">
          <Link to="/app/paths">Back to paths</Link>
        </Button>
      </div>
    );
  }

  const word = words[step];
  const isLast = step >= words.length - 1;

  function finish() {
    for (const w of words) markPracticed(w.id);
    completePath(path!.id);
  }

  return (
    <div className="space-y-5">
      <Link
        to="/app/paths"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-muted)]"
      >
        <ArrowLeft className="h-4 w-4" />
        All paths
      </Link>

      <header className="space-y-1">
        <h1 className="font-display text-display">{path.title}</h1>
        <p className="text-[var(--color-muted)]">{path.description}</p>
        <p className="text-sm tabular-nums text-[var(--color-subtle)]">
          Step {step + 1} of {words.length}
        </p>
      </header>

      <HistoricalBanner compact />

      <div
        className="flex gap-1"
        aria-hidden
      >
        {words.map((_, i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full"
            style={{
              background:
                i <= step
                  ? "var(--color-primary)"
                  : "color-mix(in oklab, var(--color-fg) 10%, transparent)",
            }}
          />
        ))}
      </div>

      <div className="surface-card pad-mode space-y-4">
        <p className="narr-word text-center text-display" lang="nax">
          {word.wordNarragansett}
        </p>

        <OralPlayer
          wordId={word.id}
          narragansett={word.wordNarragansett}
          english={word.englishGloss}
          size="hero"
        />

        {showGloss ? (
          <p className="text-center text-content text-[var(--color-muted)]">
            {word.englishGloss}
          </p>
        ) : (
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => setShowGloss(true)}
          >
            Show meaning
          </Button>
        )}

        <div className="flex justify-center">
          <Badge tone="warn">Historical seed</Badge>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="secondary"
          className="flex-1"
          disabled={step === 0}
          onClick={() => {
            setStep((s) => s - 1);
            setShowGloss(true);
          }}
        >
          Back
        </Button>
        {!isLast ? (
          <Button
            type="button"
            className="flex-1"
            onClick={() => {
              markPracticed(word.id);
              setStep((s) => s + 1);
              setShowGloss(true);
            }}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="land"
            className="flex-1"
            onClick={finish}
          >
            <Check className="h-4 w-4" />
            {completed ? "Completed" : "Complete path"}
          </Button>
        )}
      </div>

      {completed && (
        <p className="text-center text-sm text-[var(--color-land)]">
          Path marked complete — quiet growth, no scores.
        </p>
      )}
    </div>
  );
}
