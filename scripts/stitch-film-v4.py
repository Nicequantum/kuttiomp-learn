#!/usr/bin/env python3
"""Stitch film-v4 continuous one-day-story.mp4 from narrative-first shots.

Prefers AI video under film-build/shots; falls back to Ken Burns from stills.
Never pulls practice-scene shorts from public/scenes/*.mp4.
"""
from __future__ import annotations

import json
import re
import shutil
import subprocess
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path("/workspace/film-build")
OUT = Path("/tmp/film-build-stitch")
FINAL = Path("/workspace/public/scenes/long/one-day-story.mp4")
POSTER = Path("/workspace/public/scenes/long/one-day-story.jpg")
W, H, FPS, SHOT = 480, 720, 20, 12
FRAMES = SHOT * FPS


def run(cmd: list[str]) -> bool:
    r = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    return r.returncode == 0


def make_clip(s: dict) -> tuple[int, Path | None, str]:
    idx = s["index"]
    pad = f"{idx:03d}"
    act = s["actId"]
    still = ROOT / "stills" / Path(s["still"]).name
    if not still.exists():
        alts = list((ROOT / "stills").glob(f"{pad}_*.jpg"))
        still = alts[0] if alts else None
    video = ROOT / "shots" / Path(s["video"]).name
    if not video.exists():
        alts = list((ROOT / "shots").glob(f"{pad}_*.mp4"))
        video = alts[0] if alts else None

    norm = OUT / "norm" / f"{pad}.mp4"
    if video and video.exists():
        ok = run(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(video),
                "-an",
                "-vf",
                f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS},format=yuv420p",
                "-t",
                str(SHOT),
                "-c:v",
                "libx264",
                "-preset",
                "ultrafast",
                "-crf",
                "28",
                "-movflags",
                "+faststart",
                str(norm),
            ]
        )
        if ok and norm.exists():
            return idx, norm, "video"

    if still is None or not still.exists():
        return idx, None, "no-still"

    kb = ROOT / "kenburns" / f"{pad}_{act}.mp4"
    ok = run(
        [
            "ffmpeg",
            "-y",
            "-loop",
            "1",
            "-i",
            str(still),
            "-an",
            "-vf",
            f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},zoompan=z='min(zoom+0.00055,1.12)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={FRAMES}:s={W}x{H}:fps={FPS},format=yuv420p",
            "-t",
            str(SHOT),
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",
            "-crf",
            "28",
            "-movflags",
            "+faststart",
            str(kb),
        ]
    )
    if ok and kb.exists():
        shutil.copy2(kb, norm)
        return idx, norm, "kb"
    return idx, None, "fail"


def main() -> None:
    manifest_path = ROOT / "narrative" / "manifest.json"
    if not manifest_path.exists():
        raise SystemExit("Missing narrative/manifest.json — run build-film-v4-plan.mjs first")

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "norm").mkdir(exist_ok=True)
    (ROOT / "kenburns").mkdir(exist_ok=True)

    manifest = json.loads(manifest_path.read_text())
    results: dict[int, tuple[Path | None, str]] = {}
    with ThreadPoolExecutor(max_workers=4) as ex:
        futs = {ex.submit(make_clip, s): s["index"] for s in manifest}
        for fut in as_completed(futs):
            idx, path, kind = fut.result()
            results[idx] = (path, kind)

    ordered: list[Path] = []
    v = kb = m = 0
    for i in range(len(manifest)):
        path, kind = results[i]
        if path is None:
            m += 1
            print("missing", i, kind)
            continue
        ordered.append(path)
        if kind == "video":
            v += 1
        else:
            kb += 1

    print(f"clips={len(ordered)} video={v} kb={kb} missing={m}")
    if len(ordered) < 100:
        raise SystemExit("too few clips")

    list_path = OUT / "list.txt"
    list_path.write_text("".join(f"file '{p}'\n" for p in ordered))
    raw = OUT / "raw.mp4"
    subprocess.run(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(list_path), "-c", "copy", str(raw)],
        check=True,
    )
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(raw),
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "28",
            "-movflags",
            "+faststart",
            str(FINAL),
        ],
        check=True,
    )
    subprocess.run(
        ["ffmpeg", "-y", "-ss", "36", "-i", str(FINAL), "-frames:v", "1", "-q:v", "3", str(POSTER)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    r = subprocess.run(["ffmpeg", "-i", str(FINAL)], capture_output=True, text=True)
    md = re.search(r"Duration: ([^,]+)", r.stderr)
    print("DONE duration", md.group(1) if md else "?", "bytes", FINAL.stat().st_size)


if __name__ == "__main__":
    main()
