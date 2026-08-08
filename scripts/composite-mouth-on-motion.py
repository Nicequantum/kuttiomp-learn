#!/usr/bin/env python3
"""Hybrid v8 — face-tracked multi-viseme mouth on body-motion plate.

Preserves full-body I2V / procedural body life. Accents lower-face only,
with per-frame face tracking so lips ride head motion. Visemes from
phoneme table (text) or audio RMS when --audio is set.

Does not modify source motion or stills.
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

import numpy as np

ROOT = Path("/workspace")
sys.path.insert(0, str(ROOT / "scripts"))
from kids_animation_lib import (  # noqa: E402
    FPS,
    H,
    W,
    apply_mouth_on_frame,
    audio_viseme_keys,
    blend_viseme_plates,
    build_mouth_bank,
    face_band,
    hybrid_viseme_keys,
    load_cover,
    sample_viseme,
    syllable_viseme_keys,
    track_shift,
)

FFMPEG = "/usr/local/bin/ffmpeg"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("motion", type=Path)
    ap.add_argument("closed", type=Path)
    ap.add_argument("open", type=Path)
    ap.add_argument("out", type=Path)
    ap.add_argument("--text", default="")
    ap.add_argument("--audio", type=Path, default=None)
    ap.add_argument("--peak-gain", type=float, default=1.0)
    ap.add_argument(
        "--track",
        choices=["auto", "on", "off"],
        default="auto",
        help="Face track mouth ROI. auto=off for motion-v8 procedural, on for I2V.",
    )
    args = ap.parse_args()

    closed = load_cover(args.closed)
    open_m = load_cover(args.open)
    bank = build_mouth_bank(closed, open_m)

    keys = []
    source = "none"
    if args.audio and Path(args.audio).exists() and args.text.strip():
        keys = hybrid_viseme_keys(args.text.strip(), Path(args.audio))
        source = f"hybrid-audio-text ({len(keys)}) · {args.text.strip()[:40]}"
    elif args.audio and Path(args.audio).exists():
        keys = audio_viseme_keys(Path(args.audio))
        source = f"audio-rms ({len(keys)})"
    if not keys and args.text.strip():
        keys = syllable_viseme_keys(args.text.strip())
        source = f"phoneme ({len(keys)}) · {args.text.strip()[:48]}"

    use_mouth = bool(keys) and bank.meta.get("mode") in (
        "multi-viseme",
        "procedural-jaw",
    )
    # Auto-track: I2V (motion-v7) needs it; procedural body barely moves head
    motion_s = str(args.motion)
    if args.track == "on":
        do_track = True
    elif args.track == "off":
        do_track = False
    else:
        do_track = (
            "motion-v7" in motion_s
            or "motion-v11" in motion_s
            or "i2v" in motion_s.lower()
            or "bodylife" in motion_s
            or "-amp." in motion_s
            or "film-adult" in motion_s
            or "film-student" in motion_s
            or "film-elder" in motion_s
        )


    ref_band = face_band(closed) if do_track else None

    smooth_dy, smooth_dx = 0.0, 0.0
    smooth_a = 0.0
    last_vid = 0
    track_dy, track_dx = 0, 0

    cmd_in = [
        FFMPEG,
        "-v",
        "error",
        "-i",
        str(args.motion),
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgb24",
        "-s",
        f"{W}x{H}",
        "-r",
        str(FPS),
        "-",
    ]
    args.out.parent.mkdir(parents=True, exist_ok=True)
    cmd_out = [
        FFMPEG,
        "-y",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgb24",
        "-s",
        f"{W}x{H}",
        "-r",
        str(FPS),
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
        str(args.out),
    ]
    pin = subprocess.Popen(cmd_in, stdout=subprocess.PIPE)
    pout = subprocess.Popen(
        cmd_out, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    )
    assert pin.stdout and pout.stdin

    frame_bytes = W * H * 3
    i = 0
    mouth_frames = 0
    # Pre-blend plates once per viseme for speed when not tracking offset changes often
    try:
        while True:
            buf = pin.stdout.read(frame_bytes)
            if len(buf) < frame_bytes:
                break
            frame = np.frombuffer(buf, dtype=np.uint8).reshape(H, W, 3).astype(np.float32)
            if use_mouth:
                t = i / FPS
                vid, a = sample_viseme(t, keys)
                a = min(1.0, a * args.peak_gain)
                smooth_a = smooth_a * 0.35 + a * 0.65
                if a > 0.05:
                    last_vid = vid
                if do_track and ref_band is not None and i % 4 == 0:
                    track_dy, track_dx = track_shift(ref_band, frame)
                    k = 0.4 if smooth_a > 0.08 else 0.22
                    smooth_dy = smooth_dy * (1 - k) + track_dy * k
                    smooth_dx = smooth_dx * (1 - k) + track_dx * k
                if smooth_a > 0.025:
                    mouth_rgb = blend_viseme_plates(bank, last_vid, smooth_a)
                    frame = apply_mouth_on_frame(
                        frame,
                        mouth_rgb,
                        bank.mask,
                        int(round(smooth_dy)),
                        int(round(smooth_dx)),
                        smooth_a,
                    )
                    mouth_frames += 1
            pout.stdin.write(np.clip(frame, 0, 255).astype(np.uint8).tobytes())
            i += 1
    finally:
        pin.stdout.close()
        pout.stdin.close()
        pin.wait()
        pout.wait()

    side = args.out.with_suffix(".mouth.txt")
    side.write_text(
        f"hybrid_v8 frames={i} mouth_frames={mouth_frames} use_mouth={use_mouth} "
        f"track={do_track} source={source} mode={bank.meta.get('mode')} "
        f"residual={bank.meta.get('face_residual_after')}\n"
        f"meta={bank.meta}\n"
        + "\n".join(
            f"{k.t0:.3f}-{k.t1:.3f} v={k.viseme}@{k.strength:.2f}" for k in keys
        )
        + "\n"
    )
    print(
        f"OK v8-mouth {args.out} frames={i} mouth={use_mouth} track={do_track} "
        f"src={source} res={bank.meta.get('face_residual_after')} mode={bank.meta.get('mode')}",
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
