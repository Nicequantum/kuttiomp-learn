/**
 * Oral playback — living recording → Grok Agent/TTS → browser.
 *
 * Protocol 7 (oral primacy): language audio must work even when video
 * has no track or fails to load. Unlock audio on the first user gesture.
 */

let currentAudio: HTMLAudioElement | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;
let grokAvailable: boolean | null = null;
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

/**
 * Call from the first user gesture (Play / Hear) so later TTS and
 * HTMLAudioElement playback are not blocked by autoplay policy.
 */
export async function unlockAudioPlayback(): Promise<void> {
  if (typeof window === "undefined" || audioUnlocked) return;
  try {
    // Tiny silent wav — primes the audio element pipeline
    const silent =
      "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
    const a = new Audio(silent);
    a.volume = 0.01;
    await a.play().catch(() => {});
    a.pause();
    a.src = "";
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
      return { configured: false, provider: "browser-fallback", voice: null };
    }
    const data = (await res.json()) as {
      configured: boolean;
      provider: string;
      voice: string | null;
      agentId?: string | null;
    };
    grokAvailable = data.configured;
    return data;
  } catch {
    grokAvailable = false;
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
    // Do not call full stopSpeaking() here — it cancels the queue we are about to use.
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = "";
      currentAudio = null;
    }
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
    } catch {
      /* ignore */
    }
    const u = new SpeechSynthesisUtterance(trimmed);
    u.rate = opts?.rate ?? 0.8;
    u.lang = "en-US";
    u.volume = 1;
    u.onend = () => {
      currentUtterance = null;
      resolve();
    };
    u.onerror = () => {
      currentUtterance = null;
      resolve();
    };
    currentUtterance = u;
    // Chrome sometimes drops the first speak() after cancel — double-kick
    window.speechSynthesis.speak(u);
    window.setTimeout(() => {
      if (currentUtterance === u && window.speechSynthesis.paused) {
        try {
          window.speechSynthesis.resume();
        } catch {
          /* ignore */
        }
      }
    }, 80);
  });
}

function playUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = "";
      currentAudio = null;
    }
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* ignore */
    }
    currentUtterance = null;
    const audio = new Audio(url);
    audio.volume = 1;
    currentAudio = audio;
    audio.onended = () => {
      currentAudio = null;
      resolve(true);
    };
    audio.onerror = () => {
      currentAudio = null;
      resolve(false);
    };
    void audio.play().catch(() => resolve(false));
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

/** Warm cache without playing — call while video buffers. */
export async function prefetchSpeak(
  text: string,
  kind: "narragansett" | "english" = "narragansett",
): Promise<boolean> {
  if (!text?.trim()) return false;
  if (grokAvailable === null) await checkTtsStatus();
  if (!grokAvailable) return false;
  const url = await fetchTtsBlobUrl(text.trim(), kind);
  return Boolean(url);
}

export async function speakWord(opts: {
  narragansett: string;
  english?: string;
  includeEnglish?: boolean;
  /** Living speaker recording from public API */
  primaryAudioUrl?: string;
}): Promise<"recording" | "grok" | "browser" | "none"> {
  await unlockAudioPlayback();

  // 1) Living speaker recording (production path)
  if (opts.primaryAudioUrl) {
    const ok = await playUrl(opts.primaryAudioUrl);
    if (ok) {
      if (opts.includeEnglish && opts.english) {
        if (grokAvailable === null) await checkTtsStatus();
        if (grokAvailable) await grokSpeak(opts.english, "english");
        else await browserSpeak(opts.english, { rate: 0.9 });
      }
      return "recording";
    }
  }

  if (grokAvailable === null) {
    await checkTtsStatus();
  }

  if (grokAvailable) {
    const ok = await grokSpeak(opts.narragansett, "narragansett");
    if (ok) {
      if (opts.includeEnglish && opts.english) {
        await grokSpeak(opts.english, "english");
      }
      return "grok";
    }
  }

  // Browser fallback — always attempt; oral primacy over silence
  if (!opts.narragansett?.trim() && !opts.english?.trim()) return "none";
  await browserSpeak(opts.narragansett || opts.english || "", { rate: 0.7 });
  if (opts.includeEnglish && opts.english) {
    await browserSpeak(opts.english, { rate: 0.9 });
  }
  return "browser";
}
