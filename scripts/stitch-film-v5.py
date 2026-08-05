#!/usr/bin/env python3
"""Stitch Film V5 master-first one-day-story (900s) with crossfades + ambient bed.

Pilot act (kin-greet) prefers full I2V under film-v5/shots/kin-greet/.
Other acts: I2V heroes when present, else Ken Burns from stills.
"""
from __future__ import annotations

import json
import math
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path("/workspace")
V5 = ROOT / "film-v5"
OUT = Path("/tmp/film-v5-stitch")
FINAL = ROOT / "public/scenes/long/one-day-story.mp4"
POSTER = ROOT / "public/scenes/long/one-day-story.jpg"
EXPORT_MASTER = V5 / "export/one-day-story-v5-master.mp4"
EXPORT_POSTER = V5 / "export/one-day-story-v5.jpg"
PILOT_OUT = V5 / "export/acts/kin-greet.mp4"

W, H, FPS = 480, 720, 24
CROSS = 0.45
ACT_SEC = 90.0
SHOTS_PER_ACT = 8
# Per-clip duration so 8 clips + 7 crossfades ≈ 90s
CLIP_SEC = (ACT_SEC + (SHOTS_PER_ACT - 1) * CROSS) / SHOTS_PER_ACT  # ~11.64375


def run(cmd: list[str], check: bool = True) -> subprocess.CompletedProcess:
    r = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if check and r.returncode != 0:
        print("CMD FAIL:", " ".join(cmd[:8]), "...", file=sys.stderr)
        print(r.stderr[-2000:], file=sys.stderr)
        raise RuntimeError(f"command failed: {r.returncode}")
    return r


def kenburns(still: Path, out: Path, duration: float, zoom_dir: int = 1) -> None:
    """Simple Ken Burns: slow zoom + slight pan."""
    z0, z1 = (1.0, 1.12) if zoom_dir > 0 else (1.12, 1.0)
    frames = max(1, int(round(duration * FPS)))
    # zoompan z expression: linear zoom over frames
    vf = (
        f"scale={W * 2}:{H * 2}:force_original_aspect_ratio=increase,"
        f"crop={W * 2}:{H * 2},"
        f"zoompan=z='{z0}+({z1}-{z0})*on/{frames}':"
        f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
        f"d={frames}:s={W}x{H}:fps={FPS},"
        f"format=yuv420p"
    )
    run(
        [
            "ffmpeg",
            "-y",
            "-loop",
            "1",
            "-i",
            str(still),
            "-vf",
            vf,
            "-t",
            f"{duration:.4f}",
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "20",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            str(out),
        ]
    )


def normalize_clip(src: Path, out: Path, duration: float) -> None:
    """Scale/crop/fps and force duration (pad last frame if short)."""
    run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(src),
            "-an",
            "-vf",
            f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS},format=yuv420p,"
            f"tpad=stop_mode=clone:stop_duration=2",
            "-t",
            f"{duration:.4f}",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "20",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            str(out),
        ]
    )


def xfade_concat(clips: list[Path], out: Path, cross: float = CROSS) -> None:
    """Crossfade N clips into one file."""
    if not clips:
        raise ValueError("no clips")
    if len(clips) == 1:
        shutil.copy(clips[0], out)
        return

    # Get durations
    durs = []
    for c in clips:
        r2 = run(["ffmpeg", "-i", str(c)], check=False)
        dur = CLIP_SEC
        for line in r2.stderr.splitlines():
            if "Duration" in line:
                part = line.split("Duration:")[1].split(",")[0].strip()
                h, m, s = part.split(":")
                dur = int(h) * 3600 + int(m) * 60 + float(s)
                break
        durs.append(dur)

    # Build filter_complex
    inputs: list[str] = []
    for c in clips:
        inputs.extend(["-i", str(c)])

    n = len(clips)
    # offset for xfade at join i: sum(durs[0:i+1]) - (i+1)*cross ... actually
    # first xfade offset = durs[0] - cross
    # next offsets accumulate
    filters = []
    # label streams
    prev = "[0:v]"
    offset = durs[0] - cross
    for i in range(1, n):
        out_label = f"[v{i}]" if i < n - 1 else "[vout]"
        filters.append(
            f"{prev}[{i}:v]xfade=transition=fade:duration={cross:.3f}:offset={offset:.4f}{out_label}"
        )
        prev = out_label
        if i < n - 1:
            offset = offset + durs[i] - cross

    fc = ";".join(filters)
    cmd = [
        "ffmpeg",
        "-y",
        *inputs,
        "-filter_complex",
        fc,
        "-map",
        "[vout]",
        "-an",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "20",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        str(out),
    ]
    run(cmd)


def make_ambient(duration: float, out: Path) -> None:
    """Soft nature-like ambient bed (no speech) via filtered noise + tones."""
    run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "lavfi",
            "-i",
            f"anoisesrc=color=brown:amplitude=0.04:duration={duration:.2f}",
            "-f",
            "lavfi",
            "-i",
            f"sine=frequency=120:sample_rate=44100:duration={duration:.2f}",
            "-filter_complex",
            f"[0:a]volume=0.35[n];[1:a]volume=0.03[s];[n][s]amix=inputs=2:duration=first,"
            f"highpass=f=60,lowpass=f=2500,afade=t=in:st=0:d=2,"
            f"afade=t=out:st={max(0, duration - 3):.2f}:d=3",
            "-t",
            f"{duration:.2f}",
            "-c:a",
            "aac",
            "-b:a",
            "96k",
            str(out),
        ]
    )


def hard_concat(parts: list[Path], out: Path) -> None:
    lst = OUT / "concat.txt"
    lst.write_text("".join(f"file '{p}'\n" for p in parts))
    run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(lst),
            "-c",
            "copy",
            str(out),
        ]
    )


def mux_ambient(video: Path, audio: Path, out: Path) -> None:
    run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(video),
            "-i",
            str(audio),
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-b:a",
            "96k",
            "-shortest",
            "-movflags",
            "+faststart",
            str(out),
        ]
    )


def pick_still(act_id: str, beat: int, stills_map: dict) -> Path | None:
    # pilot stills
    p = V5 / "stills" / act_id / f"b{beat:02d}.jpg"
    if p.exists():
        return p
    # named stills
    for key in stills_map.get(act_id, []):
        sp = V5 / "stills" / key
        if sp.exists():
            return sp
    # any still
    pool = sorted((V5 / "stills").glob("*.jpg"))
    if pool:
        return pool[beat % len(pool)]
    return None


def pick_video(act_id: str, beat: int, hero_map: dict) -> Path | None:
    p = V5 / "shots" / act_id / f"b{beat:02d}.mp4"
    if p.exists():
        return p
    heroes = hero_map.get(act_id, [])
    if beat < len(heroes):
        hp = V5 / "shots" / heroes[beat]
        if hp.exists():
            return hp
    # dawn legacy flat shots s000-s006
    if act_id == "dawn-wake" and beat < 7:
        hp = V5 / "shots" / f"s00{beat}.mp4"
        if hp.exists():
            return hp
    return None


def build_act(act_id: str, order: int, stills_map: dict, hero_map: dict) -> Path:
    act_dir = OUT / "acts" / act_id
    act_dir.mkdir(parents=True, exist_ok=True)
    clips: list[Path] = []
    for i in range(SHOTS_PER_ACT):
        norm = act_dir / f"n{i:02d}.mp4"
        v = pick_video(act_id, i, hero_map)
        if v and v.exists():
            normalize_clip(v, norm, CLIP_SEC)
            kind = "i2v"
        else:
            still = pick_still(act_id, i, stills_map)
            if still is None:
                raise FileNotFoundError(f"no still for {act_id} beat {i}")
            kenburns(still, norm, CLIP_SEC, zoom_dir=1 if i % 2 == 0 else -1)
            kind = "kenburns"
        print(f"  {act_id} b{i}: {kind} -> {norm.name}")
        clips.append(norm)
    act_out = act_dir / "act.mp4"
    xfade_concat(clips, act_out, CROSS)
    # Trim/pad to exact ACT_SEC
    exact = act_dir / "act_exact.mp4"
    run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(act_out),
            "-t",
            f"{ACT_SEC:.3f}",
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "20",
            "-pix_fmt",
            "yuv420p",
            str(exact),
        ]
    )
    return exact


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (V5 / "export/acts").mkdir(parents=True, exist_ok=True)
    (V5 / "export/posters").mkdir(parents=True, exist_ok=True)

    stills_map = {
        "dawn-wake": [
            "s000_dawn_wake.jpg",
            "s001_dawn_sit.jpg",
            "s002_dawn_fire.jpg",
            "s003_dawn_door.jpg",
            "s004_dawn_marsh.jpg",
            "s005_dawn_wetu.jpg",
            "s006_dawn_clearing.jpg",
            "a00_dawn_marsh.jpg",
        ],
        "kin-greet": [],  # uses stills/kin-greet/
        "morning-meal": ["s030_meal.jpg", "s002_dawn_fire.jpg"],
        "prepare-path": ["s020_path.jpg", "s006_dawn_clearing.jpg"],
        "land-corn": ["s040_corn.jpg"],
        "forest-trail": ["s050_forest.jpg"],
        "water-shore": ["s060_canoe.jpg", "s061_water_people.jpg"],
        "sky-weather": ["s065_sky.jpg"],
        "evening-talk": ["s070_evening.jpg"],
        "night-return": ["s080_night.jpg"],
    }
    # Optional hero I2V filenames under film-v5/shots/ (flat)
    hero_map = {
        "dawn-wake": [f"s00{i}.mp4" for i in range(7)],
        "kin-greet": [],  # directory form
        "morning-meal": ["s030.mp4"],
        "prepare-path": ["s020.mp4"],
        "land-corn": ["s040.mp4"],
        "forest-trail": ["s050.mp4"],
        "water-shore": ["s060.mp4"],
        "sky-weather": [],
        "evening-talk": [],
        "night-return": [],
    }

    plan = json.loads((V5 / "BEAT_PLAN.json").read_text())
    acts = sorted(plan["acts"], key=lambda a: a["order"])

    act_paths: list[Path] = []
    for act in acts:
        aid = act["id"]
        print(f"== Building act {aid} ==")
        p = build_act(aid, act["order"], stills_map, hero_map)
        act_paths.append(p)
        # export derived act package
        dest = V5 / "export/acts" / f"{aid}.mp4"
        shutil.copy(p, dest)
        # poster from first still
        still = pick_still(aid, 0, stills_map) or (V5 / "stills/s010_kin_greet.jpg")
        if still and still.exists():
            poster = V5 / "export/posters" / f"{aid}.jpg"
            run(
                [
                    "ffmpeg",
                    "-y",
                    "-i",
                    str(still),
                    "-vf",
                    f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}",
                    "-frames:v",
                    "1",
                    str(poster),
                ],
                check=False,
            )

    # Pilot copy is kin-greet (skip if already the same path)
    if PILOT_OUT.resolve() != (V5 / "export/acts/kin-greet.mp4").resolve():
        shutil.copy(V5 / "export/acts/kin-greet.mp4", PILOT_OUT)
    print("Pilot:", PILOT_OUT)

    print("== Concat acts ==")
    silent = OUT / "master_silent.mp4"
    hard_concat(act_paths, silent)

    print("== Ambient bed ==")
    amb = OUT / "ambient.m4a"
    make_ambient(900.0, amb)
    master_tmp = OUT / "master_audio.mp4"
    mux_ambient(silent, amb, master_tmp)

    # Exact 900s
    run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(master_tmp),
            "-t",
            "900",
            "-c",
            "copy",
            str(EXPORT_MASTER),
        ]
    )
    shutil.copy(EXPORT_MASTER, FINAL)

    # Poster from kin-greet still (strong V5 look) or dawn
    poster_src = V5 / "stills/kin-greet/b02.jpg"
    if not poster_src.exists():
        poster_src = V5 / "stills/s010_kin_greet.jpg"
    run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(poster_src),
            "-vf",
            f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}",
            "-frames:v",
            "1",
            str(POSTER),
        ]
    )
    shutil.copy(POSTER, EXPORT_POSTER)

    # duration report
    r = run(["ffmpeg", "-i", str(FINAL)], check=False)
    for line in r.stderr.splitlines():
        if "Duration" in line or "Stream #0" in line:
            print(line.strip())
    print("WROTE", FINAL)
    print("WROTE", EXPORT_MASTER)
    print("WROTE", PILOT_OUT)


if __name__ == "__main__":
    main()
