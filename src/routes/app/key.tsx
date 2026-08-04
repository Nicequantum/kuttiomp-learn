import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Lock, ArrowRight } from "lucide-react";
import { HistoricalBanner } from "@/components/content/HistoricalBanner";
import { Badge } from "@/components/ui/badge";
import { getChapters, getCorpusMeta } from "@/lib/content/corpus";
import { useModeStore } from "@/lib/mode/store";

export const Route = createFileRoute("/app/key")({
  component: KeyLibraryPage,
});

function KeyLibraryPage() {
  const chapters = getChapters();
  const meta = getCorpusMeta();
  const mode = useModeStore((s) => s.mode);
  const totalVisible = chapters.reduce((n, c) => n + c.count, 0);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="label-eyebrow text-[var(--color-primary)]">
          Full historical seed
        </p>
        <h1 className="font-display text-display">The Key (1643)</h1>
        <p className="text-content text-[var(--color-muted)] leading-relaxed">
          All thirty-two chapters of Roger Williams’ record, with modern English
          glosses for learning. Living Keepers replace this when they publish.
        </p>
        <p className="text-sm text-[var(--color-subtle)]">
          {totalVisible} forms visible in your mode
          {meta.totalInSeed ? ` · ${meta.totalInSeed} in full seed` : ""}
          {mode ? ` · ${mode.replace(/_/g, " ")}` : ""}
        </p>
      </header>

      <HistoricalBanner />

      <div className="grid gap-3">
        {chapters.map((ch) => {
          const locked = ch.count === 0;
          return (
            <Link
              key={ch.num}
              to="/app/words"
              search={{ chapter: ch.title }}
              className="surface-card pad-mode flex items-start justify-between gap-3 hover:border-[var(--color-border-strong)] focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
            >
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm tabular-nums text-[var(--color-subtle)]">
                    Ch. {ch.num}
                  </span>
                  <h2 className="font-display text-title">{ch.title}</h2>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone="neutral">{ch.count} forms</Badge>
                  <Badge
                    tone={
                      ch.sensitivity === "everyday" ? "land" : "warn"
                    }
                  >
                    {ch.sensitivity}
                  </Badge>
                </div>
              </div>
              {locked ? (
                <Lock
                  className="mt-1 h-5 w-5 shrink-0 text-[var(--color-subtle)]"
                  aria-hidden
                />
              ) : (
                <ArrowRight
                  className="mt-1 h-5 w-5 shrink-0 text-[var(--color-subtle)]"
                  aria-hidden
                />
              )}
            </Link>
          );
        })}
      </div>

      <p className="flex items-start gap-2 text-sm leading-relaxed text-[var(--color-subtle)]">
        <BookOpen className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        Younger modes hide sensitive chapters automatically. Adult and Elder see
        the full historical seed for community learning.
      </p>
    </div>
  );
}
