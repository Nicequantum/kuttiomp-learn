import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Route as RouteIcon,
  Volume2,
  Sun,
  Film,
  Clapperboard,
  Upload,
} from "lucide-react";
import { OrthographyGuide } from "@/components/content/OrthographyGuide";
import { HistoricalBanner } from "@/components/content/HistoricalBanner";
import { MasteryPanel } from "@/components/content/MasteryPanel";
import { VideoProductGuide } from "@/components/content/VideoProductGuide";
import { WordCard } from "@/components/content/WordCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getFeaturedWords,
  getPaths,
  getAllWords,
  getWordById,
  getChapters,
  getCorpusMeta,
} from "@/lib/content/corpus";
import { getDayJourneyStats } from "@/lib/content/day-journey";
import { formatDuration, getLongStories } from "@/lib/content/long-stories";
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
  const dayStats = getDayJourneyStats(mode);
  const longStory = getLongStories(mode)[0];
  const completedStories = useProgressStore((s) => s.completedStories);
  const lastStoryId = useProgressStore((s) => s.lastStoryId);
  const lastStoryPositionSec = useProgressStore((s) => s.lastStoryPositionSec);
  const completedDayActs = useProgressStore((s) => s.completedDayActs);
  const completedScenes = useProgressStore((s) => s.completedScenes);

  const storyInProgress =
    longStory &&
    lastStoryId === longStory.id &&
    lastStoryPositionSec >= 5 &&
    !completedStories.includes(longStory.id);
  const storyDone =
    longStory && completedStories.includes(longStory.id);

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
              ? "Large bold type, high contrast, one calm step at a time."
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

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-2">
          <h2 className="font-display text-title">Video learning</h2>
          <p className="text-xs text-[var(--color-subtle)]">
            Three surfaces · different jobs
          </p>
        </div>

        {longStory && (
          <Link
            to="/app/stories/$id"
            params={{ id: longStory.id }}
            className="focus-stage pad-mode flex items-center justify-between gap-3 hover:border-[var(--color-border-strong)]"
          >
            <div className="flex gap-3 min-w-0">
              <Film className="mt-1 h-6 w-6 shrink-0 text-[var(--color-primary)]" />
              <div className="min-w-0">
                <p className="label-eyebrow">Stories · continuous film</p>
                <p className="font-display text-title">{longStory.title}</p>
                <p className="text-sm text-[var(--color-muted)]">
                  {formatDuration(longStory.durationSec)} one file ·{" "}
                  {longStory.lines.length} language lines · Host + Guest · dawn
                  to night
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {storyInProgress && (
                    <Badge tone="neutral">
                      In progress ·{" "}
                      {Math.floor(lastStoryPositionSec / 60)}:
                      {String(Math.floor(lastStoryPositionSec % 60)).padStart(
                        2,
                        "0",
                      )}
                    </Badge>
                  )}
                  {storyDone && <Badge tone="land">Watched</Badge>}
                  {!storyInProgress && !storyDone && (
                    <Badge tone="land">Play end to end</Badge>
                  )}
                </div>
              </div>
            </div>
            <ArrowRight
              className="h-5 w-5 shrink-0 text-[var(--color-subtle)]"
              aria-hidden
            />
          </Link>
        )}

        <Link
          to="/app/day"
          className="surface-card pad-mode flex items-center justify-between gap-3 hover:border-[var(--color-border-strong)]"
        >
          <div className="flex gap-3 min-w-0">
            <Sun className="mt-1 h-6 w-6 shrink-0 text-[var(--color-primary)]" />
            <div className="min-w-0">
              <p className="label-eyebrow">Full Day · acts you advance</p>
              <p className="font-display text-title">A full day</p>
              <p className="text-sm text-[var(--color-muted)]">
                ~{dayStats.filmMin} min across {dayStats.actCount} separate acts
                — not one continuous story file
              </p>
              <p className="mt-1 text-xs tabular-nums text-[var(--color-subtle)]">
                {completedDayActs.length} acts marked
              </p>
            </div>
          </div>
          <ArrowRight
            className="h-5 w-5 shrink-0 text-[var(--color-subtle)]"
            aria-hidden
          />
        </Link>

        <Link
          to="/app/scenes"
          className="surface-card pad-mode flex items-center justify-between gap-3 hover:border-[var(--color-border-strong)]"
        >
          <div className="flex gap-3 min-w-0">
            <Clapperboard className="mt-1 h-6 w-6 shrink-0 text-[var(--color-primary)]" />
            <div className="min-w-0">
              <p className="label-eyebrow">Scenes · short practice</p>
              <p className="font-display text-title">Scenes</p>
              <p className="text-sm text-[var(--color-muted)]">
                Short reconstructed clips · dual tracks · line-by-line Learn
              </p>
              <p className="mt-1 text-xs tabular-nums text-[var(--color-subtle)]">
                {completedScenes.length} short scenes marked
              </p>
            </div>
          </div>
          <ArrowRight
            className="h-5 w-5 shrink-0 text-[var(--color-subtle)]"
            aria-hidden
          />
        </Link>

        <VideoProductGuide compact />

        <Link
          to="/app/media"
          className="surface-card pad-mode flex items-center justify-between gap-3 hover:border-[var(--color-border-strong)]"
        >
          <div className="flex gap-3 min-w-0">
            <Upload className="mt-1 h-5 w-5 shrink-0 text-[var(--color-primary)]" />
            <div className="min-w-0">
              <p className="label-eyebrow">Keepers</p>
              <p className="font-display text-title">Community media</p>
              <p className="text-sm text-[var(--color-muted)]">
                Replace any reconstruction with a real recording — catalog of
                every slot
              </p>
            </div>
          </div>
          <ArrowRight
            className="h-5 w-5 shrink-0 text-[var(--color-subtle)]"
            aria-hidden
          />
        </Link>
      </section>

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
