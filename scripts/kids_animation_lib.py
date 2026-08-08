#!/usr/bin/env python3
"""Little Ones Hybrid v8 — shared animation core.

World-class speech + body layer for cinematic kids plates:

  1. Multi-viseme mouth shapes (rest / slight / mid / wide / round)
     built from ONE closed plate + pose-aligned open plate.
  2. Phoneme-aware speech envelope from text (or audio RMS when present).
  3. Per-frame face tracking so mouth ROI rides I2V head motion.
  4. Intentional body-language micro-animation (gestures, breath, blink)
     when no I2V body plate exists — never throws away stills progress.

Pure numpy/Pillow/ffmpeg. No network. Deterministic.
"""
from __future__ import annotations

import math
import re
import struct
import subprocess
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

W, H, FPS, DUR = 1080, 1920, 24, 6.0
FFMPEG = "/usr/local/bin/ffmpeg"

_VOWELS = set(
    "aeiouáéíóúàèìòùâêîôûäëïöüāēīōūăĕĭŏŭæœy"
    "AEIOUÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÄËÏÖÜĀĒĪŌŪĂĔĬŎŬÆŒY"
)

# Viseme ids
REST, SLIGHT, MID, WIDE, ROUND = 0, 1, 2, 3, 4
VISEME_NAMES = ("rest", "slight", "mid", "wide", "round")

# Peak jaw amounts per viseme (blend toward open plate inside ROI)
# v11: slightly stronger so lips read on short words and soft-light plates
VISEME_OPEN = {
    REST: 0.0,
    SLIGHT: 0.30,
    MID: 0.55,
    WIDE: 0.78,
    ROUND: 0.62,
}

MAX_FACE_RESIDUAL = 7.0  # after align; above → procedural jaw (no open-plate morph)
MOUTH_Y0, MOUTH_Y1 = 0.42, 0.72
MOUTH_X0, MOUTH_X1 = 0.18, 0.82


# ── Image helpers ────────────────────────────────────────────────────────────

def load_cover(path: Path, w: int = W, h: int = H) -> np.ndarray:
    im = Image.open(path).convert("RGB")
    scale = max(w / im.width, h / im.height)
    nw, nh = int(round(im.width * scale)), int(round(im.height * scale))
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    left, top = (nw - w) // 2, (nh - h) // 2
    return np.asarray(im.crop((left, top, left + w, top + h)), dtype=np.float32)


def phase_shift(ref: np.ndarray, mov: np.ndarray) -> tuple[int, int]:
    a = ref.mean(axis=2)
    b = mov.mean(axis=2)
    y0, y1 = int(H * 0.20), int(H * 0.72)
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
    return int(np.clip(dy, -48, 48)), int(np.clip(dx, -48, 48))


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


def face_residual(a: np.ndarray, b: np.ndarray) -> float:
    y0, y1 = int(H * 0.22), int(H * 0.70)
    return float(np.mean(np.abs(a[y0:y1] - b[y0:y1])))


def mouth_ellipse_mask(
    h: int,
    w: int,
    *,
    cy: float | None = None,
    cx: float | None = None,
    ry: float | None = None,
    rx: float | None = None,
) -> np.ndarray:
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    if cy is None:
        cy = h * (MOUTH_Y0 + MOUTH_Y1) / 2
    if cx is None:
        cx = w * (MOUTH_X0 + MOUTH_X1) / 2
    if ry is None:
        ry = h * (MOUTH_Y1 - MOUTH_Y0) / 2 * 1.05
    if rx is None:
        rx = w * (MOUTH_X1 - MOUTH_X0) / 2 * 1.05
    ny = (yy - cy) / max(ry, 1.0)
    nx = (xx - cx) / max(rx, 1.0)
    d = ny * ny + nx * nx
    m = np.clip(1.0 - d, 0.0, 1.0) ** 1.35
    return m.astype(np.float32)[:, :, None]


def soft_dilate(m2d: np.ndarray, k: int = 9) -> np.ndarray:
    from numpy.lib.stride_tricks import sliding_window_view

    pad = k // 2
    p = np.pad(m2d, pad, mode="edge")
    windows = sliding_window_view(p, (k, k))
    return windows.max(axis=(-2, -1)).astype(np.float32)


def gaussian_blur_mask(m2d: np.ndarray, radius: float = 6.0) -> np.ndarray:
    im = Image.fromarray(np.clip(m2d * 255, 0, 255).astype(np.uint8), mode="L")
    im = im.filter(ImageFilter.GaussianBlur(radius=radius))
    return np.asarray(im, dtype=np.float32) / 255.0


# ── Multi-viseme mouth plate bank ────────────────────────────────────────────

@dataclass
class MouthBank:
    rest: np.ndarray
    slight: np.ndarray
    mid: np.ndarray
    wide: np.ndarray
    round: np.ndarray
    mask: np.ndarray  # HxWx1
    meta: dict

    def plate(self, vid: int) -> np.ndarray:
        return (
            self.rest,
            self.slight,
            self.mid,
            self.wide,
            self.round,
        )[int(np.clip(vid, 0, 4))]


def _procedural_jaw(closed: np.ndarray, mask: np.ndarray, open_amt: float) -> np.ndarray:
    """Open mouth without a second plate: darken + vertical split inside ROI.

    Safe when open still is misaligned — never morphs head/pose.
    """
    if open_amt < 0.02:
        return closed.copy()
    h, w = closed.shape[:2]
    cy = int(h * (MOUTH_Y0 + MOUTH_Y1) / 2)
    out = closed.copy()
    # Vertical open: pull upper lip up, lower lip down inside mask
    yy = np.arange(h, dtype=np.float32)[:, None]
    pull = (yy - cy) / max(h * 0.08, 1.0)
    pull = np.clip(pull, -1.5, 1.5)
    src_y = np.clip(yy - pull * open_amt * 14.0, 0, h - 1.001)
    y0 = np.floor(src_y).astype(np.int32)[:, 0]
    y1 = np.minimum(y0 + 1, h - 1)
    frac = (src_y[:, 0] - y0).astype(np.float32)[:, None, None]
    # sample rows
    sampled = closed[y0] * (1 - frac) + closed[y1] * frac
    a = mask * open_amt
    out = closed * (1.0 - a) + sampled * a
    # Interior darken (mouth cavity)
    cavity = mask * (open_amt * 0.55)
    out = out * (1.0 - cavity * 0.55) + np.array([28.0, 16.0, 14.0]) * cavity * 0.55
    return out.astype(np.float32)


def build_mouth_bank(closed: np.ndarray, open_m: np.ndarray) -> MouthBank:
    """Pose-align open → closed; build 5 mouth plates via ROI-only morph.

    If open plate is misaligned past residual gate, fall back to procedural
    jaw so every line still has pronunciation motion (no head-nod glitch).
    """
    dy, dx = phase_shift(closed, open_m)
    aligned = shift_image(open_m, dy, dx)
    res_before = face_residual(closed, open_m)
    res_after = face_residual(closed, aligned)
    if res_after > res_before:
        aligned = open_m
        dy, dx = 0, 0
        res_after = res_before

    meta = {
        "shift_dy": dy,
        "shift_dx": dx,
        "face_residual_before": round(res_before, 2),
        "face_residual_after": round(res_after, 2),
        "mode": "multi-viseme",
    }

    base_mask = mouth_ellipse_mask(closed.shape[0], closed.shape[1])
    mask = soft_dilate(base_mask[:, :, 0], k=11)
    mask = gaussian_blur_mask(mask, radius=5.5)[:, :, None]

    if res_after > MAX_FACE_RESIDUAL:
        # Procedural jaw — still multi-viseme, zero pose risk
        meta["mode"] = "procedural-jaw"
        meta["reason"] = f"face_residual {res_after:.1f} > {MAX_FACE_RESIDUAL}"
        slight = _procedural_jaw(closed, mask, 0.35)
        mid = _procedural_jaw(closed, mask, 0.55)
        wide = _procedural_jaw(closed, mask, 0.78)
        round_p = _procedural_jaw(closed, mask, 0.60)
        # slight horizontal squash for round
        round_p = _round_mouth_warp(round_p, closed, mask, 0.25)
        meta["mask_mean"] = round(float(mask.mean()), 4)
        return MouthBank(closed.copy(), slight, mid, wide, round_p, mask, meta)

    diff = np.mean(np.abs(aligned - closed), axis=2, keepdims=True)
    band = base_mask[:, :, 0] > 0.08
    dmax = float(diff[band].max()) if band.any() else float(diff.max()) or 1.0
    diff_n = np.clip(diff / (0.42 * dmax + 1e-6), 0.0, 1.0)
    mask = base_mask * (0.50 + 0.50 * diff_n)
    mask = soft_dilate(mask[:, :, 0], k=11)
    mask = gaussian_blur_mask(mask, radius=5.0)[:, :, None]

    def make(open_amt: float, round_squash: float = 0.0) -> np.ndarray:
        open_cap = closed * (1.0 - open_amt) + aligned * open_amt
        plate = closed * (1.0 - mask) + open_cap * mask
        # Mix a little procedural cavity so open plate isn't the only cue
        proc = _procedural_jaw(closed, mask, open_amt * 0.55)
        plate = plate * 0.72 + proc * 0.28
        if round_squash > 0.01:
            plate = _round_mouth_warp(plate, closed, mask, round_squash)
        return plate.astype(np.float32)

    slight = make(VISEME_OPEN[SLIGHT])
    mid = make(VISEME_OPEN[MID])
    wide = make(VISEME_OPEN[WIDE])
    round_p = make(VISEME_OPEN[ROUND], round_squash=0.35)
    meta["mask_mean"] = round(float(mask.mean()), 4)
    return MouthBank(closed.copy(), slight, mid, wide, round_p, mask, meta)


def _round_mouth_warp(
    plate: np.ndarray,
    closed: np.ndarray,
    mask: np.ndarray,
    strength: float,
) -> np.ndarray:
    """Subtle vertical squeeze toward mouth center for rounded vowels."""
    h, w = plate.shape[:2]
    cy = int(h * (MOUTH_Y0 + MOUTH_Y1) / 2)
    out = plate.copy()
    y0 = max(0, int(h * MOUTH_Y0) - 8)
    y1 = min(h, int(h * MOUTH_Y1) + 8)
    for y in range(y0, y1):
        src_y = cy + (y - cy) * (1.0 - 0.18 * strength)
        src_y = float(np.clip(src_y, 0, h - 1.001))
        y_i = int(src_y)
        frac = src_y - y_i
        row = plate[y_i] * (1 - frac) + plate[min(y_i + 1, h - 1)] * frac
        a = mask[y, :, 0:1]
        out[y] = plate[y] * (1 - a * strength) + row * (a * strength)
    return out


# ── Speech envelope (phoneme / syllable / audio) ─────────────────────────────

@dataclass
class VisemeKey:
    t0: float
    t1: float
    viseme: int
    strength: float  # 0..1


def _char_viseme(ch: str) -> int:
    c = ch.lower()
    if c in "aáàâäāăæ":
        return WIDE
    if c in "eéèêëēĕiíìîïīĭyý":
        return SLIGHT
    if c in "oóòôöōŏuúùûüūŭ":
        return ROUND
    if c in "w":
        return ROUND
    return MID


def syllable_viseme_keys(
    text: str,
    *,
    lead: float = 0.32,
    max_end: float = 4.4,
) -> list[VisemeKey]:
    """Map Narragansett/English orthography → timed viseme keys.

    Each vowel nucleus opens to its viseme; consonants briefly rest or slight.
    Word boundaries insert a micro rest so pronunciation feels intentional.
    """
    cleaned = re.sub(r"[?!,.;:\"()]+", " ", text)
    words = [w.strip("-–—") for w in cleaned.split() if w.strip("-–—")]
    words = [w for w in words if w.lower() not in {"or", "and", "a", "the"}]
    if not words:
        return []

    units: list[tuple[str, int]] = []
    for w in words:
        units.append(("gap", REST))
        in_v = False
        for ch in w:
            is_v = ch in _VOWELS
            if is_v:
                units.append(("v", _char_viseme(ch)))
                in_v = True
            else:
                if ch.isalpha():
                    units.append(("c", SLIGHT if in_v else REST))
                in_v = False
        units.append(("end", REST))

    while units and units[0][0] == "gap":
        units.pop(0)

    open_v, gap_c, word_gap = 0.13, 0.045, 0.10
    speech_n = sum(1 for k, _ in units if k in {"v", "c"})
    est = lead + speech_n * 0.11 + max(0, len(words) - 1) * word_gap
    scale = (max_end - lead) / max(0.25, est - lead) if est > max_end else 1.0
    open_v *= scale
    gap_c *= scale
    word_gap *= scale

    keys: list[VisemeKey] = []
    t = lead
    for kind, vid in units:
        if kind == "gap":
            t += word_gap * 0.55
            continue
        if kind == "end":
            a, b = t, min(t + gap_c * 0.8, max_end)
            if b > a + 0.02:
                keys.append(VisemeKey(a, b, REST, 0.15))
            t = b + word_gap * 0.35
            continue
        if kind == "v":
            hold = open_v * (1.15 if vid == WIDE else 1.0)
            strength = 1.0 if vid in (WIDE, ROUND) else 0.85
            a, b = t, min(t + hold, max_end)
            if b > a + 0.04:
                keys.append(VisemeKey(round(a, 4), round(b, 4), vid, strength))
            t = b + gap_c * 0.5
        else:
            hold = gap_c * 1.1
            a, b = t, min(t + hold, max_end)
            if b > a + 0.03:
                keys.append(VisemeKey(round(a, 4), round(b, 4), vid, 0.45))
            t = b + gap_c * 0.25
        if t >= max_end:
            break
    return keys


def audio_viseme_keys(audio: Path, *, fps: int = FPS, dur: float = DUR) -> list[VisemeKey]:
    """RMS energy → open amount; map strength bands to visemes (mid/wide)."""
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
    thr = max(peak * 0.14, 90.0)
    keys: list[VisemeKey] = []
    i = 0
    while i < len(rms):
        if rms[i] < thr:
            i += 1
            continue
        j = i
        while j < len(rms) and rms[j] >= thr:
            j += 1
        if j - i >= 2:
            a, b = i / fps, min(j / fps, dur - 0.05)
            seg = rms[i:j]
            avg = sum(seg) / len(seg)
            rel = avg / (peak + 1e-6)
            if rel > 0.72:
                vid, strength = WIDE, min(1.0, rel)
            elif rel > 0.45:
                vid, strength = MID, min(1.0, rel + 0.1)
            else:
                vid, strength = SLIGHT, max(0.4, rel + 0.2)
            keys.append(VisemeKey(round(a, 4), round(b, 4), vid, strength))
        i = max(j, i + 1)
    return keys




def audio_rms_envelope(audio: Path, *, fps: int = FPS, sr: int = 16000) -> list[float]:
    """Per-frame RMS 0..1 for an oral clip."""
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
        rms.append(acc ** 0.5)
    peak = max(rms) if rms else 1.0
    return [min(1.0, r / (peak + 1e-6)) for r in rms]


def detect_speech_window(
    audio: Path, *, sr: int = 16000, thr_ratio: float = 0.10
) -> tuple[float, float]:
    """Return (onset_s, offset_s) of primary speech in oral file."""
    raw = subprocess.check_output(
        [FFMPEG, "-v", "error", "-i", str(audio), "-ac", "1", "-ar", str(sr), "-f", "s16le", "-"]
    )
    if len(raw) < 4:
        return 0.0, 0.0
    n = len(raw) // 2
    samples = struct.unpack(f"<{n}h", raw)
    peak = max(abs(s) for s in samples) or 1
    thr = max(int(peak * thr_ratio), 400)
    # 20ms hop
    hop = max(1, sr // 50)
    active = []
    for i in range(0, n, hop):
        chunk = samples[i : i + hop]
        if max(abs(s) for s in chunk) >= thr:
            active.append(i / sr)
    if not active:
        return 0.0, n / sr
    return active[0], active[-1] + hop / sr


def normalize_oral_slot(
    src: Path,
    dst: Path,
    *,
    lead: float = 0.22,
    total: float = DUR,
    sr: int = 24000,
) -> dict:
    """Trim silence, place speech at fixed lead, pad to total seconds.

    This is the shared clock contract: bake mouth and mux the *same* normalized
    oral so lips and language cannot drift.
    """
    dst.parent.mkdir(parents=True, exist_ok=True)
    onset, offset = detect_speech_window(src)
    speech_dur = max(0.12, offset - onset)
    # Cap speech so it fits after lead with 0.25s tail room
    max_speech = max(0.4, total - lead - 0.25)
    use_dur = min(speech_dur, max_speech)
    # Extract speech, then pad front with lead silence via adelay + apad
    tmp = dst.with_suffix(".raw.wav")
    # -ss onset -t use_dur then pad
    cmd = [
        FFMPEG, "-y",
        "-ss", f"{onset:.4f}",
        "-i", str(src),
        "-t", f"{use_dur:.4f}",
        "-af",
        f"aformat=sample_rates={sr}:channel_layouts=mono,"
        f"adelay={int(lead*1000)}|{int(lead*1000)},"
        f"apad=whole_dur={total:.3f},atrim=0:{total:.3f},asetpts=PTS-STARTPTS",
        "-ar", str(sr), "-ac", "1", "-c:a", "pcm_s16le",
        str(tmp),
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    # encode mp3 for packaging when dst ends with .mp3
    if dst.suffix.lower() == ".mp3":
        subprocess.run(
            [
                FFMPEG, "-y", "-i", str(tmp),
                "-codec:a", "libmp3lame", "-b:a", "128k",
                str(dst),
            ],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        tmp.unlink(missing_ok=True)
    else:
        tmp.replace(dst)
    meta = {
        "onset_src": round(onset, 4),
        "offset_src": round(offset, 4),
        "lead": lead,
        "speech_used": round(use_dur, 4),
        "total": total,
    }
    return meta


def hybrid_viseme_keys(
    text: str,
    audio: Path,
    *,
    fps: int = FPS,
    dur: float = DUR,
) -> list[VisemeKey]:
    """Text multi-viseme shapes time-warped onto real audio speech window.

    Shared clock: peaks live only where the packaged oral has energy;
    shapes still follow Narragansett orthography (wide/round/slight).
    """
    a_keys = audio_viseme_keys(audio, fps=fps, dur=dur)
    # Build text keys with zero lead so we can scale purely relative
    t_keys = syllable_viseme_keys(text, lead=0.0, max_end=12.0)
    if not a_keys and not t_keys:
        return []
    if not a_keys:
        return t_keys
    if not t_keys:
        return a_keys

    # Speech window from audio (with tiny pad)
    a0 = max(0.0, a_keys[0].t0 - 0.02)
    a1 = min(dur - 0.05, a_keys[-1].t1 + 0.04)
    t0 = t_keys[0].t0
    t1 = t_keys[-1].t1
    span_t = max(0.12, t1 - t0)
    span_a = max(0.12, a1 - a0)
    scale = span_a / span_t

    env = audio_rms_envelope(audio, fps=fps)
    out: list[VisemeKey] = []
    for k in t_keys:
        nt0 = a0 + (k.t0 - t0) * scale
        nt1 = a0 + (k.t1 - t0) * scale
        if nt1 > nt0 + 0.03 and nt0 < dur:
            mid = (nt0 + nt1) * 0.5
            idx = int(round(mid * fps))
            rel = env[idx] if 0 <= idx < len(env) else 0.5
            # Shape from text; open amount gated hard by real oral energy
            strength = min(1.0, k.strength * (0.25 + 0.95 * rel))
            if rel < 0.08:
                strength *= 0.15  # near-silent → nearly closed
            out.append(
                VisemeKey(
                    round(max(0.0, nt0), 4),
                    round(min(dur - 0.02, nt1), 4),
                    k.viseme,
                    strength,
                )
            )
    return out if out else a_keys


def sample_viseme(t: float, keys: list[VisemeKey]) -> tuple[int, float]:
    """Return (viseme_id, alpha 0..1) at time t with smooth attack/release."""
    best_a = 0.0
    best_v = REST
    for k in keys:
        if t < k.t0 or t > k.t1:
            continue
        u = (t - k.t0) / max(1e-6, k.t1 - k.t0)
        env = math.sin(math.pi * u) ** 1.15
        a = env * k.strength
        if a > best_a:
            best_a = a
            best_v = k.viseme
    return best_v, min(1.0, best_a)


def blend_viseme_plates(
    bank: MouthBank,
    viseme: int,
    alpha: float,
) -> np.ndarray:
    """Crossfade rest → target viseme plate by alpha."""
    if alpha < 0.02:
        return bank.rest
    target = bank.plate(viseme)
    a = min(1.0, alpha)
    a = a ** 0.92
    return bank.rest * (1.0 - a) + target * a


# ── Face tracking on motion frames ───────────────────────────────────────────

def face_band(img: np.ndarray) -> np.ndarray:
    y0, y1 = int(H * 0.18), int(H * 0.68)
    x0, x1 = int(W * 0.12), int(W * 0.88)
    band = img[y0:y1, x0:x1].mean(axis=2)
    return band - band.mean()


def track_shift(ref_band: np.ndarray, frame: np.ndarray) -> tuple[int, int]:
    """Phase-correlate face band of frame vs closed still → (dy, dx)."""
    y0, y1 = int(H * 0.18), int(H * 0.68)
    x0, x1 = int(W * 0.12), int(W * 0.88)
    b = frame[y0:y1, x0:x1].mean(axis=2)
    b = b - b.mean()
    if b.shape != ref_band.shape:
        return 0, 0
    fa = np.fft.fft2(ref_band)
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
    return int(np.clip(dy, -36, 36)), int(np.clip(dx, -36, 36))


def apply_mouth_on_frame(
    frame: np.ndarray,
    mouth_rgb: np.ndarray,
    mask: np.ndarray,
    dy: int,
    dx: int,
    alpha: float,
) -> np.ndarray:
    """Composite mouth plate onto motion frame at tracked offset."""
    if alpha < 0.02:
        return frame
    m_rgb = shift_image(mouth_rgb, dy, dx)
    m_mask = shift_image(mask, dy, dx)
    a = np.clip(m_mask * alpha, 0.0, 1.0)
    return frame * (1.0 - a) + m_rgb * a


# ── Body language (procedural when no I2V) ───────────────────────────────────

GESTURE_IDLE = "idle"
GESTURE_WAVE = "wave"
GESTURE_OPEN_HAND = "open_hand"
GESTURE_HEART = "heart"
GESTURE_BOW = "bow"
GESTURE_THANK = "thank"
GESTURE_POINT_SELF = "point_self"
GESTURE_BECKON = "beckon"
GESTURE_COUNT = "count"
GESTURE_OFFER = "offer"
GESTURE_LISTEN = "listen"
GESTURE_SETTLE = "settle"
GESTURE_YAWN = "yawn"
GESTURE_NOD = "nod"
GESTURE_LOOK = "look"


@dataclass
class GesturePlan:
    name: str
    peak_t: float = 1.4
    peak_w: float = 1.8
    strength: float = 0.85
    breath: float = 1.0
    blink: bool = True


def gesture_envelope(t: float, plan: GesturePlan) -> float:
    u = (t - plan.peak_t) / max(0.2, plan.peak_w / 2)
    if abs(u) > 1.4:
        return 0.0
    return math.exp(-0.5 * (u * 1.35) ** 2) * plan.strength


def body_life_frame(
    base: np.ndarray,
    t: float,
    dur: float,
    plan: GesturePlan,
    *,
    zoom: str = "in",
) -> np.ndarray:
    """Render one living frame from a still with intentional body language."""
    h, w = base.shape[:2]
    g = gesture_envelope(t, plan)
    breath = 0.012 * plan.breath * math.sin(2 * math.pi * t / 3.6)
    head_sway = 0.004 * math.sin(2 * math.pi * t / 5.1 + 0.4)

    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    src_y = yy.copy()
    src_x = xx.copy()

    ny = yy / h
    nx = xx / w

    torso = np.clip((ny - 0.32) / 0.55, 0, 1) * np.clip((0.92 - ny) / 0.15, 0, 1)
    src_y += breath * h * 0.55 * torso * (ny - 0.55)

    head = np.clip((0.48 - ny) / 0.30, 0, 1) ** 1.2
    src_x += head_sway * w * head

    name = plan.name
    if name == GESTURE_WAVE:
        arm = np.clip((nx - 0.52) / 0.35, 0, 1) * np.clip((ny - 0.28) / 0.40, 0, 1)
        arm *= np.clip((0.72 - ny) / 0.15, 0, 1)
        src_y -= g * 28 * arm * (0.55 + 0.45 * math.sin(2 * math.pi * t / 0.9))
        src_x += g * 10 * arm
    elif name == GESTURE_OPEN_HAND:
        hand = np.clip((nx - 0.35) / 0.40, 0, 1) * np.clip((ny - 0.40) / 0.30, 0, 1)
        src_y -= g * 12 * hand
        src_x += g * 8 * hand * math.sin(math.pi * min(1, t / 2.0))
    elif name == GESTURE_HEART or name == GESTURE_POINT_SELF:
        chest = np.exp(-((nx - 0.5) ** 2) / 0.04 - ((ny - 0.48) ** 2) / 0.03)
        src_y += g * 10 * chest
        src_x += g * 4 * chest * (0.5 - nx) * 2
        head_n = np.clip((0.45 - ny) / 0.28, 0, 1)
        src_y += g * 6 * head_n * math.sin(math.pi * min(1.0, max(0, (t - 0.6) / 1.2)))
    elif name == GESTURE_BOW:
        upper = np.clip((0.70 - ny) / 0.55, 0, 1)
        src_y += g * 22 * upper * (ny * 0.4 + 0.3)
    elif name == GESTURE_THANK:
        palms = np.exp(-((nx - 0.35) ** 2) / 0.05 - ((ny - 0.52) ** 2) / 0.04) + np.exp(
            -((nx - 0.65) ** 2) / 0.05 - ((ny - 0.52) ** 2) / 0.04
        )
        src_y -= g * 14 * palms
        src_x += g * 12 * palms * (nx - 0.5) * 2
    elif name == GESTURE_BECKON:
        arm = np.clip((0.55 - nx) / 0.35, 0, 1) * np.clip((ny - 0.35) / 0.35, 0, 1)
        phase = math.sin(2 * math.pi * t / 1.1)
        src_x += g * 14 * arm * phase
        src_y -= g * 8 * arm * abs(phase)
    elif name == GESTURE_COUNT:
        hand = np.clip((nx - 0.45) / 0.30, 0, 1) * np.clip((ny - 0.35) / 0.28, 0, 1)
        beat = 0.5 + 0.5 * math.sin(2 * math.pi * t / 1.5)
        src_y -= g * 18 * hand * beat
    elif name == GESTURE_OFFER:
        bowl = np.exp(-((nx - 0.5) ** 2) / 0.06 - ((ny - 0.58) ** 2) / 0.04)
        src_y -= g * 10 * bowl
        src_x += g * 3 * bowl * math.sin(2 * math.pi * t / 4)
    elif name == GESTURE_LISTEN:
        head_n = np.clip((0.48 - ny) / 0.30, 0, 1)
        src_x += g * 7 * head_n * math.sin(math.pi * min(1, t / 2.5))
        src_y += g * 3 * head_n
    elif name == GESTURE_SETTLE:
        body = np.clip((ny - 0.25) / 0.7, 0, 1)
        src_y += g * 16 * body * min(1.0, t / 2.5)
    elif name == GESTURE_YAWN:
        head_n = np.clip((0.50 - ny) / 0.32, 0, 1)
        src_y -= g * 8 * head_n
    elif name == GESTURE_NOD:
        head_n = np.clip((0.48 - ny) / 0.30, 0, 1)
        src_y += g * 10 * head_n * math.sin(2 * math.pi * t / 1.6)
    elif name == GESTURE_LOOK:
        head_n = np.clip((0.48 - ny) / 0.30, 0, 1)
        src_x += g * 9 * head_n * math.sin(2 * math.pi * t / 5.5)

    src_y = np.clip(src_y, 0, h - 1.001)
    src_x = np.clip(src_x, 0, w - 1.001)
    y0 = np.floor(src_y).astype(np.int32)
    x0 = np.floor(src_x).astype(np.int32)
    y1 = np.minimum(y0 + 1, h - 1)
    x1 = np.minimum(x0 + 1, w - 1)
    wy = (src_y - y0)[:, :, None]
    wx = (src_x - x0)[:, :, None]
    frame = (
        base[y0, x0] * (1 - wy) * (1 - wx)
        + base[y0, x1] * (1 - wy) * wx
        + base[y1, x0] * wy * (1 - wx)
        + base[y1, x1] * wy * wx
    )

    if plan.blink:
        for bt in (2.35, 5.05):
            d = abs(t - bt)
            if d < 0.07:
                blink_a = (1.0 - d / 0.07) * 0.55
                ey0, ey1 = int(h * 0.30), int(h * 0.42)
                ex0, ex1 = int(w * 0.22), int(w * 0.78)
                patch = frame[ey0:ey1, ex0:ex1]
                frame[ey0:ey1, ex0:ex1] = patch * (1.0 - blink_a * 0.35)

    frame = kenburns_crop(frame, t, dur, zoom)
    return frame


def kenburns_crop(frame: np.ndarray, t: float, dur: float, zoom: str) -> np.ndarray:
    z0, z1 = (1.0, 1.045) if zoom == "in" else (1.045, 1.0)
    z = z0 + (z1 - z0) * (t / max(dur, 1e-6))
    z = max(1.0, min(1.07, z))
    if abs(z - 1.0) < 1e-3:
        return np.clip(frame, 0, 255).astype(np.float32)
    h, w = frame.shape[:2]
    nh, nw = int(round(h * z)), int(round(w * z))
    im = Image.fromarray(np.clip(frame, 0, 255).astype(np.uint8)).resize(
        (nw, nh), Image.Resampling.BILINEAR
    )
    left = (nw - w) // 2
    top = (nh - h) // 2
    im = im.crop((left, top, left + w, top + h))
    return np.asarray(im, dtype=np.float32)


# ── Gesture table for all Little Ones lines ──────────────────────────────────

LINE_GESTURES: dict[str, GesturePlan] = {
    "k1": GesturePlan(GESTURE_WAVE, peak_t=1.2, peak_w=2.4, strength=0.95),
    "k2": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.5, peak_w=2.0, strength=0.85),
    "k3": GesturePlan(GESTURE_HEART, peak_t=1.3, peak_w=2.2, strength=0.9),
    "k4": GesturePlan(GESTURE_BOW, peak_t=1.6, peak_w=2.4, strength=0.88),
    "k5": GesturePlan(GESTURE_THANK, peak_t=1.4, peak_w=2.0, strength=0.9),
    "mk1": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.3, peak_w=1.8, strength=0.8),
    "mk2": GesturePlan(GESTURE_OFFER, peak_t=1.4, peak_w=2.0, strength=0.85),
    "mk3": GesturePlan(GESTURE_BECKON, peak_t=1.5, peak_w=2.0, strength=0.85),
    "mk4": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.4, peak_w=1.8, strength=0.8),
    "mk5": GesturePlan(GESTURE_THANK, peak_t=1.4, peak_w=2.0, strength=0.9),
    "ck1": GesturePlan(GESTURE_COUNT, peak_t=1.2, peak_w=1.6, strength=0.9),
    "ck2": GesturePlan(GESTURE_COUNT, peak_t=1.3, peak_w=1.6, strength=0.9),
    "ck3": GesturePlan(GESTURE_COUNT, peak_t=1.3, peak_w=1.6, strength=0.9),
    "ck4": GesturePlan(GESTURE_COUNT, peak_t=1.2, peak_w=1.5, strength=0.9),
    "ck5": GesturePlan(GESTURE_COUNT, peak_t=1.4, peak_w=1.8, strength=0.95),
    "fkids1": GesturePlan(GESTURE_LOOK, peak_t=1.5, peak_w=2.2, strength=0.75),
    "fkids2": GesturePlan(GESTURE_LOOK, peak_t=1.5, peak_w=2.2, strength=0.75),
    "fkids3": GesturePlan(GESTURE_POINT_SELF, peak_t=1.3, peak_w=2.0, strength=0.9),
    "fkids4": GesturePlan(GESTURE_LISTEN, peak_t=1.6, peak_w=2.4, strength=0.8),
    "fkids5": GesturePlan(GESTURE_LISTEN, peak_t=1.6, peak_w=2.4, strength=0.8),
    "hk1": GesturePlan(GESTURE_LOOK, peak_t=1.8, peak_w=2.5, strength=0.7),
    "hk2": GesturePlan(GESTURE_IDLE, peak_t=1.5, peak_w=2.0, strength=0.5, breath=1.2),
    "hk3": GesturePlan(GESTURE_BECKON, peak_t=1.4, peak_w=2.0, strength=0.9),
    "hk4": GesturePlan(GESTURE_YAWN, peak_t=1.6, peak_w=2.2, strength=0.85),
    "hk5": GesturePlan(GESTURE_SETTLE, peak_t=2.0, peak_w=2.8, strength=0.85),
    "dk1": GesturePlan(GESTURE_LOOK, peak_t=1.5, peak_w=2.2, strength=0.75),
    "dk2": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.4, peak_w=2.0, strength=0.8),
    "dk3": GesturePlan(GESTURE_WAVE, peak_t=1.5, peak_w=2.0, strength=0.7),
    "dk4": GesturePlan(GESTURE_LOOK, peak_t=1.6, peak_w=2.2, strength=0.75),
    "dk5": GesturePlan(GESTURE_SETTLE, peak_t=1.8, peak_w=2.4, strength=0.8),
    "sk1": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.4, peak_w=2.0, strength=0.8),
    "sk2": GesturePlan(GESTURE_LOOK, peak_t=1.5, peak_w=2.0, strength=0.75),
    "sk3": GesturePlan(GESTURE_IDLE, peak_t=1.5, peak_w=2.0, strength=0.55, breath=1.15),
    "sk4": GesturePlan(GESTURE_SETTLE, peak_t=1.6, peak_w=2.2, strength=0.8),
    "sk5": GesturePlan(GESTURE_OFFER, peak_t=1.5, peak_w=2.0, strength=0.85),
    "bk1": GesturePlan(GESTURE_LOOK, peak_t=1.3, peak_w=2.0, strength=0.8),
    "bk2": GesturePlan(GESTURE_LOOK, peak_t=1.4, peak_w=2.0, strength=0.8),
    "bk3": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.4, peak_w=1.8, strength=0.8),
    "bk4": GesturePlan(GESTURE_WAVE, peak_t=1.5, peak_w=2.0, strength=0.75),
    "bk5": GesturePlan(GESTURE_POINT_SELF, peak_t=1.3, peak_w=1.8, strength=0.8),
    "wk1": GesturePlan(GESTURE_OFFER, peak_t=1.3, peak_w=1.8, strength=0.85),
    "wk2": GesturePlan(GESTURE_LOOK, peak_t=1.5, peak_w=2.0, strength=0.8),
    "wk3": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.4, peak_w=1.8, strength=0.8),
    "wk4": GesturePlan(GESTURE_LOOK, peak_t=1.5, peak_w=2.0, strength=0.75),
    "wk5": GesturePlan(GESTURE_WAVE, peak_t=1.4, peak_w=2.0, strength=0.8),
    "skids1": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.4, peak_w=2.0, strength=0.8),
    "skids2": GesturePlan(GESTURE_BECKON, peak_t=1.5, peak_w=2.0, strength=0.85),
    "skids3": GesturePlan(GESTURE_YAWN, peak_t=1.5, peak_w=2.2, strength=0.9),
    "skids4": GesturePlan(GESTURE_SETTLE, peak_t=1.8, peak_w=2.5, strength=0.85),
    "skids5": GesturePlan(GESTURE_SETTLE, peak_t=2.0, peak_w=2.6, strength=0.8),
    "pk1": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.4, peak_w=2.0, strength=0.85),
    "pk2": GesturePlan(GESTURE_LOOK, peak_t=1.5, peak_w=2.0, strength=0.75),
    "pk3": GesturePlan(GESTURE_LOOK, peak_t=1.5, peak_w=2.0, strength=0.75),
    "pk4": GesturePlan(GESTURE_THANK, peak_t=1.4, peak_w=2.0, strength=0.9),
    "pk5": GesturePlan(GESTURE_WAVE, peak_t=1.4, peak_w=2.0, strength=0.8),
    "lk1": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.4, peak_w=2.0, strength=0.8),
    "lk2": GesturePlan(GESTURE_OFFER, peak_t=1.5, peak_w=2.0, strength=0.85),
    "lk3": GesturePlan(GESTURE_OFFER, peak_t=1.5, peak_w=2.0, strength=0.85),
    "lk4": GesturePlan(GESTURE_IDLE, peak_t=1.5, peak_w=2.0, strength=0.6, breath=1.2),
    "lk5": GesturePlan(GESTURE_LOOK, peak_t=1.5, peak_w=2.0, strength=0.75),
    # Young Path (Student) — parallel to Little Ones gestures
    "gs1": GesturePlan(GESTURE_WAVE, peak_t=1.2, peak_w=2.4, strength=0.95),
    "gs2": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.5, peak_w=2.0, strength=0.85),
    "gs3": GesturePlan(GESTURE_HEART, peak_t=1.3, peak_w=2.2, strength=0.9),
    "gs4": GesturePlan(GESTURE_BOW, peak_t=1.6, peak_w=2.4, strength=0.88),
    "gs5": GesturePlan(GESTURE_THANK, peak_t=1.4, peak_w=2.0, strength=0.9),
    "ms1": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.3, peak_w=1.8, strength=0.8),
    "ms2": GesturePlan(GESTURE_OFFER, peak_t=1.4, peak_w=2.0, strength=0.85),
    "ms3": GesturePlan(GESTURE_BECKON, peak_t=1.5, peak_w=2.0, strength=0.85),
    "ms4": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.4, peak_w=1.8, strength=0.8),
    "ms5": GesturePlan(GESTURE_THANK, peak_t=1.4, peak_w=2.0, strength=0.9),
    "cs1": GesturePlan(GESTURE_COUNT, peak_t=1.2, peak_w=1.6, strength=0.9),
    "cs2": GesturePlan(GESTURE_COUNT, peak_t=1.3, peak_w=1.6, strength=0.9),
    "cs3": GesturePlan(GESTURE_COUNT, peak_t=1.3, peak_w=1.6, strength=0.9),
    "cs4": GesturePlan(GESTURE_COUNT, peak_t=1.2, peak_w=1.5, strength=0.9),
    "cs5": GesturePlan(GESTURE_COUNT, peak_t=1.4, peak_w=1.8, strength=0.95),
    "fs1": GesturePlan(GESTURE_LOOK, peak_t=1.5, peak_w=2.2, strength=0.75),
    "fs2": GesturePlan(GESTURE_LOOK, peak_t=1.5, peak_w=2.2, strength=0.75),
    "fs3": GesturePlan(GESTURE_POINT_SELF, peak_t=1.3, peak_w=2.0, strength=0.9),
    "fs4": GesturePlan(GESTURE_LISTEN, peak_t=1.6, peak_w=2.4, strength=0.8),
    "fs5": GesturePlan(GESTURE_LISTEN, peak_t=1.6, peak_w=2.4, strength=0.8),
    "hs1": GesturePlan(GESTURE_LOOK, peak_t=1.8, peak_w=2.5, strength=0.7),
    "hs2": GesturePlan(GESTURE_IDLE, peak_t=1.5, peak_w=2.0, strength=0.5, breath=1.2),
    "hs3": GesturePlan(GESTURE_BECKON, peak_t=1.4, peak_w=2.0, strength=0.9),
    "hs4": GesturePlan(GESTURE_YAWN, peak_t=1.6, peak_w=2.2, strength=0.85),
    "hs5": GesturePlan(GESTURE_SETTLE, peak_t=2.0, peak_w=2.8, strength=0.85),
    "ds1": GesturePlan(GESTURE_LOOK, peak_t=1.5, peak_w=2.2, strength=0.75),
    "ds2": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.4, peak_w=2.0, strength=0.8),
    "ds3": GesturePlan(GESTURE_WAVE, peak_t=1.5, peak_w=2.0, strength=0.7),
    "ds4": GesturePlan(GESTURE_LOOK, peak_t=1.6, peak_w=2.2, strength=0.75),
    "ds5": GesturePlan(GESTURE_SETTLE, peak_t=1.8, peak_w=2.4, strength=0.8),
    "ss1": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.4, peak_w=2.0, strength=0.8),
    "ss2": GesturePlan(GESTURE_LOOK, peak_t=1.5, peak_w=2.0, strength=0.75),
    "ss3": GesturePlan(GESTURE_IDLE, peak_t=1.5, peak_w=2.0, strength=0.55, breath=1.15),
    "ss4": GesturePlan(GESTURE_SETTLE, peak_t=1.6, peak_w=2.2, strength=0.8),
    "ss5": GesturePlan(GESTURE_OFFER, peak_t=1.5, peak_w=2.0, strength=0.85),
    "bs1": GesturePlan(GESTURE_LOOK, peak_t=1.3, peak_w=2.0, strength=0.8),
    "bs2": GesturePlan(GESTURE_LOOK, peak_t=1.4, peak_w=2.0, strength=0.8),
    "bs3": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.4, peak_w=1.8, strength=0.8),
    "bs4": GesturePlan(GESTURE_WAVE, peak_t=1.5, peak_w=2.0, strength=0.75),
    "bs5": GesturePlan(GESTURE_POINT_SELF, peak_t=1.3, peak_w=1.8, strength=0.8),
    "ws1": GesturePlan(GESTURE_OFFER, peak_t=1.3, peak_w=1.8, strength=0.85),
    "ws2": GesturePlan(GESTURE_LOOK, peak_t=1.5, peak_w=2.0, strength=0.8),
    "ws3": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.4, peak_w=1.8, strength=0.8),
    "ws4": GesturePlan(GESTURE_LOOK, peak_t=1.5, peak_w=2.0, strength=0.75),
    "ws5": GesturePlan(GESTURE_WAVE, peak_t=1.4, peak_w=2.0, strength=0.8),
    "sls1": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.4, peak_w=2.0, strength=0.8),
    "sls2": GesturePlan(GESTURE_BECKON, peak_t=1.5, peak_w=2.0, strength=0.85),
    "sls3": GesturePlan(GESTURE_YAWN, peak_t=1.5, peak_w=2.2, strength=0.9),
    "sls4": GesturePlan(GESTURE_SETTLE, peak_t=1.8, peak_w=2.5, strength=0.85),
    "sls5": GesturePlan(GESTURE_SETTLE, peak_t=2.0, peak_w=2.6, strength=0.8),
    "ps1": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.4, peak_w=2.0, strength=0.85),
    "ps2": GesturePlan(GESTURE_LOOK, peak_t=1.5, peak_w=2.0, strength=0.75),
    "ps3": GesturePlan(GESTURE_LOOK, peak_t=1.5, peak_w=2.0, strength=0.75),
    "ps4": GesturePlan(GESTURE_THANK, peak_t=1.4, peak_w=2.0, strength=0.9),
    "ps5": GesturePlan(GESTURE_WAVE, peak_t=1.4, peak_w=2.0, strength=0.8),
    "ls1": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.4, peak_w=2.0, strength=0.8),
    "ls2": GesturePlan(GESTURE_OFFER, peak_t=1.5, peak_w=2.0, strength=0.85),
    "ls3": GesturePlan(GESTURE_OFFER, peak_t=1.5, peak_w=2.0, strength=0.85),
    "ls4": GesturePlan(GESTURE_IDLE, peak_t=1.5, peak_w=2.0, strength=0.6, breath=1.2),
    "ls5": GesturePlan(GESTURE_LOOK, peak_t=1.5, peak_w=2.0, strength=0.75),
    # Adult Path — parallel to Young Path / Little Ones
    "ga1": GesturePlan(GESTURE_WAVE, peak_t=1.2, peak_w=2.4, strength=0.95),
    "ga2": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.5, peak_w=2.0, strength=0.85),
    "ga3": GesturePlan(GESTURE_HEART, peak_t=1.3, peak_w=2.2, strength=0.9),
    "ga4": GesturePlan(GESTURE_BOW, peak_t=1.6, peak_w=2.4, strength=0.88),
    "ga5": GesturePlan(GESTURE_THANK, peak_t=1.4, peak_w=2.0, strength=0.9),
    "ma1": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.3, peak_w=1.8, strength=0.85),
    "ma2": GesturePlan(GESTURE_OFFER, peak_t=1.4, peak_w=2.0, strength=0.9),
    "ma3": GesturePlan(GESTURE_BECKON, peak_t=1.5, peak_w=2.0, strength=0.85),
    "ma4": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.4, peak_w=1.8, strength=0.85),
    "ma5": GesturePlan(GESTURE_THANK, peak_t=1.4, peak_w=2.0, strength=0.9),
    "ca1": GesturePlan(GESTURE_COUNT, peak_t=1.2, peak_w=1.6, strength=0.95),
    "ca2": GesturePlan(GESTURE_COUNT, peak_t=1.3, peak_w=1.6, strength=0.95),
    "ca3": GesturePlan(GESTURE_COUNT, peak_t=1.3, peak_w=1.6, strength=0.95),
    "ca4": GesturePlan(GESTURE_COUNT, peak_t=1.2, peak_w=1.5, strength=0.95),
    "ca5": GesturePlan(GESTURE_COUNT, peak_t=1.4, peak_w=1.8, strength=1.0),
    "fa1": GesturePlan(GESTURE_LOOK, peak_t=1.5, peak_w=2.2, strength=0.85),
    "fa2": GesturePlan(GESTURE_LOOK, peak_t=1.5, peak_w=2.2, strength=0.85),
    "fa3": GesturePlan(GESTURE_POINT_SELF, peak_t=1.3, peak_w=2.0, strength=0.9),
    "fa4": GesturePlan(GESTURE_LISTEN, peak_t=1.6, peak_w=2.4, strength=0.85),
    "fa5": GesturePlan(GESTURE_LISTEN, peak_t=1.6, peak_w=2.4, strength=0.85),
    "ha1": GesturePlan(GESTURE_LOOK, peak_t=1.8, peak_w=2.5, strength=0.85),
    "ha2": GesturePlan(GESTURE_IDLE, peak_t=1.5, peak_w=2.0, strength=0.7, breath=1.25),
    "ha3": GesturePlan(GESTURE_BECKON, peak_t=1.4, peak_w=2.0, strength=0.9),
    "ha4": GesturePlan(GESTURE_YAWN, peak_t=1.6, peak_w=2.2, strength=0.85),
    "ha5": GesturePlan(GESTURE_SETTLE, peak_t=2.0, peak_w=2.8, strength=0.9),
    "da1": GesturePlan(GESTURE_LOOK, peak_t=1.5, peak_w=2.2, strength=0.85),
    "da2": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.4, peak_w=2.0, strength=0.85),
    "da3": GesturePlan(GESTURE_WAVE, peak_t=1.5, peak_w=2.0, strength=0.8),
    "da4": GesturePlan(GESTURE_LOOK, peak_t=1.6, peak_w=2.2, strength=0.85),
    "da5": GesturePlan(GESTURE_SETTLE, peak_t=1.8, peak_w=2.4, strength=0.85),
    "sa1": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.4, peak_w=2.0, strength=0.85),
    "sa2": GesturePlan(GESTURE_LOOK, peak_t=1.5, peak_w=2.0, strength=0.85),
    "sa3": GesturePlan(GESTURE_IDLE, peak_t=1.5, peak_w=2.0, strength=0.7, breath=1.2),
    "sa4": GesturePlan(GESTURE_SETTLE, peak_t=1.6, peak_w=2.2, strength=0.85),
    "sa5": GesturePlan(GESTURE_OFFER, peak_t=1.5, peak_w=2.0, strength=0.9),
    "ba1": GesturePlan(GESTURE_LOOK, peak_t=1.3, peak_w=2.0, strength=0.85),
    "ba2": GesturePlan(GESTURE_LOOK, peak_t=1.4, peak_w=2.0, strength=0.85),
    "ba3": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.4, peak_w=1.8, strength=0.85),
    "ba4": GesturePlan(GESTURE_WAVE, peak_t=1.5, peak_w=2.0, strength=0.85),
    "ba5": GesturePlan(GESTURE_POINT_SELF, peak_t=1.3, peak_w=1.8, strength=0.85),
    "wa1": GesturePlan(GESTURE_OFFER, peak_t=1.3, peak_w=1.8, strength=0.9),
    "wa2": GesturePlan(GESTURE_LOOK, peak_t=1.5, peak_w=2.0, strength=0.85),
    "wa3": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.4, peak_w=1.8, strength=0.85),
    "wa4": GesturePlan(GESTURE_LOOK, peak_t=1.5, peak_w=2.0, strength=0.85),
    "wa5": GesturePlan(GESTURE_WAVE, peak_t=1.4, peak_w=2.0, strength=0.9),
    "sla1": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.4, peak_w=2.0, strength=0.85),
    "sla2": GesturePlan(GESTURE_BECKON, peak_t=1.5, peak_w=2.0, strength=0.9),
    "sla3": GesturePlan(GESTURE_YAWN, peak_t=1.5, peak_w=2.2, strength=0.9),
    "sla4": GesturePlan(GESTURE_SETTLE, peak_t=1.8, peak_w=2.5, strength=0.9),
    "sla5": GesturePlan(GESTURE_SETTLE, peak_t=2.0, peak_w=2.6, strength=0.85),
    "pa1": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.4, peak_w=2.0, strength=0.9),
    "pa2": GesturePlan(GESTURE_LOOK, peak_t=1.5, peak_w=2.0, strength=0.85),
    "pa3": GesturePlan(GESTURE_LOOK, peak_t=1.5, peak_w=2.0, strength=0.85),
    "pa4": GesturePlan(GESTURE_THANK, peak_t=1.4, peak_w=2.0, strength=0.9),
    "pa5": GesturePlan(GESTURE_WAVE, peak_t=1.4, peak_w=2.0, strength=0.9),
    "la1": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.4, peak_w=2.0, strength=0.85),
    "la2": GesturePlan(GESTURE_OFFER, peak_t=1.5, peak_w=2.0, strength=0.9),
    "la3": GesturePlan(GESTURE_OFFER, peak_t=1.5, peak_w=2.0, strength=0.9),
    "la4": GesturePlan(GESTURE_IDLE, peak_t=1.5, peak_w=2.0, strength=0.75, breath=1.25),
    "la5": GesturePlan(GESTURE_LOOK, peak_t=1.5, peak_w=2.0, strength=0.85),
    # Elder Path — solemn public discourse gestures
    "ec1": GesturePlan(GESTURE_BECKON, peak_t=1.4, peak_w=2.0, strength=0.9),
    "ec2": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.4, peak_w=2.0, strength=0.9),
    "ec3": GesturePlan(GESTURE_BECKON, peak_t=1.5, peak_w=2.0, strength=0.9),
    "ec4": GesturePlan(GESTURE_LISTEN, peak_t=1.6, peak_w=2.4, strength=0.9),
    "ec5": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.4, peak_w=2.0, strength=0.95),
    "ew1": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.4, peak_w=2.0, strength=0.9),
    "ew2": GesturePlan(GESTURE_HEART, peak_t=1.4, peak_w=2.2, strength=0.9),
    "ew3": GesturePlan(GESTURE_LOOK, peak_t=1.5, peak_w=2.2, strength=0.85),
    "ew4": GesturePlan(GESTURE_BOW, peak_t=1.6, peak_w=2.4, strength=0.9),
    "ew5": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.5, peak_w=2.2, strength=0.95),
    "ed1": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.4, peak_w=2.0, strength=0.9),
    "ed2": GesturePlan(GESTURE_LOOK, peak_t=1.4, peak_w=2.0, strength=0.85),
    "ed3": GesturePlan(GESTURE_BECKON, peak_t=1.5, peak_w=2.0, strength=0.9),
    "ed4": GesturePlan(GESTURE_HEART, peak_t=1.4, peak_w=2.2, strength=0.95),
    "ed5": GesturePlan(GESTURE_LISTEN, peak_t=1.6, peak_w=2.4, strength=0.9),
    "es1": GesturePlan(GESTURE_LOOK, peak_t=1.5, peak_w=2.4, strength=0.9),
    "es2": GesturePlan(GESTURE_LOOK, peak_t=1.5, peak_w=2.2, strength=0.9),
    "es3": GesturePlan(GESTURE_LOOK, peak_t=1.6, peak_w=2.4, strength=0.9),
    "es4": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.4, peak_w=2.0, strength=0.85),
    "es5": GesturePlan(GESTURE_LOOK, peak_t=1.5, peak_w=2.2, strength=0.9),
    "emp1": GesturePlan(GESTURE_OFFER, peak_t=1.4, peak_w=2.0, strength=0.9),
    "emp2": GesturePlan(GESTURE_IDLE, peak_t=1.5, peak_w=2.0, strength=0.75, breath=1.2),
    "emp3": GesturePlan(GESTURE_OFFER, peak_t=1.4, peak_w=2.0, strength=0.9),
    "emp4": GesturePlan(GESTURE_OFFER, peak_t=1.4, peak_w=2.0, strength=0.85),
    "emp5": GesturePlan(GESTURE_HEART, peak_t=1.5, peak_w=2.0, strength=0.9),
    "et1": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.4, peak_w=2.0, strength=0.9),
    "et2": GesturePlan(GESTURE_OFFER, peak_t=1.4, peak_w=2.0, strength=0.9),
    "et3": GesturePlan(GESTURE_LOOK, peak_t=1.4, peak_w=2.0, strength=0.85),
    "et4": GesturePlan(GESTURE_THANK, peak_t=1.4, peak_w=2.0, strength=0.9),
    "et5": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.4, peak_w=2.0, strength=0.9),
    "em1": GesturePlan(GESTURE_LOOK, peak_t=1.5, peak_w=2.2, strength=0.85),
    "em2": GesturePlan(GESTURE_HEART, peak_t=1.4, peak_w=2.2, strength=0.9),
    "em3": GesturePlan(GESTURE_IDLE, peak_t=1.5, peak_w=2.0, strength=0.75, breath=1.2),
    "em4": GesturePlan(GESTURE_HEART, peak_t=1.4, peak_w=2.2, strength=0.95),
    "em5": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.5, peak_w=2.2, strength=0.9),
    "eka1": GesturePlan(GESTURE_BECKON, peak_t=1.4, peak_w=2.0, strength=0.9),
    "eka2": GesturePlan(GESTURE_SETTLE, peak_t=1.6, peak_w=2.4, strength=0.85),
    "eka3": GesturePlan(GESTURE_LOOK, peak_t=1.4, peak_w=2.0, strength=0.85),
    "eka4": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.4, peak_w=2.0, strength=0.9),
    "eka5": GesturePlan(GESTURE_SETTLE, peak_t=1.8, peak_w=2.4, strength=0.9),
    "eh1": GesturePlan(GESTURE_BECKON, peak_t=1.4, peak_w=2.0, strength=0.9),
    "eh2": GesturePlan(GESTURE_LOOK, peak_t=1.5, peak_w=2.2, strength=0.9),
    "eh3": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.4, peak_w=2.0, strength=0.9),
    "eh4": GesturePlan(GESTURE_OFFER, peak_t=1.5, peak_w=2.0, strength=0.9),
    "eh5": GesturePlan(GESTURE_OFFER, peak_t=1.5, peak_w=2.0, strength=0.95),
    "eg1": GesturePlan(GESTURE_WAVE, peak_t=1.4, peak_w=2.0, strength=0.9),
    "eg2": GesturePlan(GESTURE_WAVE, peak_t=1.4, peak_w=2.0, strength=0.85),
    "eg3": GesturePlan(GESTURE_HEART, peak_t=1.4, peak_w=2.0, strength=0.9),
    "eg4": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.4, peak_w=2.0, strength=0.85),
    "eg5": GesturePlan(GESTURE_LOOK, peak_t=1.4, peak_w=2.0, strength=0.85),
    "ep1": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.4, peak_w=2.4, strength=0.95),
    "ep2": GesturePlan(GESTURE_SETTLE, peak_t=1.6, peak_w=2.4, strength=0.9),
    "ep3": GesturePlan(GESTURE_BECKON, peak_t=1.5, peak_w=2.0, strength=0.9),
    "ep4": GesturePlan(GESTURE_HEART, peak_t=1.5, peak_w=2.2, strength=0.95),
    "ep5": GesturePlan(GESTURE_THANK, peak_t=1.5, peak_w=2.2, strength=0.95),
    "evt1": GesturePlan(GESTURE_LOOK, peak_t=1.5, peak_w=2.2, strength=0.9),
    "evt2": GesturePlan(GESTURE_LOOK, peak_t=1.5, peak_w=2.2, strength=0.85),
    "evt3": GesturePlan(GESTURE_LOOK, peak_t=1.4, peak_w=2.0, strength=0.9),
    "evt4": GesturePlan(GESTURE_OPEN_HAND, peak_t=1.4, peak_w=2.0, strength=0.9),
    "evt5": GesturePlan(GESTURE_LOOK, peak_t=1.5, peak_w=2.2, strength=0.9),
}


def gesture_for_line(line_id: str) -> GesturePlan:
    return LINE_GESTURES.get(line_id, GesturePlan(GESTURE_IDLE, strength=0.55))


GESTURE_I2V_PHRASE: dict[str, str] = {
    GESTURE_WAVE: "the child completes a warm friendly hand wave, arm rising then settling",
    GESTURE_OPEN_HAND: "the speaking child opens one palm outward in a gentle question",
    GESTURE_HEART: "the child places a hand softly over the heart and gives a small proud nod",
    GESTURE_BOW: "both children make a slow respectful bow and rise together",
    GESTURE_THANK: "both children offer a soft open-hand thank-you gesture outward",
    GESTURE_POINT_SELF: "the children lightly gesture toward their own chests with joy",
    GESTURE_BECKON: "a welcoming beckoning hand motion, inviting closer",
    GESTURE_COUNT: "the child lifts fingers to count, clear intentional hand motion",
    GESTURE_OFFER: "hands present or offer a wooden bowl / gift forward gently",
    GESTURE_LISTEN: "attentive listening posture, soft head tilt, calm presence",
    GESTURE_SETTLE: "the body eases downward into rest, shoulders soften",
    GESTURE_YAWN: "a natural sleepy stretch and soft yawn posture (mouth calm)",
    GESTURE_NOD: "a warm single nod of agreement",
    GESTURE_LOOK: "eyes and head gently track something meaningful in the scene",
    GESTURE_IDLE: "soft natural breathing and micro weight shift, alive but calm",
}


def i2v_body_prompt(line_id: str, english_hint: str = "") -> str:
    plan = gesture_for_line(line_id)
    phrase = GESTURE_I2V_PHRASE.get(plan.name, GESTURE_I2V_PHRASE[GESTURE_IDLE])
    hint = f" Meaning of the line: {english_hint}." if english_hint else ""
    return (
        f"Premium children’s cinematic storybook animation, same exact faces and costumes. "
        f"Physical body language only: {phrase}.{hint} "
        f"Soft breathing, fabric and hair micro-motion, gentle parallax. "
        f"CRITICAL: keep the mouth soft-closed or nearly still — do NOT animate speaking lips "
        f"(lips are composited separately). No face morph, no new characters, vertical 9:16."
    )
