#!/usr/bin/env python3
"""Create a 6s 1080x1920 cinematic Ken Burns shot from a still (fallback when I2V unavailable)."""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

W, H, FPS, DUR = 1080, 1920, 24, 6


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("still", type=Path)
    ap.add_argument("out", type=Path)
    ap.add_argument("--zoom", choices=["in", "out"], default="in")
    args = ap.parse_args()
    args.out.parent.mkdir(parents=True, exist_ok=True)
    frames = FPS * DUR
    # Slow push-in or pull-out
    if args.zoom == "in":
        z = f"zoompan=z='min(zoom+0.0008,1.18)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={W}x{H}:fps={FPS}"
    else:
        z = f"zoompan=z='if(eq(on,1),1.18,max(zoom-0.0008,1.0))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={W}x{H}:fps={FPS}"
    vf = f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},{z},format=yuv420p"
    cmd = [
        "/usr/local/bin/ffmpeg",
        "-y",
        "-loop",
        "1",
        "-i",
        str(args.still),
        "-vf",
        vf,
        "-t",
        str(DUR),
        "-r",
        str(FPS),
        "-an",
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "18",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        str(args.out),
    ]
    print("+", " ".join(cmd), flush=True)
    subprocess.run(cmd, check=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
