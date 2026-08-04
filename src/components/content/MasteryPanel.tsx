import { getStage, getStages } from "@/lib/content/corpus";
import { useProgressStore } from "@/lib/progress/store";

export function MasteryPanel() {
  const heard = useProgressStore((s) => s.heardIds.length);
  const practiced = useProgressStore((s) => s.practicedIds.length);
  const paths = useProgressStore((s) => s.completedPaths.length);
  const scenes = useProgressStore((s) => s.completedScenes.length);
  const dayActs = useProgressStore((s) => s.completedDayActs.length);
  const stories = useProgressStore((s) => s.completedStories.length);
  const stageNum = useProgressStore((s) => s.stats().stage);
  const stage = getStage(stageNum) ?? getStages()[0];
  const stages = getStages();

  return (
    <section
      className="surface-card pad-mode"
      aria-labelledby="mastery-heading"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-[var(--color-subtle)]">
            Learning stage
          </p>
          <h2
            id="mastery-heading"
            className="mt-1 font-display text-title text-[var(--color-fg)]"
          >
            {stage.label}
          </h2>
          <p className="mt-1 text-[var(--color-muted)] leading-snug">
            {stage.description}
          </p>
        </div>
        <div className="rounded-full border border-[var(--color-border)] px-3 py-1 text-sm tabular-nums text-[var(--color-muted)]">
          {stageNum}/6
        </div>
      </div>

      <div className="mt-4 flex gap-1.5" aria-hidden>
        {stages.map((s) => (
          <div
            key={s.id}
            className="h-2 flex-1 rounded-full"
            style={{
              background:
                s.id <= stageNum
                  ? "var(--color-primary)"
                  : "color-mix(in oklab, var(--color-fg) 10%, transparent)",
            }}
          />
        ))}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-mode bg-[color-mix(in_oklab,var(--color-fg)_4%,transparent)] px-2 py-3">
          <dt className="text-xs text-[var(--color-subtle)]">Heard</dt>
          <dd className="mt-1 font-display text-xl tabular-nums">{heard}</dd>
        </div>
        <div className="rounded-mode bg-[color-mix(in_oklab,var(--color-fg)_4%,transparent)] px-2 py-3">
          <dt className="text-xs text-[var(--color-subtle)]">Practiced</dt>
          <dd className="mt-1 font-display text-xl tabular-nums">
            {practiced}
          </dd>
        </div>
        <div className="rounded-mode bg-[color-mix(in_oklab,var(--color-fg)_4%,transparent)] px-2 py-3">
          <dt className="text-xs text-[var(--color-subtle)]">Scenes</dt>
          <dd className="mt-1 font-display text-xl tabular-nums">{scenes}</dd>
        </div>
        <div className="rounded-mode bg-[color-mix(in_oklab,var(--color-fg)_4%,transparent)] px-2 py-3">
          <dt className="text-xs text-[var(--color-subtle)]">Day acts</dt>
          <dd className="mt-1 font-display text-xl tabular-nums">{dayActs}</dd>
        </div>
        <div className="rounded-mode bg-[color-mix(in_oklab,var(--color-fg)_4%,transparent)] px-2 py-3">
          <dt className="text-xs text-[var(--color-subtle)]">Stories</dt>
          <dd className="mt-1 font-display text-xl tabular-nums">{stories}</dd>
        </div>
        <div className="rounded-mode bg-[color-mix(in_oklab,var(--color-fg)_4%,transparent)] px-2 py-3">
          <dt className="text-xs text-[var(--color-subtle)]">Paths</dt>
          <dd className="mt-1 font-display text-xl tabular-nums">{paths}</dd>
        </div>
      </dl>
      <p className="mt-3 text-sm text-[var(--color-subtle)]">
        Progress is personal growth — no streaks, scores, or rankings.
      </p>
    </section>
  );
}
