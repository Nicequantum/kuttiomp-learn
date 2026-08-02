import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Route as RouteIcon, Volume2 } from "lucide-react";
import { HistoricalBanner } from "@/components/content/HistoricalBanner";
import { MasteryPanel } from "@/components/content/MasteryPanel";
import { WordCard } from "@/components/content/WordCard";
import { Button } from "@/components/ui/button";
import {
  getFeaturedWords,
  getPaths,
  getAllWords,
} from "@/lib/content/corpus";
import { useModeStore } from "@/lib/mode/store";
import { MODES } from "@/lib/mode/modes";
import { useProgressStore } from "@/lib/progress/store";
import { getWordById } from "@/lib/content/corpus";

export const Route = createFileRoute("/app/")({
  component: HomePage,
});

function HomePage() {
  const mode = useModeStore((s) => s.mode);
  const meta = mode ? MODES[mode] : MODES.core_adult;
  const featured = getFeaturedWords(mode === "little_ones" ? 4 : 5);
  const paths = getPaths().slice(0, 2);
  const total = getAllWords().length;
  const lastId = useProgressStore((s) => s.lastListenWordId);
  const resumeWord = lastId ? getWordById(lastId) : undefined;

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="label-eyebrow text-[var(--color-primary)]">Welcome</p>
        <h1 className="font-display text-display text-glow text-[var(--color-fg)]">
          {meta.id === "little_ones"
            ? "Let’s listen together"
            : meta.id === "elder"
              ? "Voice leads the way"
              : "Continue your path"}
        </h1>
        <p className="max-w-prose text-content text-[var(--color-muted)] leading-relaxed">
          {meta.id === "little_ones"
            ? "Tap a word, hear the sound, say it back. Short and gentle."
            : meta.id === "elder"
              ? "Large text, clear audio, one calm step at a time."
              : "Listen first. Meaning second. Living speakers replace every historical placeholder."}
        </p>
      </header>

      <Link to="/app/listen" className="block">
        <div className="focus-stage pad-mode flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="label-eyebrow">Primary action</p>
            <p className="font-display text-title">
              {resumeWord ? "Resume listening" : "Continue listening"}
            </p>
            <p className="text-sm text-[var(--color-muted)]">
              {resumeWord
                ? `Pick up at “${resumeWord.wordNarragansett}”`
                : "Focus mode — one form at a time, oral first"}
            </p>
          </div>
          <Button size="lg" className="shrink-0 shadow-[0_0_28px_var(--color-glow)]">
            Start
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </Link>

      <HistoricalBanner compact={meta.id === "little_ones"} />

      <MasteryPanel />

      <section className="space-y-3" aria-labelledby="start-heading">
        <h2 id="start-heading" className="font-display text-title">
          Explore
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            to="/app/listen"
            className="surface-card pad-mode flex flex-col gap-2 transition-colors hover:border-[var(--color-border-strong)]"
          >
            <Volume2 className="h-5 w-5 text-[var(--color-primary)]" />
            <p className="font-medium">Listen</p>
            <p className="text-sm text-[var(--color-muted)]">Oral focus</p>
          </Link>
          <Link
            to="/app/words"
            className="surface-card pad-mode flex flex-col gap-2 transition-colors hover:border-[var(--color-border-strong)]"
          >
            <BookOpen className="h-5 w-5 text-[var(--color-primary)]" />
            <p className="font-medium">Words</p>
            <p className="text-sm text-[var(--color-muted)]">{total} demo entries</p>
          </Link>
          <Link
            to="/app/paths"
            className="surface-card pad-mode flex flex-col gap-2 transition-colors hover:border-[var(--color-border-strong)]"
          >
            <RouteIcon className="h-5 w-5 text-[var(--color-primary)]" />
            <p className="font-medium">Paths</p>
            <p className="text-sm text-[var(--color-muted)]">Guided topics</p>
          </Link>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="featured-heading">
        <div className="flex items-end justify-between gap-2">
          <h2 id="featured-heading" className="font-display text-title">
            Featured forms
          </h2>
          <Link
            to="/app/words"
            className="text-sm font-medium text-[var(--color-primary)]"
          >
            All words
          </Link>
        </div>
        <div className="grid gap-3">
          {featured.map((w) => (
            <WordCard key={w.id} word={w} />
          ))}
        </div>
      </section>

      {paths.length > 0 && (
        <section className="space-y-3" aria-labelledby="paths-heading">
          <h2 id="paths-heading" className="font-display text-title">
            Paths
          </h2>
          <div className="grid gap-3">
            {paths.map((p) => (
              <Link
                key={p.id}
                to="/app/paths/$id"
                params={{ id: p.id }}
                className="surface-card pad-mode block transition-colors hover:border-[var(--color-border-strong)]"
              >
                <p className="font-medium">{p.title}</p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  {p.description}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
