#!/usr/bin/env python3
"""Stitch 5×6s talking I2V clips + packaged oral into a 30s path master.

Strips generated ambient audio and muxes the same oral pack used in Learn,
with a 0.22s lead so lips and language share one clock.
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path("/workspace")
FF = "/usr/local/bin/ffmpeg"
W, H, DUR, FPS = 1080, 1920, 6.0, 24
LEAD = 0.22


def run(cmd: list[str]) -> None:
    print("+", " ".join(str(c) for c in cmd[:14]), flush=True)
    subprocess.run(cmd, check=True)


def mux_shot(video: Path, audio: Path, out: Path) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    # Pad oral with lead silence, trim/pad picture to exactly DUR
    filter_a = f"adelay={int(LEAD * 1000)}|{int(LEAD * 1000)},apad,atrim=0:{DUR:.2f}"
    vf = f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS},setsar=1"
    run(
        [
            FF, "-y",
            "-i", str(video),
            "-i", str(audio),
            "-map", "0:v:0",
            "-map", "1:a:0",
            "-vf", vf,
            "-af", filter_a,
            "-t", f"{DUR:.2f}",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "1",
            "-movflags", "+faststart",
            str(out),
        ]
    )


def concat(shots: list[Path], out: Path) -> None:
    lst = out.with_suffix(".txt")
    lst.write_text("".join(f"file '{s.resolve()}'\n" for s in shots))
    run(
        [
            FF, "-y", "-f", "concat", "-safe", "0", "-i", str(lst),
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "128k",
            "-movflags", "+faststart",
            str(out),
        ]
    )
    lst.unlink(missing_ok=True)


def poster(src: Path, dest: Path) -> None:
    run([FF, "-y", "-ss", "1.4", "-i", str(src), "-frames:v", "1", "-q:v", "3", str(dest)])


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("name", help="master id, e.g. discourse-elder")
    ap.add_argument("--clips", required=True, help="dir with 01.mp4..05.mp4")
    ap.add_argument("--audio-dir", required=True)
    ap.add_argument("--line-ids", required=True, help="comma list of 5 oral ids")
    args = ap.parse_args()

    clips = Path(args.clips)
    audio_dir = Path(args.audio_dir)
    ids = [x.strip() for x in args.line_ids.split(",")]
    if len(ids) != 5:
        print("need 5 line ids", file=sys.stderr)
        return 2

    work = ROOT / "artifacts" / "talking" / "mux" / args.name
    work.mkdir(parents=True, exist_ok=True)
    shots: list[Path] = []
    for i, lid in enumerate(ids, start=1):
        vid = clips / f"{i:02d}.mp4"
        aud = audio_dir / f"{lid}.mp3"
        if not vid.exists() or not aud.exists():
            print("missing", vid, aud, file=sys.stderr)
            return 2
        out = work / f"{i:02d}.mp4"
        mux_shot(vid, aud, out)
        shots.append(out)

    export = ROOT / "film-elder" / "export" if "elder" in args.name else ROOT / "film-kids" / "export"
    export.mkdir(parents=True, exist_ok=True)
    master = ROOT / "public" / "scenes" / f"{args.name}.mp4"
    tmp = export / f"{args.name}.talking.mp4"
    concat(shots, tmp)
    tmp.replace(master) if tmp.parent == master.parent else None
    # always copy into public
    if tmp.resolve() != master.resolve():
        master.write_bytes(tmp.read_bytes())
    poster(master, ROOT / "public" / "scenes" / f"{args.name}.jpg")
    print("MASTER", master, master.stat().st_size)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
