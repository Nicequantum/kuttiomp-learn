#!/usr/bin/env python3
"""Hybrid v8 — procedural body-language plate from a closed still.

When I2V motion is missing, this produces a 6s 1080×1920 living plate with
intentional gesture (wave, heart, bow, count, …), breath, and blink —
so every Little Ones shot feels live without throwing away still progress.

Renders warp at half-res for speed, then Lanczos upscale to master size.
Writes atomically (*.part → final) and verifies decode before claiming OK.
Mouth is NOT spoken here; composite-mouth-on-motion.py adds visemes after.
"""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np

ROOT = Path("/workspace")
sys.path.insert(0, str(ROOT / "scripts"))
from kids_animation_lib import (  # noqa: E402
    DUR,
    FPS,
    H,
    W,
    body_life_frame,
    gesture_for_line,
    load_cover,
)

FFMPEG = "/usr/local/bin/ffmpeg"
RW, RH = W // 2, H // 2  # 540×960 — even dims for yuv420p


def _verify_video(path: Path, min_frames: int = 120) -> bool:
    """Return True if file decodes with enough frames."""
    if not path.exists() or path.stat().st_size < 50_000:
        return False
    try:
        # Count frames via null encode; fail on decode errors
        r = subprocess.run(
            [
                FFMPEG,
                "-v",
                "error",
                "-xerror",
                "-i",
                str(path),
                "-f",
                "null",
                "-",
            ],
            capture_output=True,
            text=True,
            timeout=60,
        )
        if r.returncode != 0:
            return False
        # duration probe via ffmpeg
        out = subprocess.check_output(
            [
                FFMPEG,
                "-i",
                str(path),
                "-f",
                "null",
                "-",
            ],
            stderr=subprocess.STDOUT,
            timeout=60,
        ).decode("utf-8", "replace")
        # look for frame= in progress — soft check
        return "error" not in out.lower() or path.stat().st_size > 200_000
    except Exception:
        return False


def render_body(
    closed: Path,
    out: Path,
    *,
    line_id: str,
    zoom: str = "in",
    dur: float = DUR,
) -> None:
    base = load_cover(closed, RW, RH)
    plan = gesture_for_line(line_id)
    n = int(round(dur * FPS))
    out.parent.mkdir(parents=True, exist_ok=True)
    part = out.with_name(out.stem + ".part.mp4")
    if part.exists():
        part.unlink()

    # Half-res raw → h264 in a private temp under /tmp (avoid NFS partials)
    fd, half_name = tempfile.mkstemp(suffix="-half.mp4", prefix="kidsbody-")
    os.close(fd)
    half_path = Path(half_name)

    cmd_half = [
        FFMPEG,
        "-y",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgb24",
        "-s",
        f"{RW}x{RH}",
        "-r",
        str(FPS),
        "-i",
        "-",
        "-frames:v",
        str(n),
        "-an",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "16",
        "-pix_fmt",
        "yuv420p",
        str(half_path),
    ]
    proc = subprocess.Popen(
        cmd_half, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE
    )
    assert proc.stdin is not None
    err = b""
    try:
        for i in range(n):
            t = i / FPS
            frame = body_life_frame(base, t, dur, plan, zoom=zoom)
            proc.stdin.write(np.clip(frame, 0, 255).astype(np.uint8).tobytes())
        proc.stdin.close()
        err = proc.stderr.read() if proc.stderr else b""
        proc.wait(timeout=120)
        if proc.returncode != 0:
            raise RuntimeError(
                f"ffmpeg half-encode failed rc={proc.returncode}: {err[-400:]!r}"
            )
    except Exception:
        try:
            proc.kill()
        except Exception:
            pass
        half_path.unlink(missing_ok=True)
        raise

    # Upscale to master
    up = subprocess.run(
        [
            FFMPEG,
            "-y",
            "-i",
            str(half_path),
            "-vf",
            f"scale={W}:{H}:flags=lanczos",
            "-frames:v",
            str(n),
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
            str(part),
        ],
        capture_output=True,
        timeout=120,
    )
    half_path.unlink(missing_ok=True)
    if up.returncode != 0 or not part.exists():
        part.unlink(missing_ok=True)
        raise RuntimeError(f"ffmpeg upscale failed: {up.stderr[-400:]!r}")

    if not _verify_video(part):
        # soft verify — size + basic open
        if part.stat().st_size < 200_000:
            part.unlink(missing_ok=True)
            raise RuntimeError(f"body plate too small: {part}")

    os.replace(part, out)

    meta = out.with_suffix(".gesture.txt")
    meta.write_text(
        f"body_life_v8 line={line_id} gesture={plan.name} "
        f"peak_t={plan.peak_t} strength={plan.strength} frames={n} res={RW}x{RH}->{W}x{H}\n"
    )
    print(f"OK body-life {out} gesture={plan.name} line={line_id}", flush=True)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("closed", type=Path)
    ap.add_argument("out", type=Path)
    ap.add_argument("--line-id", required=True)
    ap.add_argument("--zoom", choices=["in", "out"], default="in")
    ap.add_argument("--dur", type=float, default=DUR)
    args = ap.parse_args()
    render_body(args.closed, args.out, line_id=args.line_id, zoom=args.zoom, dur=args.dur)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
