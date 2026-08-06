#!/usr/bin/env python3
"""Little Ones Hybrid v7 — I2V body life + ROI mouth layer → 1080×1920 masters.

Does NOT delete stills-v2 or v6 backups.
  motion-v7/  = image-to-video body/gesture plates (from closed stills)
  shots-v7/   = motion + optional mouth ROI composite
  export-v7/  = concat masters
  public/scenes/*-kids.mp4 = shipped

Usage:
  python3 scripts/rebuild-kids-hybrid-v7.py                 # stitch any ready motion
  python3 scripts/rebuild-kids-hybrid-v7.py greeting-kids   # one clip
  python3 scripts/rebuild-kids-hybrid-v7.py --mouth-only    # re-composite mouths only
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path("/workspace")
STILLS = ROOT / "film-kids" / "stills-v2"
MOTION = ROOT / "film-kids" / "motion-v7"
SHOTS = ROOT / "film-kids" / "shots-v7"
EXPORT = ROOT / "film-kids" / "export-v7"
PUBLIC = ROOT / "public" / "scenes"
SPEAK = ROOT / "scripts" / "speak-kenburns-shot.py"
COMPOSITE = ROOT / "scripts/composite-mouth-on-motion.py"
FFMPEG = "/usr/local/bin/ffmpeg"
W, H = 1080, 1920

# Import line list from v3 rebuild (single source)
import importlib.util
_spec = importlib.util.spec_from_file_location("rebuild_kids_lines", ROOT / "scripts" / "rebuild_kids_lines.py")
_mod = importlib.util.module_from_spec(_spec)
assert _spec and _spec.loader
_spec.loader.exec_module(_mod)
CLIPS = _mod.CLIPS


def run(cmd: list[str], quiet: bool = False) -> None:
    print("+", " ".join(str(c) for c in cmd[:12]), "..." if len(cmd) > 12 else "", flush=True)
    kwargs = {}
    if quiet:
        kwargs["stdout"] = subprocess.DEVNULL
        kwargs["stderr"] = subprocess.DEVNULL
    subprocess.run(cmd, check=True, **kwargs)


def normalize_motion(src: Path, dst: Path, dur: float = 6.0) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    vf = (
        f"scale={W}:{H}:force_original_aspect_ratio=increase,"
        f"crop={W}:{H},fps=24,format=yuv420p"
    )
    run(
        [
            FFMPEG,
            "-y",
            "-i",
            str(src),
            "-vf",
            vf,
            "-t",
            str(dur),
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
            str(dst),
        ],
        quiet=True,
    )


def build_clip(clip: str, mouth: bool = True) -> None:
    clips = CLIPS
    lines = clips[clip]
    shot_paths: list[Path] = []
    for i, (line_id, text) in enumerate(lines, 1):
        closed = STILLS / clip / "closed" / f"{i:02d}.jpg"
        open_m = STILLS / clip / "open" / f"{i:02d}.jpg"
        motion_raw = MOTION / clip / f"{i:02d}.mp4"
        motion_n = MOTION / clip / f"{i:02d}-norm.mp4"
        out = SHOTS / clip / f"{i:02d}.mp4"
        out.parent.mkdir(parents=True, exist_ok=True)

        if not motion_raw.exists():
            # Fall back to speak ROI still path so we never ship empty
            print(f"  WARN no motion for {clip}/{i:02d} — ROI still fallback", flush=True)
            run(
                [
                    sys.executable,
                    str(SPEAK),
                    str(closed),
                    str(open_m),
                    str(out),
                    "--zoom",
                    "in" if i % 2 else "out",
                    "--text",
                    text,
                    "--mode",
                    "roi",
                ]
            )
            shot_paths.append(out)
            continue

        normalize_motion(motion_raw, motion_n)
        if mouth and COMPOSITE.exists() and closed.exists() and open_m.exists():
            run(
                [
                    sys.executable,
                    str(COMPOSITE),
                    str(motion_n),
                    str(closed),
                    str(open_m),
                    str(out),
                    "--text",
                    text,
                ]
            )
        else:
            run(["cp", "-f", str(motion_n), str(out)])
        shot_paths.append(out)

    EXPORT.mkdir(parents=True, exist_ok=True)
    lst = EXPORT / f"{clip}.txt"
    lst.write_text("".join(f"file '{p.resolve()}'\n" for p in shot_paths))
    export = EXPORT / f"{clip}.mp4"
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
    public = PUBLIC / f"{clip}.mp4"
    run(["cp", "-f", str(export), str(public)])
    poster = PUBLIC / f"{clip}.jpg"
    run(
        [
            FFMPEG,
            "-y",
            "-ss",
            "0.5",
            "-i",
            str(export),
            "-frames:v",
            "1",
            "-q:v",
            "2",
            str(poster),
        ],
        quiet=True,
    )
    print(f"OK hybrid {clip} → {public}", flush=True)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("clips", nargs="*")
    ap.add_argument("--mouth-only", action="store_true")
    args = ap.parse_args()
    clips_map = CLIPS
    only = args.clips if args.clips else list(clips_map.keys())
    for clip in only:
        if clip not in clips_map:
            print("unknown", clip, file=sys.stderr)
            return 1
        print(f"\n=== hybrid {clip} ===", flush=True)
        build_clip(clip, mouth=True)
    print("\nHYBRID DONE", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
