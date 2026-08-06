/**
 * Runtime mouth envelope from oral audio (Learn mode).
 * Same shared-clock idea as bake: AnalyserNode → jaw open 0..1.
 * Used by MouthOverlay when packaged film mouth isn't the clock.
 */

export type MouthEnvelope = {
  open: number; // 0..1
  speaking: boolean;
};

let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!sharedCtx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    sharedCtx = new AC();
  }
  return sharedCtx;
}

/**
 * Attach analyser to an HTMLAudioElement already playing oral language.
 * Returns a poll() that yields current jaw open amount.
 */
export function attachMouthAnalyser(audio: HTMLAudioElement): {
  poll: () => MouthEnvelope;
  dispose: () => void;
} | null {
  const ctx = getCtx();
  if (!ctx) return null;

  let source: MediaElementAudioSourceNode | null = null;
  let analyser: AnalyserNode | null = null;
  try {
    // Resume on user gesture paths — caller should unlock first
    void ctx.resume();
    source = ctx.createMediaElementSource(audio);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.55;
    source.connect(analyser);
    analyser.connect(ctx.destination);
  } catch {
    // Element may already be wired; fail soft
    return null;
  }

  const data = new Uint8Array(analyser.frequencyBinCount);
  let ema = 0;

  return {
    poll: () => {
      if (!analyser) return { open: 0, speaking: false };
      analyser.getByteTimeDomainData(data);
      // RMS of centered waveform
      let acc = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i]! - 128) / 128;
        acc += v * v;
      }
      const rms = Math.sqrt(acc / data.length);
      // Speech band boost via frequency data
      const freq = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(freq);
      let mid = 0;
      const n = freq.length;
      for (let i = Math.floor(n * 0.08); i < Math.floor(n * 0.45); i++) {
        mid += freq[i]!;
      }
      mid = mid / Math.max(1, Math.floor(n * 0.37)) / 255;
      const raw = Math.min(1, Math.max(0, rms * 4.2 + mid * 0.85));
      ema = ema * 0.4 + raw * 0.6;
      const open = ema < 0.06 ? 0 : Math.min(1, (ema - 0.04) * 1.35);
      return { open, speaking: open > 0.08 };
    },
    dispose: () => {
      try {
        source?.disconnect();
        analyser?.disconnect();
      } catch {
        /* ignore */
      }
      source = null;
      analyser = null;
    },
  };
}

/** Lightweight synthetic envelope from Narragansett text when no analyser. */
export function syntheticEnvelopeFromText(
  text: string,
  tSec: number,
  lead = 0.28,
): number {
  const cleaned = text.replace(/[?!,.;:"()]+/g, " ").trim();
  if (!cleaned) return 0;
  const vowels = /[aeiouáéíóúàèìòùâêîôûäëïöüāēīōūy]/i;
  const words = cleaned.split(/\s+/).filter(Boolean);
  let cursor = lead;
  let best = 0;
  for (const w of words) {
    let n = 0;
    let inV = false;
    for (const ch of w) {
      const isV = vowels.test(ch);
      if (isV && !inV) n++;
      inV = isV;
    }
    n = Math.max(1, n);
    for (let si = 0; si < n; si++) {
      const hold = 0.12 * (si === n - 1 ? 1.1 : 1);
      const a = cursor;
      const b = cursor + hold;
      if (tSec >= a && tSec <= b) {
        const u = (tSec - a) / Math.max(1e-6, b - a);
        const env = Math.sin(Math.PI * u) ** 1.2;
        best = Math.max(best, env * (si === n - 1 ? 1 : 0.7));
      }
      cursor = b + 0.045;
    }
    cursor += 0.08;
  }
  return best;
}
