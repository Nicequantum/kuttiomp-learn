import { Link } from "@tanstack/react-router";
import { Clapperboard, Film, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export type VideoSurfaceId = "stories" | "day" | "scenes";

const SURFACES: {
  id: VideoSurfaceId;
  title: string;
  length: string;
  role: string;
  to: "/app/stories" | "/app/day" | "/app/scenes";
  icon: typeof Film;
}[] = [
  {
    id: "stories",
    title: "Stories",
    length: "One continuous film · 15–30+ min",
    role: "Narrative cinema. Same cast end to end. Language lines track the whole film. Press play and watch through — or resume where you left off.",
    to: "/app/stories",
    icon: Film,
  },
  {
    id: "day",
    title: "Full Day",
    length: "Ten acts you advance · ~15–20 min total",
    role: "Life-cycle path. Dawn through night in separate multi-minute acts. You choose the next act — not one automatic long file.",
    to: "/app/day",
    icon: Sun,
  },
  {
    id: "scenes",
    title: "Scenes",
    length: "Short practice clips · ~20–40 s each",
    role: "Chapter drills. Line-by-line Learn mode for greetings, land, water, and daily speech. Not a substitute for the long story film.",
    to: "/app/scenes",
    icon: Clapperboard,
  },
];

type Props = {
  /** Highlight the surface the learner is already on */
  active?: VideoSurfaceId;
  /** Compact three-row cards vs fuller body copy */
  compact?: boolean;
  className?: string;
};

/**
 * Product clarity for the three video surfaces.
 * Stories ≠ Day ≠ Scenes — maintained through 2050 as separate content packages.
 */
export function VideoProductGuide({ active, compact, className }: Props) {
  return (
    <section
      className={cn("space-y-2", className)}
      aria-label="How video learning is organized"
    >
      {!compact && (
        <header className="space-y-1">
          <p className="label-eyebrow text-[var(--color-primary)]">
            Video learning
          </p>
          <h2 className="font-display text-title">Three different ways to watch</h2>
          <p className="text-sm text-[var(--color-muted)] leading-relaxed">
            Stories, Full Day, and Scenes are separate on purpose. A continuous
            film is not a folder of clips, and short drills are not a day path.
          </p>
        </header>
      )}
      <ul className="grid gap-2">
        {SURFACES.map((s) => {
          const Icon = s.icon;
          const isActive = active === s.id;
          return (
            <li key={s.id}>
              <Link
                to={s.to}
                className={cn(
                  "flex gap-3 rounded-mode border px-3 py-3 transition-colors",
                  isActive
                    ? "border-[var(--color-primary)] bg-[color-mix(in_oklab,var(--color-primary)_10%,transparent)]"
                    : "border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface)_88%,transparent)] hover:border-[var(--color-border-strong)]",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  className={cn(
                    "mt-0.5 h-5 w-5 shrink-0",
                    isActive
                      ? "text-[var(--color-primary)]"
                      : "text-[var(--color-muted)]",
                  )}
                  aria-hidden
                />
                <div className="min-w-0 space-y-0.5">
                  <p className="font-medium text-[var(--color-fg)]">
                    {s.title}
                    {isActive ? (
                      <span className="ml-2 text-xs font-normal text-[var(--color-primary)]">
                        You are here
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-[var(--color-subtle)]">{s.length}</p>
                  {!compact && (
                    <p className="text-sm text-[var(--color-muted)] leading-relaxed">
                      {s.role}
                    </p>
                  )}
                  {compact && (
                    <p className="text-sm text-[var(--color-muted)] leading-snug">
                      {s.role.split(".")[0]}.
                    </p>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
