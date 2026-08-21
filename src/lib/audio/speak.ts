/**
 * Oral playback — one voice at a time.
 * Contract order: living recording → machine TTS → browser speech.
 */

let currentAudio: HTMLAudioElement | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;
let grokAvailable: boolean | null = null;
let ttsProvider: string | null = null;
let lastTtsError: string | null = null;
let audioUnlocked = false;
/** Bumped on every stop / new speak so stale play() cannot overlap. */
let speakGen = 0;

const audioCache = new Map<string, string>();

export function stopSpeaking() {
  speakGen += 1;
  if (typeof window === "undefined") return;
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.onended = null;
      currentAudio.onerror = null;
      currentAudio.src = "";
    } catch {
      /* ignore */
    }
    currentAudio = null;
  }
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
  currentUtterance = null;
}

export function getLastTtsError() {
  return lastTtsError;
}

export function isGrokTtsAvailable() {
  return grokAvailable === true;
}

export function isCloudVoiceLive() {
  return grokAvailable === true;
}

export function getTtsProvider() {
  return ttsProvider;
}

export async function unlockAudioPlayback(): Promise<void> {
  if (typeof window === "undefined" || audioUnlocked) return;
  try {
    const silent =
      "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
    const a = new Audio(silent);
    a.volume = 0.01;
    await Promise.race([
      a.play().catch(() => {}),
      new Promise((r) => setTimeout(r, 400)),
    ]);
    try {
      a.pause();
      a.src = "";
    } catch {
      /* ignore */
    }
  } catch {
    /* ignore */
  }
  try {
    window.speechSynthesis?.resume();
  } catch {
    /* ignore */
  }
  audioUnlocked = true;
}

export async function checkTtsStatus(): Promise<{
  configured: boolean;
  provider: string;
  voice: string | null;
  agentId?: string | null;
  warning?: string | null;
}> {
  try {
    const res = await fetch("/api/tts", { method: "GET" });
    if (!res.ok) {
      grokAvailable = false;
      ttsProvider = "browser-fallback";
      return { configured: false, provider: "browser-fallback", voice: null };
    }
    const data = (await res.json()) as {
      configured: boolean;
      provider: string;
      voice: string | null;
      agentId?: string | null;
    };
    grokAvailable = data.configured;
    ttsProvider = data.provider;
    return data;
  } catch {
    grokAvailable = false;
    ttsProvider = "browser-fallback";
    return { configured: false, provider: "browser-fallback", voice: null };
  }
}

function browserSpeak(text: string, opts?: { rate?: number }): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve();
      return;
    }
    const trimmed = text?.trim();
    if (!trimmed) {
      resolve();
      return;
    }

    const gen = speakGen;
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
    } catch {
      /* ignore */
    }

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      currentUtterance = null;
      window.clearTimeout(timer);
      resolve();
    };

    const u = new SpeechSynthesisUtterance(trimmed);
    u.rate = opts?.rate ?? 0.8;
    u.lang = "en-US";
    u.volume = 1;
    u.onend = finish;
    u.onerror = finish;
    currentUtterance = u;
    const timer = window.setTimeout(finish, 12000);
    try {
      window.speechSynthesis.speak(u);
    } catch {
      finish();
    }
    window.setTimeout(() => {
      if (gen !== speakGen) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          /* ignore */
        }
        finish();
        return;
      }
      try {
        if (!done && window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch {
        /* ignore */
      }
    }, 60);
  });
}

function playUrl(url: string, onStart?: () => void): Promise<boolean> {
  return new Promise((resolve) => {
    const gen = speakGen;
    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.onended = null;
        currentAudio.onerror = null;
        currentAudio.src = "";
      } catch {
        /* ignore */
      }
      currentAudio = null;
    }
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* ignore */
    }
    currentUtterance = null;

    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      if (currentAudio) {
        try {
          currentAudio.onended = null;
          currentAudio.onerror = null;
        } catch {
          /* ignore */
        }
      }
      resolve(ok);
    };

    const audio = new Audio(url);
    audio.volume = 1;
    currentAudio = audio;
    audio.onended = () => {
      if (currentAudio === audio) currentAudio = null;
      finish(true);
    };
    audio.onerror = () => {
      if (currentAudio === audio) currentAudio = null;
      finish(false);
    };
    const timer = window.setTimeout(() => {
      try {
        audio.pause();
        audio.src = "";
      } catch {
        /* ignore */
      }
      if (currentAudio === audio) currentAudio = null;
      finish(false);
    }, 20000);
    if (gen !== speakGen) {
      try {
        audio.pause();
        audio.src = "";
      } catch {
        /* ignore */
      }
      finish(false);
      return;
    }
    void audio
      .play()
      .then(() => {
        if (gen !== speakGen) {
          try {
            audio.pause();
            audio.src = "";
          } catch {
            /* ignore */
          }
          finish(false);
          return;
        }
        onStart?.();
      })
      .catch(() => finish(false));
  });
}

async function fetchTtsBlobUrl(
  text: string,
  kind: "narragansett" | "english",
): Promise<string | null> {
  const cacheKey = `${kind}:${text}`;
  const hit = audioCache.get(cacheKey);
  if (hit) return hit;
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, kind }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      lastTtsError =
        (err as { message?: string }).message || `TTS HTTP ${res.status}`;
      return null;
    }
    const blob = await res.blob();
    if (!blob.size) {
      lastTtsError = "Empty audio";
      return null;
    }
    const url = URL.createObjectURL(blob);
    audioCache.set(cacheKey, url);
    lastTtsError = null;
    return url;
  } catch (e) {
    lastTtsError = e instanceof Error ? e.message : "network error";
    return null;
  }
}

async function grokSpeak(
  text: string,
  kind: "narragansett" | "english",
  onStart?: () => void,
): Promise<boolean> {
  const url = await fetchTtsBlobUrl(text, kind);
  if (!url) return false;
  return playUrl(url, onStart);
}

export async function prefetchSpeak(
  text: string,
  kind: "narragansett" | "english" = "narragansett",
  opts?: { force?: boolean },
): Promise<boolean> {
  if (!text?.trim()) return false;
  try {
    if (grokAvailable === null) await checkTtsStatus();
    if (!grokAvailable) return false;
    if (ttsProvider === "xai-voice-agent" && !opts?.force) return false;
    const url = await fetchTtsBlobUrl(text.trim(), kind);
    return Boolean(url);
  } catch {
    return false;
  }
}

export async function speakWord(opts: {
  narragansett: string;
  english?: string;
  includeEnglish?: boolean;
  primaryAudioUrl?: string;
  disallowBrowserFallback?: boolean;
  /** Fires when the chosen voice actually starts playing. */
  onStart?: () => void;
}): Promise<"recording" | "grok" | "browser" | "none"> {
  try {
    await unlockAudioPlayback();
  } catch {
    /* ignore */
  }

  stopSpeaking();
  const myGen = speakGen;

  if (grokAvailable === null) {
    await checkTtsStatus();
  }
  if (myGen !== speakGen) return "none";

  // Public Lexicon Contract audio order:
  // 1. living speaker recording (primaryAudioUrl)
  // 2. machine TTS / Voice Agent (never labeled as a speaker)
  // 3. browser speech (last resort)
  // ScenePlayer already omits packaged film audio when the Voice Agent is
  // configured, so films stay one-speaker.
  if (opts.primaryAudioUrl) {
    const ok = await playUrl(opts.primaryAudioUrl, opts.onStart);
    if (myGen !== speakGen) return "none";
    if (ok) {
      if (opts.includeEnglish && opts.english) {
        if (grokAvailable) {
          await grokSpeak(opts.english, "english");
        } else {
          await browserSpeak(opts.english, { rate: 0.9 });
        }
      }
      return "recording";
    }
  }

  // Machine TTS only after a living recording is absent or failed.
  // Do not also start browser speech on success — that stacked voices.
  if (grokAvailable) {
    const ok = await grokSpeak(opts.narragansett, "narragansett", opts.onStart);
    if (myGen !== speakGen) return "none";
    if (ok) {
      if (opts.includeEnglish && opts.english) {
        if (myGen !== speakGen) return "grok";
        await grokSpeak(opts.english, "english");
      }
      return "grok";
    }
    return "none";
  }

  if (!opts.narragansett?.trim() && !opts.english?.trim()) return "none";

  if (opts.disallowBrowserFallback) {
    if (opts.includeEnglish && opts.english) {
      await browserSpeak(opts.english, { rate: 0.9 });
    }
    return "none";
  }

  await browserSpeak(opts.narragansett || opts.english || "", { rate: 0.7 });
  if (opts.includeEnglish && opts.english) {
    await browserSpeak(opts.english, { rate: 0.9 });
  }
  return "browser";
}
