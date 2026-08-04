import { createFileRoute, Link } from "@tanstack/react-router";
import { Film, Play } from "lucide-react";
import { HistoricalBanner } from "@/components/content/HistoricalBanner";
import { VideoProductGuide } from "@/components/content/VideoProductGuide";
import { Badge } from "@/components/ui/badge";
import { formatDuration, getLongStories } from "@/lib/content/long-stories";
import { useModeStore } from "@/lib/mode/store";
import { useProgressStore } from "@/lib/progress/store";

export const Route = createFileRoute("/app/stories/")({
  component: StoriesIndexPage,
});

function StoriesIndexPage() {
  const mode = useModeStore((s) => s.mode);
  const stories = getLongStories(mode);
  const completedStories = useProgressStore((s) => s.completedStories);
  const lastStoryId = useProgressStore((s) => s.lastStoryId);
  const lastStoryPositionSec = useProgressStore((s) => s.lastStoryPositionSec);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="label-eyebrow inline-flex items-center gap-1.5 text-[var(--color-primary)]">
          <Film className="h-3.5 w-3.5" />
          Stories · continuous film
        </p>
        <h1 className="font-display text-display">Stories</h1>
        <p className="text-content text-[var(--color-muted)] leading-relaxed max-w-2xl">
          Full-length continuous films with language end to end — one media file
          per story, fixed cast, shot-timed dialogue. Not a playlist of practice
          shorts. For multi-act life-cycle chapters, use{" "}
          <Link to="/app/day" className="text-[var(--color-primary)]">
            Full Day
          </Link>
          ; for short drills, use{" "}
          <Link to="/app/scenes" className="text-[var(--color-primary)]">
            Scenes
          </Link>
          .
        </p>
      </header>

      <HistoricalBanner compact />

      <VideoProductGuide active="stories" compact />

      <p className="rounded-mode border border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface)_90%,transparent)] px-3 py-2 text-sm text-[var(--color-muted)] leading-relaxed">
        Prefer{" "}
        <strong className="text-[var(--color-fg)]">Play full film</strong>{" "}
        (Watch mode) for end-to-end viewing. Your place is saved if you leave.
        Subtitles and optional spoken Narragansett follow the language lines
        without skipping between scenes.
      </p>

      <div className="grid gap-4 sm:grid-cols-1">
        {stories.map((story) => {
          const done = completedStories.includes(story.id);
          const canResume =
            lastStoryId === story.id && lastStoryPositionSec >= 5;
          return (
            <Link
              key={story.id}
              to="/app/stories/$id"
              params={{ id: story.id }}
              className="group surface-card overflow-hidden transition hover:border-[var(--color-primary)]"
            >
              <div className="relative aspect-video overflow-hidden bg-black/40 sm:aspect-[21/9]">
                <img
                  src={story.posterSrc}
                  alt=""
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className="font-display text-xl text-white drop-shadow">
                      {story.title}
                    </p>
                    <p className="text-sm text-white/85">{story.subtitle}</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-[var(--color-primary-fg)]">
                    <Play className="h-3.5 w-3.5" fill="currentColor" />
                    {canResume
                      ? "Continue film"
                      : `${formatDuration(story.durationSec)} continuous`}
                  </span>
                </div>
              </div>
              <div className="pad-mode space-y-2">
                <p className="text-sm text-[var(--color-muted)] leading-relaxed">
                  {story.summary}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone="land">
                    {story.lines.length} language lines
                  </Badge>
                  <Badge tone="neutral">Host + Guest cast</Badge>
                  <Badge tone="warn">Historical reconstruction</Badge>
                  {done && <Badge tone="land">Watched</Badge>}
                  {canResume && !done && (
                    <Badge tone="neutral">In progress</Badge>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {stories.length === 0 && (
        <p className="text-[var(--color-muted)]">
          No long stories available in this mode.
        </p>
      )}
    </div>
  );
}
