#!/usr/bin/env python3
"""Little Ones Hybrid v8 — body language + multi-viseme mouth → masters.

Preserves ALL prior progress:
  stills-v2/          locked cinematic plates (never deleted)
  export-v6-backup/   Speak-v6 ROI masters
  motion-v7/          existing I2V body plates (preferred when present)
  motion-v8/          procedural body-life plates (generated when no I2V)
  shots-v8/           motion + face-tracked multi-viseme mouth
  export-v8/          concat masters
  public/scenes/*-kids.mp4  shipped

Priority for body plate per shot:
  1. film-kids/motion-v7/<clip>/NN.mp4  (real I2V — best)
  2. film-kids/motion-v8/<clip>/NN.mp4  (procedural gesture life, if valid)
  3. generate procedural on the fly

Usage:
  python3 scripts/rebuild-kids-hybrid-v8.py
  python3 scripts/rebuild-kids-hybrid-v8.py greeting-kids
  python3 scripts/rebuild-kids-hybrid-v8.py --force-body
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path("/workspace")
STILLS = ROOT / "film-kids" / "stills-v2"
MOTION_V7 = ROOT / "film-kids" / "motion-v7"
MOTION_V8 = ROOT / "film-kids" / "motion-v8"
SHOTS = ROOT / "film-kids" / "shots-v8"
EXPORT = ROOT / "film-kids" / "export-v8"
PUBLIC = ROOT / "public" / "scenes"
BODY = ROOT / "scripts" / "render-kids-body-life.py"
COMPOSITE = ROOT / "scripts" / "composite-mouth-on-motion.py"
FFMPEG = "/usr/local/bin/ffmpeg"
W, H = 1080, 1920

import importlib.util

_spec = importlib.util.spec_from_file_location(
    "rebuild_kids_lines", ROOT / "scripts" / "rebuild_kids_lines.py"
)
_mod = importlib.util.module_from_spec(_spec)
assert _spec and _spec.loader
_spec.loader.exec_module(_mod)
CLIPS = _mod.CLIPS


def run(cmd: list[str], quiet: bool = False) -> None:
    print("+", " ".join(str(c) for c in cmd[:14]), "..." if len(cmd) > 14 else "", flush=True)
    kwargs = {}
    if quiet:
        kwargs["stdout"] = subprocess.DEVNULL
        kwargs["stderr"] = subprocess.DEVNULL
    subprocess.run(cmd, check=True, **kwargs)


def video_ok(path: Path, min_bytes: int = 200_000) -> bool:
    if not path.exists() or path.stat().st_size < min_bytes:
        return False
    r = subprocess.run(
        [FFMPEG, "-v", "error", "-xerror", "-i", str(path), "-f", "null", "-"],
        capture_output=True,
        timeout=90,
    )
    return r.returncode == 0


def normalize_motion(src: Path, dst: Path, dur: float = 6.0) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    part = dst.with_name(dst.stem + ".part.mp4")
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
            str(part),
        ],
        quiet=True,
    )
    part.replace(dst)


def ensure_body(
    clip: str,
    i: int,
    line_id: str,
    closed: Path,
    *,
    force: bool = False,
) -> Path:
    v7_raw = MOTION_V7 / clip / f"{i:02d}.mp4"
    v7_norm = MOTION_V7 / clip / f"{i:02d}-norm.mp4"
    v8 = MOTION_V8 / clip / f"{i:02d}.mp4"

    if v7_raw.exists() and not force:
        if not video_ok(v7_norm):
            normalize_motion(v7_raw, v7_norm)
        if video_ok(v7_norm):
            return v7_norm

    if v8.exists() and not force and video_ok(v8):
        return v8

    # (re)generate procedural body
    if v8.exists():
        v8.unlink()
    v8.parent.mkdir(parents=True, exist_ok=True)
    zoom = "in" if i % 2 else "out"
    run(
        [
            sys.executable,
            str(BODY),
            str(closed),
            str(v8),
            "--line-id",
            line_id,
            "--zoom",
            zoom,
        ]
    )
    if not video_ok(v8):
        raise RuntimeError(f"body plate invalid after render: {v8}")
    return v8


def build_clip(clip: str, *, force_body: bool = False, mouth: bool = True) -> None:
    lines = CLIPS[clip]
    shot_paths: list[Path] = []
    for i, (line_id, text) in enumerate(lines, 1):
        closed = STILLS / clip / "closed" / f"{i:02d}.jpg"
        open_m = STILLS / clip / "open" / f"{i:02d}.jpg"
        out = SHOTS / clip / f"{i:02d}.mp4"
        out.parent.mkdir(parents=True, exist_ok=True)

        if not closed.exists():
            print(f"  SKIP missing closed still {closed}", flush=True)
            continue

        body = ensure_body(clip, i, line_id, closed, force=force_body)

        audio = ROOT / "public" / "audio" / "kids" / f"{line_id}.mp3"
        if mouth and COMPOSITE.exists() and open_m.exists():
            cmd = [
                sys.executable,
                str(COMPOSITE),
                str(body),
                str(closed),
                str(open_m),
                str(out),
                "--text",
                text,
            ]
            if audio.exists():
                cmd.extend(["--audio", str(audio)])
            run(cmd)
            if not video_ok(out, min_bytes=80_000):
                print(f"  WARN bad mouth composite {out} — using body only", flush=True)
                run(["cp", "-f", str(body), str(out)])
        else:
            run(["cp", "-f", str(body), str(out)])
        shot_paths.append(out)

    if not shot_paths:
        print(f"  FAIL no shots for {clip}", flush=True)
        return

    # Only concat valid shots
    good = [p for p in shot_paths if video_ok(p, min_bytes=80_000)]
    if len(good) < len(shot_paths):
        print(f"  WARN {clip}: {len(good)}/{len(shot_paths)} valid shots", flush=True)
    if not good:
        raise RuntimeError(f"no valid shots for {clip}")

    EXPORT.mkdir(parents=True, exist_ok=True)
    lst = EXPORT / f"{clip}.txt"
    lst.write_text("".join(f"file '{p.resolve()}'\n" for p in good))
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
    print(f"OK hybrid-v8 {clip} → {public} ({len(good)} shots)", flush=True)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("clips", nargs="*")
    ap.add_argument("--force-body", action="store_true")
    ap.add_argument("--no-mouth", action="store_true")
    args = ap.parse_args()
    only = args.clips if args.clips else list(CLIPS.keys())
    for clip in only:
        if clip not in CLIPS:
            print("unknown", clip, file=sys.stderr)
            return 1
        print(f"\n=== hybrid-v8 {clip} ===", flush=True)
        build_clip(clip, force_body=args.force_body, mouth=not args.no_mouth)
    print("\nHYBRID V8 DONE", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
