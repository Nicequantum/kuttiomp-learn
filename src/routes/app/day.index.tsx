import { createFileRoute, Link } from "@tanstack/react-router";
import { Play, Sun, CheckCircle2, ArrowRight } from "lucide-react";
import { HistoricalBanner } from "@/components/content/HistoricalBanner";
import { VideoProductGuide } from "@/components/content/VideoProductGuide";
import { Badge } from "@/components/ui/badge";
import {
  DAY_JOURNEY,
  getDayActsForMode,
  getDayJourneyStats,
} from "@/lib/content/day-journey";
import { useModeStore } from "@/lib/mode/store";
import { useProgressStore } from "@/lib/progress/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/day/")({
  component: DayJourneyIndexPage,
});

function DayJourneyIndexPage() {
  const mode = useModeStore((s) => s.mode);
  const acts = getDayActsForMode(mode);
  const stats = getDayJourneyStats(mode);
  const completed = useProgressStore((s) => s.completedDayActs);
  const lastId = useProgressStore((s) => s.lastDayActId);
  const doneCount = acts.filter((a) => completed.includes(a.id)).length;
  const pct = acts.length ? Math.round((doneCount / acts.length) * 100) : 0;
  const nextAct =
    acts.find((a) => !completed.includes(a.id)) ?? acts[0] ?? null;
  const resume =
    lastId && acts.some((a) => a.id === lastId)
      ? acts.find((a) => a.id === lastId)
      : null;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="label-eyebrow text-[var(--color-primary)]">
          Full Day · acts you advance
        </p>
        <h1 className="font-display text-display">{DAY_JOURNEY.title}</h1>
        <p className="text-content text-[var(--color-muted)] leading-relaxed">
          {DAY_JOURNEY.subtitle}. {DAY_JOURNEY.summary} This is{" "}
          <strong className="text-[var(--color-fg)]">not</strong> the continuous
          long story — for one end-to-end film, open{" "}
          <Link to="/app/stories" className="text-[var(--color-primary)]">
            Stories
          </Link>
          .
        </p>
      </header>

      <HistoricalBanner compact />

      <VideoProductGuide active="day" compact />

      <div className="surface-card pad-mode space-y-3">
        <div className="flex items-start gap-3">
          <Sun className="mt-0.5 h-6 w-6 shrink-0 text-[var(--color-primary)]" />
          <div className="space-y-1 text-sm leading-relaxed text-[var(--color-muted)]">
            <p>
              <strong className="text-[var(--color-fg)]">
                ~{stats.filmMin} minutes of film
              </strong>{" "}
              ({stats.filmSec}s packaged across {stats.actCount} acts) ·{" "}
              <strong className="text-[var(--color-fg)]">
                ~{stats.practiceMin} minutes of Learn practice
              </strong>{" "}
              · {stats.lines} language lines · Host + Guest speakers throughout.
            </p>
            <p>
              Film length is the stitched act file. Practice length is the
              line-paced Learn window (may be longer). You advance each act
              yourself. Community uploads can replace any act file when ready.
            </p>
            <p className="text-[var(--color-subtle)]">
              Living ceremony is not staged here — evening is discourse/news
              only.
            </p>
          </div>
        </div>
      </div>

      <div className="surface-card pad-mode space-y-2">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="font-medium text-[var(--color-fg)]">Day path</span>
          <span className="tabular-nums text-[var(--color-muted)]">
            {doneCount} of {acts.length} acts · {pct}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--color-fg)_10%,transparent)]">
          <div
            className="h-full rounded-full bg-[var(--color-primary)] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {nextAct && (
        <Link
          to="/app/day/$actId"
          params={{ actId: nextAct.id }}
          className="focus-stage pad-mode flex items-center justify-between gap-3"
        >
          <div>
            <p className="label-eyebrow">
              {doneCount === 0 ? "Begin the day" : "Continue the day"}
            </p>
            <p className="font-display text-title">{nextAct.title}</p>
            <p className="text-sm text-[var(--color-muted)]">
              Act {nextAct.order} · ~{Math.round(nextAct.durationSec / 60)} min
              film · ~{Math.round(nextAct.practiceSec / 60)} min practice
            </p>
          </div>
          <Play className="h-6 w-6 shrink-0 text-[var(--color-primary)]" />
        </Link>
      )}

      {resume && resume.id !== nextAct?.id && (
        <Link
          to="/app/day/$actId"
          params={{ actId: resume.id }}
          className="surface-card pad-mode flex items-center justify-between gap-3 hover:border-[var(--color-border-strong)]"
        >
          <div>
            <p className="label-eyebrow">Resume</p>
            <p className="font-display text-lg">{resume.title}</p>
          </div>
          <ArrowRight className="h-5 w-5 text-[var(--color-primary)]" />
        </Link>
      )}

      <ol className="relative space-y-0 border-l border-[var(--color-border)] pl-4">
        {acts.map((act, i) => {
          const done = completed.includes(act.id);
          return (
            <li key={act.id} className="relative pb-5 last:pb-0">
              <span
                className={cn(
                  "absolute -left-[1.35rem] top-1 flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-medium",
                  done
                    ? "border-[var(--color-land)] bg-[var(--color-land)] text-white"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)]",
                )}
              >
                {done ? <CheckCircle2 className="h-3 w-3" /> : act.order}
              </span>
              <Link
                to="/app/day/$actId"
                params={{ actId: act.id }}
                className="group block overflow-hidden rounded-mode-lg border border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface)_90%,transparent)] hover:border-[var(--color-border-strong)]"
              >
                <div className="flex gap-3 p-2 sm:p-3">
                  <img
                    src={act.posterSrc}
                    alt=""
                    className="h-20 w-28 shrink-0 rounded-md object-cover sm:h-24 sm:w-36"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-display text-lg text-[var(--color-fg)] group-hover:text-[var(--color-primary)]">
                      {act.title}
                    </p>
                    <p className="text-sm text-[var(--color-muted)] line-clamp-2">
                      {act.beat}
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      <Badge tone="neutral">
                        {act.durationSec}s film
                      </Badge>
                      <Badge tone="neutral">
                        {act.practiceSec}s practice
                      </Badge>
                      <Badge tone="neutral">{act.lines.length} lines</Badge>
                      {done && <Badge tone="land">Done</Badge>}
                      {i < acts.length - 1 && (
                        <span className="text-xs text-[var(--color-subtle)] self-center">
                          → next act
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>

      <p className="text-sm text-[var(--color-subtle)] leading-relaxed">
        Prefer short chapter drills?{" "}
        <Link to="/app/scenes" className="text-[var(--color-primary)]">
          Open Scenes
        </Link>
        . Prefer one continuous film?{" "}
        <Link to="/app/stories" className="text-[var(--color-primary)]">
          Open Stories
        </Link>
        .
      </p>
    </div>
  );
}
