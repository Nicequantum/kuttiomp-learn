import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Route as RouteIcon, Volume2 } from "lucide-react";
import { OrthographyGuide } from "@/components/content/OrthographyGuide";
import { HistoricalBanner } from "@/components/content/HistoricalBanner";
import { MasteryPanel } from "@/components/content/MasteryPanel";
import { WordCard } from "@/components/content/WordCard";
import { Button } from "@/components/ui/button";
import {
  getFeaturedWords,
  getPaths,
  getAllWords,
  getWordById,
  getChapters,
  getCorpusMeta,
} from "@/lib/content/corpus";
import { useModeStore } from "@/lib/mode/store";
import { MODES } from "@/lib/mode/modes";
import { useProgressStore } from "@/lib/progress/store";

export const Route = createFileRoute("/app/")({
  component: HomePage,
});

function HomePage() {
  const mode = useModeStore((s) => s.mode);
  const meta = mode ? MODES[mode] : MODES.core_adult;
  const featured = getFeaturedWords(mode === "little_ones" ? 4 : 5);
  const paths = getPaths().slice(0, 3);
  const total = getAllWords().length;
  const seedTotal = getCorpusMeta().totalInSeed ?? total;
  const chapters = getChapters();
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
        <p className="text-sm text-[var(--color-subtle)]">
          {total} forms in your mode
          {seedTotal !== total ? ` · ${seedTotal} in full seed` : ""}
          {" · "}
          {chapters.filter((c) => c.count > 0).length} chapters open
        </p>
      </header>

      <HistoricalBanner compact />

      <OrthographyGuide compact />

      <Link
        to="/app/key"
        className="surface-card pad-mode flex items-center justify-between gap-3 hover:border-[var(--color-border-strong)]"
      >
        <div>
          <p className="label-eyebrow">Full book seed</p>
          <p className="font-display text-title">The Key (1643)</p>
          <p className="text-sm text-[var(--color-muted)]">
            All 32 chapters · modern English glosses · historical spellings
          </p>
        </div>
        <ArrowRight className="h-5 w-5 text-[var(--color-subtle)]" aria-hidden />
      </Link>

      <Link
        to="/app/listen"
        className="focus-stage pad-mode flex items-center justify-between gap-4 hover:border-[var(--color-border-strong)]"
      >
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
        <Volume2 className="h-8 w-8 text-[var(--color-primary)]" aria-hidden />
      </Link>

      <MasteryPanel />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-title">Featured forms</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/app/words" search={{}}>
              All words
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-3">
          {featured.map((w) => (
            <WordCard key={w.id} word={w} />
          ))}
        </div>
      </section>

      {paths.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-title">Paths</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/app/paths">
                Browse
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
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
                  <p className="font-medium">{p.title}</p>
                  <p className="text-sm text-[var(--color-muted)]">
                    {p.wordIds.length} forms · stage {p.stage}
                  </p>
                </div>
                <RouteIcon
                  className="h-5 w-5 text-[var(--color-subtle)]"
                  aria-hidden
                />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="surface-card pad-mode flex gap-3">
        <BookOpen
          className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-primary)]"
          aria-hidden
        />
        <div>
          <p className="font-medium">Demo scaffold</p>
          <p className="text-sm text-[var(--color-muted)] leading-relaxed">
            Full Williams Key seed with modern English. When Keepers publish,
            living forms replace this scaffold.
          </p>
        </div>
      </section>
    </div>
  );
}
