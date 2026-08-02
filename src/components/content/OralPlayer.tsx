import { useEffect, useState } from "react";
import { Pause, Play, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  checkTtsStatus,
  speakWord,
  stopSpeaking,
} from "@/lib/audio/speak";
import { useProgressStore } from "@/lib/progress/store";
import { cn } from "@/lib/utils";

type Props = {
  wordId: string;
  narragansett: string;
  english: string;
  size?: "default" | "hero";
  className?: string;
  showEnglishToggle?: boolean;
};

export function OralPlayer({
  wordId,
  narragansett,
  english,
  size = "default",
  className,
  showEnglishToggle = true,
}: Props) {
  const [playing, setPlaying] = useState(false);
  const [withEnglish, setWithEnglish] = useState(false);
  const [provider, setProvider] = useState<string>("checking");
  const markHeard = useProgressStore((s) => s.markHeard);

  useEffect(() => {
    void checkTtsStatus().then((s) =>
      setProvider(s.configured ? `Grok TTS (${s.voice ?? "default"})` : "Browser voice"),
    );
  }, []);

  async function onPlay() {
    if (playing) {
      stopSpeaking();
      setPlaying(false);
      return;
    }
    setPlaying(true);
    markHeard(wordId);
    await speakWord({
      narragansett,
      english,
      includeEnglish: withEnglish,
    });
    setPlaying(false);
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-mode-lg border border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface)_88%,transparent)] backdrop-blur-sm",
        size === "hero" ? "p-5" : "p-4",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[var(--color-muted)]">
          <Volume2 className="h-4 w-4" aria-hidden />
          <span className="text-sm font-medium tracking-wide uppercase">
            Oral first
          </span>
        </div>
        <span className="text-xs text-[var(--color-subtle)]">{provider}</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="primary"
          size={size === "hero" ? "lg" : "default"}
          onClick={onPlay}
          aria-label={playing ? "Stop audio" : `Play ${narragansett}`}
          className="gap-2"
        >
          {playing ? (
            <Pause className="h-5 w-5" aria-hidden />
          ) : (
            <Play className="h-5 w-5" aria-hidden />
          )}
          {playing ? "Stop" : "Hear pronunciation"}
        </Button>

        {showEnglishToggle && (
          <label className="flex items-center gap-2 text-[length:calc(var(--mode-font-body)*0.92)] text-[var(--color-muted)]">
            <input
              type="checkbox"
              checked={withEnglish}
              onChange={(e) => setWithEnglish(e.target.checked)}
              className="h-4 w-4 accent-[var(--color-primary)]"
            />
            Then English
          </label>
        )}
      </div>

      <p className="text-[length:calc(var(--mode-font-body)*0.85)] text-[var(--color-subtle)] leading-snug">
        {provider.startsWith("Grok")
          ? "Human-quality Grok voice for demo only — not a living tribal speaker. Approved Keeper recordings will replace this."
          : "Using device voice until XAI_API_KEY is set on the server. Add the key on Vercel for Grok TTS."}
      </p>
    </div>
  );
}
