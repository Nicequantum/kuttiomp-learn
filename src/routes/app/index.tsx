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

export const Route = createFileRoute("/app/")({
  component: HomePage,
});

function HomePage() {
  const mode = useModeStore((s) => s.mode);
  const meta = mode ? MODES[mode] : MODES.core_adult;
  const featured = getFeaturedWords(mode === "little_ones" ? 4 : 6);
  const paths = getPaths().slice(0, 3);
  const total = getAllWords().length;

  return (
    <div className="space-y-7">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-[var(--color-subtle)]">
          Welcome
        </p>
        <h1 className="font-display text-display text-[var(--color-fg)]">
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
              ? "Large text, clear audio controls, and calm screens — one step at a time."
              : "Listen first. Meaning second. Living speakers will replace every historical placeholder."}
        </p>
      </header>

      <HistoricalBanner compact={meta.id === "little_ones"} />

      <MasteryPanel />

      <section className="space-y-3" aria-labelledby="start-heading">
        <h2 id="start-heading" className="font-display text-title">
          Start here
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            to="/app/listen"
            className="surface-card pad-mode flex flex-col gap-2 hover:border-[var(--color-border-strong)]"
          >
            <Volume2 className="h-5 w-5 text-[var(--color-primary)]" />
            <p className="font-medium">Listen</p>
            <p className="text-sm text-[var(--color-muted)]">
              Oral practice queue
            </p>
          </Link>
          <Link
            to="/app/words"
            className="surface-card pad-mode flex flex-col gap-2 hover:border-[var(--color-border-strong)]"
          >
            <BookOpen className="h-5 w-5 text-[var(--color-primary)]" />
            <p className="font-medium">Words</p>
            <p className="text-sm text-[var(--color-muted)]">
              {total} demo entries
            </p>
          </Link>
          <Link
            to="/app/paths"
            className="surface-card pad-mode flex flex-col gap-2 hover:border-[var(--color-border-strong)]"
          >
            <RouteIcon className="h-5 w-5 text-[var(--color-primary)]" />
            <p className="font-medium">Paths</p>
            <p className="text-sm text-[var(--color-muted)]">Guided topics</p>
          </Link>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="featured-heading">
        <div className="flex items-end justify-between gap-3">
          <h2 id="featured-heading" className="font-display text-title">
            {meta.id === "little_ones" ? "Words to hear" : "Featured words"}
          </h2>
          <Link
            to="/app/words"
            className="text-sm font-medium text-[var(--color-primary)]"
          >
            See all
          </Link>
        </div>
        <div className="grid gap-3">
          {featured.map((w) => (
            <WordCard key={w.id} word={w} showGloss />
          ))}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="paths-heading">
        <div className="flex items-end justify-between gap-3">
          <h2 id="paths-heading" className="font-display text-title">
            Learning paths
          </h2>
          <Link
            to="/app/paths"
            className="text-sm font-medium text-[var(--color-primary)]"
          >
            All paths
          </Link>
        </div>
        <div className="grid gap-3">
          {paths.map((p) => (
            <Link
              key={p.id}
              to="/app/paths/$id"
              params={{ id: p.id }}
              className="surface-card pad-mode flex items-center justify-between gap-3 hover:border-[var(--color-border-strong)]"
            >
              <div>
                <p className="font-display text-lg">{p.title}</p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  {p.wordIds.length} items · Stage {p.stage}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-[var(--color-subtle)]" />
            </Link>
          ))}
        </div>
      </section>

      <section className="surface-card pad-mode space-y-3">
        <h2 className="font-display text-title">For Knowledge Keepers</h2>
        <p className="text-[var(--color-muted)] leading-relaxed">
          This demo is the house with temporary furniture. When you approve
          words, phrases, and speaker audio in the Keeper portal, those living
          entries replace every historical placeholder in production.
        </p>
        <Button asChild variant="secondary" className="w-full sm:w-auto">
          <Link to="/app/profile">How production cutover works</Link>
        </Button>
      </section>
    </div>
  );
}
