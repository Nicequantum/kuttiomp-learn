import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { HistoricalBanner } from "@/components/content/HistoricalBanner";
import { ScenePlayer } from "@/components/scenes/ScenePlayer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSceneById, getScenesForMode } from "@/lib/content/scenes";
import { useModeStore } from "@/lib/mode/store";
import { MODES } from "@/lib/mode/modes";

export const Route = createFileRoute("/app/scenes/$id")({
  component: SceneDetailPage,
});

function SceneDetailPage() {
  const { id } = Route.useParams();
  const mode = useModeStore((s) => s.mode);
  const scene = getSceneById(id);
  const large = mode === "elder" || mode === "little_ones";
  const others = getScenesForMode(mode)
    .filter((s) => s.id !== id)
    .slice(0, 3);

  if (!scene) {
    return (
      <div className="space-y-4">
        <p className="text-[var(--color-muted)]">
          Scene not found or not available in this learning mode.
        </p>
        <Button asChild variant="secondary">
          <Link to="/app/scenes">Back to scenes</Link>
        </Button>
        {mode && (
          <p className="text-sm text-[var(--color-subtle)]">
            Current mode: {MODES[mode].label}. Switch mode in Profile for more
            scenes.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link
        to="/app/scenes"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        All scenes
      </Link>

      <header className="space-y-2">
        <p className="label-eyebrow text-[var(--color-primary)]">
          Ch. {scene.chapterNum} · {scene.chapter}
        </p>
        <h1 className="font-display text-display">{scene.title}</h1>
        <p className="text-content text-[var(--color-muted)] leading-relaxed">
          {scene.summary}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="warn">Historical reconstruction</Badge>
          <Badge tone={scene.style === "cartoon" ? "land" : "neutral"}>
            {scene.style}
          </Badge>
          <Badge tone="neutral">{scene.lines.length} lines</Badge>
        </div>
      </header>

      <HistoricalBanner compact />

      <ScenePlayer scene={scene} largeTargets={large} />

      <p className="text-sm leading-relaxed text-[var(--color-subtle)]">
        {scene.reconstructionNote}
      </p>

      {others.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-display text-title">More scenes</h2>
          <div className="grid gap-2">
            {others.map((s) => (
              <Link
                key={s.id}
                to="/app/scenes/$id"
                params={{ id: s.id }}
                className="surface-card flex items-center gap-3 p-2 hover:border-[var(--color-border-strong)]"
              >
                <img
                  src={s.posterSrc}
                  alt=""
                  className="h-14 w-20 shrink-0 rounded-md object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate font-medium">{s.title}</p>
                  <p className="truncate text-sm text-[var(--color-muted)]">
                    {s.chapter}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
