import { createFileRoute, Link } from "@tanstack/react-router";
import { Clapperboard, Play, Upload } from "lucide-react";
import { HistoricalBanner } from "@/components/content/HistoricalBanner";
import { Badge } from "@/components/ui/badge";
import {
  getScenesForMode,
  getSceneDomains,
  getSceneSeries,
} from "@/lib/content/scenes";
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
  const seriesList = getSceneSeries();
  const [domain, setDomain] = useState<string | null>(null);
  const [series, setSeries] = useState<string | null>(null);
  const [style, setStyle] = useState<"all" | "cinematic" | "cartoon">("all");
  const completed = useProgressStore((s) => s.completedScenes);
  const lastId = useProgressStore((s) => s.lastSceneId);

  const list = useMemo(() => {
    return scenes.filter((s) => {
      if (domain && s.domain !== domain) return false;
      if (series && (s.series ?? "Other") !== series) return false;
      if (style !== "all" && s.style !== style) return false;
      return true;
    });
  }, [scenes, domain, series, style]);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="label-eyebrow text-[var(--color-primary)]">
          Live video learning
        </p>
        <h1 className="font-display text-display">Scenes</h1>
        <p className="text-content text-[var(--color-muted)] leading-relaxed">
          Watch reconstructed moments, dual subtitles, line-by-line practice.
          Your community videos can replace any clip when ready.
        </p>
        <p className="text-sm text-[var(--color-subtle)]">
          {list.length} of {scenes.length} scenes in this mode
        </p>
      </header>

      <HistoricalBanner compact />

      <div className="surface-card pad-mode flex gap-3 text-sm leading-relaxed text-[var(--color-muted)]">
        <Clapperboard className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-primary)]" />
        <p>
          Packaged clips are AI reconstructions. When you upload files named by
          scene id into <code className="text-[var(--color-fg)]">uploads/</code>
          , the player switches to your media automatically.
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
        {(
          [
            ["all", "All styles"],
            ["cinematic", "Cinematic"],
            ["cartoon", "Cartoon"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setStyle(key)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-sm",
              style === key
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-[var(--color-border)] text-[var(--color-muted)]",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setSeries(null)}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1.5 text-sm",
            !series
              ? "border-[var(--color-primary)] text-[var(--color-primary)]"
              : "border-[var(--color-border)] text-[var(--color-muted)]",
          )}
        >
          All series
        </button>
        {seriesList.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSeries(s.id === series ? null : s.id)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-sm",
              series === s.id
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-[var(--color-border)] text-[var(--color-muted)]",
            )}
          >
            {s.id}
          </button>
        ))}
      </div>

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
          All topics
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
                      {scene.series ? ` · ${scene.series}` : ""}
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
                  {scene.mediaStatus === "awaiting_upload" && (
                    <Badge tone="warn">
                      <Upload className="mr-1 inline h-3 w-3" />
                      Upload ready
                    </Badge>
                  )}
                  <Badge tone="neutral">{scene.lines.length} lines</Badge>
                </div>
              </div>
            </Link>
          );
        })}
        {list.length === 0 && (
          <div className="surface-card pad-mode text-center text-[var(--color-muted)]">
            No scenes for these filters. Clear filters or switch mode.
          </div>
        )}
      </div>
    </div>
  );
}
