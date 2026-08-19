#!/usr/bin/env python3
"""Mux the oral clock onto a continuous I2V plate and fail-closed.

Never overwrites a freeze directory. Writes a new master + probe report.
"""

from __future__ import annotations

import argparse
import json
import math
import struct
import subprocess
import sys
import wave
from pathlib import Path


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def probe_duration(path: Path) -> float:
    out = subprocess.check_output(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=nw=1:nk=1",
            str(path),
        ],
        text=True,
    ).strip()
    return float(out)


def wav_samples(path: Path) -> tuple[int, list[int]]:
    with wave.open(str(path), "rb") as w:
        n = w.getnframes()
        fr = w.getframerate()
        samples = struct.unpack("<" + "h" * n, w.readframes(n))
    return fr, list(samples)


def peak_in(samples: list[int], fr: int, start: float, end: float) -> int:
    a = max(0, int(start * fr))
    b = min(len(samples), int(end * fr))
    if b <= a:
        return 0
    return max(abs(s) for s in samples[a:b])


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--contract", required=True)
    p.add_argument("--plate", required=True, help="I2V mp4, picture only (audio discarded)")
    p.add_argument("--oral", required=True, help="stitched language wav/mp3/m4a")
    p.add_argument("--out", required=True)
    p.add_argument("--report", required=True)
    args = p.parse_args()

    contract = json.loads(Path(args.contract).read_text())
    plate = Path(args.plate)
    oral = Path(args.oral)
    out = Path(args.out)
    report_path = Path(args.report)
    out.parent.mkdir(parents=True, exist_ok=True)
    report_path.parent.mkdir(parents=True, exist_ok=True)

    work = out.parent / "_muxwork"
    work.mkdir(exist_ok=True)
    oral_wav = work / "oral.wav"
    master_wav = work / "master.wav"

    run(["ffmpeg", "-y", "-i", str(oral), "-ar", "24000", "-ac", "1", str(oral_wav)])
    run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(plate),
            "-i",
            str(oral_wav),
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-vf",
            "scale=1080:1920:flags=lanczos,format=yuv420p",
            "-c:v",
            "libx264",
            "-profile:v",
            "high",
            "-preset",
            "slow",
            "-crf",
            "17",
            "-r",
            "24",
            "-c:a",
            "aac",
            "-b:a",
            "160k",
            "-ar",
            "24000",
            "-ac",
            "1",
            "-shortest",
            "-movflags",
            "+faststart",
            str(out),
        ]
    )
    run(["ffmpeg", "-y", "-i", str(out), "-vn", "-ac", "1", "-ar", "24000", str(master_wav)])

    # ffmpeg static build may lack ffprobe; fall back
    try:
        duration = probe_duration(out)
    except (FileNotFoundError, subprocess.CalledProcessError):
        fr, samples = wav_samples(master_wav)
        duration = len(samples) / fr

    fr, samples = wav_samples(master_wav)
    lines_ok = []
    fail = False
    for line in contract["lines"]:
        peak = peak_in(samples, fr, float(line["startSec"]), float(line["endSec"]))
        ok = peak > 800
        lines_ok.append({"id": line["id"], "peak": peak, "ok": ok})
        if not ok:
            fail = True

    if duration < 14.5 or duration > 16.0:
        fail = True

    report = {
        "clipId": contract["clipId"],
        "version": contract.get("version"),
        "durationSec": duration,
        "out": str(out),
        "lines": lines_ok,
        "pass": not fail,
    }
    report_path.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
    return 0 if not fail else 1


if __name__ == "__main__":
    raise SystemExit(main())
