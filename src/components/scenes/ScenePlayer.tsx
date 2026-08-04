import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Captions,
  CaptionsOff,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Languages,
  Gauge,
  SkipForward,
  SkipBack,
  BookOpen,
  CheckCircle2,
  Ear,
  Film,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type {
  LearningScene,
  PlayMode,
  SubtitleTrack,
  VoiceTrack,
} from "@/lib/content/scenes";
import {
  getNextScene,
  getPrevScene,
  resolveSceneVideoSrc,
} from "@/lib/content/scenes";
import { speakWord, stopSpeaking } from "@/lib/audio/speak";
import { useProgressStore } from "@/lib/progress/store";
import { cn } from "@/lib/utils";

type NavLink = { to: string; params?: Record<string, string>; label: string };

type Props = {
  scene: LearningScene;
  largeTargets?: boolean;
  /** Override default scene-list navigation (e.g. Full Day acts) */
  nextNav?: NavLink | null;
  prevNav?: NavLink | null;
  /** Custom video resolver (day uploads path) */
  resolveVideo?: (
    scene: LearningScene,
  ) => Promise<{ src: string; fromUpload: boolean }>;
  /** Progress key prefix — default "scene" */
  progressKind?: "scene" | "day-act";
};

const SPEEDS = [0.75, 1, 1.25] as const;

const VOICE_OPTIONS: { key: VoiceTrack; label: string; hint: string }[] = [
  { key: "narragansett", label: "Narragansett", hint: "Language first (default)" },
  { key: "english", label: "English", hint: "Hear English gloss" },
  { key: "both", label: "Both", hint: "Language, then English" },
  { key: "off", label: "Off", hint: "Visual only" },
];

const SUB_OPTIONS: { key: SubtitleTrack; label: string }[] = [
  { key: "english", label: "English" },
  { key: "narragansett", label: "Narragansett" },
  { key: "both", label: "Both" },
  { key: "off", label: "Off" },
];

export function ScenePlayer({
  scene,
  largeTargets,
  nextNav,
  prevNav,
  resolveVideo,
  progressKind = "scene",
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const learnToken = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [videoSrc, setVideoSrc] = useState(scene.videoSrc);
  const [fromUpload, setFromUpload] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [mediaDuration, setMediaDuration] = useState(scene.durationSec);
  const [voice, setVoice] = useState<VoiceTrack>("narragansett");
  const [subs, setSubs] = useState<SubtitleTrack>("english");
  const [playMode, setPlayMode] = useState<PlayMode>("learn");
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [activeLineIdx, setActiveLineIdx] = useState(0);
  const [loopLine, setLoopLine] = useState(false);
  const [ambientOn, setAmbientOn] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [practicedLines, setPracticedLines] = useState<Set<string>>(
    () => new Set(),
  );

  const completeScene = useProgressStore((s) => s.completeScene);
  const completeDayAct = useProgressStore((s) => s.completeDayAct);
  const setLastScene = useProgressStore((s) => s.setLastScene);
  const setLastDayAct = useProgressStore((s) => s.setLastDayAct);
  const markHeard = useProgressStore((s) => s.markHeard);
  const markPracticed = useProgressStore((s) => s.markPracticed);

  const defaultNext = getNextScene(scene.id);
  const defaultPrev = getPrevScene(scene.id);
  const next =
    nextNav === null
      ? undefined
      : nextNav
        ? nextNav
        : defaultNext
          ? {
              to: "/app/scenes/$id",
              params: { id: defaultNext.id },
              label: "Next scene",
            }
          : undefined;
  const prev =
    prevNav === null
      ? undefined
      : prevNav
        ? prevNav
        : defaultPrev
          ? {
              to: "/app/scenes/$id",
              params: { id: defaultPrev.id },
              label: "Prev",
            }
          : undefined;

  const activeLine = scene.lines[activeLineIdx] ?? scene.lines[0];
  const practiceDuration = scene.durationSec;
  const displayDuration =
    playMode === "learn" ? practiceDuration : mediaDuration || practiceDuration;

  useEffect(() => {
    if (progressKind === "day-act") setLastDayAct(scene.id);
    else setLastScene(scene.id);
    setActiveLineIdx(0);
    setTime(0);
    setPlaying(false);
    setPracticedLines(new Set());
    setVoice("narragansett");
    setSubs("english");
    setPlayMode("learn");
    learnToken.current += 1;
    stopSpeaking();
    const resolver = resolveVideo ?? resolveSceneVideoSrc;
    void resolver(scene).then((r) => {
      setVideoSrc(r.src);
      setFromUpload(r.fromUpload);
    });
    return () => {
      learnToken.current += 1;
      stopSpeaking();
    };
  }, [scene, setLastScene, setLastDayAct, progressKind, resolveVideo]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = speed;
    v.muted = !ambientOn;
    v.volume = ambientOn ? 0.35 : 0;
  }, [speed, videoSrc, ambientOn]);

  useEffect(() => {
    function onFs() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const bumpChrome = useCallback(() => {
    setChromeVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (playing) {
      hideTimer.current = setTimeout(() => setChromeVisible(false), 2800);
    }
  }, [playing]);

  useEffect(() => {
    if (!playing) {
      setChromeVisible(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      return;
    }
    bumpChrome();
  }, [playing, bumpChrome]);

  async function enterFullscreen() {
    const el = shellRef.current;
    if (!el || document.fullscreenElement) return;
    try {
      await el.requestFullscreen?.();
    } catch {
      /* blocked */
    }
  }

  async function exitFullscreen() {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        /* ignore */
      }
    }
  }

  function markComplete() {
    if (progressKind === "day-act") completeDayAct(scene.id);
    else completeScene(scene.id);
  }

  function markLinePracticed(lineId: string, wordId?: string) {
    const practiceKey = `${progressKind}:${scene.id}:${lineId}`;
    markHeard(practiceKey);
    markPracticed(practiceKey);
    if (wordId) {
      markHeard(wordId);
      markPracticed(wordId);
    }
    setPracticedLines((p) => new Set(p).add(lineId));
  }

  async function speakLine(
    line: (typeof scene.lines)[0],
    track: VoiceTrack = voice,
  ) {
    if (track === "off" || !line) return;
    setSpeaking(true);
    try {
      markLinePracticed(line.id, line.wordId);
      if (track === "english") {
        await speakWord({
          narragansett: line.english,
          english: line.english,
          includeEnglish: false,
        });
        return;
      }
      await speakWord({
        narragansett: line.narragansett,
        english: line.english,
        includeEnglish: track === "both",
      });
    } finally {
      setSpeaking(false);
    }
  }

  function mediaTimeForLine(idx: number): number {
    const v = videoRef.current;
    const md = v?.duration || mediaDuration || 1;
    if (scene.lines.length <= 1) return 0;
    return (idx / scene.lines.length) * Math.max(0.1, md - 0.15);
  }

  function seekMediaToLine(idx: number) {
    const v = videoRef.current;
    if (!v) return;
    try {
      v.currentTime = mediaTimeForLine(idx);
    } catch {
      /* ignore */
    }
  }

  const runLearnSequence = useCallback(
    async (fromIdx: number) => {
      const token = ++learnToken.current;
      const v = videoRef.current;
      setPlaying(true);
      setActiveLineIdx(fromIdx);

      for (let i = fromIdx; i < scene.lines.length; i++) {
        if (learnToken.current !== token) return;
        const line = scene.lines[i];
        setActiveLineIdx(i);
        setTime(line.startSec);
        seekMediaToLine(i);

        if (v) {
          try {
            v.muted = !ambientOn;
            await v.play();
          } catch {
            /* autoplay */
          }
        }

        if (voice !== "off") {
          await speakLine(line, voice);
        } else {
          const hold = Math.max(1.2, line.endSec - line.startSec) * 1000;
          await new Promise((r) => setTimeout(r, hold / speed));
        }

        if (learnToken.current !== token) return;
        if (loopLine) {
          i -= 1;
          continue;
        }
        await new Promise((r) => setTimeout(r, 350 / speed));
      }

      if (learnToken.current !== token) return;
      setPlaying(false);
      markComplete();
      if (v) v.pause();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scene, voice, loopLine, ambientOn, speed, progressKind],
  );

  function stopLearn() {
    learnToken.current += 1;
    stopSpeaking();
    setSpeaking(false);
    setPlaying(false);
    videoRef.current?.pause();
  }

  async function togglePlay() {
    if (playing) {
      stopLearn();
      if (playMode === "watch") videoRef.current?.pause();
      return;
    }
    await enterFullscreen();
    bumpChrome();
    if (playMode === "learn") {
      void runLearnSequence(activeLineIdx);
      return;
    }
    const v = videoRef.current;
    if (!v) return;
    try {
      await v.play();
      setPlaying(true);
      if (voice !== "off" && activeLine) void speakLine(activeLine, voice);
    } catch {
      setPlaying(false);
    }
  }

  function seekLine(idx: number) {
    const line = scene.lines[idx];
    if (!line) return;
    stopLearn();
    setActiveLineIdx(idx);
    setTime(line.startSec);
    seekMediaToLine(idx);
    void enterFullscreen().then(() => {
      if (playMode === "learn") void runLearnSequence(idx);
      else {
        void videoRef.current?.play();
        setPlaying(true);
        if (voice !== "off") void speakLine(line, voice);
      }
    });
  }

  function nextLine() {
    seekLine(Math.min(scene.lines.length - 1, activeLineIdx + 1));
  }
  function prevLine() {
    seekLine(Math.max(0, activeLineIdx - 1));
  }

  function restart() {
    stopLearn();
    setActiveLineIdx(0);
    setTime(0);
    if (videoRef.current) videoRef.current.currentTime = 0;
    void enterFullscreen().then(() => {
      if (playMode === "learn") void runLearnSequence(0);
      else {
        void videoRef.current?.play();
        setPlaying(true);
      }
    });
  }

  async function hearLineManual(lang: "n" | "e" | "both") {
    if (!activeLine) return;
    if (playing) stopLearn();
    const track: VoiceTrack =
      lang === "n" ? "narragansett" : lang === "e" ? "english" : "both";
    await speakLine(activeLine, track);
  }

  function toggleFullscreenBtn() {
    if (document.fullscreenElement) void exitFullscreen();
    else void enterFullscreen();
  }

  const onTime = useCallback(() => {
    if (playMode !== "watch") return;
    const v = videoRef.current;
    if (!v) return;
    const t = v.currentTime;
    const md = v.duration || 1;
    const practiceT = (t / md) * practiceDuration;
    setTime(practiceT);
    const idx = scene.lines.findIndex(
      (l) => practiceT >= l.startSec && practiceT < l.endSec,
    );
    if (idx >= 0 && idx !== activeLineIdx) {
      setActiveLineIdx(idx);
      if (playing && voice !== "off" && !speaking) {
        void speakLine(scene.lines[idx], voice);
      }
    }
    if (loopLine && activeLine && practiceT >= activeLine.endSec - 0.05) {
      v.currentTime = mediaTimeForLine(activeLineIdx);
    }
  }, [
    playMode,
    scene.lines,
    activeLineIdx,
    loopLine,
    activeLine,
    practiceDuration,
    playing,
    voice,
    speaking,
  ]);

  function onEnded() {
    if (playMode === "watch") {
      setPlaying(false);
      markComplete();
    }
  }

  const progress =
    displayDuration > 0
      ? playMode === "learn"
        ? ((activeLineIdx + (speaking ? 0.5 : 0)) / scene.lines.length) * 100
        : (time / displayDuration) * 100
      : 0;

  const subtitleNode = useMemo(() => {
    if (subs === "off" || !activeLine) return null;
    return (
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 flex justify-center px-4",
          isFullscreen ? "bottom-24 sm:bottom-28" : "bottom-16",
        )}
      >
        <div className="max-w-2xl rounded-xl bg-black/75 px-5 py-3 text-center shadow-lg backdrop-blur-md">
          {(subs === "narragansett" || subs === "both") && (
            <p
              lang="nax"
              className={cn(
                "font-display text-white drop-shadow",
                largeTargets || isFullscreen ? "text-2xl sm:text-3xl" : "text-xl",
              )}
            >
              {activeLine.narragansett}
            </p>
          )}
          {(subs === "english" || subs === "both") && (
            <p
              className={cn(
                "text-white/90",
                largeTargets || isFullscreen ? "text-lg sm:text-xl" : "text-base",
                subs === "both" && "mt-1",
              )}
            >
              {activeLine.english}
            </p>
          )}
        </div>
      </div>
    );
  }, [subs, activeLine, largeTargets, isFullscreen]);

  return (
    <div className="space-y-4">
      {scene.mediaStatus === "awaiting_upload" && !fromUpload && (
        <p className="rounded-mode border border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-warn)_12%,transparent)] px-3 py-2 text-sm text-[var(--color-muted)]">
          Stand-in video — drop your file at{" "}
          <code className="text-[var(--color-fg)]">{scene.uploadSrc}</code> to
          replace it.
        </p>
      )}
      {fromUpload && (
        <p className="text-sm text-[var(--color-land)]">
          Playing your uploaded community video for this section.
        </p>
      )}

      <p className="text-sm text-[var(--color-subtle)] leading-relaxed">
        Default: <strong className="text-[var(--color-fg)]">hear Narragansett</strong>
        {" · "}
        <strong className="text-[var(--color-fg)]">read English</strong>
        . Play opens fullscreen. Film ~{Math.round(mediaDuration || scene.durationSec / 2)}
        s · practice ~{practiceDuration}s with speech.
      </p>

      <div
        ref={shellRef}
        className={cn(
          "relative overflow-hidden bg-black shadow-[var(--shadow-elevated)]",
          isFullscreen
            ? "fixed inset-0 z-50 rounded-none border-0"
            : "rounded-mode-lg border border-[var(--color-border)]",
        )}
        onPointerMove={bumpChrome}
        onClick={bumpChrome}
      >
        <video
          ref={videoRef}
          key={videoSrc}
          className={cn(
            "w-full bg-black object-contain",
            isFullscreen ? "h-dvh max-h-dvh" : "aspect-video max-h-[70vh]",
          )}
          src={videoSrc}
          poster={scene.posterSrc}
          playsInline
          muted={!ambientOn}
          onTimeUpdate={onTime}
          onLoadedMetadata={(e) =>
            setMediaDuration(e.currentTarget.duration || scene.durationSec)
          }
          onPlay={() => {
            if (playMode === "watch") setPlaying(true);
          }}
          onPause={() => {
            if (playMode === "watch") setPlaying(false);
          }}
          onEnded={onEnded}
          preload="metadata"
        />

        {subtitleNode}

        {!playing && chromeVisible && (
          <button
            type="button"
            onClick={() => void togglePlay()}
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/25"
            aria-label="Play fullscreen"
          >
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-xl">
              <Play className="h-8 w-8" fill="currentColor" />
            </span>
          </button>
        )}

        <div
          className={cn(
            "absolute inset-x-0 bottom-0 z-20 transition-opacity duration-300",
            chromeVisible || !playing
              ? "opacity-100"
              : "pointer-events-none opacity-0",
          )}
        >
          <div className="bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pb-3 pt-16">
            <div className="mb-2 h-1 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-200"
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void togglePlay()}
                className="inline-flex h-11 min-w-11 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
                aria-label={playing ? "Pause" : "Play fullscreen"}
              >
                {playing ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" fill="currentColor" />
                )}
              </button>
              <button
                type="button"
                onClick={prevLine}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/90 hover:bg-white/10"
                aria-label="Previous line"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={nextLine}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/90 hover:bg-white/10"
                aria-label="Next line"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <span className="ml-1 min-w-0 flex-1 truncate text-xs text-white/80 tabular-nums sm:text-sm">
                Line {activeLineIdx + 1}/{scene.lines.length}
                {speaking ? " · speaking…" : ""}
                {" · "}
                {fmt(playMode === "learn" ? activeLine?.startSec ?? 0 : time)} /{" "}
                {fmt(displayDuration)}
              </span>
              <button
                type="button"
                onClick={() => setAmbientOn((a) => !a)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/90 hover:bg-white/10"
                aria-label={
                  ambientOn ? "Mute ambient video audio" : "Unmute ambient video audio"
                }
              >
                {ambientOn ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4 opacity-60" />
                )}
              </button>
              <button
                type="button"
                onClick={toggleFullscreenBtn}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/90 hover:bg-white/10"
                aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? (
                  <Minimize className="h-4 w-4" />
                ) : (
                  <Maximize className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {!isFullscreen && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="primary"
            size={largeTargets ? "lg" : "default"}
            onClick={() => void togglePlay()}
          >
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            {playing ? "Pause" : "Play fullscreen"}
          </Button>
          <Button type="button" variant="secondary" onClick={restart}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={loopLine ? "soft" : "secondary"}
            onClick={() => setLoopLine((v) => !v)}
          >
            Loop line
          </Button>
          {prev && (
            <Button asChild variant="secondary">
              <Link to={prev.to} params={prev.params}>
                <SkipBack className="h-4 w-4" />
                {prev.label}
              </Link>
            </Button>
          )}
          {next && (
            <Button asChild variant="soft">
              <Link to={next.to} params={next.params}>
                <SkipForward className="h-4 w-4" />
                {next.label}
              </Link>
            </Button>
          )}
        </div>
      )}

      <div className="surface-card pad-mode space-y-4">
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-muted)]">
            <Ear className="h-4 w-4" />
            Hear (starts as Narragansett)
          </span>
          <div className="flex flex-wrap gap-2">
            {VOICE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                title={opt.hint}
                onClick={() => setVoice(opt.key)}
                className={cn(
                  "min-h-11 rounded-full border px-3 py-1.5 text-sm",
                  voice === opt.key
                    ? "border-[var(--color-primary)] bg-[color-mix(in_oklab,var(--color-primary)_14%,transparent)] text-[var(--color-primary)]"
                    : "border-[var(--color-border)] text-[var(--color-muted)]",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-muted)]">
            {subs === "off" ? (
              <CaptionsOff className="h-4 w-4" />
            ) : (
              <Captions className="h-4 w-4" />
            )}
            Subtitles (starts as English)
          </span>
          <div className="flex flex-wrap gap-2">
            {SUB_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setSubs(opt.key)}
                className={cn(
                  "min-h-11 rounded-full border px-3 py-1.5 text-sm",
                  subs === opt.key
                    ? "border-[var(--color-primary)] bg-[color-mix(in_oklab,var(--color-primary)_14%,transparent)] text-[var(--color-primary)]"
                    : "border-[var(--color-border)] text-[var(--color-muted)]",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-muted)]">
            <Film className="h-4 w-4" />
            Mode
          </span>
          {(
            [
              ["learn", "Learn (line-by-line)"],
              ["watch", "Watch (continuous)"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                stopLearn();
                setPlayMode(key);
              }}
              className={cn(
                "min-h-11 rounded-full border px-3 py-1.5 text-sm",
                playMode === key
                  ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                  : "border-[var(--color-border)] text-[var(--color-muted)]",
              )}
            >
              {label}
            </button>
          ))}
          <span className="ml-2 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-muted)]">
            <Gauge className="h-4 w-4" />
            Speed
          </span>
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
              className={cn(
                "min-h-11 rounded-full border px-3 py-1.5 text-sm tabular-nums",
                speed === s
                  ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                  : "border-[var(--color-border)] text-[var(--color-muted)]",
              )}
            >
              {s}×
            </button>
          ))}
          <span className="ml-auto text-xs tabular-nums text-[var(--color-subtle)]">
            Practiced {practicedLines.size}/{scene.lines.length} lines
          </span>
        </div>
      </div>

      {activeLine && (
        <div className="focus-stage pad-mode space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge tone="land">{activeLine.speaker}</Badge>
            <Badge tone="neutral">
              Line {activeLineIdx + 1} / {scene.lines.length}
            </Badge>
            {practicedLines.has(activeLine.id) && (
              <Badge tone="land">
                <CheckCircle2 className="mr-1 inline h-3 w-3" />
                Heard
              </Badge>
            )}
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
            <Button type="button" variant="primary" onClick={() => void hearLineManual("n")}>
              <Volume2 className="h-4 w-4" />
              Hear Narragansett
            </Button>
            <Button type="button" variant="secondary" onClick={() => void hearLineManual("e")}>
              <Languages className="h-4 w-4" />
              Hear English
            </Button>
            <Button type="button" variant="soft" onClick={() => void hearLineManual("both")}>
              Hear both
            </Button>
            {activeLine.wordId && (
              <Button asChild variant="secondary">
                <Link to="/app/words/$id" params={{ id: activeLine.wordId }}>
                  <BookOpen className="h-4 w-4" />
                  Open in Words
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}

      <section className="space-y-2">
        <h2 className="font-display text-title">Dialogue</h2>
        <ul className="space-y-2">
          {scene.lines.map((line, i) => (
            <li key={line.id}>
              <button
                type="button"
                onClick={() => seekLine(i)}
                className={cn(
                  "min-h-11 w-full rounded-mode border px-3 py-3 text-left transition-colors",
                  i === activeLineIdx
                    ? "border-[var(--color-primary)] bg-[color-mix(in_oklab,var(--color-primary)_12%,transparent)]"
                    : "border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface)_80%,transparent)] hover:border-[var(--color-border-strong)]",
                )}
              >
                <p className="flex items-center gap-2 text-xs text-[var(--color-subtle)]">
                  <span>
                    {line.speaker} · {fmt(line.startSec)}
                  </span>
                  {practicedLines.has(line.id) && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-[var(--color-land)]" />
                  )}
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
