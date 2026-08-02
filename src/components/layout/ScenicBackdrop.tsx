import { SCENERY } from "@/lib/content/config";
import { useModeStore } from "@/lib/mode/store";
import type { LearningMode } from "@/lib/mode/modes";
import { cn } from "@/lib/utils";

const modeScene: Record<LearningMode, keyof typeof SCENERY> = {
  little_ones: "sunset",
  young_learner: "stream",
  core_adult: "coastal",
  elder: "stream",
};

/**
 * Fixed land photography backdrop — max sharpness.
 * Minimal wash; frosted surface-cards carry text contrast.
 * Uses real <img> + object-fit for crisper browser decoding than CSS bg.
 */
export function ScenicBackdrop({ className }: { className?: string }) {
  const mode = useModeStore((s) => s.mode) ?? "core_adult";
  const scene = SCENERY[modeScene[mode]];

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
            // Avoid CSS scale transforms (they soften pixels)
            mode === "elder" && "contrast-[1.05] saturate-[0.95]",
          )}
          style={{
            imageRendering: "auto",
          }}
        />
      </picture>

      {/* Barely-there wash — land stays photographic */}
      <div
        className={cn(
          "absolute inset-0",
          mode === "elder"
            ? "bg-[color-mix(in_oklab,var(--color-bg)_65%,transparent)]"
            : "bg-[color-mix(in_oklab,var(--color-bg)_14%,transparent)]",
        )}
      />
      {/* Thin top/bottom only for chrome readability */}
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[color-mix(in_oklab,var(--color-bg)_28%,transparent)] to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[color-mix(in_oklab,var(--color-bg)_32%,transparent)] to-transparent" />
    </div>
  );
}
