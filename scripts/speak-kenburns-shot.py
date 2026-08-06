#!/usr/bin/env python3
"""6s 1080×1920 speak-shot — Phase A/B safe mouth motion.

Fixes the head-nod/glitch bug:
  • Align open → closed (phase correlation on face band)
  • Blend ONLY a mouth ROI (not full frame morph)
  • If residual misalignment is still high → closed plate only (no glitch)
  • Ken Burns mild on result

Envelope: syllable peaks from --text, or RMS from --audio (preferred).
"""
from __future__ import annotations

import argparse
import math
import re
import struct
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image

W, H, FPS, DUR = 1080, 1920, 24, 6.0
FFMPEG = "/usr/local/bin/ffmpeg"

_VOWELS = set(
    "aeiouáéíóúàèìòùâêîôûäëïöüāēīōūăĕĭŏŭæœy"
    "AEIOUÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÄËÏÖÜĀĒĪŌŪĂĔĬŎŬÆŒY"
)

PEAK_ALPHA = 0.82
# Residual after align: above this → refuse morph (no head-nod)
MAX_FACE_RESIDUAL = 6.5
MOUTH_Y0, MOUTH_Y1 = 0.40, 0.74
MOUTH_X0, MOUTH_X1 = 0.15, 0.85
# Cap how much of the (often wide) open plate enters the mouth ROI
OPEN_CAP = 0.42


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
    open_s: float = 0.14,
    gap_s: float = 0.045,
    word_gap: float = 0.12,
    max_end: float = 4.5,
) -> list[tuple[float, float, float]]:
    words = syllable_spans(text)
    if not words:
        return []
    total_syl = sum(n for _, n in words)
    est = lead + total_syl * (open_s + gap_s) + max(0, len(words) - 1) * (word_gap - gap_s)
    scale = (max_end - lead) / max(0.2, est - lead) if est > max_end else 1.0
    o, g, wg = open_s * scale, gap_s * scale, word_gap * scale
    peaks: list[tuple[float, float, float]] = []
    t = lead
    for _w, n in words:
        for si in range(n):
            strength = 1.0 if si == n - 1 else 0.70
            hold = o * (1.12 if si == n - 1 else 1.0)
            a, b = t, min(t + hold, max_end)
            if a >= max_end:
                return peaks
            if b > a + 0.05:
                peaks.append((round(a, 4), round(b, 4), strength))
            t = b + g
        t += max(0.0, wg - g)
        if t >= max_end:
            break
    return peaks


def audio_peaks(audio: Path, *, fps: int = FPS, dur: float = DUR) -> list[tuple[float, float, float]]:
    sr = 16000
    raw = subprocess.check_output(
        [FFMPEG, "-v", "error", "-i", str(audio), "-ac", "1", "-ar", str(sr), "-f", "s16le", "-"]
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
            seg = rms[i:j]
            strength = min(1.0, (sum(seg) / len(seg)) / (peak * 0.55 + 1e-6))
            strength = max(0.55, min(1.0, strength))
            peaks.append((round(a, 4), round(b, 4), strength))
        i = max(j, i + 1)
    return peaks


def alpha_at(t: float, peaks: list[tuple[float, float, float]]) -> float:
    a = 0.0
    for s, e, strength in peaks:
        if t < s or t > e:
            continue
        u = (t - s) / max(1e-6, e - s)
        env = math.sin(math.pi * u) ** 1.2
        a = max(a, env * PEAK_ALPHA * strength)
    return min(1.0, a)


def load_cover(path: Path, w: int = W, h: int = H) -> np.ndarray:
    im = Image.open(path).convert("RGB")
    scale = max(w / im.width, h / im.height)
    nw, nh = int(round(im.width * scale)), int(round(im.height * scale))
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - w) // 2
    top = (nh - h) // 2
    im = im.crop((left, top, left + w, top + h))
    return np.asarray(im, dtype=np.float32)


def phase_shift(ref: np.ndarray, mov: np.ndarray) -> tuple[int, int]:
    a = ref.mean(axis=2)
    b = mov.mean(axis=2)
    y0, y1 = int(H * 0.22), int(H * 0.70)
    a = a[y0:y1] - a[y0:y1].mean()
    b = b[y0:y1] - b[y0:y1].mean()
    fa = np.fft.fft2(a)
    fb = np.fft.fft2(b)
    R = fa * np.conj(fb)
    R /= np.abs(R) + 1e-9
    r = np.fft.ifft2(R)
    peak = np.unravel_index(int(np.argmax(np.abs(r))), r.shape)
    dy, dx = int(peak[0]), int(peak[1])
    if dy > r.shape[0] // 2:
        dy -= r.shape[0]
    if dx > r.shape[1] // 2:
        dx -= r.shape[1]
    return int(np.clip(dy, -40, 40)), int(np.clip(dx, -40, 40))


def shift_image(img: np.ndarray, dy: int, dx: int) -> np.ndarray:
    if dy == 0 and dx == 0:
        return img
    rolled = np.roll(np.roll(img, dy, axis=0), dx, axis=1)
    if dy > 0:
        rolled[:dy] = img[:dy]
    elif dy < 0:
        rolled[dy:] = img[dy:]
    if dx > 0:
        rolled[:, :dx] = img[:, :dx]
    elif dx < 0:
        rolled[:, dx:] = img[:, dx:]
    return rolled


def face_residual(closed: np.ndarray, other: np.ndarray) -> float:
    y0, y1 = int(H * 0.22), int(H * 0.70)
    return float(np.mean(np.abs(closed[y0:y1] - other[y0:y1])))


def mouth_roi_mask(h: int, w: int) -> np.ndarray:
    yy, xx = np.mgrid[0:h, 0:w]
    y0, y1 = h * MOUTH_Y0, h * MOUTH_Y1
    x0, x1 = w * MOUTH_X0, w * MOUTH_X1
    cy, cx = (y0 + y1) / 2, (x0 + x1) / 2
    ry, rx = (y1 - y0) / 2 * 1.05, (x1 - x0) / 2 * 1.05
    ny = (yy - cy) / max(ry, 1)
    nx = (xx - cx) / max(rx, 1)
    d = ny * ny + nx * nx
    m = np.clip(1.0 - d, 0.0, 1.0) ** 1.25
    return m.astype(np.float32)[:, :, None]


def _soft_dilate(m: np.ndarray, k: int = 7) -> np.ndarray:
    from numpy.lib.stride_tricks import sliding_window_view

    pad = k // 2
    p = np.pad(m, pad, mode="edge")
    windows = sliding_window_view(p, (k, k))
    return windows.max(axis=(-2, -1)).astype(np.float32)


def build_mouth_layer(closed: np.ndarray, open_m: np.ndarray) -> tuple[np.ndarray, dict]:
    dy, dx = phase_shift(closed, open_m)
    aligned = shift_image(open_m, dy, dx)
    res_before = face_residual(closed, open_m)
    res_after = face_residual(closed, aligned)
    # Prefer better residual
    if res_after > res_before:
        aligned = open_m
        dy, dx = 0, 0
        res_after = res_before

    meta = {
        "shift_dy": dy,
        "shift_dx": dx,
        "face_residual_before": round(res_before, 2),
        "face_residual_after": round(res_after, 2),
        "mode": "roi",
    }

    if res_after > MAX_FACE_RESIDUAL:
        meta["mode"] = "closed-only"
        meta["reason"] = f"face_residual {res_after:.1f} > {MAX_FACE_RESIDUAL}"
        return closed.copy(), meta

    base_mask = mouth_roi_mask(closed.shape[0], closed.shape[1])
    diff = np.mean(np.abs(aligned - closed), axis=2, keepdims=True)
    band = base_mask[:, :, 0] > 0.08
    dmax = float(diff[band].max()) if band.any() else float(diff.max()) or 1.0
    diff_n = np.clip(diff / (0.45 * dmax + 1e-6), 0.0, 1.0)
    # Geometric mouth always contributes; difference boosts where open really changes lips
    mask = base_mask * (0.55 + 0.45 * diff_n)
    mask = _soft_dilate(mask[:, :, 0], k=9)[:, :, None]
    mask = np.clip(mask, 0.0, 1.0)

    open_cap = closed * (1.0 - OPEN_CAP) + aligned * OPEN_CAP
    speak = closed * (1.0 - mask) + open_cap * mask
    meta["mask_mean"] = round(float(mask.mean()), 4)
    return speak.astype(np.float32), meta


def kenburns_crop(frame: np.ndarray, t: float, dur: float, zoom: str) -> np.ndarray:
    z0, z1 = (1.0, 1.05) if zoom == "in" else (1.05, 1.0)
    z = z0 + (z1 - z0) * (t / max(dur, 1e-6))
    z = max(1.0, min(1.08, z))
    if abs(z - 1.0) < 1e-3:
        return np.clip(frame, 0, 255).astype(np.uint8)
    h, w = frame.shape[:2]
    nh, nw = int(round(h * z)), int(round(w * z))
    im = Image.fromarray(np.clip(frame, 0, 255).astype(np.uint8)).resize(
        (nw, nh), Image.Resampling.BILINEAR
    )
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
    soft_path: Path | None = None,
    mode: str = "roi",
) -> dict:
    closed = load_cover(closed_path)
    open_src = load_cover(soft_path) if soft_path and soft_path.exists() else load_cover(open_path)

    if mode == "none" or not peaks:
        speak = closed
        meta = {"mode": "closed-only", "reason": "mode=none or no peaks"}
    elif mode == "full":
        dy, dx = phase_shift(closed, open_src)
        aligned = shift_image(open_src, dy, dx)
        if face_residual(closed, aligned) > MAX_FACE_RESIDUAL:
            speak, meta = closed, {"mode": "closed-only", "reason": "full refused high residual"}
        else:
            speak = closed * 0.72 + aligned * 0.28
            meta = {"mode": "full-aligned", "shift_dy": dy, "shift_dx": dx}
    else:
        speak, meta = build_mouth_layer(closed, open_src)

    n = int(round(dur * fps))
    out.parent.mkdir(parents=True, exist_ok=True)
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
    proc = subprocess.Popen(
        cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    )
    assert proc.stdin is not None
    try:
        for i in range(n):
            t = i / fps
            a = alpha_at(t, peaks) if meta.get("mode") != "closed-only" else 0.0
            if a < 1e-4:
                blended = closed
            else:
                blended = closed * (1.0 - a) + speak * a
            frame = kenburns_crop(blended, t, dur, zoom)
            proc.stdin.write(frame.tobytes())
    finally:
        proc.stdin.close()
        proc.wait()
        if proc.returncode != 0:
            raise RuntimeError(f"ffmpeg encode failed for {out}")

    side = out.with_suffix(".mouth.txt")
    lines = [f"mode={meta.get('mode')}", f"meta={meta}", f"peak_alpha={PEAK_ALPHA}"]
    lines.extend(f"{s:.3f}-{e:.3f}@{k:.2f}" for s, e, k in peaks)
    side.write_text("\n".join(lines) + "\n")
    return meta


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("closed", type=Path)
    ap.add_argument("open", type=Path)
    ap.add_argument("out", type=Path)
    ap.add_argument("--zoom", choices=["in", "out"], default="in")
    ap.add_argument("--text", default="")
    ap.add_argument("--audio", type=Path, default=None)
    ap.add_argument("--soft", type=Path, default=None)
    ap.add_argument("--mode", choices=["roi", "full", "none"], default="roi")
    ap.add_argument("--dur", type=float, default=DUR)
    args = ap.parse_args()

    peaks: list[tuple[float, float, float]] = []
    mode_label = "closed-only"
    if args.audio and args.audio.exists():
        peaks = audio_peaks(args.audio, dur=args.dur)
        mode_label = f"audio-rms ({len(peaks)} peaks)"
    if not peaks and args.text.strip():
        peaks = syllable_peaks(args.text.strip(), max_end=min(4.5, args.dur - 0.4))
        mode_label = f"syllable ({len(peaks)} peaks · {args.text.strip()[:40]})"

    meta = render_shot(
        args.closed,
        args.open,
        args.out,
        peaks,
        zoom=args.zoom,
        dur=args.dur,
        soft_path=args.soft,
        mode=args.mode,
    )
    print(f"OK {args.out} · {mode_label} · mouth={meta.get('mode')} {meta}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
