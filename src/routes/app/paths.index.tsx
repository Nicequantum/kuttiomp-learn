import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { HistoricalBanner } from "@/components/content/HistoricalBanner";
import { Badge } from "@/components/ui/badge";
import { getPaths } from "@/lib/content/corpus";
import { useProgressStore } from "@/lib/progress/store";

export const Route = createFileRoute("/app/paths/")({
  component: PathsPage,
});

function PathsPage() {
  const paths = getPaths();
  const completed = useProgressStore((s) => s.completedPaths);

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <h1 className="font-display text-display">Paths</h1>
        <p className="text-content text-[var(--color-muted)]">
          Short guided walks through everyday language — greetings, family,
          land, and more.
        </p>
      </header>

      <HistoricalBanner compact />

      <div className="grid gap-3">
        {paths.map((p) => {
          const done = completed.includes(p.id);
          return (
            <Link
              key={p.id}
              to="/app/paths/$id"
              params={{ id: p.id }}
              className="surface-card pad-mode flex items-start justify-between gap-3 hover:border-[var(--color-border-strong)]"
            >
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-title">{p.title}</h2>
                  {done && (
                    <Badge tone="land">
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Completed
                      </span>
                    </Badge>
                  )}
                </div>
                <p className="text-[var(--color-muted)] leading-snug">
                  {p.description}
                </p>
                <p className="text-sm text-[var(--color-subtle)]">
                  {p.wordIds.length} items · Stage {p.stage} · {p.chapter}
                </p>
              </div>
              <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-[var(--color-subtle)]" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
