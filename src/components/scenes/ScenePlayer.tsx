import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Captions,
  CaptionsOff,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  Languages,
  Gauge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { LearningScene, SubtitleTrack } from "@/lib/content/scenes";
import { speakWord, stopSpeaking } from "@/lib/audio/speak";
import { useProgressStore } from "@/lib/progress/store";
import { cn } from "@/lib/utils";

type Props = {
  scene: LearningScene;
  largeTargets?: boolean;
};

const SPEEDS = [0.75, 1, 1.25] as const;

export function ScenePlayer({ scene, largeTargets }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(scene.durationSec);
  const [subs, setSubs] = useState<SubtitleTrack>("both");
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [activeLineIdx, setActiveLineIdx] = useState(0);
  const [loopLine, setLoopLine] = useState(false);
  const [muted, setMuted] = useState(false);
  const completeScene = useProgressStore((s) => s.completeScene);
  const setLastScene = useProgressStore((s) => s.setLastScene);
  const markHeard = useProgressStore((s) => s.markHeard);

  const activeLine = scene.lines[activeLineIdx] ?? scene.lines[0];

  useEffect(() => {
    setLastScene(scene.id);
  }, [scene.id, setLastScene]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = speed;
  }, [speed]);

  const onTime = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const t = v.currentTime;
    setTime(t);
    const idx = scene.lines.findIndex((l) => t >= l.startSec && t < l.endSec);
    if (idx >= 0 && idx !== activeLineIdx) setActiveLineIdx(idx);
    if (loopLine && activeLine && t >= activeLine.endSec - 0.05) {
      v.currentTime = activeLine.startSec;
    }
  }, [scene.lines, activeLineIdx, loopLine, activeLine]);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  }

  function seekLine(idx: number) {
    const line = scene.lines[idx];
    if (!line || !videoRef.current) return;
    setActiveLineIdx(idx);
    videoRef.current.currentTime = line.startSec;
    void videoRef.current.play();
    setPlaying(true);
  }

  function nextLine() {
    seekLine(Math.min(scene.lines.length - 1, activeLineIdx + 1));
  }
  function prevLine() {
    seekLine(Math.max(0, activeLineIdx - 1));
  }

  function restart() {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    setActiveLineIdx(0);
    void v.play();
    setPlaying(true);
  }

  async function hearLine(lang: "n" | "e" | "both") {
    if (!activeLine) return;
    stopSpeaking();
    markHeard(`scene:${scene.id}:${activeLine.id}`);
    if (lang === "e") {
      await speakWord({
        narragansett: activeLine.english,
        english: activeLine.english,
        includeEnglish: false,
      });
      return;
    }
    await speakWord({
      narragansett: activeLine.narragansett,
      english: activeLine.english,
      includeEnglish: lang === "both",
    });
  }

  function toggleFullscreen() {
    const el = shellRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen?.();
    }
  }

  function onEnded() {
    setPlaying(false);
    completeScene(scene.id);
  }

  const progress = duration > 0 ? (time / duration) * 100 : 0;

  const subtitleNode = useMemo(() => {
    if (subs === "off" || !activeLine) return null;
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-14 flex justify-center px-3">
        <div className="max-w-lg rounded-xl bg-black/70 px-4 py-2 text-center shadow-lg backdrop-blur-sm">
          {(subs === "narragansett" || subs === "both") && (
            <p
              lang="nax"
              className={cn(
                "font-display text-white",
                largeTargets ? "text-xl" : "text-lg",
              )}
            >
              {activeLine.narragansett}
            </p>
          )}
          {(subs === "english" || subs === "both") && (
            <p
              className={cn(
                "text-white/90",
                largeTargets ? "text-base" : "text-sm",
                subs === "both" && "mt-0.5",
              )}
            >
              {activeLine.english}
            </p>
          )}
        </div>
      </div>
    );
  }, [subs, activeLine, largeTargets]);

  return (
    <div className="space-y-4">
      <div
        ref={shellRef}
        className="relative overflow-hidden rounded-mode-lg border border-[var(--color-border)] bg-black shadow-[var(--shadow-elevated)]"
      >
        <video
          ref={videoRef}
          className="aspect-video w-full object-cover"
          src={scene.videoSrc}
          poster={scene.posterSrc}
          playsInline
          muted={muted}
          onTimeUpdate={onTime}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || scene.durationSec)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={onEnded}
          preload="metadata"
        />
        {subtitleNode}

        {/* scrub */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-8">
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.05}
            value={time}
            aria-label="Seek"
            className="w-full accent-[var(--color-primary)]"
            onChange={(e) => {
              const t = Number(e.target.value);
              if (videoRef.current) videoRef.current.currentTime = t;
              setTime(t);
            }}
          />
          <div className="mt-1 flex items-center justify-between text-xs text-white/80">
            <span>
              {fmt(time)} / {fmt(duration)}
            </span>
            <span className="tabular-nums">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>

      {/* transport */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="primary"
          size={largeTargets ? "lg" : "default"}
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          {playing ? "Pause" : "Play"}
        </Button>
        <Button type="button" variant="secondary" onClick={restart} aria-label="Restart">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button type="button" variant="secondary" onClick={prevLine} aria-label="Previous line">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button type="button" variant="secondary" onClick={nextLine} aria-label="Next line">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={loopLine ? "soft" : "secondary"}
          onClick={() => setLoopLine((v) => !v)}
        >
          Loop line
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? "Unmute video" : "Mute video"}
        >
          <Volume2 className={cn("h-4 w-4", muted && "opacity-40")} />
        </Button>
        <Button type="button" variant="secondary" onClick={toggleFullscreen}>
          <Maximize className="h-4 w-4" />
        </Button>
      </div>

      {/* captions + speed */}
      <div className="surface-card pad-mode space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-muted)]">
            {subs === "off" ? (
              <CaptionsOff className="h-4 w-4" />
            ) : (
              <Captions className="h-4 w-4" />
            )}
            Subtitles
          </span>
          {(
            [
              ["off", "Off"],
              ["narragansett", "Narragansett"],
              ["english", "English"],
              ["both", "Both"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSubs(key)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm",
                subs === key
                  ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                  : "border-[var(--color-border)] text-[var(--color-muted)]",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-muted)]">
            <Gauge className="h-4 w-4" />
            Speed
          </span>
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm tabular-nums",
                speed === s
                  ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                  : "border-[var(--color-border)] text-[var(--color-muted)]",
              )}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      {/* active line + dual hear */}
      {activeLine && (
        <div className="focus-stage pad-mode space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge tone="land">{activeLine.speaker}</Badge>
            <Badge tone="neutral">
              Line {activeLineIdx + 1} / {scene.lines.length}
            </Badge>
          </div>
          <p
            lang="nax"
            className={cn(
              "font-display text-[var(--color-fg)]",
              largeTargets ? "text-3xl" : "text-2xl",
            )}
          >
            {activeLine.narragansett}
          </p>
          <p className="text-content text-[var(--color-muted)]">
            {activeLine.english}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="primary"
              onClick={() => void hearLine("n")}
            >
              <Volume2 className="h-4 w-4" />
              Hear Narragansett
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void hearLine("e")}
            >
              <Languages className="h-4 w-4" />
              Hear English
            </Button>
            <Button
              type="button"
              variant="soft"
              onClick={() => void hearLine("both")}
            >
              Hear both
            </Button>
          </div>
        </div>
      )}

      {/* transcript */}
      <section className="space-y-2">
        <h2 className="font-display text-title">Dialogue</h2>
        <ul className="space-y-2">
          {scene.lines.map((line, i) => (
            <li key={line.id}>
              <button
                type="button"
                onClick={() => seekLine(i)}
                className={cn(
                  "w-full rounded-mode border px-3 py-3 text-left transition-colors",
                  i === activeLineIdx
                    ? "border-[var(--color-primary)] bg-[color-mix(in_oklab,var(--color-primary)_12%,transparent)]"
                    : "border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface)_80%,transparent)] hover:border-[var(--color-border-strong)]",
                )}
              >
                <p className="text-xs text-[var(--color-subtle)]">
                  {line.speaker} · {fmt(line.startSec)}
                </p>
                <p lang="nax" className="font-display text-lg text-[var(--color-fg)]">
                  {line.narragansett}
                </p>
                <p className="text-sm text-[var(--color-muted)]">{line.english}</p>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function fmt(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
