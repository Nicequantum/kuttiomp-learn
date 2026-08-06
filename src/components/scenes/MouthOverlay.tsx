/**
 * Subtle runtime mouth-life indicator for Little Ones Learn mode.
 *
 * Does NOT paint a fake photographic mouth (that would break cast lock).
 * Instead: a soft jaw-glow cue under the speaker that pulses with oral
 * audio / synthetic phoneme envelope — reinforces that speech is live
 * while the baked multi-viseme track handles true lips on the film.
 *
 * When `jawOpen` is near 0, renders nothing.
 */
import { cn } from "@/lib/utils";

type Props = {
  jawOpen: number; // 0..1
  className?: string;
  /** Label for a11y when speaking */
  speakingLabel?: string;
};

export function MouthOverlay({ jawOpen, className, speakingLabel }: Props) {
  const a = Math.max(0, Math.min(1, jawOpen));
  if (a < 0.04) return null;

  // Soft vignette at lower-third center — reads as “voice is live”
  const opacity = 0.12 + a * 0.38;
  const scaleY = 0.55 + a * 0.55;
  const scaleX = 0.7 + a * 0.35;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-[18%] z-[5] flex justify-center",
        className,
      )}
      aria-hidden={!speakingLabel}
      role={speakingLabel ? "status" : undefined}
      aria-label={speakingLabel}
    >
      <div
        className="h-8 w-28 rounded-[100%] bg-[radial-gradient(ellipse_at_center,rgba(255,210,160,0.85),transparent_70%)] blur-[6px]"
        style={{
          opacity,
          transform: `scale(${scaleX}, ${scaleY})`,
          transition: "opacity 60ms linear, transform 60ms linear",
        }}
      />
    </div>
  );
}
