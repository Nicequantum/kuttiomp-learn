import { SCENERY } from "@/lib/content/config";
import { useModeStore } from "@/lib/mode/store";
import type { LearningMode } from "@/lib/mode/modes";
import { cn } from "@/lib/utils";

const modeScene: Record<LearningMode, string> = {
  little_ones: SCENERY.sunset,
  young_learner: SCENERY.stream,
  core_adult: SCENERY.coastal,
  elder: SCENERY.stream,
};

/**
 * Fixed land photography backdrop with soft wash so text stays readable.
 * Mode switches scene subtly — place, not costume.
 */
export function ScenicBackdrop({ className }: { className?: string }) {
  const mode = useModeStore((s) => s.mode) ?? "core_adult";
  const src = modeScene[mode];

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-0 -z-10 overflow-hidden",
        className,
      )}
    >
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
        style={{
          backgroundImage: `url(${src})`,
          filter: mode === "elder" ? "grayscale(0.15) contrast(1.05)" : "none",
        }}
      />
      {/* Lighter wash so land shows; elder keeps more solid for Protocol 11 */}
      <div
        className={cn(
          "absolute inset-0",
          mode === "elder"
            ? "bg-[color-mix(in_oklab,var(--color-bg)_86%,transparent)]"
            : mode === "little_ones"
              ? "bg-[color-mix(in_oklab,var(--color-bg)_55%,transparent)]"
              : "bg-[color-mix(in_oklab,var(--color-bg)_58%,transparent)]",
        )}
      />
      <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-[color-mix(in_oklab,var(--color-bg)_45%,transparent)] to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-[color-mix(in_oklab,var(--color-bg)_65%,transparent)] to-transparent" />
    </div>
  );
}
