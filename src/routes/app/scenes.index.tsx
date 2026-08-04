import { createFileRoute, Link } from "@tanstack/react-router";
import { Clapperboard, Play } from "lucide-react";
import { HistoricalBanner } from "@/components/content/HistoricalBanner";
import { Badge } from "@/components/ui/badge";
import { getScenesForMode, getSceneDomains } from "@/lib/content/scenes";
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
  const [domain, setDomain] = useState<string | null>(null);
  const completed = useProgressStore((s) => s.completedScenes);
  const lastId = useProgressStore((s) => s.lastSceneId);

  const list = useMemo(() => {
    if (!domain) return scenes;
    return scenes.filter((s) => s.domain === domain);
  }, [scenes, domain]);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="label-eyebrow text-[var(--color-primary)]">
          Live video learning
        </p>
        <h1 className="font-display text-display">Scenes</h1>
        <p className="text-content text-[var(--color-muted)] leading-relaxed">
          Watch reconstructed moments, read dual subtitles, step line by line,
          and hear each form in Narragansett or English.
        </p>
      </header>

      <HistoricalBanner compact />

      <div className="surface-card pad-mode flex gap-3 text-sm leading-relaxed text-[var(--color-muted)]">
        <Clapperboard className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-primary)]" />
        <p>
          Videos are AI educational reconstructions — not living ceremony and not
          living speaker film. Language forms are historical demo seed until
          Keepers publish replacements.
        </p>
      </div>

      {lastId && scenes.some((s) => s.id === lastId) && (
        <Link
          to="/app/scenes/$id"
          params={{ id: lastId }}
          className="focus-stage pad-mode flex items-center justify-between gap-3"
        >
          <div>
            <p className="label-eyebrow">Resume</p>
            <p className="font-display text-title">Continue last scene</p>
          </div>
          <Play className="h-6 w-6 text-[var(--color-primary)]" />
        </Link>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setDomain(null)}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1.5 text-sm",
            !domain
              ? "border-[var(--color-primary)] text-[var(--color-primary)]"
              : "border-[var(--color-border)] text-[var(--color-muted)]",
          )}
        >
          All
        </button>
        {domains.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setDomain(d.id === domain ? null : d.id)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-sm",
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
                    <p className="font-display text-xl text-white">{scene.title}</p>
                    <p className="text-sm text-white/80">
                      Ch. {scene.chapterNum} · {scene.durationSec}s
                    </p>
                  </div>
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-lg">
                    <Play className="h-5 w-5" fill="currentColor" />
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
                  <Badge tone="neutral">{scene.lines.length} lines</Badge>
                </div>
              </div>
            </Link>
          );
        })}
        {list.length === 0 && (
          <div className="surface-card pad-mode text-center text-[var(--color-muted)]">
            No scenes for this path yet. Try Adult or Elder mode for the full set.
          </div>
        )}
      </div>
    </div>
  );
}
