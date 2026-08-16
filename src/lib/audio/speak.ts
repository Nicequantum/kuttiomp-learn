/**
 * Oral playback — living recording → Grok Agent/TTS → browser.
 *
 * Protocol 7 (oral primacy): language audio must work even when video
 * has no track or fails to load. Unlock audio on the first user gesture.
 */

let currentAudio: HTMLAudioElement | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;
let grokAvailable: boolean | null = null;
let ttsProvider: string | null = null;
let lastTtsError: string | null = null;
let audioUnlocked = false;

const audioCache = new Map<string, string>();

export function stopSpeaking() {
  if (typeof window === "undefined") return;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }
  window.speechSynthesis?.cancel();
  currentUtterance = null;
}

export function getLastTtsError() {
  return lastTtsError;
}

export function isGrokTtsAvailable() {
  return grokAvailable === true;
}

/** True when the programmed Voice Agent (or Grok TTS) is live. */
export function isCloudVoiceLive() {
  return grokAvailable === true;
}

export function getTtsProvider() {
  return ttsProvider;
}

/**
 * Call from the first user gesture (Play / Hear) so later TTS and
 * HTMLAudioElement playback are not blocked by autoplay policy.
 * Never throws; never hangs.
 */
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

    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.src = "";
      } catch {
        /* ignore */
      }
      currentAudio = null;
    }
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
    // Hard cap — speechSynthesis sometimes never fires onend
    const timer = window.setTimeout(finish, 12000);
    try {
      window.speechSynthesis.speak(u);
    } catch {
      finish();
    }
    window.setTimeout(() => {
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

function playUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (currentAudio) {
      try {
        currentAudio.pause();
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
      currentAudio = null;
      finish(true);
    };
    audio.onerror = () => {
      currentAudio = null;
      finish(false);
    };
    const timer = window.setTimeout(() => finish(false), 15000);
    void audio.play().catch(() => finish(false));
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
): Promise<boolean> {
  const url = await fetchTtsBlobUrl(text, kind);
  if (!url) return false;
  return playUrl(url);
}

/** Warm cache without playing — never blocks UI. */
export async function prefetchSpeak(
  text: string,
  kind: "narragansett" | "english" = "narragansett",
): Promise<boolean> {
  if (!text?.trim()) return false;
  try {
    if (grokAvailable === null) await checkTtsStatus();
    if (!grokAvailable) return false;
    // Don't stampede a Voice Agent with four warm-up sockets on page load.
    if (ttsProvider === "xai-voice-agent") return false;
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
  /** Living speaker recording from public API */
  primaryAudioUrl?: string;
  /**
   * When true, never use en-US speechSynthesis for the primary language line.
   * Path packs set this when packaged oral exists so a failed load does not
   * fall through to English browser TTS on Narragansett forms.
   */
  disallowBrowserFallback?: boolean;
}): Promise<"recording" | "grok" | "browser" | "none"> {
  try {
    await unlockAudioPlayback();
  } catch {
    /* ignore */
  }

  if (grokAvailable === null) {
    await checkTtsStatus();
  }

  // Cloud voice first (Voice Agent, then Grok TTS). If that fails,
  // packaged oral and browser still speak — never go silent.
  if (grokAvailable) {
    const ok = await grokSpeak(opts.narragansett, "narragansett");
    if (ok) {
      if (opts.includeEnglish && opts.english) {
        await grokSpeak(opts.english, "english");
      }
      return "grok";
    }
  }

  // 2) Packaged oral (scaffold or agent-baked) when cloud voice is down
  if (opts.primaryAudioUrl) {
    const ok = await playUrl(opts.primaryAudioUrl);
    if (ok) {
      if (opts.includeEnglish && opts.english) {
        await browserSpeak(opts.english, { rate: 0.9 });
      }
      return "recording";
    }
  }

  if (!opts.narragansett?.trim() && !opts.english?.trim()) return "none";

  // Path / packaged oral: do not English-browser-speak Narragansett forms.
  // English gloss may still use browser when cloud TTS is unavailable.
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
