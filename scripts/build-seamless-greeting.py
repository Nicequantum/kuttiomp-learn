#!/usr/bin/env python3
"""One continuous 30s Hello-friend film.

  • Two 15s I2V plates from the SAME still, crossfaded (no 5-clip chop)
  • Five oral lines mixed as a child greeting conversation
  • Mouths driven by the FULL 30s audio bed (not per-slot)
"""
from __future__ import annotations

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
    blend_viseme_plates,
    apply_mouth_on_frame,
    audio_viseme_keys,
    build_mouth_bank,
    face_band,
    load_cover,
    sample_viseme,
    track_shift,
)

FFMPEG = "/usr/local/bin/ffmpeg"
TOTAL = 30.0
XFADE = 1.2

CUES = [
    ("k1", 1.50, "Ascowequassunnúmmis"),
    ("k2", 4.20, "Askuttaaquompsín"),
    ("k3", 6.70, "Asnpaumpmaúntam"),
    ("k4", 9.10, "Cowaúnckamish"),
    ("k5", 11.50, "Taubotneanawáyean"),
]


def run(cmd: list[str]) -> None:
    print("+", " ".join(cmd[:10]), "...", flush=True)
    subprocess.check_call(cmd)


def mix_conversation(out: Path) -> None:
    inputs: list[str] = []
    filters = []
    for i, (lid, start, _t) in enumerate(CUES):
        src = ROOT / "public" / "audio" / "kids" / f"{lid}.mp3"
        inputs += ["-i", str(src)]
        delay_ms = int(round(start * 1000))
        filters.append(
            f"[{i}:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=mono,"
            f"adelay={delay_ms}|{delay_ms},apad=whole_dur={TOTAL:.2f},atrim=0:{TOTAL:.2f}[a{i}]"
        )
    mix_in = "".join(f"[a{i}]" for i in range(len(CUES)))
    filters.append(
        f"{mix_in}amix=inputs={len(CUES)}:normalize=0:duration=longest,"
        f"alimiter=limit=0.95,atrim=0:{TOTAL:.2f},apad=whole_dur={TOTAL:.2f}[out]"
    )
    run(
        [
            FFMPEG,
            "-y",
            *inputs,
            "-filter_complex",
            ";".join(filters),
            "-map",
            "[out]",
            "-c:a",
            "libmp3lame",
            "-b:a",
            "160k",
            str(out),
        ]
    )


def stitch_picture(a: Path, b: Path, out: Path) -> None:
    work = out.parent
    clean_a = work / "a-clean.mp4"
    clean_b = work / "b-clean.mp4"
    vf = (
        "scale=1080:1920:force_original_aspect_ratio=increase,"
        "crop=1080:1920,fps=24,setsar=1,format=yuv420p"
    )
    for src, dest in ((a, clean_a), (b, clean_b)):
        run(
            [
                FFMPEG,
                "-y",
                "-i",
                str(src),
                "-map",
                "0:v:0",
                "-vf",
                vf,
                "-an",
                "-t",
                "15",
                "-r",
                "24",
                "-c:v",
                "libx264",
                "-preset",
                "veryfast",
                "-crf",
                "17",
                "-pix_fmt",
                "yuv420p",
                str(dest),
            ]
        )
    offset = 15.0 - XFADE
    filt = (
        f"[0:v]setpts=PTS-STARTPTS[v0];"
        f"[1:v]setpts=PTS-STARTPTS[v1];"
        f"[v0][v1]xfade=transition=fade:duration={XFADE}:offset={offset:.2f}[vout]"
    )
    run(
        [
            FFMPEG,
            "-y",
            "-i",
            str(clean_a),
            "-i",
            str(clean_b),
            "-filter_complex",
            filt,
            "-map",
            "[vout]",
            "-an",
            "-r",
            "24",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "17",
            "-pix_fmt",
            "yuv420p",
            "-t",
            f"{TOTAL:.2f}",
            str(out),
        ]
    )


def composite_mouths(motion: Path, closed: Path, open_p: Path, audio: Path, out: Path) -> None:
    closed_im = load_cover(closed)
    open_im = load_cover(open_p)
    bank = build_mouth_bank(closed_im, open_im)
    keys = audio_viseme_keys(audio, fps=FPS, dur=TOTAL)
    print(f"  visemes={len(keys)} mode={bank.meta.get('mode')}", flush=True)
    ref_band = face_band(closed_im)
    cmd_in = [
        FFMPEG,
        "-v",
        "error",
        "-i",
        str(motion),
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
    out.parent.mkdir(parents=True, exist_ok=True)
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
        str(out),
    ]
    pin = subprocess.Popen(cmd_in, stdout=subprocess.PIPE)
    pout = subprocess.Popen(
        cmd_out, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    )
    assert pin.stdout and pout.stdin
    frame_bytes = W * H * 3
    i = 0
    while True:
        buf = pin.stdout.read(frame_bytes)
        if not buf or len(buf) < frame_bytes:
            break
        frame = np.frombuffer(buf, dtype=np.uint8).reshape((H, W, 3)).astype(np.float32)
        t = i / FPS
        dy, dx = track_shift(ref_band, frame)
        vid, amt = sample_viseme(t, keys)
        if amt > 0.04:
            mouth_rgb = blend_viseme_plates(bank, vid, amt)
            frame = apply_mouth_on_frame(frame, mouth_rgb, bank.mask, dy, dx, amt)
        pout.stdin.write(frame.clip(0, 255).astype(np.uint8).tobytes())
        i += 1
    pin.stdout.close()
    pout.stdin.close()
    pin.wait()
    rc = pout.wait()
    if rc != 0:
        raise RuntimeError("mouth composite failed")
    print(f"  mouthed frames={i}", flush=True)


def mux(picture: Path, audio: Path, dest: Path) -> None:
    run(
        [
            FFMPEG,
            "-y",
            "-i",
            str(picture),
            "-i",
            str(audio),
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "17",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-shortest",
            "-movflags",
            "+faststart",
            str(dest),
        ]
    )


def main() -> int:
    a = Path(sys.argv[1])
    b = Path(sys.argv[2])
    work = ROOT / "artifacts" / "talking" / "seamless-greeting"
    work.mkdir(parents=True, exist_ok=True)
    bed = work / "conversation.mp3"
    plate = work / "plate.mp4"
    lips = work / "lips.mp4"
    master = ROOT / "public" / "scenes" / "greeting-kids.mp4"
    poster = ROOT / "public" / "scenes" / "greeting-kids.jpg"
    closed = ROOT / "film-kids" / "stills" / "greeting-kids" / "closed" / "01.jpg"
    opened = ROOT / "film-kids" / "stills" / "greeting-kids" / "open" / "01.jpg"

    print("=== mix conversation ===", flush=True)
    mix_conversation(bed)
    print("=== stitch continuous picture ===", flush=True)
    stitch_picture(a, b, plate)
    print("=== audio-driven mouths ===", flush=True)
    composite_mouths(plate, closed, opened, bed, lips)
    print("=== mux ===", flush=True)
    mux(lips, bed, master)
    run(
        [
            FFMPEG,
            "-y",
            "-ss",
            "2.2",
            "-i",
            str(master),
            "-frames:v",
            "1",
            "-q:v",
            "3",
            "-update",
            "1",
            str(poster),
        ]
    )
    print("MASTER", master, master.stat().st_size, flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
