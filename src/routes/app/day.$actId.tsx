import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Sun } from "lucide-react";
import { HistoricalBanner } from "@/components/content/HistoricalBanner";
import { ScenePlayer } from "@/components/scenes/ScenePlayer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  dayActAsScene,
  getDayActById,
  getNextDayAct,
  getPrevDayAct,
  resolveDayActVideoSrc,
} from "@/lib/content/day-journey";
import type { LearningScene } from "@/lib/content/scenes";
import { useModeStore } from "@/lib/mode/store";
import { MODES } from "@/lib/mode/modes";

export const Route = createFileRoute("/app/day/$actId")({
  component: DayActPage,
});

function DayActPage() {
  const { actId } = Route.useParams();
  const mode = useModeStore((s) => s.mode);
  const act = getDayActById(actId);
  const large = mode === "elder" || mode === "little_ones";
  const next = getNextDayAct(actId, mode);
  const prev = getPrevDayAct(actId, mode);

  if (!act) {
    return (
      <div className="space-y-4">
        <p className="text-[var(--color-muted)]">
          Act not found or not available in this learning mode.
        </p>
        <Button asChild variant="secondary">
          <Link to="/app/day">Back to Full Day</Link>
        </Button>
        {mode && (
          <p className="text-sm text-[var(--color-subtle)]">
            Current mode: {MODES[mode].label}.
          </p>
        )}
      </div>
    );
  }

  const scene = dayActAsScene(act) as LearningScene;

  return (
    <div className="space-y-5">
      <Link
        to="/app/day"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Full Day path
      </Link>

      <header className="space-y-2">
        <p className="label-eyebrow text-[var(--color-primary)] inline-flex items-center gap-1.5">
          <Sun className="h-3.5 w-3.5" />
          Act {act.order} of the day · Ch. {act.chapterNums.join(", ")}
        </p>
        <h1 className="font-display text-display">{act.title}</h1>
        <p className="text-content text-[var(--color-muted)] leading-relaxed">
          {act.beat}
        </p>
        <p className="text-sm text-[var(--color-subtle)]">{act.summary}</p>
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="warn">Historical reconstruction</Badge>
          <Badge tone="neutral">~{Math.round(act.durationSec / 60)} min film</Badge>
          <Badge tone="neutral">
            ~{Math.round(act.practiceSec / 60)} min practice
          </Badge>
          <Badge tone="neutral">{act.lines.length} lines</Badge>
          {act.chapters.map((c) => (
            <Badge key={c} tone="land">
              {c}
            </Badge>
          ))}
        </div>
      </header>

      <HistoricalBanner compact />

      <ScenePlayer
        scene={scene}
        largeTargets={large}
        progressKind="day-act"
        resolveVideo={(s) =>
          resolveDayActVideoSrc({
            ...act,
            videoSrc: s.videoSrc,
            uploadSrc: s.uploadSrc,
          })
        }
        prevNav={
          prev
            ? {
                to: "/app/day/$actId",
                params: { actId: prev.id },
                label: "Prev act",
              }
            : null
        }
        nextNav={
          next
            ? {
                to: "/app/day/$actId",
                params: { actId: next.id },
                label: "Next act",
              }
            : null
        }
      />

      <p className="text-sm leading-relaxed text-[var(--color-subtle)]">
        {act.reconstructionNote}
      </p>
    </div>
  );
}
