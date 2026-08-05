#!/usr/bin/env python3
"""Stitch Little Ones HQ shot-per-line clips to 720x1280 app masters."""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path("/workspace")
W, H = 720, 1280
FPS = 24


def run(cmd: list[str]) -> None:
    print("+", " ".join(cmd), flush=True)
    subprocess.run(cmd, check=True)


def probe_has_audio(path: Path) -> bool:
    r = subprocess.run(
        [
            "/usr/local/bin/ffmpeg",
            "-i",
            str(path),
        ],
        capture_output=True,
        text=True,
    )
    return "Audio:" in (r.stderr or "")


def normalize_shot(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    # Scale to 720x1280, pad if needed, 24fps, silent-capable
    vf = (
        f"scale={W}:{H}:force_original_aspect_ratio=decrease,"
        f"pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color=black,"
        f"fps={FPS},format=yuv420p"
    )
    run(
        [
            "/usr/local/bin/ffmpeg",
            "-y",
            "-i",
            str(src),
            "-vf",
            vf,
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "slow",
            "-crf",
            "18",
            "-profile:v",
            "high",
            "-pix_fmt",
            "yuv420p",
            "-r",
            str(FPS),
            "-movflags",
            "+faststart",
            str(dst),
        ]
    )


def concat_copy(shots: list[Path], out: Path) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    lst = out.with_suffix(".txt")
    lst.write_text("".join(f"file '{s.resolve()}'\n" for s in shots))
    run(
        [
            "/usr/local/bin/ffmpeg",
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
            str(out),
        ]
    )


def poster_from(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    run(
        [
            "/usr/local/bin/ffmpeg",
            "-y",
            "-ss",
            "0.3",
            "-i",
            str(src),
            "-frames:v",
            "1",
            "-vf",
            f"scale={W}:{H}:force_original_aspect_ratio=decrease,"
            f"pad={W}:{H}:(ow-iw)/2:(oh-ih)/2",
            "-q:v",
            "2",
            str(dst),
        ]
    )


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("clip_id", help="e.g. greeting-kids")
    ap.add_argument(
        "--shots-dir",
        type=Path,
        default=None,
        help="Directory of 01.mp4..05.mp4 (default film-kids/shots-hq/<id>)",
    )
    args = ap.parse_args()
    clip = args.clip_id
    shots_dir = args.shots_dir or (ROOT / "film-kids" / "shots-hq" / clip)
    norm_dir = ROOT / "film-kids" / "shots-hq" / f"{clip}-norm"
    export = ROOT / "film-kids" / "export-hq" / f"{clip}.mp4"
    public_mp4 = ROOT / "public" / "scenes" / f"{clip}.mp4"
    public_jpg = ROOT / "public" / "scenes" / f"{clip}.jpg"

    raw = sorted(shots_dir.glob("*.mp4"))
    if not raw:
        print(f"No mp4 in {shots_dir}", file=sys.stderr)
        return 1

    norms: list[Path] = []
    for i, src in enumerate(raw, 1):
        dst = norm_dir / f"{i:02d}.mp4"
        normalize_shot(src, dst)
        norms.append(dst)

    concat_copy(norms, export)
    run(["cp", "-f", str(export), str(public_mp4)])
    poster_from(export, public_jpg)
    print(f"OK {clip} → {public_mp4} + {public_jpg}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
