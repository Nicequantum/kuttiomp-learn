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
  AlertCircle,
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

type ProgressKind = "scene" | "day-act" | "story";

type Props = {
  scene: LearningScene;
  largeTargets?: boolean;
  nextNav?: NavLink | null;
  prevNav?: NavLink | null;
  resolveVideo?: (
    scene: LearningScene,
  ) => Promise<{ src: string; fromUpload: boolean }>;
  progressKind?: ProgressKind;
  /** Default play mode — long stories use "watch" */
  defaultPlayMode?: PlayMode;
  /**
   * Continuous cinema film presentation (preload, cast-locked film copy).
   * Does NOT force continuous playback — Learn mode is always independent
   * (isContinuous = playMode === "watch" only).
   */
  continuousFilm?: boolean;
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

/** Safe mm:ss / h:mm:ss — never renders NaN */
export function fmt(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}:${String(rm).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  }
  return `${m}:${String(r).padStart(2, "0")}`;
}

function isTypingTarget(t: EventTarget | null) {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    t.isContentEditable
  );
}

export function ScenePlayer({
  scene,
  largeTargets,
  nextNav,
  prevNav,
  resolveVideo,
  progressKind = "scene",
  defaultPlayMode = "learn",
  continuousFilm = false,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const learnToken = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSpokenLine = useRef<string | null>(null);
  /** User wants continuous film playing — auto-resume if browser stalls */
  const userIntentPlay = useRef(false);
  /** Guard against overlapping TTS during continuous watch */
  const ttsBusy = useRef(false);
  const stallTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProgressAt = useRef(0);
  const lastMediaTime = useRef(0);
  const lastSavedAt = useRef(0);
  const pendingResumeSec = useRef<number | null>(null);
  const appliedResume = useRef(false);

  const [videoSrc, setVideoSrc] = useState(scene.videoSrc);
  const [fromUpload, setFromUpload] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [mediaDuration, setMediaDuration] = useState(scene.durationSec);
  const [voice, setVoice] = useState<VoiceTrack>("narragansett");
  const [subs, setSubs] = useState<SubtitleTrack>("english");
  const [playMode, setPlayMode] = useState<PlayMode>(defaultPlayMode);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [activeLineIdx, setActiveLineIdx] = useState(0);
  const [loopLine, setLoopLine] = useState(false);
  const [ambientOn, setAmbientOn] = useState(false);
  /** native = Fullscreen API; css = fixed overlay (iframe-safe) */
  const [fsMode, setFsMode] = useState<"none" | "native" | "css">("none");
  const isFullscreen = fsMode !== "none";
  const [chromeVisible, setChromeVisible] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [practicedLines, setPracticedLines] = useState<Set<string>>(
    () => new Set(),
  );

  const completeScene = useProgressStore((s) => s.completeScene);
  const completeDayAct = useProgressStore((s) => s.completeDayAct);
  const completeStory = useProgressStore((s) => s.completeStory);
  const setLastScene = useProgressStore((s) => s.setLastScene);
  const setLastDayAct = useProgressStore((s) => s.setLastDayAct);
  const setStoryPosition = useProgressStore((s) => s.setStoryPosition);
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
  /**
   * CRITICAL Learn ≠ Watch:
   * Continuous autoplay is gated ONLY by playMode === "watch".
   * continuousFilm must never force Learn into continuous playback.
   */
  const isContinuous = playMode === "watch";
  const displayDuration =
    playMode === "learn"
      ? practiceDuration
      : mediaDuration || practiceDuration;

  const saveStoryPosition = useCallback(
    (mediaSec?: number) => {
      if (progressKind !== "story") return;
      const v = videoRef.current;
      const raw = mediaSec ?? v?.currentTime ?? 0;
      if (!Number.isFinite(raw) || raw < 0) return;
      setStoryPosition(scene.id, raw);
      lastSavedAt.current = Date.now();
    },
    [progressKind, scene.id, setStoryPosition],
  );

  useEffect(() => {
    if (progressKind === "day-act") setLastDayAct(scene.id);
    else if (progressKind === "story") {
      const store = useProgressStore.getState();
      const canResume =
        store.lastStoryId === scene.id &&
        store.lastStoryPositionSec >= 5 &&
        !store.completedStories.includes(scene.id);
      pendingResumeSec.current = canResume ? store.lastStoryPositionSec : null;
      appliedResume.current = false;
      // Touch lastStoryId without wiping a valid resume cursor
      if (store.lastStoryId !== scene.id) {
        setStoryPosition(scene.id, 0);
      }
    } else {
      setLastScene(scene.id);
    }
    setActiveLineIdx(0);
    setTime(0);
    setPlaying(false);
    userIntentPlay.current = false;
    setPracticedLines(new Set());
    setVoice("narragansett");
    setSubs("english");
    setPlayMode(defaultPlayMode);
    setMediaError(null);
    lastSpokenLine.current = null;
    ttsBusy.current = false;
    learnToken.current += 1;
    stopSpeaking();
    const resolver = resolveVideo ?? resolveSceneVideoSrc;
    void resolver(scene).then((r) => {
      setVideoSrc(r.src);
      setFromUpload(r.fromUpload);
    });
    return () => {
      // Persist place on leave (pause / navigate away)
      if (progressKind === "story") {
        const v = videoRef.current;
        if (v && Number.isFinite(v.currentTime) && v.currentTime >= 1) {
          useProgressStore.getState().setStoryPosition(scene.id, v.currentTime);
        }
      }
      learnToken.current += 1;
      userIntentPlay.current = false;
      stopSpeaking();
      if (stallTimer.current) clearTimeout(stallTimer.current);
    };
  }, [
    scene,
    setLastScene,
    setLastDayAct,
    setStoryPosition,
    progressKind,
    resolveVideo,
    defaultPlayMode,
  ]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = speed;
    v.muted = !ambientOn;
    v.volume = ambientOn ? 0.35 : 0;
  }, [speed, videoSrc, ambientOn]);

  // Keep continuous film rolling until natural end or user pause.
  // Also recovers from buffer stalls without seeking.
  useEffect(() => {
    if (!isContinuous) return;
    const id = window.setInterval(() => {
      const v = videoRef.current;
      if (!v || !userIntentPlay.current) return;
      if (v.ended) {
        userIntentPlay.current = false;
        setPlaying(false);
        setBuffering(false);
        return;
      }
      const t = v.currentTime;
      if (Math.abs(t - lastMediaTime.current) < 0.05 && !v.paused) {
        setBuffering(true);
      } else if (!v.paused) {
        setBuffering(false);
      }
      lastMediaTime.current = t;

      if (v.paused && !v.ended) {
        void v
          .play()
          .then(() => {
            setPlaying(true);
            setBuffering(false);
          })
          .catch(() => {
            try {
              v.muted = true;
              void v.play().then(() => {
                setPlaying(true);
                setBuffering(false);
              });
            } catch {
              /* wait for user */
            }
          });
      }
    }, 600);
    return () => window.clearInterval(id);
  }, [isContinuous]);

  useEffect(() => {
    function onFs() {
      if (document.fullscreenElement) setFsMode("native");
      else setFsMode((m) => (m === "native" ? "none" : m));
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        // Always leave both native and CSS fullscreen shells
        if (document.fullscreenElement) {
          void document.exitFullscreen().catch(() => {});
        }
        document.body.style.overflow = "";
        setFsMode("none");
        return;
      }
      // Space toggles play when player shell is the interaction context
      if (e.key !== " " && e.code !== "Space") return;
      if (isTypingTarget(e.target)) return;
      const shell = shellRef.current;
      if (!shell) return;
      const ae = document.activeElement;
      const inShell =
        ae === shell ||
        shell.contains(ae) ||
        isFullscreen ||
        ae === document.body ||
        ae === document.documentElement;
      if (!inShell) return;
      e.preventDefault();
      void togglePlay();
    }
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFullscreen, isContinuous, playing]);

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
    if (!el) return;
    if (document.fullscreenElement === el) {
      setFsMode("native");
      return;
    }
    if (el.requestFullscreen && !document.fullscreenElement) {
      try {
        await el.requestFullscreen();
        setFsMode("native");
        return;
      } catch {
        /* iframe / policy — fall through to CSS */
      }
    }
    document.body.style.overflow = "hidden";
    setFsMode("css");
  }

  async function exitFullscreen() {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        /* ignore */
      }
    }
    document.body.style.overflow = "";
    setFsMode("none");
  }

  function markComplete() {
    if (progressKind === "day-act") completeDayAct(scene.id);
    else if (progressKind === "story") completeStory(scene.id);
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
    // Continuous film: never stack TTS or cancel mid-film aggressively
    if (isContinuous && ttsBusy.current) return;
    ttsBusy.current = true;
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
      ttsBusy.current = false;
    }
  }

  function mediaTimeForLine(idx: number): number {
    const v = videoRef.current;
    const md = v?.duration || mediaDuration || 1;
    if (!Number.isFinite(md) || md <= 0) return 0;
    if (scene.lines.length <= 1) return 0;
    // Prefer line timeline mapped into media when practiceDuration ≈ film length
    const line = scene.lines[idx];
    if (line && practiceDuration > 0 && Number.isFinite(line.startSec)) {
      const ratio = md / practiceDuration;
      return Math.min(Math.max(0, line.startSec * ratio), Math.max(0, md - 0.05));
    }
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

  function applyPendingResume(v: HTMLVideoElement) {
    if (appliedResume.current) return;
    const resume = pendingResumeSec.current;
    if (resume == null || resume < 5) return;
    const md = v.duration;
    if (!Number.isFinite(md) || md <= 0) return;
    try {
      v.currentTime = Math.min(resume, Math.max(0, md - 0.25));
      lastMediaTime.current = v.currentTime;
      const practiceT =
        practiceDuration > 0 && md > 0
          ? (v.currentTime / md) * practiceDuration
          : v.currentTime;
      setTime(practiceT);
      appliedResume.current = true;
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
    ttsBusy.current = false;
    setPlaying(false);
    videoRef.current?.pause();
  }

  async function playContinuousFrom(startAt?: number) {
    const v = videoRef.current;
    if (!v) return;
    learnToken.current += 1; // cancel any learn loop
    setSpeaking(false);
    userIntentPlay.current = true;
    lastProgressAt.current = Date.now();
    setMediaError(null);

    if (v.readyState < 2) {
      setBuffering(true);
      await new Promise<void>((resolve) => {
        const onReady = () => {
          v.removeEventListener("canplay", onReady);
          resolve();
        };
        v.addEventListener("canplay", onReady);
        window.setTimeout(() => {
          v.removeEventListener("canplay", onReady);
          resolve();
        }, 4000);
      });
      setBuffering(false);
    }

    applyPendingResume(v);

    if (typeof startAt === "number" && Number.isFinite(startAt)) {
      try {
        const md = v.duration || mediaDuration || startAt;
        v.currentTime = Math.max(0, Math.min(startAt, Math.max(0, md - 0.05)));
      } catch {
        /* ignore */
      }
    }
    await enterFullscreen();
    bumpChrome();
    try {
      v.muted = !ambientOn;
      v.playsInline = true;
      v.loop = false;
      const p = v.play();
      if (p) await p;
      setPlaying(true);
      if (voice !== "off" && activeLine && lastSpokenLine.current !== activeLine.id) {
        lastSpokenLine.current = activeLine.id;
        void speakLine(activeLine, voice);
      }
    } catch {
      try {
        v.muted = true;
        await v.play();
        setPlaying(true);
      } catch {
        userIntentPlay.current = false;
        setPlaying(false);
      }
    }
  }

  async function togglePlay() {
    if (playing || userIntentPlay.current) {
      userIntentPlay.current = false;
      learnToken.current += 1;
      stopSpeaking();
      setSpeaking(false);
      ttsBusy.current = false;
      setPlaying(false);
      setBuffering(false);
      videoRef.current?.pause();
      // Session A: save place on pause
      saveStoryPosition();
      return;
    }
    if (isContinuous) {
      const v = videoRef.current;
      let start: number | undefined;
      if (v) {
        if (v.ended || (v.duration && v.currentTime >= v.duration - 0.25)) {
          start = 0;
          pendingResumeSec.current = null;
          appliedResume.current = true;
        } else if (
          !appliedResume.current &&
          pendingResumeSec.current != null &&
          pendingResumeSec.current >= 5 &&
          v.currentTime < 1
        ) {
          start = pendingResumeSec.current;
        }
        // otherwise continue from currentTime
      }
      await playContinuousFrom(start);
      return;
    }
    await enterFullscreen();
    bumpChrome();
    void runLearnSequence(activeLineIdx);
  }

  function seekLine(idx: number) {
    const line = scene.lines[idx];
    if (!line) return;
    if (!isContinuous) stopLearn();
    setActiveLineIdx(idx);
    setTime(line.startSec);
    if (isContinuous) {
      const mediaT = mediaTimeForLine(idx);
      void playContinuousFrom(mediaT);
      saveStoryPosition(mediaT);
      if (voice !== "off") {
        lastSpokenLine.current = line.id;
        void speakLine(line, voice);
      }
      return;
    }
    seekMediaToLine(idx);
    void enterFullscreen().then(() => {
      void runLearnSequence(idx);
    });
  }

  function seekByProgress(pct: number) {
    const v = videoRef.current;
    if (!v) return;
    // Progress bar seeks the film clock (Watch). In Learn, map to nearest line.
    const md = (Number.isFinite(v.duration) && v.duration > 0)
      ? v.duration
      : (Number.isFinite(mediaDuration) && mediaDuration > 0 ? mediaDuration : 0);
    if (!Number.isFinite(md) || md <= 0) return;
    const clamped = Math.min(1, Math.max(0, pct));
    const mediaT = clamped * md;
    if (!isContinuous) {
      // Snap to nearest dialogue line for Learn mode
      const practiceT = practiceDuration > 0 ? clamped * practiceDuration : mediaT;
      let best = 0;
      let bestDist = Infinity;
      scene.lines.forEach((line, i) => {
        const d = Math.abs(line.startSec - practiceT);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      seekLine(best);
      return;
    }
    try {
      v.currentTime = mediaT;
    } catch {
      return;
    }
    const practiceT =
      practiceDuration > 0 ? clamped * practiceDuration : mediaT;
    setTime(Number.isFinite(practiceT) ? practiceT : mediaT);
    // Update active line from practice clock
    let idx = scene.lines.findIndex(
      (l) => practiceT >= l.startSec && practiceT < l.endSec,
    );
    if (idx < 0 && scene.lines.length) idx = scene.lines.length - 1;
    if (idx >= 0) setActiveLineIdx(idx);
    saveStoryPosition(mediaT);
    if (userIntentPlay.current) {
      void v.play().catch(() => {});
    }
  }

  function nextLine() {
    seekLine(Math.min(scene.lines.length - 1, activeLineIdx + 1));
  }
  function prevLine() {
    seekLine(Math.max(0, activeLineIdx - 1));
  }

  function restart() {
    stopLearn();
    userIntentPlay.current = false;
    setActiveLineIdx(0);
    setTime(0);
    lastSpokenLine.current = null;
    ttsBusy.current = false;
    pendingResumeSec.current = null;
    appliedResume.current = true;
    if (videoRef.current) videoRef.current.currentTime = 0;
    if (progressKind === "story") {
      setStoryPosition(scene.id, 0);
    }
    if (isContinuous) {
      void playContinuousFrom(0);
      return;
    }
    void enterFullscreen().then(() => {
      void runLearnSequence(0);
    });
  }

  async function hearLineManual(lang: "n" | "e" | "both") {
    if (!activeLine) return;
    if (playing && !isContinuous) stopLearn();
    const track: VoiceTrack =
      lang === "n" ? "narragansett" : lang === "e" ? "english" : "both";
    ttsBusy.current = false;
    stopSpeaking();
    await speakLine(activeLine, track);
  }

  function toggleFullscreenBtn() {
    if (document.fullscreenElement || fsMode !== "none") void exitFullscreen();
    else void enterFullscreen();
  }

  function switchPlayMode(key: PlayMode) {
    // Leaving continuous: stop autoplay intent so Learn never keeps rolling
    userIntentPlay.current = false;
    stopLearn();
    lastSpokenLine.current = null;
    setPlayMode(key);
    if (key === "learn") {
      saveStoryPosition();
    }
  }

  const onTime = useCallback(() => {
    if (!isContinuous) return;
    const v = videoRef.current;
    if (!v) return;
    const t = v.currentTime;
    const md = v.duration || mediaDuration || 1;
    lastProgressAt.current = Date.now();
    lastMediaTime.current = t;
    const practiceT =
      practiceDuration > 0 && md > 0 && Number.isFinite(md)
        ? (t / Math.max(0.01, md)) * practiceDuration
        : t;
    setTime(Number.isFinite(practiceT) ? practiceT : 0);
    if (md && Number.isFinite(md)) setMediaDuration(md);

    // Throttled progress save (~every 4s while watching)
    if (
      progressKind === "story" &&
      userIntentPlay.current &&
      Date.now() - lastSavedAt.current > 4000
    ) {
      saveStoryPosition(t);
    }

    let idx = scene.lines.findIndex(
      (l) => practiceT >= l.startSec && practiceT < l.endSec,
    );
    if (idx < 0 && scene.lines.length) {
      idx = scene.lines.length - 1;
    }
    if (idx >= 0 && idx !== activeLineIdx) {
      setActiveLineIdx(idx);
      const line = scene.lines[idx];
      if (
        userIntentPlay.current &&
        voice !== "off" &&
        line &&
        lastSpokenLine.current !== line.id
      ) {
        lastSpokenLine.current = line.id;
        // Fire-and-forget TTS — video clock is source of truth
        void speakLine(line, voice);
      }
    }
    // Loop line only in Learn (never while watching continuous film)
    if (
      loopLine &&
      !isContinuous &&
      activeLine &&
      practiceT >= activeLine.endSec - 0.05
    ) {
      v.currentTime = mediaTimeForLine(activeLineIdx);
    }
  }, [
    isContinuous,
    scene.lines,
    activeLineIdx,
    loopLine,
    activeLine,
    practiceDuration,
    mediaDuration,
    voice,
    progressKind,
    saveStoryPosition,
  ]);

  function onEnded() {
    if (isContinuous) {
      userIntentPlay.current = false;
      setPlaying(false);
      setBuffering(false);
      markComplete();
    }
  }

  const safeProgress = (() => {
    if (!(displayDuration > 0) || !Number.isFinite(displayDuration)) return 0;
    if (playMode === "learn") {
      return ((activeLineIdx + (speaking ? 0.5 : 0)) / Math.max(1, scene.lines.length)) * 100;
    }
    if (!Number.isFinite(time)) return 0;
    return Math.min(100, Math.max(0, (time / displayDuration) * 100));
  })();

  const filmLabel =
    Number.isFinite(mediaDuration) && mediaDuration >= 60
      ? `${Math.floor(mediaDuration / 60)} min`
      : Number.isFinite(mediaDuration)
        ? `${Math.round(mediaDuration)}s`
        : "—";

  const resumeHint =
    progressKind === "story" &&
    pendingResumeSec.current != null &&
    pendingResumeSec.current >= 5 &&
    !appliedResume.current
      ? pendingResumeSec.current
      : null;

  const subtitleNode = useMemo(() => {
    if (subs === "off" || !activeLine) return null;
    return (
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 flex justify-center px-4",
          isFullscreen ? "bottom-24 sm:bottom-28" : "bottom-16",
        )}
        data-testid="scene-player-subtitles"
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
    <div
      className="space-y-4"
      data-testid="scene-player"
      data-play-mode={playMode}
      data-continuous={isContinuous ? "true" : "false"}
      data-progress-kind={progressKind}
    >
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
        .{" "}
        {isContinuous ? (
          <>
            <strong className="text-[var(--color-fg)]">Play full film</strong> runs
            continuous end-to-end (no scene skipping) · fullscreen · ~{filmLabel}
            {" · "}same Host & Guest throughout
          </>
        ) : (
          <>
            <strong className="text-[var(--color-fg)]">Learn</strong> practices
            line-by-line · film ~{filmLabel}
            {` · ${scene.lines.length} lines`}
            {continuousFilm
              ? " · continuous autoplay stays off until you switch back to Watch"
              : ""}
          </>
        )}
        .
      </p>

      {resumeHint != null && (
        <p
          className="rounded-mode border border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-primary)_10%,transparent)] px-3 py-2 text-sm text-[var(--color-muted)]"
          data-testid="scene-player-resume-hint"
        >
          Resume from <strong className="text-[var(--color-fg)]">{fmt(resumeHint)}</strong>
          {" · "}press Play to continue where you left off.
        </p>
      )}

      {mediaError && (
        <p
          className="flex items-start gap-2 rounded-mode border border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-warn)_14%,transparent)] px-3 py-2 text-sm text-[var(--color-muted)]"
          data-testid="scene-player-error"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-warn)]" />
          <span>
            Film could not load. Check your connection and try again.{" "}
            <span className="text-[var(--color-subtle)]">({mediaError})</span>
          </span>
        </p>
      )}

      <div
        ref={shellRef}
        data-scene-player-shell="true"
        data-testid="scene-player-shell"
        data-fullscreen={isFullscreen ? "true" : "false"}
        tabIndex={0}
        className={cn(
          "relative overflow-hidden bg-black shadow-[var(--shadow-elevated)] outline-none",
          isFullscreen
            ? "fixed inset-0 z-[100] rounded-none border-0"
            : "rounded-mode-lg border border-[var(--color-border)]",
        )}
        style={
          isFullscreen
            ? { width: "100vw", height: "100dvh", maxHeight: "100dvh" }
            : undefined
        }
        onPointerMove={bumpChrome}
        onClick={bumpChrome}
        onFocus={bumpChrome}
      >
        <video
          ref={videoRef}
          key={videoSrc}
          data-testid="scene-player-video"
          className={cn(
            "w-full bg-black object-contain",
            isFullscreen ? "h-dvh max-h-dvh" : "aspect-video max-h-[70vh]",
          )}
          src={videoSrc}
          poster={scene.posterSrc}
          playsInline
          muted={!ambientOn}
          loop={false}
          onTimeUpdate={onTime}
          onWaiting={() => {
            if (userIntentPlay.current) setBuffering(true);
          }}
          onPlaying={() => {
            setBuffering(false);
            if (userIntentPlay.current) setPlaying(true);
          }}
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            if (d && Number.isFinite(d)) setMediaDuration(d);
            applyPendingResume(e.currentTarget);
          }}
          onPlay={() => {
            if (isContinuous) setPlaying(true);
          }}
          onPause={() => {
            if (!isContinuous) return;
            if (!userIntentPlay.current) {
              setPlaying(false);
              saveStoryPosition();
            }
          }}
          onEnded={onEnded}
          onError={() => {
            setMediaError("media error");
            setBuffering(false);
            userIntentPlay.current = false;
            setPlaying(false);
          }}
          preload={continuousFilm ? "auto" : "metadata"}
        />

        {subtitleNode}

        {buffering && playing && (
          <div
            className="pointer-events-none absolute inset-0 z-25 flex items-center justify-center"
            data-testid="scene-player-buffering"
          >
            <span className="rounded-full bg-black/60 px-4 py-2 text-sm text-white/90">
              Loading film…
            </span>
          </div>
        )}

        {!playing && chromeVisible && (
          <button
            type="button"
            data-testid="scene-player-big-play"
            onClick={() => void togglePlay()}
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/25"
            aria-label={
              isContinuous ? "Play full film" : "Play fullscreen"
            }
          >
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-xl">
              <Play className="h-8 w-8" fill="currentColor" />
            </span>
          </button>
        )}

        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 z-20 transition-opacity duration-300",
            chromeVisible || !playing ? "opacity-100" : "opacity-0",
          )}
        >
          <div className="bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pb-3 pt-16">
            <div
              className="pointer-events-auto mb-2 h-3 cursor-pointer overflow-hidden rounded-full bg-white/20"
              role="slider"
              data-testid="scene-player-seek"
              aria-label="Seek in film"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(safeProgress)}
              onPointerDown={(e) => {
                e.preventDefault();
                const rect = e.currentTarget.getBoundingClientRect();
                const pct =
                  rect.width > 0
                    ? Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
                    : 0;
                seekByProgress(pct);
              }}
            >
              <div
                className="pointer-events-none h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-200"
                data-testid="scene-player-progress-fill"
                style={{ width: `${safeProgress}%` }}
              />
            </div>
            <div className="pointer-events-auto flex items-center gap-2">
              <button
                type="button"
                data-testid="scene-player-toggle"
                onClick={() => void togglePlay()}
                className="inline-flex h-11 min-w-11 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
                aria-label={
                  playing
                    ? "Pause"
                    : isContinuous
                      ? "Play full film"
                      : "Play fullscreen"
                }
              >
                {playing ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" fill="currentColor" />
                )}
              </button>
              <button
                type="button"
                data-testid="scene-player-prev-line"
                onClick={prevLine}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/90 hover:bg-white/10"
                aria-label="Previous line"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                data-testid="scene-player-next-line"
                onClick={nextLine}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/90 hover:bg-white/10"
                aria-label="Next line"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <span
                className="ml-1 min-w-0 flex-1 truncate text-xs text-white/80 tabular-nums sm:text-sm"
                data-testid="scene-player-time"
              >
                Line {activeLineIdx + 1}/{scene.lines.length}
                {speaking ? " · speaking…" : ""}
                {buffering ? " · buffering…" : ""}
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
                data-testid="scene-player-fullscreen"
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
            data-testid="scene-player-play-btn"
            onClick={() => void togglePlay()}
          >
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            {playing
              ? "Pause"
              : isContinuous
                ? "Play full film"
                : "Play fullscreen"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            data-testid="scene-player-restart"
            onClick={restart}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          {playMode === "learn" && (
            <Button
              type="button"
              variant={loopLine ? "soft" : "secondary"}
              data-testid="scene-player-loop"
              onClick={() => setLoopLine((v) => !v)}
            >
              Loop line
            </Button>
          )}
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
              data-testid={`scene-player-mode-${key}`}
              onClick={() => switchPlayMode(key)}
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
        <div className="focus-stage pad-mode space-y-3" data-testid="scene-player-active-line">
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
        <ul className="max-h-[28rem] space-y-2 overflow-y-auto pr-1" data-testid="scene-player-dialogue">
          {scene.lines.map((line, i) => (
            <li key={line.id}>
              <button
                type="button"
                data-testid={`scene-player-line-${i}`}
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
