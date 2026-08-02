/**
 * Oral playback — Grok Voice Agent or REST TTS via /api/tts.
 */

let currentAudio: HTMLAudioElement | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;
let grokAvailable: boolean | null = null;
let lastTtsError: string | null = null;

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
    stopSpeaking();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = opts?.rate ?? 0.8;
    u.lang = "en-US";
    u.onend = () => {
      currentUtterance = null;
      resolve();
    };
    u.onerror = () => {
      currentUtterance = null;
      resolve();
    };
    currentUtterance = u;
    window.speechSynthesis.speak(u);
  });
}

async function grokSpeak(
  text: string,
  kind: "narragansett" | "english",
): Promise<boolean> {
  const cacheKey = `${kind}:${text}`;
  let url = audioCache.get(cacheKey);

  if (!url) {
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
        console.warn("[speak] synthesis failed", err);
        return false;
      }
      const blob = await res.blob();
      if (!blob.size) {
        lastTtsError = "Empty audio";
        return false;
      }
      url = URL.createObjectURL(blob);
      audioCache.set(cacheKey, url);
      lastTtsError = null;
    } catch (e) {
      lastTtsError = e instanceof Error ? e.message : "network error";
      return false;
    }
  }

  return new Promise((resolve) => {
    stopSpeaking();
    const audio = new Audio(url!);
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

export async function speakWord(opts: {
  narragansett: string;
  english?: string;
  includeEnglish?: boolean;
}): Promise<"grok" | "browser" | "none"> {
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

  await browserSpeak(opts.narragansett, { rate: 0.7 });
  if (opts.includeEnglish && opts.english) {
    await browserSpeak(opts.english, { rate: 0.9 });
  }
  return "browser";
}
