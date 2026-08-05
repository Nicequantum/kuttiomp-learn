#!/usr/bin/env python3
"""Rebuild Little Ones: open/closed mouth flap + Ken Burns → 1080×1920 (fast path).

Speak shots are already 1080×1920 H.264; we concat-copy (no re-encode) then poster.
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path("/workspace")
STILLS = ROOT / "film-kids" / "stills-v2"
SHOTS = ROOT / "film-kids" / "shots-v2"
EXPORT = ROOT / "film-kids" / "export-v2"
PUBLIC = ROOT / "public" / "scenes"
SPEAK = ROOT / "scripts" / "speak-kenburns-shot.py"
FFMPEG = "/usr/local/bin/ffmpeg"
W, H = 1080, 1920

CLIPS = [
    "greeting-kids",
    "meal-kids",
    "count-kids",
    "family-kids",
    "home-kids",
    "day-kids",
    "seasons-kids",
    "birds-kids",
    "water-kids",
    "sleep-kids",
    "path-kids",
    "land-kids",
]


def run(cmd: list[str], quiet: bool = False) -> None:
    print("+", " ".join(cmd[:8]), "..." if len(cmd) > 8 else "", flush=True)
    kwargs = {}
    if quiet:
        kwargs["stdout"] = subprocess.DEVNULL
        kwargs["stderr"] = subprocess.DEVNULL
    subprocess.run(cmd, check=True, **kwargs)


def build_shots(clip: str) -> list[Path]:
    base = STILLS / clip
    out_dir = SHOTS / clip
    out_dir.mkdir(parents=True, exist_ok=True)
    paths: list[Path] = []
    for i in range(1, 6):
        closed = base / "closed" / f"{i:02d}.jpg"
        open_m = base / "open" / f"{i:02d}.jpg"
        if not closed.exists() or not open_m.exists():
            raise FileNotFoundError(f"missing stills for {clip} shot {i}")
        out = out_dir / f"{i:02d}.mp4"
        zoom = "in" if i % 2 else "out"
        # Skip if already fresh speak shot from this run (exists & larger + recent optional)
        run(
            [
                sys.executable,
                str(SPEAK),
                str(closed),
                str(open_m),
                str(out),
                "--zoom",
                zoom,
            ]
        )
        paths.append(out)
    return paths


def concat_and_ship(clip: str, shots: list[Path]) -> None:
    EXPORT.mkdir(parents=True, exist_ok=True)
    lst = EXPORT / f"{clip}.txt"
    lst.write_text("".join(f"file '{s.resolve()}'\n" for s in shots))
    export = EXPORT / f"{clip}.mp4"
    public_mp4 = PUBLIC / f"{clip}.mp4"
    public_jpg = PUBLIC / f"{clip}.jpg"
    run(
        [
            FFMPEG,
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(lst),
            "-c",
            "copy",
            "-movflags",
            "+faststart",
            str(export),
        ],
        quiet=True,
    )
    run(["cp", "-f", str(export), str(public_mp4)])
    run(
        [
            FFMPEG,
            "-y",
            "-ss",
            "0.4",
            "-i",
            str(export),
            "-frames:v",
            "1",
            "-vf",
            f"scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2",
            "-q:v",
            "2",
            str(public_jpg),
        ],
        quiet=True,
    )
    print(f"OK {clip} → {public_mp4}", flush=True)


def main() -> int:
    only = sys.argv[1:] if len(sys.argv) > 1 else CLIPS
    for clip in only:
        print(f"\n=== {clip} ===", flush=True)
        shots = build_shots(clip)
        concat_and_ship(clip, shots)
    print("\nALL DONE", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
