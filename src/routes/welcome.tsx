import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MODE_LIST, MODES, type LearningMode } from "@/lib/mode/modes";
import { useModeStore } from "@/lib/mode/store";
import { APP_NAME, APP_TAGLINE, SCENERY } from "@/lib/content/config";
import { HistoricalBanner } from "@/components/content/HistoricalBanner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/welcome")({
  component: WelcomePage,
});

const portalScene: Record<LearningMode, keyof typeof SCENERY> = {
  little_ones: "sunset",
  young_learner: "stream",
  core_adult: "night",
  elder: "coastal",
};

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
      <div className="mb-10 space-y-4">
        <p className="label-eyebrow text-[var(--color-primary)]">
          Narragansett language home
        </p>
        <h1 className="font-display text-display text-glow max-w-[12ch] text-[var(--color-fg)]">
          {APP_NAME}
        </h1>
        <p className="max-w-md text-content text-[var(--color-muted)] leading-relaxed">
          {APP_TAGLINE}. Choose who you are learning with — the language stays
          the same; the path meets you where you are.
        </p>
      </div>

      <HistoricalBanner className="mb-7" />

      <p className="label-eyebrow mb-3">Choose your path</p>

      <div className="grid gap-3" role="listbox" aria-label="Learning modes">
        {MODE_LIST.map((id) => {
          const m = MODES[id];
          const active = selected === id;
          const scene = SCENERY[portalScene[id]];
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
              className={cn("portal-card text-left")}
            >
              <picture>
                <source srcSet={scene.webp} type="image/webp" />
                <img
                  src={scene.jpg}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  decoding="async"
                />
              </picture>
              <div className="absolute inset-0 bg-gradient-to-r from-[color-mix(in_oklab,var(--color-bg)_88%,transparent)] via-[color-mix(in_oklab,var(--color-bg)_55%,transparent)] to-transparent" />
              <div className="relative z-[1] flex min-h-[7.5rem] flex-col justify-center p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-title text-[var(--color-fg)]">
                      {m.label}
                    </p>
                    <p className="mt-1 text-sm font-medium text-[var(--color-primary)]">
                      {m.tagline}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "mt-1 h-5 w-5 shrink-0 rounded-full border-2",
                      active
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
                        : "border-[var(--color-border-strong)] bg-transparent",
                    )}
                    aria-hidden
                  />
                </div>
                <p className="mt-2 max-w-[34ch] text-sm text-[var(--color-muted)] leading-snug">
                  {m.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="sticky bottom-0 mt-8 bg-gradient-to-t from-[var(--color-bg)] via-[color-mix(in_oklab,var(--color-bg)_90%,transparent)] to-transparent pb-6 pt-6">
        <Button
          type="button"
          size="lg"
          className="w-full shadow-[0_0_32px_var(--color-glow)]"
          disabled={!selected}
          onClick={start}
        >
          Enter Kuttiomp
          <ArrowRight className="h-5 w-5" aria-hidden />
        </Button>
        <p className="mt-3 text-center text-sm text-[var(--color-subtle)]">
          No account for this demo · Keepers hold living authority
        </p>
      </div>
    </div>
  );
}
