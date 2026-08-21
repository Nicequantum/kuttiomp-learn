import { User } from "lucide-react";
import type { LexicalWord } from "@/lib/content/types";
import { Badge } from "@/components/ui/badge";
import { useModeStore } from "@/lib/mode/store";
import { MODES } from "@/lib/mode/modes";

export function isLivingForm(word: LexicalWord): boolean {
  return word.source === "keeper_approved";
}

export function WordSourceBadge({ word }: { word: LexicalWord }) {
  const living = isLivingForm(word);
  return (
    <Badge tone={living ? "land" : "warn"}>
      {living ? "Living" : "Historical"}
    </Badge>
  );
}

/**
 * Speaker attribution is required. Living forms name a Keeper/speaker;
 * historical seed rows already carry an honest Williams disclaimer.
 */
export function SpeakerAttribution({
  word,
  compact = false,
}: {
  word: LexicalWord;
  compact?: boolean;
}) {
  const mode = useModeStore((s) => s.mode);
  const meta = mode ? MODES[mode] : MODES.core_adult;
  const living = isLivingForm(word);
  const name =
    word.speakerAttribution?.trim() ||
    (living
      ? "Living speaker"
      : "Historical record (Williams 1643) — not a living tribal speaker");

  if (compact && meta.id === "little_ones") return null;

  return (
    <p className="mt-1.5 flex items-start gap-1.5 text-[length:calc(var(--mode-font-body)*0.85)] text-[var(--color-muted)] leading-snug">
      <User className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>
        {living ? (
          <>
            Heard from <span className="font-medium text-[var(--color-fg)]">{name}</span>
          </>
        ) : (
          name
        )}
      </span>
    </p>
  );
}
