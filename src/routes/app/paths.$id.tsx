import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ChevronRight } from "lucide-react";
import { HistoricalBanner } from "@/components/content/HistoricalBanner";
import { OralPlayer } from "@/components/content/OralPlayer";
import { OrthographyGuide } from "@/components/content/OrthographyGuide";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSessionById, getSessionWords } from "@/lib/content/sessions";
import { getPathById, getPathWords } from "@/lib/content/corpus";
import { useProgressStore } from "@/lib/progress/store";

export const Route = createFileRoute("/app/paths/$id")({
  component: PathSessionPage,
});

function PathSessionPage() {
  const { id } = Route.useParams();

  // Prefer domain sessions; fall back to legacy seed paths
  const session = useMemo(() => {
    const s = getSessionById(id);
    if (s) return s;
    const legacy = getPathById(id);
    if (!legacy) return undefined;
    const words = getPathWords(legacy);
    return {
      ...legacy,
      domain: words[0]?.semanticDomain || "other",
      kind: "seed_path" as const,
      livingCount: words.filter((w) => w.source === "keeper_approved").length,
      historicalCount: words.filter((w) => w.source === "historical_seed")
        .length,
    };
  }, [id]);

  const words = useMemo(
    () => (session ? getSessionWords(session) : []),
    [session],
  );

  const [step, setStep] = useState(0);
  const [showGloss, setShowGloss] = useState(true);
  const markPracticed = useProgressStore((s) => s.markPracticed);
  const completePath = useProgressStore((s) => s.completePath);
  const completed = useProgressStore((s) => s.completedPaths.includes(id));

  useEffect(() => {
    setStep(0);
    setShowGloss(true);
  }, [id]);

  if (!session || words.length === 0) {
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
    completePath(session!.id);
  }

  return (
    <div className="space-y-5">
      <Link
        to="/app/paths"
        className="inline-flex min-h-[var(--mode-target)] items-center gap-1.5 text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-fg)]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        All paths
      </Link>

      <header className="space-y-2">
        <p className="label-eyebrow text-[var(--color-primary)]">
          Session · stage {session.stage}
        </p>
        <h1 className="font-display text-display">{session.title}</h1>
        <p className="text-[var(--color-muted)] leading-relaxed">
          {session.description}
        </p>
        <p
          className="text-sm tabular-nums text-[var(--color-subtle)]"
          aria-live="polite"
        >
          Step {step + 1} of {words.length}
        </p>
      </header>

      <HistoricalBanner compact />

      {/* Session map / stepper */}
      <nav aria-label="Session steps">
        <ol className="flex gap-1">
          {words.map((w, i) => (
            <li key={w.id} className="flex-1">
              <button
                type="button"
                onClick={() => {
                  setStep(i);
                  setShowGloss(true);
                }}
                className="h-2 w-full rounded-full min-h-[0.5rem] focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                style={{
                  background:
                    i <= step
                      ? "var(--color-primary)"
                      : "color-mix(in oklab, var(--color-fg) 12%, transparent)",
                }}
                aria-label={`Step ${i + 1}: ${w.wordNarragansett}`}
                aria-current={i === step ? "step" : undefined}
              />
            </li>
          ))}
        </ol>
      </nav>

      <div className="focus-stage pad-mode space-y-4">
        <p
          className="narr-word text-center text-display text-glow"
          lang="nax"
        >
          {word.wordNarragansett}
        </p>

        <OralPlayer
          wordId={word.id}
          narragansett={word.wordNarragansett}
          english={word.englishGloss}
          primaryAudioUrl={word.primaryAudioUrl}
          size="hero"
        />

        {showGloss ? (
          <p className="text-center text-content text-[var(--color-muted)] leading-relaxed">
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

        <div className="flex flex-wrap justify-center gap-2">
          <Badge
            tone={word.source === "keeper_approved" ? "land" : "warn"}
          >
            {word.source === "keeper_approved"
              ? "Living form"
              : "Historical seed"}
          </Badge>
          <Badge tone="neutral">{word.semanticDomain}</Badge>
        </div>
      </div>

      {word.source === "historical_seed" && (
        <OrthographyGuide compact />
      )}

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
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        ) : (
          <Button
            type="button"
            variant="land"
            className="flex-1"
            onClick={finish}
          >
            <Check className="h-4 w-4" aria-hidden />
            {completed ? "Completed" : "Complete session"}
          </Button>
        )}
      </div>

      {completed && (
        <p className="text-center text-sm text-[var(--color-land)]">
          Session complete — quiet growth, no scores.
        </p>
      )}
    </div>
  );
}
