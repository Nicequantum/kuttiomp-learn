import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Film } from "lucide-react";
import { HistoricalBanner } from "@/components/content/HistoricalBanner";
import { ScenePlayer } from "@/components/scenes/ScenePlayer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatDuration,
  getLongStoryById,
  longStoryAsScene,
  resolveLongStoryVideoSrc,
} from "@/lib/content/long-stories";
import { useModeStore } from "@/lib/mode/store";
import { MODES } from "@/lib/mode/modes";

export const Route = createFileRoute("/app/stories/$id")({
  component: LongStoryPage,
});

function LongStoryPage() {
  const { id } = Route.useParams();
  const mode = useModeStore((s) => s.mode);
  const story = getLongStoryById(id);
  const large = mode === "elder" || mode === "little_ones";

  if (!story) {
    return (
      <div className="space-y-4">
        <p className="text-[var(--color-muted)]">
          Story not found or not available in this mode.
        </p>
        <Button asChild variant="secondary">
          <Link to="/app/stories">Back to stories</Link>
        </Button>
        {mode && (
          <p className="text-sm text-[var(--color-subtle)]">
            Mode: {MODES[mode].label}
          </p>
        )}
      </div>
    );
  }

  const scene = longStoryAsScene(story);

  return (
    <div className="space-y-5">
      <Link
        to="/app/stories"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        All long stories
      </Link>

      <header className="space-y-2">
        <p className="label-eyebrow inline-flex items-center gap-1.5 text-[var(--color-primary)]">
          <Film className="h-3.5 w-3.5" />
          Long story narrative
        </p>
        <h1 className="font-display text-display">{story.title}</h1>
        <p className="text-content text-[var(--color-muted)] leading-relaxed">
          {story.subtitle}. {story.beat}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="warn">Historical reconstruction</Badge>
          <Badge tone="land">
            {formatDuration(story.durationSec)} continuous
          </Badge>
          <Badge tone="neutral">{story.lines.length} language lines</Badge>
          <Badge tone="neutral">
            {story.chapters.length} Williams chapters
          </Badge>
        </div>
      </header>

      <HistoricalBanner compact />

      <p className="rounded-mode border border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface)_90%,transparent)] px-3 py-2 text-sm text-[var(--color-muted)]">
        Defaults to <strong className="text-[var(--color-fg)]">Watch</strong> for
        the full {formatDuration(story.durationSec)} film. Switch to{" "}
        <strong className="text-[var(--color-fg)]">Learn</strong> for
        line-by-line Narragansett. Play opens fullscreen; controls auto-hide.
      </p>

      <ScenePlayer
        scene={scene}
        largeTargets={large}
        progressKind="scene"
        defaultPlayMode="watch"
        nextNav={null}
        prevNav={null}
        resolveVideo={(s) =>
          resolveLongStoryVideoSrc({
            ...story,
            videoSrc: s.videoSrc,
            uploadSrc: s.uploadSrc,
          })
        }
      />

      <section className="space-y-2">
        <h2 className="font-display text-title">Chapters woven in</h2>
        <div className="flex flex-wrap gap-1.5">
          {story.chapters.map((c) => (
            <Badge key={c} tone="neutral">
              {c}
            </Badge>
          ))}
        </div>
      </section>

      <p className="text-sm leading-relaxed text-[var(--color-subtle)]">
        {story.reconstructionNote}
      </p>
    </div>
  );
}
