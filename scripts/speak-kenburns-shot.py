#!/usr/bin/env python3
"""6s 1080×1920 speak-shot: elegant soft mouth + Ken Burns.

Mouth motion is subtle and speech-timed:
  • Soft-speak still = mostly closed + light mix of open (never full scream)
  • Smooth raised-cosine alpha on each syllable peak (not hard on/off)
  • Mouth rest closed before speech, between words, and after the line

Optional --audio uses RMS energy for the envelope instead of syllables.
"""
from __future__ import annotations

import argparse
import math
import re
import struct
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

W, H, FPS, DUR = 1080, 1920, 24, 6.0
FFMPEG = "/usr/local/bin/ffmpeg"

_VOWELS = set(
    "aeiouáéíóúàèìòùâêîôûäëïöüāēīōūăĕĭŏŭæœy"
    "AEIOUÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÄËÏÖÜĀĒĪŌŪĂĔĬŎŬÆŒY"
)

# Soft-speak intensity: fraction of the (often too-wide) open still mixed into closed.
# Lower = more elegant / less scream. 0.28–0.38 is natural teaching speech.
SOFT_MIX = 0.32
# Peak blend of soft-speak over closed during a syllable (1.0 = full soft-speak still).
PEAK_ALPHA = 0.92
# Residual never fully hits 1.0 of the old wide open.


def syllable_spans(text: str) -> list[tuple[str, int]]:
    cleaned = re.sub(r"[?!,.;:\"()]+", " ", text)
    words: list[tuple[str, int]] = []
    for raw in cleaned.split():
        w = raw.strip("-–—")
        if not w or w.lower() in {"or", "and", "a", "the"}:
            continue
        n = 0
        in_v = False
        for ch in w:
            is_v = ch in _VOWELS
            if is_v and not in_v:
                n += 1
            in_v = is_v
        words.append((w, max(1, n)))
    return words


def syllable_peaks(
    text: str,
    *,
    lead: float = 0.30,
    open_s: float = 0.15,
    gap_s: float = 0.04,
    word_gap: float = 0.12,
    max_end: float = 4.5,
) -> list[tuple[float, float, float]]:
    """Return (start, end, peak_strength) with smooth envelopes intended."""
    words = syllable_spans(text)
    if not words:
        return []
    total_syl = sum(n for _, n in words)
    est = lead + total_syl * (open_s + gap_s) + max(0, len(words) - 1) * (word_gap - gap_s)
    scale = 1.0
    if est > max_end:
        scale = (max_end - lead) / max(0.2, est - lead)
    o, g, wg = open_s * scale, gap_s * scale, word_gap * scale

    peaks: list[tuple[float, float, float]] = []
    t = lead
    for _w, n in words:
        for si in range(n):
            # last syllable of word slightly stronger (stress), unstressed softer
            strength = 1.0 if si == n - 1 else 0.72
            hold = o * (1.15 if si == n - 1 else 1.0)
            a, b = t, t + hold
            if a >= max_end:
                return peaks
            b = min(b, max_end)
            if b > a + 0.05:
                peaks.append((round(a, 4), round(b, 4), strength))
            t = b + g
        t += max(0.0, wg - g)
        if t >= max_end:
            break
    return peaks


def audio_peaks(
    audio: Path,
    *,
    fps: int = FPS,
    dur: float = DUR,
) -> list[tuple[float, float, float]]:
    sr = 16000
    raw = subprocess.check_output(
        [
            FFMPEG,
            "-v",
            "error",
            "-i",
            str(audio),
            "-ac",
            "1",
            "-ar",
            str(sr),
            "-f",
            "s16le",
            "-",
        ]
    )
    if len(raw) < 4:
        return []
    n = len(raw) // 2
    samples = struct.unpack(f"<{n}h", raw)
    hop = max(1, sr // fps)
    rms = []
    for i in range(0, n, hop):
        chunk = samples[i : i + hop]
        if not chunk:
            break
        acc = sum(s * s for s in chunk) / len(chunk)
        rms.append(acc**0.5)
    if not rms:
        return []
    peak = max(rms) or 1.0
    thr = max(peak * 0.16, 100.0)
    flags = [v >= thr for v in rms]
    for i in range(1, len(flags) - 1):
        if flags[i - 1] and flags[i + 1]:
            flags[i] = True
    peaks: list[tuple[float, float, float]] = []
    i = 0
    while i < len(flags):
        if not flags[i]:
            i += 1
            continue
        j = i
        while j < len(flags) and flags[j]:
            j += 1
        if j - i >= 2:
            a, b = i / fps, min(j / fps, dur - 0.05)
            # strength from mean RMS in segment
            seg = rms[i:j]
            strength = min(1.0, (sum(seg) / len(seg)) / (peak * 0.55 + 1e-6))
            strength = max(0.55, min(1.0, strength))
            peaks.append((round(a, 4), round(b, 4), strength))
        i = max(j, i + 1)
    return peaks


def alpha_at(t: float, peaks: list[tuple[float, float, float]]) -> float:
    """Raised-cosine soft envelope; max PEAK_ALPHA * strength. Elegant, not binary."""
    a = 0.0
    for s, e, strength in peaks:
        if t < s or t > e:
            continue
        # raised cosine 0→1→0 over [s,e]
        u = (t - s) / max(1e-6, e - s)
        env = 0.5 - 0.5 * math.cos(2 * math.pi * u)  # full cosine bump
        # prefer a softer top: use sin^1.2 for slightly flatter mid then fall
        env = math.sin(math.pi * u) ** 1.15
        a = max(a, env * PEAK_ALPHA * strength)
    return min(1.0, a)


def load_cover(path: Path, w: int = W, h: int = H) -> np.ndarray:
    im = Image.open(path).convert("RGB")
    # cover scale + center crop
    scale = max(w / im.width, h / im.height)
    nw, nh = int(round(im.width * scale)), int(round(im.height * scale))
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - w) // 2
    top = (nh - h) // 2
    im = im.crop((left, top, left + w, top + h))
    return np.asarray(im, dtype=np.float32)


def make_soft_speak(closed: np.ndarray, open_m: np.ndarray, mix: float = SOFT_MIX) -> np.ndarray:
    """Elegant soft-speak face: mostly closed, tiny open mix — never full gape."""
    return closed * (1.0 - mix) + open_m * mix


def kenburns_crop(frame: np.ndarray, t: float, dur: float, zoom: str) -> np.ndarray:
    """Mild push-in/out via crop of slightly larger canvas (frame already WxH)."""
    # We pre-expand: caller passes frame at W,H; we simulate zoom by scaling up then crop
    z0, z1 = (1.0, 1.08) if zoom == "in" else (1.08, 1.0)
    z = z0 + (z1 - z0) * (t / max(dur, 1e-6))
    z = max(1.0, min(1.12, z))
    if abs(z - 1.0) < 1e-3:
        return frame.astype(np.uint8)
    h, w = frame.shape[:2]
    nh, nw = int(round(h * z)), int(round(w * z))
    im = Image.fromarray(frame.astype(np.uint8)).resize((nw, nh), Image.Resampling.BILINEAR)
    left = (nw - w) // 2
    top = (nh - h) // 2
    im = im.crop((left, top, left + w, top + h))
    return np.asarray(im, dtype=np.uint8)


def render_shot(
    closed_path: Path,
    open_path: Path,
    out: Path,
    peaks: list[tuple[float, float, float]],
    *,
    zoom: str = "in",
    dur: float = DUR,
    fps: int = FPS,
    soft_mix: float = SOFT_MIX,
    soft_path: Path | None = None,
) -> None:
    closed = load_cover(closed_path)
    if soft_path and soft_path.exists():
        soft = load_cover(soft_path)
    else:
        open_m = load_cover(open_path)
        soft = make_soft_speak(closed, open_m, soft_mix)

    n = int(round(dur * fps))
    out.parent.mkdir(parents=True, exist_ok=True)

    # rawvideo pipe to ffmpeg for high-quality H.264
    cmd = [
        FFMPEG,
        "-y",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgb24",
        "-s",
        f"{W}x{H}",
        "-r",
        str(fps),
        "-i",
        "-",
        "-an",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "17",
        "-profile:v",
        "high",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        str(out),
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    assert proc.stdin is not None
    try:
        for i in range(n):
            t = i / fps
            a = alpha_at(t, peaks)
            # blend closed → soft-speak
            if a < 1e-4:
                blended = closed
            else:
                blended = closed * (1.0 - a) + soft * a
            frame = kenburns_crop(blended, t, dur, zoom)
            proc.stdin.write(frame.tobytes())
    finally:
        proc.stdin.close()
        proc.wait()
        if proc.returncode != 0:
            raise RuntimeError(f"ffmpeg encode failed for {out}")

    side = out.with_suffix(".mouth.txt")
    side.write_text(
        "mode=soft-syllable\n"
        f"soft_mix={soft_mix} peak_alpha={PEAK_ALPHA}\n"
        + "\n".join(f"{s:.3f}-{e:.3f}@{k:.2f}" for s, e, k in peaks)
        + ("\n" if peaks else "\n(none)\n")
    )


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("closed", type=Path)
    ap.add_argument("open", type=Path)
    ap.add_argument("out", type=Path)
    ap.add_argument("--zoom", choices=["in", "out"], default="in")
    ap.add_argument("--text", default="")
    ap.add_argument("--audio", type=Path, default=None)
    ap.add_argument("--soft", type=Path, default=None, help="Optional dedicated soft-speak still")
    ap.add_argument("--soft-mix", type=float, default=SOFT_MIX)
    ap.add_argument("--dur", type=float, default=DUR)
    args = ap.parse_args()

    peaks: list[tuple[float, float, float]] = []
    mode = "closed-only"
    if args.audio and args.audio.exists():
        peaks = audio_peaks(args.audio, dur=args.dur)
        mode = f"audio-rms ({len(peaks)} peaks)"
    if not peaks and args.text.strip():
        peaks = syllable_peaks(args.text.strip(), max_end=min(4.5, args.dur - 0.4))
        mode = f"soft-syllable ({len(peaks)} peaks · {args.text.strip()[:40]})"

    render_shot(
        args.closed,
        args.open,
        args.out,
        peaks,
        zoom=args.zoom,
        dur=args.dur,
        soft_mix=args.soft_mix,
        soft_path=args.soft,
    )
    # copy any dedicated soft stills we already generated
    if args.soft is None:
        # also write procedural soft still next to open for inspection
        try:
            closed = load_cover(args.closed)
            open_m = load_cover(args.open)
            soft = make_soft_speak(closed, open_m, args.soft_mix)
            soft_dir = args.closed.parent.parent / "soft"
            soft_dir.mkdir(parents=True, exist_ok=True)
            name = args.closed.name
            Image.fromarray(soft.astype(np.uint8)).save(soft_dir / name, quality=92)
        except Exception:
            pass

    print(f"OK {args.out} · {mode}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
