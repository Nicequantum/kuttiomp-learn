import { createFileRoute, Link } from "@tanstack/react-router";
import { Clapperboard, Film, Play, Upload, CheckCircle2, Sun } from "lucide-react";
import { HistoricalBanner } from "@/components/content/HistoricalBanner";
import { VideoProductGuide } from "@/components/content/VideoProductGuide";
import { Badge } from "@/components/ui/badge";
import {
  getScenesForMode,
  getSceneDomains,
  getSceneSeries,
  getSceneChapters,
  getRecommendedScene,
} from "@/lib/content/scenes";
import { getDayJourneyStats } from "@/lib/content/day-journey";
import { formatDuration, getLongStories } from "@/lib/content/long-stories";
import { useModeStore } from "@/lib/mode/store";
import { useProgressStore } from "@/lib/progress/store";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/app/scenes/")({
  component: ScenesIndexPage,
});

function ScenesIndexPage() {
  const mode = useModeStore((s) => s.mode);
  const scenes = getScenesForMode(mode);
  const domains = getSceneDomains();
  const seriesList = getSceneSeries();
  const chapters = getSceneChapters();
  const dayStats = getDayJourneyStats(mode);
  const longStory = getLongStories(mode)[0];
  const [domain, setDomain] = useState<string | null>(null);
  const [series, setSeries] = useState<string | null>(null);
  const [chapter, setChapter] = useState<number | null>(null);
  const [style, setStyle] = useState<"all" | "cinematic" | "cartoon">("all");
  const completed = useProgressStore((s) => s.completedScenes);
  const lastId = useProgressStore((s) => s.lastSceneId);
  const recommended = getRecommendedScene(completed, mode);

  const list = useMemo(() => {
    return scenes.filter((s) => {
      if (domain && s.domain !== domain) return false;
      if (series && (s.series ?? "Other") !== series) return false;
      if (chapter != null && s.chapterNum !== chapter) return false;
      if (style !== "all" && s.style !== style) return false;
      return true;
    });
  }, [scenes, domain, series, chapter, style]);

  const doneCount = scenes.filter((s) => completed.includes(s.id)).length;
  const pathPct =
    scenes.length > 0 ? Math.round((doneCount / scenes.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="label-eyebrow text-[var(--color-primary)]">
          Scenes · short practice
        </p>
        <h1 className="font-display text-display">Scenes</h1>
        <p className="text-content text-[var(--color-muted)] leading-relaxed">
          Short chapter drills:{" "}
          <strong className="text-[var(--color-fg)]">hear Narragansett</strong>,{" "}
          <strong className="text-[var(--color-fg)]">read English</strong> —
          then toggle either track. These are not the continuous long film (
          <Link to="/app/stories" className="text-[var(--color-primary)]">
            Stories
          </Link>
          ) and not the multi-act day path (
          <Link to="/app/day" className="text-[var(--color-primary)]">
            Full Day
          </Link>
          ).
        </p>
        <p className="text-sm text-[var(--color-subtle)]">
          {list.length} of {scenes.length} short scenes in this mode · path
          ordered by chapter
        </p>
      </header>

      <VideoProductGuide active="scenes" compact />

      {longStory && (
        <Link
          to="/app/stories/$id"
          params={{ id: longStory.id }}
          className="focus-stage pad-mode flex items-center justify-between gap-3"
        >
          <div className="flex gap-3">
            <Film className="mt-0.5 h-6 w-6 shrink-0 text-[var(--color-primary)]" />
            <div>
              <p className="label-eyebrow">Want the continuous film?</p>
              <p className="font-display text-title">{longStory.title}</p>
              <p className="text-sm text-[var(--color-muted)]">
                {formatDuration(longStory.durationSec)} · one file ·{" "}
                {longStory.lines.length} language lines
              </p>
            </div>
          </div>
          <Play className="h-6 w-6 shrink-0 text-[var(--color-primary)]" />
        </Link>
      )}

      <Link
        to="/app/day"
        className="surface-card pad-mode flex items-center justify-between gap-3 hover:border-[var(--color-border-strong)]"
      >
        <div className="flex gap-3">
          <Sun className="mt-0.5 h-6 w-6 shrink-0 text-[var(--color-primary)]" />
          <div>
            <p className="label-eyebrow">Want the multi-act day path?</p>
            <p className="font-display text-title">A full day</p>
            <p className="text-sm text-[var(--color-muted)]">
              ~{dayStats.filmMin} min · {dayStats.actCount} acts you advance
            </p>
          </div>
        </div>
        <Play className="h-6 w-6 shrink-0 text-[var(--color-primary)]" />
      </Link>

      <Link
        to="/app/media"
        className="surface-card pad-mode flex items-center justify-between gap-3 hover:border-[var(--color-border-strong)]"
      >
        <div className="flex gap-3">
          <Upload className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-primary)]" />
          <div>
            <p className="label-eyebrow">Keepers</p>
            <p className="font-display text-title">Replace with community media</p>
            <p className="text-sm text-[var(--color-muted)]">
              Drop-in MP4 paths · live catalog · preferred when present
            </p>
          </div>
        </div>
      </Link>

      <HistoricalBanner compact />

      <div className="surface-card pad-mode space-y-2">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="font-medium text-[var(--color-fg)]">
            Short scenes path
          </span>
          <span className="tabular-nums text-[var(--color-muted)]">
            {doneCount} of {scenes.length} · {pathPct}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--color-fg)_10%,transparent)]">
          <div
            className="h-full rounded-full bg-[var(--color-primary)] transition-all"
            style={{ width: `${pathPct}%` }}
          />
        </div>
      </div>

      <div className="surface-card pad-mode flex gap-3 text-sm leading-relaxed text-[var(--color-muted)]">
        <Clapperboard className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-primary)]" />
        <p>
          Play opens fullscreen. Controls auto-hide so the picture stays clear.
          Community files go in{" "}
          <code className="text-[var(--color-fg)]">public/scenes/uploads/</code>
          {" "}— see the{" "}
          <Link to="/app/media" className="text-[var(--color-primary)]">
            media catalog
          </Link>
          .
        </p>
      </div>

      {recommended && !completed.includes(recommended.id) && (
        <Link
          to="/app/scenes/$id"
          params={{ id: recommended.id }}
          className="focus-stage pad-mode flex items-center justify-between gap-3"
        >
          <div>
            <p className="label-eyebrow">Up next</p>
            <p className="font-display text-title">{recommended.title}</p>
            <p className="text-sm text-[var(--color-muted)]">
              Ch. {recommended.chapterNum} · {recommended.chapter} · ~
              {recommended.durationSec}s practice
            </p>
          </div>
          <Play className="h-6 w-6 shrink-0 text-[var(--color-primary)]" />
        </Link>
      )}

      {lastId &&
        lastId !== recommended?.id &&
        scenes.some((s) => s.id === lastId) && (
          <Link
            to="/app/scenes/$id"
            params={{ id: lastId }}
            className="surface-card pad-mode flex items-center justify-between gap-3 hover:border-[var(--color-border-strong)]"
          >
            <div>
              <p className="label-eyebrow">Resume</p>
              <p className="font-display text-lg">Continue last scene</p>
            </div>
            <Play className="h-5 w-5 text-[var(--color-primary)]" />
          </Link>
        )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(
          [
            ["all", "All styles"],
            ["cinematic", "Cinematic"],
            ["cartoon", "Cartoon"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setStyle(key)}
            className={cn(
              "min-h-11 shrink-0 rounded-full border px-3 py-1.5 text-sm",
              style === key
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-[var(--color-border)] text-[var(--color-muted)]",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setSeries(null)}
          className={cn(
            "min-h-11 shrink-0 rounded-full border px-3 py-1.5 text-sm",
            !series
              ? "border-[var(--color-primary)] text-[var(--color-primary)]"
              : "border-[var(--color-border)] text-[var(--color-muted)]",
          )}
        >
          All series
        </button>
        {seriesList.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSeries(s.id === series ? null : s.id)}
            className={cn(
              "min-h-11 shrink-0 rounded-full border px-3 py-1.5 text-sm",
              series === s.id
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-[var(--color-border)] text-[var(--color-muted)]",
            )}
          >
            {s.id}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setChapter(null)}
          className={cn(
            "min-h-11 shrink-0 rounded-full border px-3 py-1.5 text-sm",
            chapter == null
              ? "border-[var(--color-primary)] text-[var(--color-primary)]"
              : "border-[var(--color-border)] text-[var(--color-muted)]",
          )}
        >
          All chapters
        </button>
        {chapters.map((c) => (
          <button
            key={c.num}
            type="button"
            onClick={() => setChapter(c.num === chapter ? null : c.num)}
            className={cn(
              "min-h-11 shrink-0 rounded-full border px-3 py-1.5 text-sm",
              chapter === c.num
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-[var(--color-border)] text-[var(--color-muted)]",
            )}
          >
            Ch. {c.num}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setDomain(null)}
          className={cn(
            "min-h-11 shrink-0 rounded-full border px-3 py-1.5 text-sm",
            !domain
              ? "border-[var(--color-primary)] text-[var(--color-primary)]"
              : "border-[var(--color-border)] text-[var(--color-muted)]",
          )}
        >
          All topics
        </button>
        {domains.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setDomain(d.id === domain ? null : d.id)}
            className={cn(
              "min-h-11 shrink-0 rounded-full border px-3 py-1.5 text-sm",
              domain === d.id
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-[var(--color-border)] text-[var(--color-muted)]",
            )}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4">
        {list.map((scene) => {
          const done = completed.includes(scene.id);
          return (
            <Link
              key={scene.id}
              to="/app/scenes/$id"
              params={{ id: scene.id }}
              className="group overflow-hidden rounded-mode-lg border border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface)_90%,transparent)] hover:border-[var(--color-border-strong)]"
            >
              <div className="relative aspect-video overflow-hidden bg-black/40">
                <img
                  src={scene.posterSrc}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                  <div>
                    <p className="font-display text-xl text-white">
                      {scene.title}
                    </p>
                    <p className="text-sm text-white/80">
                      Ch. {scene.chapterNum} · ~{scene.durationSec}s practice
                      {scene.series ? ` · ${scene.series}` : ""}
                    </p>
                  </div>
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-lg">
                    {done ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" fill="currentColor" />
                    )}
                  </span>
                </div>
              </div>
              <div className="space-y-2 p-3">
                <p className="text-sm text-[var(--color-muted)] leading-snug">
                  {scene.summary}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone={scene.style === "cartoon" ? "land" : "neutral"}>
                    {scene.style}
                  </Badge>
                  <Badge tone="warn">{scene.sensitivity}</Badge>
                  {done && <Badge tone="land">Watched</Badge>}
                  {scene.mediaStatus === "awaiting_upload" && (
                    <Badge tone="warn">
                      <Upload className="mr-1 inline h-3 w-3" />
                      Upload ready
                    </Badge>
                  )}
                  <Badge tone="neutral">{scene.lines.length} lines</Badge>
                </div>
              </div>
            </Link>
          );
        })}
        {list.length === 0 && (
          <div className="surface-card pad-mode text-center text-[var(--color-muted)]">
            No scenes for these filters. Clear filters or switch mode.
          </div>
        )}
      </div>
    </div>
  );
}
