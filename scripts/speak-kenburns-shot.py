#!/usr/bin/env python3
"""6s 1080×1920 speak-shot: syllable- or audio-driven mouth + Ken Burns.

Mouth is CLOSED by default. Opens only on speech energy (preferred) or on
syllable peaks derived from the Narragansett line text — never a fixed flap.
"""
from __future__ import annotations

import argparse
import re
import struct
import subprocess
import tempfile
from pathlib import Path

W, H, FPS, DUR = 1080, 1920, 24, 6.0
FFMPEG = "/usr/local/bin/ffmpeg"

# Algonquian orthography vowel nuclei (Williams-style + common diacritics)
_VOWELS = set("aeiouáéíóúàèìòùâêîôûäëïöüāēīōūăĕĭŏŭæœyAEIOUÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÄËÏÖÜĀĒĪŌŪĂĔĬŎŬÆŒY")


def syllable_spans(text: str) -> list[tuple[str, int]]:
    """Return [(word, n_syllables), ...] for spoken content."""
    cleaned = re.sub(r"[?!,.;:\"()]+", " ", text)
    words: list[tuple[str, int]] = []
    for raw in cleaned.split():
        w = raw.strip("-–—")
        if not w or w.lower() in {"or", "and", "a", "the"}:
            continue
        # vowel-group count; treat each contiguous vowel run as a syllable nucleus
        n = 0
        in_v = False
        for ch in w:
            is_v = ch in _VOWELS
            if is_v and not in_v:
                n += 1
            in_v = is_v
        n = max(1, n)
        words.append((w, n))
    return words


def syllable_open_intervals(
    text: str,
    *,
    lead: float = 0.28,
    open_s: float = 0.12,
    gap_s: float = 0.055,
    word_gap: float = 0.14,
    max_end: float = 4.6,
) -> list[tuple[float, float]]:
    """Open-mouth [start, end) intervals timed to syllable peaks of the line."""
    words = syllable_spans(text)
    if not words:
        return []

    # Slow, clear teaching pace; longer words stretch slightly but stay inside window
    total_syl = sum(n for _, n in words)
    # Target speech length ~0.17s per syllable + word gaps, clamped
    est = lead + total_syl * (open_s + gap_s) + max(0, len(words) - 1) * (word_gap - gap_s)
    scale = 1.0
    if est > max_end:
        scale = (max_end - lead) / max(0.2, est - lead)

    o = open_s * scale
    g = gap_s * scale
    wg = word_gap * scale

    opens: list[tuple[float, float]] = []
    t = lead
    for wi, (_w, n) in enumerate(words):
        for si in range(n):
            # hold the last syllable of each word a touch longer (stress)
            hold = o * (1.25 if si == n - 1 else 1.0)
            a, b = t, t + hold
            if a >= max_end:
                return opens
            b = min(b, max_end)
            if b > a + 0.04:
                opens.append((round(a, 4), round(b, 4)))
            t = b + g
        t += max(0.0, wg - g)
        if t >= max_end:
            break
    return opens


def audio_open_intervals(
    audio: Path,
    *,
    fps: int = FPS,
    dur: float = DUR,
    lead_pad: float = 0.0,
) -> list[tuple[float, float]]:
    """Derive open intervals from speech RMS energy of an audio file."""
    sr = 16000
    cmd = [
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
    raw = subprocess.check_output(cmd)
    if len(raw) < 4:
        return []
    n = len(raw) // 2
    samples = struct.unpack(f"<{n}h", raw)
    # frame RMS
    hop = max(1, sr // fps)
    rms: list[float] = []
    for i in range(0, n, hop):
        chunk = samples[i : i + hop]
        if not chunk:
            break
        acc = sum(s * s for s in chunk) / len(chunk)
        rms.append(acc**0.5)

    if not rms:
        return []
    peak = max(rms) or 1.0
    # Adaptive gate: open when energy is a meaningful fraction of peak
    thr = max(peak * 0.18, 120.0)
    # Hysteresis + min open / min closed (frames)
    min_open_f, min_closed_f = 2, 1
    open_flags = [v >= thr for v in rms]
    # smooth: close 1-frame holes
    for i in range(1, len(open_flags) - 1):
        if open_flags[i - 1] and open_flags[i + 1]:
            open_flags[i] = True

    opens: list[tuple[float, float]] = []
    i = 0
    while i < len(open_flags):
        if not open_flags[i]:
            i += 1
            continue
        j = i
        while j < len(open_flags) and open_flags[j]:
            j += 1
        if j - i >= min_open_f:
            a = i / fps + lead_pad
            b = j / fps + lead_pad
            if a < dur:
                opens.append((round(a, 4), round(min(b, dur - 0.05), 4)))
        # skip short closed runs already handled by outer loop
        i = max(j, i + min_closed_f)
    return opens


def enable_expr(opens: list[tuple[float, float]]) -> str:
    if not opens:
        return "0"
    parts = [f"between(t\\,{a:.3f}\\,{b:.3f})" for a, b in opens]
    return "+".join(parts)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("closed", type=Path)
    ap.add_argument("open", type=Path)
    ap.add_argument("out", type=Path)
    ap.add_argument("--zoom", choices=["in", "out"], default="in")
    ap.add_argument("--text", default="", help="Narragansett line (syllable mouth track)")
    ap.add_argument("--audio", type=Path, default=None, help="Optional speech audio for RMS mouth")
    ap.add_argument("--dur", type=float, default=DUR)
    args = ap.parse_args()
    args.out.parent.mkdir(parents=True, exist_ok=True)

    opens: list[tuple[float, float]] = []
    mode = "closed-only"
    if args.audio and args.audio.exists():
        opens = audio_open_intervals(args.audio, dur=args.dur)
        mode = f"audio-rms ({len(opens)} bursts)"
    if not opens and args.text.strip():
        opens = syllable_open_intervals(args.text.strip(), max_end=min(4.6, args.dur - 0.4))
        mode = f"syllable ({len(opens)} peaks · {args.text.strip()[:40]})"
    enable = enable_expr(opens)

    # Ken Burns: mild push-in or pull-out over the shot
    if args.zoom == "in":
        zexpr = "min(1.0+0.00085*on,1.12)"
    else:
        zexpr = "if(eq(on,1),1.12,max(1.12-0.00085*on,1.0))"

    fc = (
        f"[0:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1,"
        f"fps={FPS},format=yuv420p,loop=loop=-1:size=1,setpts=N/{FPS}/TB[c];"
        f"[1:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1,"
        f"fps={FPS},format=yuv420p,loop=loop=-1:size=1,setpts=N/{FPS}/TB[o];"
        f"[c][o]overlay=0:0:enable='{enable}'[spk];"
        f"[spk]scale=iw*1.2:ih*1.2,"
        f"zoompan=z='{zexpr}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
        f"d=1:s={W}x{H}:fps={FPS},format=yuv420p[v]"
    )

    cmd = [
        FFMPEG,
        "-y",
        "-i",
        str(args.closed),
        "-i",
        str(args.open),
        "-filter_complex",
        fc,
        "-map",
        "[v]",
        "-t",
        str(args.dur),
        "-r",
        str(FPS),
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
        str(args.out),
    ]
    # Write sidecar mouth track for QA / future sections
    side = args.out.with_suffix(".mouth.txt")
    side.write_text(
        f"mode={mode}\n"
        + "\n".join(f"{a:.3f}-{b:.3f}" for a, b in opens)
        + ("\n" if opens else "\n(none — mouth stays closed)\n")
    )

    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"OK {args.out} · {mode}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
