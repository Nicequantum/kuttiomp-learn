import { SCENERY } from "@/lib/content/config";
import { useModeStore } from "@/lib/mode/store";
import type { LearningMode } from "@/lib/mode/modes";
import { cn } from "@/lib/utils";

const modeScene: Record<LearningMode, keyof typeof SCENERY> = {
  little_ones: "sunset",
  young_learner: "stream",
  core_adult: "night",
  elder: "coastal",
};

/**
 * Full land photography for every mode — including Elder.
 * Elder only differs in content blocks (white cards), not a blank white page.
 * Ken Burns disabled for Elder + reduced-motion.
 */
export function ScenicBackdrop({ className }: { className?: string }) {
  const mode = useModeStore((s) => s.mode) ?? "core_adult";
  const scene = SCENERY[modeScene[mode]];
  const allowMotion = mode !== "elder";

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-0 -z-10 overflow-hidden",
        className,
      )}
    >
      <picture>
        <source srcSet={scene.webp} type="image/webp" />
        <img
          src={scene.jpg}
          alt=""
          decoding="async"
          fetchPriority="high"
          className={cn(
            "absolute inset-0 h-full w-full object-cover object-center",
            allowMotion &&
              "motion-safe:animate-[ken_48s_ease-in-out_infinite_alternate]",
          )}
        />
      </picture>

      <div
        className="absolute inset-0"
        style={{
          background: `color-mix(in oklab, var(--color-bg) var(--scene-wash), transparent)`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center, transparent 25%, color-mix(in oklab, var(--color-bg) var(--scene-vignette), transparent) 100%)`,
        }}
      />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[color-mix(in_oklab,var(--color-bg)_45%,transparent)] to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[color-mix(in_oklab,var(--color-bg)_65%,transparent)] to-transparent" />

      <style>{`
        @keyframes ken {
          from { transform: scale(1.02); }
          to { transform: scale(1.08); }
        }
        @media (prefers-reduced-motion: reduce) {
          .motion-safe\\:animate-\\[ken_48s_ease-in-out_infinite_alternate\\] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
