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
  const [statusLine, setStatusLine] = useState("Checking voice…");
  const [lastEngine, setLastEngine] = useState<string | null>(null);
  const markHeard = useProgressStore((s) => s.markHeard);

  useEffect(() => {
    void checkTtsStatus().then((s) => {
      if (!s.configured) {
        setStatusLine("Browser voice — add XAI_API_KEY on Vercel for Grok TTS");
        return;
      }
      if (s.warning) {
        setStatusLine(`Grok TTS (using ${s.voice}) — ${s.warning}`);
        return;
      }
      setStatusLine(`Grok TTS ready (voice: ${s.voice ?? "default"})`);
    });
  }, []);

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
    });
    setLastEngine(engine);
    if (engine === "browser") {
      const err = getLastTtsError();
      if (err) {
        setStatusLine(`Grok TTS failed → browser voice. ${err}`);
      }
    } else if (engine === "grok") {
      setStatusLine((prev) =>
        prev.startsWith("Grok TTS ready") || prev.includes("using")
          ? prev
          : "Playing with Grok TTS",
      );
    }
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
        <span className="max-w-[55%] text-right text-xs text-[var(--color-subtle)] leading-snug">
          {lastEngine === "grok"
            ? "Playing: Grok"
            : lastEngine === "browser"
              ? "Playing: browser"
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
        {statusLine}
      </p>
    </div>
  );
}
