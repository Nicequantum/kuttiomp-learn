import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Layers, Route as RouteIcon } from "lucide-react";
import { HistoricalBanner } from "@/components/content/HistoricalBanner";
import { Badge } from "@/components/ui/badge";
import { getSessionsByStage } from "@/lib/content/sessions";
import { useProgressStore } from "@/lib/progress/store";

export const Route = createFileRoute("/app/paths/")({
  component: PathsPage,
});

function PathsPage() {
  const stages = getSessionsByStage();
  const completed = useProgressStore((s) => s.completedPaths);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="label-eyebrow text-[var(--color-primary)]">Sessions</p>
        <h1 className="font-display text-display">Paths</h1>
        <p className="text-content text-[var(--color-muted)] leading-relaxed">
          Guided walks by topic — short sessions you can finish in one sitting.
          No scores. Just listening and return.
        </p>
      </header>

      <HistoricalBanner compact />

      {stages.length === 0 && (
        <div className="surface-card pad-mode text-[var(--color-muted)]">
          No sessions yet. When Keepers publish words, domain paths appear here.
        </div>
      )}

      {stages.map((group) => (
        <section
          key={group.stage}
          className="space-y-3"
          aria-labelledby={`stage-${group.stage}`}
        >
          <div className="flex items-center gap-2">
            <Layers
              className="h-4 w-4 text-[var(--color-primary)]"
              aria-hidden
            />
            <h2 id={`stage-${group.stage}`} className="font-display text-title">
              {group.label}
            </h2>
          </div>

          <div className="grid gap-3">
            {group.sessions.map((p) => {
              const done = completed.includes(p.id);
              return (
                <Link
                  key={p.id}
                  to="/app/paths/$id"
                  params={{ id: p.id }}
                  className="surface-card pad-mode flex items-start justify-between gap-3 transition-colors hover:border-[var(--color-border-strong)] focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                >
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-title">{p.title}</h3>
                      {done && (
                        <Badge tone="land">
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" aria-hidden />
                            Completed
                          </span>
                        </Badge>
                      )}
                      {p.kind === "domain_session" && (
                        <Badge tone="neutral">
                          <span className="inline-flex items-center gap-1">
                            <RouteIcon className="h-3 w-3" aria-hidden />
                            Domain
                          </span>
                        </Badge>
                      )}
                    </div>
                    <p className="text-[var(--color-muted)] leading-snug">
                      {p.description}
                    </p>
                    <p className="text-sm text-[var(--color-subtle)]">
                      {p.wordIds.length} forms
                      {p.livingCount > 0 ? ` · ${p.livingCount} living` : ""}
                      {p.historicalCount > 0
                        ? ` · ${p.historicalCount} historical`
                        : ""}
                    </p>
                  </div>
                  <ArrowRight
                    className="mt-1 h-5 w-5 shrink-0 text-[var(--color-subtle)]"
                    aria-hidden
                  />
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
