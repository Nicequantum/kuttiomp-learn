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
import {
  prefetchSpeak,
  speakWord,
  stopSpeaking,
  unlockAudioPlayback,
  checkTtsStatus,
  getTtsProvider,
} from "@/lib/audio/speak";
import {
  sceneHasLanguageFilm,
  computeFilmHasLanguageTrack,
  computeFilmAudioShouldPlay,
  computeFilmCarriesLanguage,
} from "@/lib/audio/film-language-clock";
import { syntheticEnvelopeFromText } from "@/lib/audio/mouth-envelope";
import { MouthOverlay } from "@/components/scenes/MouthOverlay";
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


/**
 * Language-film catalog policy lives in film-language-clock.ts
 * (shared with dual-audio acceptance tests).
 */

/**
 * Ensure media can start. Never call video.load() (it resets the element
 * and was blocking play). Prefer immediate muted play for autoplay policy.
 */
async function ensureVideoPlaying(v: HTMLVideoElement): Promise<boolean> {
  try {
    v.playsInline = true;
    // Always start muted so browsers allow play without gesture issues
    v.muted = true;
    if (v.readyState < 2) {
      await Promise.race([
        new Promise<void>((resolve) => {
          const done = () => {
            v.removeEventListener("loadeddata", done);
            v.removeEventListener("canplay", done);
            resolve();
          };
          v.addEventListener("loadeddata", done);
          v.addEventListener("canplay", done);
        }),
        new Promise<void>((resolve) => window.setTimeout(resolve, 2500)),
      ]);
    }
    if (v.ended) {
      try {
        v.currentTime = 0;
      } catch {
        /* ignore */
      }
    }
    await v.play();
    return true;
  } catch {
    try {
      v.muted = true;
      await v.play();
      return true;
    } catch {
      return false;
    }
  }
}

function detectVideoHasAudio(v: HTMLVideoElement): boolean | null {
  try {
    const anyV = v as HTMLVideoElement & {
      audioTracks?: { length: number };
      mozHasAudio?: boolean;
      webkitAudioDecodedByteCount?: number;
    };
    if (anyV.audioTracks && typeof anyV.audioTracks.length === "number") {
      return anyV.audioTracks.length > 0;
    }
    if (typeof anyV.mozHasAudio === "boolean") return anyV.mozHasAudio;
    if (
      typeof anyV.webkitAudioDecodedByteCount === "number" &&
      anyV.webkitAudioDecodedByteCount > 0
    ) {
      return true;
    }
  } catch {
    /* ignore */
  }
  return null;
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
  const oralQueue = useRef<(typeof scene.lines)[number][]>([]);
  const ttsBusy = useRef(false);
  /** Tracks film language authority so ambient-off / probe-silent can re-arm oral. */
  const prevFilmCarriesLanguage = useRef<boolean | null>(null);
  /** User wants continuous film playing — auto-resume if browser stalls */
  const userIntentPlay = useRef(false);
  const stallSince = useRef<number | null>(null);
  const lastProgressAt = useRef(0);
  const lastMediaTime = useRef(0);
  const lastSavedAt = useRef(0);
  const pendingResumeSec = useRef<number | null>(null);
  const appliedResume = useRef(false);
  /** Internal only — never shown as "Loading…" to the learner */
  const preparingRef = useRef(false);

  const [videoSrc, setVideoSrc] = useState(scene.videoSrc);
  const [fromUpload, setFromUpload] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [mediaDuration, setMediaDuration] = useState(scene.durationSec);
  const [voice, setVoice] = useState<VoiceTrack>("narragansett");
  const [subs, setSubs] = useState<SubtitleTrack>("english");
  const singleTake = Boolean(scene.singleTake || scene.tags?.includes("single-take"));
  const [playMode, setPlayMode] = useState<PlayMode>(
    singleTake ? "watch" : defaultPlayMode,
  );
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [activeLineIdx, setActiveLineIdx] = useState(0);
  const [speakingLineId, setSpeakingLineId] = useState<string | null>(null);
  const [loopLine, setLoopLine] = useState(false);
  /**
   * Film soundtrack (embedded AAC). Film V5 master bakes Narragansett language
   * + soft ambient into the picture track — language first.
   * Default ON for continuous film / day-act windows so learners hear the language
   * without a second control. Short drill scenes stay off unless a community
   * upload carries a real track (detected below).
   * Learn mode still uses the separate oral path for line-by-line practice.
   */
  const [ambientOn, setAmbientOn] = useState(
    () =>
      continuousFilm ||
      progressKind === "story" ||
      progressKind === "day-act" ||
      Boolean(scene.tags?.includes("speak")),
  );
  const [mediaHasAudio, setMediaHasAudio] = useState<boolean | null>(null);
  /** native = Fullscreen API; css = fixed overlay (iframe-safe) */
  const [fsMode, setFsMode] = useState<"none" | "native" | "css">("none");
  const isFullscreen = fsMode !== "none";
  const [chromeVisible, setChromeVisible] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [oralOnly, setOralOnly] = useState(false);
  const [practicedLines, setPracticedLines] = useState<Set<string>>(
    () => new Set(),
  );
  const [ttsConfigured, setTtsConfigured] = useState<boolean | null>(null);
  /** Runtime jaw open 0..1 — Learn mode oral pulse (Little Ones hybrid). */
  const [jawOpen, setJawOpen] = useState(0);
  const jawRaf = useRef<number | null>(null);
  const jawStartedAt = useRef(0);

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
  const captionLine =
    scene.lines.find((l) => l.id === speakingLineId) ?? activeLine;
  const practiceDuration = scene.durationSec;
  /**
   * Film V5 master-window: day acts play a slice of the master film.
   * Community uploads are self-contained act clips — ignore mediaWindow then.
   */
  const mediaWindow =
    fromUpload || !scene.mediaWindow ? undefined : scene.mediaWindow;
  const windowStart = mediaWindow?.startSec ?? 0;
  const windowEnd = mediaWindow?.endSec ?? null;
  const hasMediaWindow = windowEnd != null && Number.isFinite(windowEnd);
  /**
   * CRITICAL Learn ≠ Watch:
   * Continuous autoplay is gated ONLY by playMode === "watch".
   * continuousFilm must never force Learn into continuous playback.
   */
  const isContinuous = playMode === "watch";
  const isLearn = playMode === "learn";

  const languageFilm = useMemo(
    () =>
      sceneHasLanguageFilm(scene, {
        continuousFilm,
        progressKind,
        fromUpload,
      }),
    [scene, continuousFilm, progressKind, fromUpload],
  );

  /** Proven or catalog-assumed language track (covers Watch start race). */
  const filmHasLanguageTrack = computeFilmHasLanguageTrack(
    mediaHasAudio,
    languageFilm,
  );

  /**
   * Unmute film only in Watch with ambient on + language track.
   * Learn always mutes — oral is the single language clock.
   */
  const filmAudioShouldPlay = computeFilmAudioShouldPlay({
    isContinuous,
    ambientOn,
    filmHasLanguageTrack,
    oralOnly,
  });

  /**
   * Suppress oral when film already carries language (Watch + ambient).
   * If user mutes film soundtrack, oral may fill the gap.
   */
  const filmCarriesLanguage = computeFilmCarriesLanguage({
    isContinuous,
    ambientOn,
    filmHasLanguageTrack,
  });

  /** Media length available for this scene (window or full file). */
  const effectiveMediaLen = hasMediaWindow
    ? Math.max(0.05, (windowEnd as number) - windowStart)
    : mediaDuration;
  const displayDuration =
    playMode === "learn"
      ? practiceDuration
      : effectiveMediaLen || practiceDuration;

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
    setPlayMode(singleTake ? "watch" : defaultPlayMode);
    setMediaError(null);
    setOralOnly(false);
    setMediaHasAudio(null);
    lastSpokenLine.current = null;
    oralQueue.current = [];
    ttsBusy.current = false;
    setSpeakingLineId(null);
    stallSince.current = null;
    preparingRef.current = false;
    learnToken.current += 1;
    stopSpeaking();
    setVideoSrc(scene.videoSrc);
    const resolver = resolveVideo ?? resolveSceneVideoSrc;
    void resolver(scene).then((r) => {
      setVideoSrc(r.src);
      setFromUpload(r.fromUpload);
    });
    // Warm TTS status + first lines (silent prefetch — no UI)
    void checkTtsStatus().then((s) => setTtsConfigured(s.configured));
    const warm = scene.lines.slice(0, 4);
    void (async () => {
      for (const line of warm) {
        if (line.narragansett) await prefetchSpeak(line.narragansett, "narragansett");
      }
    })();
    return () => {
      if (progressKind === "story") {
        const v = videoRef.current;
        if (v && Number.isFinite(v.currentTime) && v.currentTime >= 1) {
          useProgressStore.getState().setStoryPosition(scene.id, v.currentTime);
        }
      }
      learnToken.current += 1;
      userIntentPlay.current = false;
      stopSpeaking();
    };
  }, [
    scene,
    setLastScene,
    setLastDayAct,
    setStoryPosition,
    progressKind,
    resolveVideo,
    defaultPlayMode,
    singleTake,
  ]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = speed;
    // Single language clock: unmute film only in Watch + ambient + language track.
    // Learn always keeps film muted (oral path). Never ambientOn || isContinuous.
    if (filmAudioShouldPlay) {
      v.muted = false;
      v.volume = 0.85;
    } else {
      v.muted = true;
      v.volume = 1;
    }
  }, [
    speed,
    videoSrc,
    ambientOn,
    mediaHasAudio,
    isContinuous,
    isLearn,
    oralOnly,
    filmAudioShouldPlay,
  ]);

  /**
   * When film loses language authority (ambient muted, or probe proves no track),
   * clear the spoken-line lock and fill the current line once via oral — otherwise
   * Watch goes silent until the next line boundary.
   * When film gains authority, stop oral so film is the only language clock.
   */
  useEffect(() => {
    const prev = prevFilmCarriesLanguage.current;
    prevFilmCarriesLanguage.current = filmCarriesLanguage;
    if (prev === null || prev === filmCarriesLanguage) return;
    if (!isContinuous) return;

    if (filmCarriesLanguage) {
      stopSpeaking();
      setSpeaking(false);
      ttsBusy.current = false;
      if (activeLine) lastSpokenLine.current = activeLine.id;
      return;
    }

    // Film no longer carries language → oral may fill.
    lastSpokenLine.current = null;
    if (
      userIntentPlay.current &&
      voice !== "off" &&
      activeLine &&
      !ttsBusy.current
    ) {
      lastSpokenLine.current = activeLine.id;
      void speakLine(activeLine, voice).catch(() => {});
    }
    // speakLine is stable enough for this transition; intentional omit from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on filmCarriesLanguage edge
  }, [filmCarriesLanguage, isContinuous, voice, activeLine]);

  // Continuous stall recovery — silent; no "Loading…" chrome
  useEffect(() => {
    if (!isContinuous) return;
    const id = window.setInterval(() => {
      const v = videoRef.current;
      if (!v || !userIntentPlay.current) {
        stallSince.current = null;
        return;
      }
      const pastWindow =
        hasMediaWindow &&
        windowEnd != null &&
        v.currentTime >= windowEnd - 0.05;
      if (v.ended || pastWindow) {
        userIntentPlay.current = false;
        setPlaying(false);
        stallSince.current = null;
        if (pastWindow) {
          try {
            v.pause();
          } catch {
            /* ignore */
          }
        }
        return;
      }
      const t = v.currentTime;
      const stalled =
        Math.abs(t - lastMediaTime.current) < 0.05 && !v.paused && !v.ended;
      if (stalled) {
        if (stallSince.current == null) stallSince.current = Date.now();
      } else {
        stallSince.current = null;
      }
      lastMediaTime.current = t;

      if (v.paused && !v.ended) {
        void v
          .play()
          .then(() => {
            setPlaying(true);
          })
          .catch(() => {
            /* do not start a second oral clock — one speaker only */
          });
      }
    }, 800);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isContinuous, voice, activeLine, hasMediaWindow, windowEnd]);

  useEffect(() => {
    function onFs() {
      if (document.fullscreenElement) setFsMode("native");
      else setFsMode((m) => (m === "native" ? "none" : m));
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (document.fullscreenElement) {
          void document.exitFullscreen().catch(() => {});
        }
        document.body.style.overflow = "";
        setFsMode("none");
        return;
      }
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

  function stopJawPulse() {
    if (jawRaf.current != null) {
      cancelAnimationFrame(jawRaf.current);
      jawRaf.current = null;
    }
    setJawOpen(0);
  }

  function startJawPulse(text: string) {
    stopJawPulse();
    jawStartedAt.current = performance.now();
    const tick = () => {
      const t = (performance.now() - jawStartedAt.current) / 1000;
      const open = syntheticEnvelopeFromText(text, t);
      setJawOpen(open);
      // Stop after line window (~4.5s of speech energy)
      if (t < 5.5) {
        jawRaf.current = requestAnimationFrame(tick);
      } else {
        setJawOpen(0);
        jawRaf.current = null;
      }
    };
    jawRaf.current = requestAnimationFrame(tick);
  }

  async function speakLine(
    line: (typeof scene.lines)[0],
    track: VoiceTrack = voice,
  ) {
    if (track === "off" || !line) return;
    // Never cut the Voice Agent off mid-word. Queue the next line.
    if (ttsBusy.current) {
      if (!oralQueue.current.some((l) => l.id === line.id)) {
        oralQueue.current.push(line);
      }
      return;
    }
    ttsBusy.current = true;
    setSpeaking(true);
    setSpeakingLineId(line.id);
    // Force film mute while oral plays — prevents Learn/Hear dual-speak
    const vMute = videoRef.current;
    if (vMute) vMute.muted = true;
    // Little Ones: soft runtime jaw cue locked to oral text clock
    if (scene.series === "Little Ones" || scene.tags?.includes("speak")) {
      startJawPulse(line.narragansett || line.english || "");
    }
    try {
      markLinePracticed(line.id, line.wordId);
      // Language-first: packaged oral clip when present (Narragansett + English baked in)
      const packaged =
        ttsConfigured && getTtsProvider() === "xai-voice-agent"
          ? undefined
          : track === "english"
          ? undefined
          : line.audioSrc ||
            (line.id.startsWith("od")
              ? `/audio/one-day/${line.id}.mp3`
              : line.id.startsWith("dw") ||
                  line.id.startsWith("kg") ||
                  line.id.match(
                    /^(mm|pp|lc|ft|ws|sw|et|nr)\d/,
                  )
                ? `/audio/day/${line.id}.mp3`
                : line.id.match(
                      /^(k|mk|ck|fkids|hk|dk|sk|bk|wk|skids|pk|lk)\d+$/,
                    )
                  ? `/audio/kids/${line.id}.mp3`
                  : undefined);

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
        // Packaged clips already include a short English gloss after Narragansett
        includeEnglish: track === "both" && !packaged,
        primaryAudioUrl: packaged,
        // Never fall back to en-US browser TTS on packaged Narragansett lines
        disallowBrowserFallback: Boolean(packaged),
      });
    } finally {
      setSpeaking(false);
      ttsBusy.current = false;
      stopJawPulse();
      const vRest = videoRef.current;
      if (vRest) {
        if (filmAudioShouldPlay) {
          vRest.muted = false;
          vRest.volume = 0.85;
        } else {
          vRest.muted = true;
        }
      }
      const queued = oralQueue.current.shift();
      if (queued) void speakLine(queued, track);
    }
  }

  function mediaTimeForLine(idx: number): number {
    const v = videoRef.current;
    const fullMd = v?.duration || mediaDuration || 1;
    const md = hasMediaWindow
      ? effectiveMediaLen
      : Number.isFinite(fullMd) && fullMd > 0
        ? fullMd
        : 1;
    if (!Number.isFinite(md) || md <= 0) return windowStart;
    if (scene.lines.length <= 1) return windowStart;
    const line = scene.lines[idx];
    if (line && practiceDuration > 0 && Number.isFinite(line.startSec)) {
      // Map practice line times into window (or full media):
      // windowStart + (line.startSec / practiceDuration) * effectiveMediaLen
      const offset = (line.startSec / practiceDuration) * md;
      const mediaT = windowStart + offset;
      const maxT = hasMediaWindow
        ? (windowEnd as number) - 0.05
        : Math.max(0, fullMd - 0.05);
      return Math.min(Math.max(windowStart, mediaT), Math.max(windowStart, maxT));
    }
    const offset = (idx / scene.lines.length) * Math.max(0.1, md - 0.15);
    return windowStart + offset;
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
    // Day-act master windows: never resume mid-master; always start at windowStart.
    if (hasMediaWindow || progressKind === "day-act") return;
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

  function seekToWindowStart(v: HTMLVideoElement) {
    if (!hasMediaWindow) return;
    try {
      v.currentTime = windowStart;
      lastMediaTime.current = windowStart;
      setTime(0);
    } catch {
      /* ignore */
    }
  }

  /** Start video immediately (muted). Never blocks on long buffer waits. */
  async function startVideoSoft(v: HTMLVideoElement | null) {
    if (!v || oralOnly) return false;
    preparingRef.current = true;
    try {
      const ok = await ensureVideoPlaying(v);
      if (!ok) return false;
      // Learn: always muted. Watch: ambient + language track only.
      if (filmAudioShouldPlay) {
        try {
          v.muted = false;
          v.volume = 0.85;
        } catch {
          /* keep muted */
        }
      } else {
        v.muted = true;
        v.volume = 1;
      }
      return true;
    } catch {
      return false;
    } finally {
      preparingRef.current = false;
    }
  }

  const runLearnSequence = useCallback(
    async (fromIdx: number) => {
      const token = ++learnToken.current;
      const v = videoRef.current;
      setPlaying(true);
      setActiveLineIdx(fromIdx);
      void unlockAudioPlayback();

      // Start picture immediately — do not wait for TTS or long buffer
      void startVideoSoft(v).then((ok) => {
        if (!ok && learnToken.current === token) {
          setOralOnly(true);
          setMediaError("video-unavailable-oral-continues");
        }
      });

      // Prefetch speech in background (non-blocking)
      void (async () => {
        for (const line of scene.lines.slice(fromIdx, fromIdx + 6)) {
          if (line.narragansett)
            await prefetchSpeak(line.narragansett, "narragansett");
        }
      })();

      for (let i = fromIdx; i < scene.lines.length; i++) {
        if (learnToken.current !== token) return;
        const line = scene.lines[i];
        setActiveLineIdx(i);
        setTime(line.startSec);
        seekMediaToLine(i);

        // Keep video rolling after seek — film stays muted in Learn
        if (v && !oralOnly) {
          try {
            v.muted = true;
            if (v.paused && !v.ended) {
              await v.play().catch(() => {});
            }
          } catch {
            /* keep oral */
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
        await new Promise((r) => setTimeout(r, 280 / speed));
      }

      if (learnToken.current !== token) return;
      setPlaying(false);
      markComplete();
      if (v) v.pause();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scene, voice, loopLine, ambientOn, speed, progressKind, oralOnly, mediaHasAudio],
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
    learnToken.current += 1;
    setSpeaking(false);
    setMediaError(null);
    void unlockAudioPlayback();

    // Mark intent only after we actually try to start — avoids "dead" second click cancel
    // during a long wait. Set intent + playing early so UI responds.
    userIntentPlay.current = true;
    setPlaying(true);
    lastProgressAt.current = Date.now();

    void (async () => {
      for (const line of scene.lines.slice(
        Math.max(0, activeLineIdx),
        Math.max(0, activeLineIdx) + 8,
      )) {
        if (line.narragansett)
          await prefetchSpeak(line.narragansett, "narragansett");
      }
    })();

    if (v) applyPendingResume(v);

    if (v && typeof startAt === "number" && Number.isFinite(startAt)) {
      try {
        if (hasMediaWindow) {
          // startAt is media time (absolute) from mediaTimeForLine, or window offset 0
          const abs =
            startAt < windowStart
              ? windowStart + startAt
              : startAt;
          const maxT = (windowEnd as number) - 0.05;
          v.currentTime = Math.max(windowStart, Math.min(abs, maxT));
        } else {
          const md = v.duration || mediaDuration || startAt;
          v.currentTime = Math.max(0, Math.min(startAt, Math.max(0, md - 0.05)));
        }
      } catch {
        /* ignore */
      }
    } else if (v && hasMediaWindow) {
      // Start continuous watch at act window (no story resume)
      try {
        if (v.currentTime < windowStart || v.currentTime >= (windowEnd as number) - 0.05) {
          v.currentTime = windowStart;
        }
      } catch {
        /* ignore */
      }
    }

    // Start video FIRST (gesture still warm), then fullscreen
    const videoOk = await startVideoSoft(v);
    if (!videoOk) {
      setOralOnly(true);
      setMediaError("video-unavailable-oral-continues");
      if (voice !== "off") {
        const token = learnToken.current;
        for (let i = activeLineIdx; i < scene.lines.length; i++) {
          if (learnToken.current !== token || !userIntentPlay.current) break;
          setActiveLineIdx(i);
          lastSpokenLine.current = scene.lines[i].id;
          await speakLine(scene.lines[i], voice);
        }
        if (learnToken.current === token) {
          userIntentPlay.current = false;
          setPlaying(false);
          markComplete();
        }
      }
      return;
    }

    setOralOnly(false);
    void enterFullscreen();
    bumpChrome();

    // Continuous watch: film language track → no oral overlay (no dual clock).
    // Uses catalog languageFilm so we do not race mediaHasAudio === null.
    if (filmCarriesLanguage) {
      if (activeLine) lastSpokenLine.current = activeLine.id;
      return;
    }
    if (
      voice !== "off" &&
      activeLine &&
      lastSpokenLine.current !== activeLine.id
    ) {
      lastSpokenLine.current = activeLine.id;
      void speakLine(activeLine, voice);
    } else if (activeLine) {
      lastSpokenLine.current = activeLine.id;
    }
  }

  async function togglePlay() {
    void unlockAudioPlayback();
    if (playing || userIntentPlay.current) {
      userIntentPlay.current = false;
      learnToken.current += 1;
      stopSpeaking();
      setSpeaking(false);
      ttsBusy.current = false;
      oralQueue.current = [];
      setSpeakingLineId(null);
      setPlaying(false);
      videoRef.current?.pause();
      saveStoryPosition();
      return;
    }
    if (isContinuous) {
      const v = videoRef.current;
      let start: number | undefined;
      if (v) {
        const atEnd = hasMediaWindow
          ? v.currentTime >= (windowEnd as number) - 0.25
          : v.ended ||
            (v.duration > 0 && v.currentTime >= v.duration - 0.25);
        if (atEnd) {
          start = hasMediaWindow ? windowStart : 0;
          pendingResumeSec.current = null;
          appliedResume.current = true;
        } else if (
          !hasMediaWindow &&
          !appliedResume.current &&
          pendingResumeSec.current != null &&
          pendingResumeSec.current >= 5 &&
          v.currentTime < 1
        ) {
          start = pendingResumeSec.current;
        } else if (hasMediaWindow && v.currentTime < windowStart) {
          start = windowStart;
        }
      }
      await playContinuousFrom(start);
      return;
    }
    // Learn: start sequence immediately; fullscreen after
    void runLearnSequence(activeLineIdx);
    void enterFullscreen();
    bumpChrome();
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
    const clamped = Math.min(1, Math.max(0, pct));

    if (hasMediaWindow) {
      const winLen = effectiveMediaLen;
      if (!Number.isFinite(winLen) || winLen <= 0) return;
      const mediaT = windowStart + clamped * winLen;
      if (!isContinuous) {
        const practiceT =
          practiceDuration > 0 ? clamped * practiceDuration : clamped * winLen;
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
        v.currentTime = Math.min(mediaT, (windowEnd as number) - 0.05);
      } catch {
        return;
      }
      // Watch display time is offset within window
      const displayT = clamped * winLen;
      setTime(Number.isFinite(displayT) ? displayT : 0);
      const practiceT =
        practiceDuration > 0 ? (displayT / winLen) * practiceDuration : displayT;
      let idx = scene.lines.findIndex(
        (l) => practiceT >= l.startSec && practiceT < l.endSec,
      );
      if (idx < 0 && scene.lines.length) idx = scene.lines.length - 1;
      if (idx >= 0) setActiveLineIdx(idx);
      if (userIntentPlay.current) {
        void v.play().catch(() => {});
      }
      return;
    }

    const md =
      Number.isFinite(v.duration) && v.duration > 0
        ? v.duration
        : Number.isFinite(mediaDuration) && mediaDuration > 0
          ? mediaDuration
          : 0;
    if (!Number.isFinite(md) || md <= 0) return;
    const mediaT = clamped * md;
    if (!isContinuous) {
      const practiceT =
        practiceDuration > 0 ? clamped * practiceDuration : mediaT;
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
    oralQueue.current = [];
    ttsBusy.current = false;
    pendingResumeSec.current = null;
    appliedResume.current = true;
    setOralOnly(false);
    if (videoRef.current) {
      videoRef.current.currentTime = hasMediaWindow ? windowStart : 0;
    }
    if (progressKind === "story") {
      setStoryPosition(scene.id, 0);
    }
    if (isContinuous) {
      void playContinuousFrom(hasMediaWindow ? windowStart : 0);
      return;
    }
    void enterFullscreen().then(() => {
      void runLearnSequence(0);
    });
  }

  async function hearLineManual(lang: "n" | "e" | "both") {
    await unlockAudioPlayback();
    if (playing && !isContinuous) stopLearn();
    const v = videoRef.current;
    if (v) v.muted = true;
    const track: VoiceTrack =
      lang === "n" ? "narragansett" : lang === "e" ? "english" : "both";
    ttsBusy.current = false;
    stopSpeaking();
    if (singleTake) {
      for (const line of scene.lines) {
        await speakLine(line, track);
      }
      return;
    }
    if (!activeLine) return;
    await speakLine(activeLine, track);
  }

  function toggleFullscreenBtn() {
    if (document.fullscreenElement || fsMode !== "none") void exitFullscreen();
    else void enterFullscreen();
  }

  function switchPlayMode(key: PlayMode) {
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
    lastProgressAt.current = Date.now();
    lastMediaTime.current = t;

    // Film V5: clamp continuous play to mediaWindow
    if (hasMediaWindow && windowEnd != null) {
      if (t >= windowEnd - 0.05) {
        try {
          v.currentTime = windowEnd - 0.05;
          v.pause();
        } catch {
          /* ignore */
        }
        userIntentPlay.current = false;
        setPlaying(false);
        setTime(effectiveMediaLen);
        markComplete();
        return;
      }
      if (t < windowStart) {
        try {
          v.currentTime = windowStart;
        } catch {
          /* ignore */
        }
      }
    }

    const winLen = hasMediaWindow
      ? effectiveMediaLen
      : v.duration || mediaDuration || 1;
    const offsetInWindow = hasMediaWindow
      ? Math.max(0, t - windowStart)
      : t;
    const md = hasMediaWindow
      ? winLen
      : v.duration || mediaDuration || 1;

    // Watch: display continuous time within window (or full file)
    // Learn mapping for line hit-testing still uses practice scale
    const displayT = hasMediaWindow
      ? Math.min(offsetInWindow, winLen)
      : t;
    const practiceT =
      practiceDuration > 0 && md > 0 && Number.isFinite(md)
        ? hasMediaWindow
          ? Math.min(
              practiceDuration,
              Math.max(
                0,
                (offsetInWindow / Math.max(0.01, winLen)) * practiceDuration,
              ),
            )
          : (t / Math.max(0.01, md)) * practiceDuration
        : displayT;

    setTime(
      Number.isFinite(isContinuous ? displayT : practiceT)
        ? isContinuous
          ? displayT
          : practiceT
        : 0,
    );
    if (!hasMediaWindow) {
      const full = v.duration || mediaDuration;
      if (full && Number.isFinite(full)) setMediaDuration(full);
    } else {
      // Keep mediaDuration as window length for watch UI helpers
      setMediaDuration(winLen);
    }

    if (
      progressKind === "story" &&
      !hasMediaWindow &&
      userIntentPlay.current &&
      Date.now() - lastSavedAt.current > 4000
    ) {
      saveStoryPosition(t);
    }

    let idx = scene.lines.findIndex(
      (l) => practiceT >= l.startSec && practiceT < l.endSec,
    );
    // Stay put in the tiny gaps — never snap to the last line
    // (that replayed "I thank you" between words).
    if (idx < 0) idx = activeLineIdx;
    if (idx >= 0 && idx !== activeLineIdx) {
      setActiveLineIdx(idx);
      const line = scene.lines[idx];
      // Path packs are picture-only: oral/agent is the language clock in
      // Watch and Learn so the programmed voice is never swapped for a
      // leftover scaffold AAC. Stories/uploads may still carry language.
      if (
        userIntentPlay.current &&
        voice !== "off" &&
        line &&
        lastSpokenLine.current !== line.id &&
        !filmCarriesLanguage
      ) {
        lastSpokenLine.current = line.id;
        void speakLine(line, voice);
        // Prefetch next few
        const next = scene.lines.slice(idx + 1, idx + 4);
        void (async () => {
          for (const l of next) {
            if (l.narragansett)
              await prefetchSpeak(l.narragansett, "narragansett");
          }
        })();
      } else if (line) {
        lastSpokenLine.current = line.id;
      }
    }
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
    hasMediaWindow,
    windowStart,
    windowEnd,
    effectiveMediaLen,
    ambientOn,
    mediaHasAudio,
    filmCarriesLanguage,
  ]);

  function onEnded() {
    if (!isContinuous) return;
    // With mediaWindow, completion is handled in onTime at windowEnd
    if (hasMediaWindow) {
      userIntentPlay.current = false;
      setPlaying(false);
      setTime(effectiveMediaLen);
      markComplete();
      return;
    }
    userIntentPlay.current = false;
    setPlaying(false);
    markComplete();
    if (progressKind === "story") {
      setStoryPosition(scene.id, 0);
    }
  }

  const resumeHint =
    progressKind === "story" &&
    pendingResumeSec.current != null &&
    pendingResumeSec.current >= 5 &&
    !appliedResume.current
      ? pendingResumeSec.current
      : null;

  const filmLabel = useMemo(() => {
    const d = hasMediaWindow
      ? effectiveMediaLen
      : mediaDuration || scene.durationSec;
    if (!Number.isFinite(d) || d <= 0) return "—";
    if (d >= 60) return `${Math.round(d / 60)} min`;
    return `${Math.round(d)}s`;
  }, [mediaDuration, scene.durationSec, hasMediaWindow, effectiveMediaLen]);

  const safeProgress = useMemo(() => {
    const d = displayDuration;
    if (!Number.isFinite(d) || d <= 0) return 0;
    const t =
      playMode === "learn" ? (activeLine?.startSec ?? 0) : time;
    return Math.min(100, Math.max(0, (t / d) * 100));
  }, [displayDuration, playMode, activeLine, time]);

  useEffect(() => {
    return () => {
      if (jawRaf.current != null) cancelAnimationFrame(jawRaf.current);
    };
  }, []);

  const subtitleNode = useMemo(() => {
    if (subs === "off" || !captionLine) return null;
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-16 z-10 flex justify-center px-3 sm:bottom-20">
        <div
          className={cn(
            "max-w-[94%] text-center shadow-2xl",
            largeTargets
              ? "rounded-xl bg-black/90 px-4 py-3 ring-2 ring-[var(--color-primary)]"
              : "rounded-lg bg-black/80 px-3 py-2 backdrop-blur-sm",
          )}
        >
          {(subs === "narragansett" || subs === "both") && (
            <p
              className={cn(
                "font-display font-bold tracking-tight text-[#fff8ee]",
                largeTargets || isFullscreen ? "text-3xl leading-snug sm:text-4xl" : "text-xl",
              )}
            >
              {captionLine.narragansett}
            </p>
          )}
          {(subs === "english" || subs === "both") && (
            <p
              className={cn(
                "font-semibold text-[#f0e2c4]",
                largeTargets || isFullscreen ? "text-xl leading-snug sm:text-2xl" : "text-base",
                subs === "both" && "mt-1",
              )}
            >
              {captionLine.english}
            </p>
          )}
        </div>
      </div>
    );
  }, [subs, captionLine, largeTargets, isFullscreen]);

  return (
    <div
      className="space-y-4"
      data-testid="scene-player"
      data-play-mode={playMode}
      data-continuous={isContinuous ? "true" : "false"}
      data-progress-kind={progressKind}
      data-media-has-audio={
        mediaHasAudio === null ? "unknown" : mediaHasAudio ? "true" : "false"
      }
      data-oral-only={oralOnly ? "true" : "false"}
      data-ambient={ambientOn ? "true" : "false"}
      data-film-audio-should-play={filmAudioShouldPlay ? "true" : "false"}
      data-film-carries-language={filmCarriesLanguage ? "true" : "false"}
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
        . Language is first — the same voice speaks in Learn and Watch
        (your Voice Agent when connected). Path films are the picture;
        they do not play a second computer voice.
        {" "}
        {isContinuous ? (
          <>
            <strong className="text-[var(--color-fg)]">Play full film</strong> runs
            continuous end-to-end · fullscreen · ~{filmLabel}
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

      {ttsConfigured === false && (
        <p className="rounded-mode border border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-warn)_10%,transparent)] px-3 py-2 text-sm text-[var(--color-muted)]">
          Server voice is not configured here — using your device speech as a
          temporary scaffold. Set <code className="text-[var(--color-fg)]">XAI_API_KEY</code>{" "}
          for full Grok pronunciation. Living speaker recordings always take priority when present.
        </p>
      )}

      {resumeHint != null && (
        <p
          className="rounded-mode border border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-primary)_10%,transparent)] px-3 py-2 text-sm text-[var(--color-muted)]"
          data-testid="scene-player-resume-hint"
        >
          Resume from <strong className="text-[var(--color-fg)]">{fmt(resumeHint)}</strong>
          {" · "}press Play to continue where you left off.
        </p>
      )}

      {mediaError && mediaError !== "video-unavailable-oral-continues" && (
        <p
          className="flex items-start gap-2 rounded-mode border border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-warn)_14%,transparent)] px-3 py-2 text-sm text-[var(--color-muted)]"
          data-testid="scene-player-error"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-warn)]" />
          <span>
            Film could not load. Language audio continues when you press Play or
            Hear.{" "}
            <span className="text-[var(--color-subtle)]">({mediaError})</span>
          </span>
        </p>
      )}

      {oralOnly && (
        <p className="rounded-mode border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-muted)]">
          Picture is unavailable — continuing with spoken language only so practice is not interrupted.
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
            oralOnly && "opacity-40",
          )}
          src={videoSrc}
          poster={scene.posterSrc}
          playsInline
          muted={!filmAudioShouldPlay}
          loop={false}
          preload="auto"
          onTimeUpdate={onTime}
          onWaiting={() => {
            /* intentional: no learner-facing loading chrome */
          }}
          onLoadedMetadata={(e) => {
            const el = e.currentTarget;
            const d = el.duration;
            if (hasMediaWindow) {
              // Watch duration is the window length, not the full master
              setMediaDuration(effectiveMediaLen);
              // Day-act / windowed: always land at window start (no master resume)
              seekToWindowStart(el);
              appliedResume.current = true;
            } else if (d && Number.isFinite(d)) {
              setMediaDuration(d);
              applyPendingResume(el);
            }
            const has = detectVideoHasAudio(el);
            if (has === true) setMediaHasAudio(true);
            else if (has === false) setMediaHasAudio(false);
            // Language films: ambient on for Watch; Learn still mutes film.
            if (
              (has === true || languageFilm) &&
              (fromUpload ||
                continuousFilm ||
                progressKind === "story" ||
                progressKind === "day-act" ||
                scene.series === "Little Ones" ||
                scene.series === "Young Path" ||
                scene.series === "Adult Path" ||
                scene.series === "Elder Path" ||
                scene.tags?.includes("speak"))
            ) {
              setAmbientOn(true);
            }
          }}
          onPlaying={(e) => {
            // Re-probe after decode — Safari often reports audio only after play
            const el = e.currentTarget;
            const has = detectVideoHasAudio(el);
            if (has === true) setMediaHasAudio(true);
            if (userIntentPlay.current) setPlaying(true);
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
            userIntentPlay.current = false;
            // Do not stop oral practice — learner can still Hear lines
            setOralOnly(true);
          }}
        />

        <MouthOverlay
          jawOpen={jawOpen}
          speakingLabel={
            speaking && activeLine
              ? `Speaking ${activeLine.narragansett}`
              : undefined
          }
        />

        {subtitleNode}

        {/* No "Loading film…" overlay — buffer silently before/while speaking */}

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
                aria-label={playing ? "Pause" : "Play film"}
              >
                {playing ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" fill="currentColor" />
                )}
              </button>
              {!singleTake && (
                <>
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
                </>
              )}
              <span
                className="ml-1 min-w-0 flex-1 truncate text-xs text-white/80 tabular-nums sm:text-sm"
                data-testid="scene-player-time"
              >
                {singleTake ? null : (
                  <>
                    Line {activeLineIdx + 1}/{scene.lines.length}
                    {speaking ? " · speaking" : ""}
                    {" · "}
                  </>
                )}
                {fmt(playMode === "learn" && !singleTake ? activeLine?.startSec ?? 0 : time)} /{" "}
                {fmt(displayDuration)}
              </span>
              {mediaHasAudio !== false && (
                <button
                  type="button"
                  data-testid="scene-player-ambient"
                  onClick={() => setAmbientOn((a) => !a)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/90 hover:bg-white/10"
                  aria-label={
                    ambientOn
                      ? "Mute film soundtrack"
                      : "Unmute film soundtrack"
                  }
                  title={
                    ambientOn
                      ? "Film soundtrack on (Narragansett language + ambient). Tap to mute."
                      : "Film soundtrack muted. Tap to hear language on the film."
                  }
                >
                  {ambientOn ? (
                    <Volume2 className="h-4 w-4" />
                  ) : (
                    <VolumeX className="h-4 w-4 opacity-60" />
                  )}
                </button>
              )}
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
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size={largeTargets ? "lg" : "default"}
              onClick={() => void togglePlay()}
              data-testid="scene-player-mode-play"
            >
              {playing ? (
                <>
                  <Pause className="h-4 w-4" /> Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />{" "}
                  {isContinuous || singleTake ? "Play film" : "Play Learn"}
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size={largeTargets ? "lg" : "default"}
              onClick={restart}
            >
              <RotateCcw className="h-4 w-4" /> Restart
            </Button>
            {prev && (
              <Button asChild variant="ghost" size={largeTargets ? "lg" : "default"}>
                <Link to={prev.to} params={prev.params}>
                  <SkipBack className="h-4 w-4" /> {prev.label}
                </Link>
              </Button>
            )}
            {next && (
              <Button asChild variant="ghost" size={largeTargets ? "lg" : "default"}>
                <Link to={next.to} params={next.params}>
                  {next.label} <SkipForward className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>

          {!singleTake && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-muted)]">
              <Film className="h-4 w-4" /> Mode
            </span>
            {(
              [
                { key: "learn" as const, label: "Learn" },
                { key: "watch" as const, label: "Watch" },
              ] as const
            ).map((m) => (
              <button
                key={m.key}
                type="button"
                data-testid={`scene-player-mode-${m.key}`}
                onClick={() => switchPlayMode(m.key)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  playMode === m.key
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
                    : "border-[var(--color-border)] text-[var(--color-muted)]",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-muted)]">
              <Ear className="h-4 w-4" />
              Hear (starts as Narragansett)
            </span>
            {VOICE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setVoice(opt.key)}
                title={opt.hint}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  voice === opt.key
                    ? "border-[var(--color-primary)] bg-[color-mix(in_oklab,var(--color-primary)_18%,transparent)] text-[var(--color-fg)]"
                    : "border-[var(--color-border)] text-[var(--color-muted)]",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-muted)]">
              <Captions className="h-4 w-4" />
              Subtitles
            </span>
            {SUB_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setSubs(opt.key)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  subs === opt.key
                    ? "border-[var(--color-primary)] bg-[color-mix(in_oklab,var(--color-primary)_18%,transparent)] text-[var(--color-fg)]"
                    : "border-[var(--color-border)] text-[var(--color-muted)]",
                )}
              >
                {opt.label === "Off" ? (
                  <span className="inline-flex items-center gap-1">
                    <CaptionsOff className="h-3.5 w-3.5" /> Off
                  </span>
                ) : (
                  opt.label
                )}
              </button>
            ))}
          </div>

          {!singleTake && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-muted)]">
              <Gauge className="h-4 w-4" /> Speed
            </span>
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium tabular-nums transition-colors",
                  speed === s
                    ? "border-[var(--color-primary)] bg-[color-mix(in_oklab,var(--color-primary)_18%,transparent)] text-[var(--color-fg)]"
                    : "border-[var(--color-border)] text-[var(--color-muted)]",
                )}
              >
                {s}×
              </button>
            ))}
            <span className="ml-2 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-muted)]">
              <Languages className="h-4 w-4" /> Loop line
            </span>
            <button
              type="button"
              onClick={() => setLoopLine((x) => !x)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                loopLine
                  ? "border-[var(--color-primary)] bg-[color-mix(in_oklab,var(--color-primary)_18%,transparent)] text-[var(--color-fg)]"
                  : "border-[var(--color-border)] text-[var(--color-muted)]",
              )}
            >
              {loopLine ? "On" : "Off"}
            </button>
          </div>
          )}

          {singleTake ? (
            <div className="rounded-mode border border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface)_88%,transparent)] p-3">
              <p className="text-sm font-medium text-[var(--color-fg)]">The greeting</p>
              <p
                className={cn(
                  "mt-2 font-display font-bold leading-snug text-[var(--color-fg)]",
                  largeTargets ? "text-[length:calc(var(--mode-font-title))]" : "text-content",
                )}
              >
                {scene.lines.map((l) => l.narragansett).join("  ·  ")}
              </p>
              <p className="mt-2 font-semibold text-[var(--color-muted)]">
                {scene.lines.map((l) => l.english).join(" ")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size={largeTargets ? "lg" : "default"}
                  onClick={() => void hearLineManual("n")}
                >
                  <Ear className="h-4 w-4" />
                  Hear the greeting
                </Button>
              </div>
            </div>
          ) : (
            <>
          <div className="rounded-mode border border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface)_88%,transparent)] p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-[var(--color-fg)]">
                Current line
              </p>
              {practicedLines.has(activeLine?.id ?? "") && (
                <span className="inline-flex items-center gap-1 text-sm text-[var(--color-land)]">
                  <CheckCircle2 className="h-4 w-4" />
                  Heard
                </span>
              )}
            </div>
            {activeLine && (
              <>
                <p
                  className={cn(
                    "font-display font-bold leading-snug text-[var(--color-fg)]",
                    largeTargets ? "text-[length:calc(var(--mode-font-title))]" : "text-content",
                  )}
                >
                  {activeLine.narragansett}
                </p>
                <p
                  className={cn(
                    "font-semibold text-[var(--color-muted)]",
                    largeTargets ? "mt-2 text-content" : "text-content",
                  )}
                >
                  {activeLine.english}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size={largeTargets ? "lg" : "default"}
                    onClick={() => void hearLineManual("n")}
                  >
                    <Ear className="h-4 w-4" />
                    Hear Narragansett
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size={largeTargets ? "lg" : "default"}
                    onClick={() => void hearLineManual("e")}
                  >
                    Hear English
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size={largeTargets ? "lg" : "default"}
                    onClick={() => void hearLineManual("both")}
                  >
                    Hear both
                  </Button>
                </div>
              </>
            )}
          </div>

          <div className="space-y-2">
            <p className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-fg)]">
              <BookOpen className="h-4 w-4" />
              Lines
            </p>
            <ul className="max-h-64 space-y-1 overflow-y-auto rounded-mode border border-[var(--color-border)] p-2">
              {scene.lines.map((line, i) => (
                <li key={line.id}>
                  <button
                    type="button"
                    onClick={() => seekLine(i)}
                    className={cn(
                      "flex w-full flex-col items-start rounded-md px-2 py-2 text-left transition-colors",
                      i === activeLineIdx
                        ? "bg-[color-mix(in_oklab,var(--color-primary)_14%,transparent)]"
                        : "hover:bg-[color-mix(in_oklab,var(--color-fg)_5%,transparent)]",
                    )}
                  >
                    <span className="text-sm font-medium text-[var(--color-fg)]">
                      {line.speaker}: {line.narragansett}
                    </span>
                    <p className="text-sm text-[var(--color-muted)]">{line.english}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {practicedLines.size > 0 && !singleTake && (
            <div className="flex flex-wrap gap-2">
              <Badge tone="neutral">
                {practicedLines.size}/{scene.lines.length} lines heard
              </Badge>
            </div>
          )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
