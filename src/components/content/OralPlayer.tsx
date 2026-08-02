import { useEffect, useState } from "react";
import { Pause, Play, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  checkTtsStatus,
  getLastTtsError,
  speakWord,
  stopSpeaking,
} from "@/lib/audio/speak";
import { useProgressStore } from "@/lib/progress/store";
import { cn } from "@/lib/utils";

type Props = {
  wordId: string;
  narragansett: string;
  english: string;
  primaryAudioUrl?: string;
  size?: "default" | "hero";
  className?: string;
  showEnglishToggle?: boolean;
};

export function OralPlayer({
  wordId,
  narragansett,
  english,
  primaryAudioUrl,
  size = "default",
  className,
  showEnglishToggle = true,
}: Props) {
  const [playing, setPlaying] = useState(false);
  const [withEnglish, setWithEnglish] = useState(false);
  const [statusLine, setStatusLine] = useState("Checking voice…");
  const [lastEngine, setLastEngine] = useState<string | null>(null);
  const markHeard = useProgressStore((s) => s.markHeard);

  useEffect(() => {
    if (primaryAudioUrl) {
      setStatusLine("Living speaker recording available");
      return;
    }
    void checkTtsStatus().then((s) => {
      if (!s.configured) {
        setStatusLine("Browser voice — demo stand-in only");
        return;
      }
      setStatusLine("Demo cloud voice (not a living speaker)");
    });
  }, [primaryAudioUrl]);

  async function onPlay() {
    if (playing) {
      stopSpeaking();
      setPlaying(false);
      return;
    }
    setPlaying(true);
    markHeard(wordId);
    const engine = await speakWord({
      narragansett,
      english,
      includeEnglish: withEnglish,
      primaryAudioUrl,
    });
    setLastEngine(engine);
    if (engine === "browser" && !primaryAudioUrl) {
      const err = getLastTtsError();
      if (err) setStatusLine("Cloud voice unavailable — using device voice");
    }
    if (engine === "recording") {
      setStatusLine("Playing living speaker recording");
    }
    setPlaying(false);
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-mode-lg border border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface-elevated)_55%,transparent)]",
        size === "hero" ? "p-5" : "p-4",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[var(--color-primary)]">
          <Volume2 className="h-4 w-4" aria-hidden />
          <span className="text-sm font-semibold tracking-wide uppercase">
            Oral first
          </span>
        </div>
        <span className="text-xs text-[var(--color-subtle)]">
          {lastEngine === "recording"
            ? "Speaker"
            : lastEngine === "grok"
              ? "Demo voice"
              : lastEngine === "browser"
                ? "Device"
                : ""}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="primary"
          size={size === "hero" ? "lg" : "default"}
          onClick={onPlay}
          aria-label={playing ? "Stop audio" : `Play ${narragansett}`}
          className="gap-2 shadow-[0_0_24px_var(--color-glow)]"
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
        {statusLine}
      </p>
    </div>
  );
}
