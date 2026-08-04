import { createFileRoute, Link } from "@tanstack/react-router";
import { Film, Play, Clock } from "lucide-react";
import { HistoricalBanner } from "@/components/content/HistoricalBanner";
import { Badge } from "@/components/ui/badge";
import {
  formatDuration,
  getLongStories,
} from "@/lib/content/long-stories";
import { useModeStore } from "@/lib/mode/store";
import { useProgressStore } from "@/lib/progress/store";

export const Route = createFileRoute("/app/stories/")({
  component: LongStoriesIndexPage,
});

function LongStoriesIndexPage() {
  const mode = useModeStore((s) => s.mode);
  const stories = getLongStories(mode);
  const completed = useProgressStore((s) => s.completedScenes);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="label-eyebrow text-[var(--color-primary)]">
          Long story narratives
        </p>
        <h1 className="font-display text-display">Stories</h1>
        <p className="text-content text-[var(--color-muted)] leading-relaxed">
          Full-length reconstructed films with language end to end — not short
          clips. Hear Narragansett first, read English, or switch either track.
        </p>
      </header>

      <HistoricalBanner compact />

      <div className="surface-card pad-mode flex gap-3 text-sm leading-relaxed text-[var(--color-muted)]">
        <Film className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-primary)]" />
        <p>
          Each story is one continuous video file (many shots stitched). Prefer{" "}
          <strong className="text-[var(--color-fg)]">Watch</strong> mode for the
          full cinema arc, or{" "}
          <strong className="text-[var(--color-fg)]">Learn</strong> for
          line-by-line speech across the whole film.
        </p>
      </div>

      <div className="grid gap-4">
        {stories.map((story) => {
          const done = completed.includes(story.id);
          return (
            <Link
              key={story.id}
              to="/app/stories/$id"
              params={{ id: story.id }}
              className="group overflow-hidden rounded-mode-lg border border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface)_90%,transparent)] hover:border-[var(--color-border-strong)]"
            >
              <div className="relative aspect-video overflow-hidden bg-black/40">
                <img
                  src={story.posterSrc}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                  <div>
                    <p className="font-display text-2xl text-white">
                      {story.title}
                    </p>
                    <p className="text-sm text-white/85">{story.subtitle}</p>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-white/90">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDuration(story.durationSec)} continuous film
                    </p>
                  </div>
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-lg">
                    <Play className="h-6 w-6" fill="currentColor" />
                  </span>
                </div>
              </div>
              <div className="space-y-2 p-3">
                <p className="text-sm leading-snug text-[var(--color-muted)]">
                  {story.summary}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone="land">Long story</Badge>
                  <Badge tone="neutral">{story.lines.length} lines</Badge>
                  <Badge tone="neutral">
                    {story.chapters.length} chapters woven
                  </Badge>
                  {done && <Badge tone="land">Watched</Badge>}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <p className="text-sm text-[var(--color-subtle)]">
        Prefer short lessons?{" "}
        <Link to="/app/scenes" className="text-[var(--color-primary)]">
          Scenes
        </Link>
        {" · "}
        <Link to="/app/day" className="text-[var(--color-primary)]">
          Full Day acts
        </Link>
      </p>
    </div>
  );
}
