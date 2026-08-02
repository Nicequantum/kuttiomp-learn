import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MODE_LIST, MODES, type LearningMode } from "@/lib/mode/modes";
import { useModeStore } from "@/lib/mode/store";
import { APP_NAME, APP_TAGLINE } from "@/lib/content/config";
import { HistoricalBanner } from "@/components/content/HistoricalBanner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/welcome")({
  component: WelcomePage,
});

function WelcomePage() {
  const navigate = useNavigate();
  const hasOnboarded = useModeStore((s) => s.hasOnboarded);
  const completeOnboarding = useModeStore((s) => s.completeOnboarding);
  const [selected, setSelected] = useState<LearningMode | null>(null);

  useEffect(() => {
    if (hasOnboarded) {
      navigate({ to: "/app" });
    }
  }, [hasOnboarded, navigate]);

  function start() {
    if (!selected) return;
    completeOnboarding(selected);
    navigate({ to: "/app" });
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 py-8 md:max-w-2xl md:py-12">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--color-primary)_18%,transparent)] text-[var(--color-primary)] backdrop-blur-sm">
          <Leaf className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <p className="font-display text-xl tracking-tight">{APP_NAME}</p>
          <p className="text-sm text-[var(--color-muted)]">{APP_TAGLINE}</p>
        </div>
      </div>

      <header className="mb-6 space-y-3">
        <h1 className="font-display text-display text-[var(--color-fg)]">
          Choose your path
        </h1>
        <p className="max-w-prose text-content text-[var(--color-muted)] leading-relaxed">
          Four ways into the same living language — for little ones, students,
          adults, and elders. You can change this anytime.
        </p>
      </header>

      <HistoricalBanner className="mb-6" />

      <div className="grid gap-3" role="listbox" aria-label="Learning modes">
        {MODE_LIST.map((id) => {
          const m = MODES[id];
          const active = selected === id;
          return (
            <button
              key={id}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => {
                setSelected(id);
                document.documentElement.dataset.mode = id;
              }}
              className={cn(
                "surface-card pad-mode text-left transition-all duration-150",
                active
                  ? "border-[var(--color-primary)] ring-2 ring-[var(--color-ring)]"
                  : "hover:border-[var(--color-border-strong)]",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-title">{m.label}</p>
                  <p className="mt-1 text-sm font-medium text-[var(--color-primary)]">
                    {m.tagline}
                  </p>
                </div>
                <span
                  className={cn(
                    "mt-1 h-5 w-5 shrink-0 rounded-full border-2",
                    active
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
                      : "border-[var(--color-border-strong)]",
                  )}
                  aria-hidden
                />
              </div>
              <p className="mt-2 text-[var(--color-muted)] leading-snug">
                {m.description}
              </p>
              <p className="mt-2 text-sm text-[var(--color-subtle)]">
                For: {m.who}
              </p>
            </button>
          );
        })}
      </div>

      <div className="sticky bottom-0 mt-8 bg-gradient-to-t from-[color-mix(in_oklab,var(--color-bg)_92%,transparent)] via-[color-mix(in_oklab,var(--color-bg)_80%,transparent)] to-transparent pb-6 pt-4">
        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={!selected}
          onClick={start}
        >
          Enter Kuttiomp
          <ArrowRight className="h-5 w-5" aria-hidden />
        </Button>
        <p className="mt-3 text-center text-sm text-[var(--color-subtle)]">
          No account required for this demo · Install from Safari after deploy
        </p>
      </div>
    </div>
  );
}
