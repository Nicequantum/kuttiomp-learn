import { createFileRoute, Link } from "@tanstack/react-router";
import { Film, Play } from "lucide-react";
import { HistoricalBanner } from "@/components/content/HistoricalBanner";
import { Badge } from "@/components/ui/badge";
import { formatDuration, getLongStories } from "@/lib/content/long-stories";
import { useModeStore } from "@/lib/mode/store";

export const Route = createFileRoute("/app/stories/")({
  component: StoriesIndexPage,
});

function StoriesIndexPage() {
  const mode = useModeStore((s) => s.mode);
  const stories = getLongStories(mode);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="label-eyebrow inline-flex items-center gap-1.5 text-[var(--color-primary)]">
          <Film className="h-3.5 w-3.5" />
          Long stories
        </p>
        <h1 className="font-display text-display">Stories</h1>
        <p className="text-content text-[var(--color-muted)] leading-relaxed max-w-2xl">
          Full-length reconstructed films with language end to end — not short
          practice clips stitched together. Each film is built as one narrative:
          dialogue first, then scenes that follow the same people through the day.
        </p>
      </header>

      <HistoricalBanner compact />

      <p className="rounded-mode border border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface)_90%,transparent)] px-3 py-2 text-sm text-[var(--color-muted)] leading-relaxed">
        Each story is one continuous video (many shots of the same cast, generated
        for this film and stitched once). Prefer{" "}
        <strong className="text-[var(--color-fg)]">Play full film</strong> for
        end-to-end watching. Subtitles and optional spoken Narragansett follow the
        language lines across the whole film — without skipping between scenes.
      </p>

      <div className="grid gap-4 sm:grid-cols-1">
        {stories.map((story) => (
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
                  {formatDuration(story.durationSec)} continuous film
                </span>
              </div>
            </div>
            <div className="pad-mode space-y-2">
              <p className="text-sm text-[var(--color-muted)] leading-relaxed">
                {story.summary}
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Badge tone="land">{story.lines.length} language lines</Badge>
                <Badge tone="neutral">Host + Guest cast</Badge>
                <Badge tone="warn">Historical reconstruction</Badge>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {stories.length === 0 && (
        <p className="text-[var(--color-muted)]">
          No long stories available in this mode.
        </p>
      )}
    </div>
  );
}
