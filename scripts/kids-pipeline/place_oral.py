#!/usr/bin/env python3
"""Place trimmed line audio on a hand-authored timeline.

Does not touch picture. Living drop-in files keep the same ids.
"""

from __future__ import annotations

import argparse
import json
import struct
import subprocess
import wave
from pathlib import Path


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def to_wav(src: Path, dest: Path) -> None:
    run(["ffmpeg", "-y", "-i", str(src), "-ar", "24000", "-ac", "1", str(dest)])


def samples_of(wav_path: Path) -> tuple[int, list[int]]:
    with wave.open(str(wav_path), "rb") as w:
        n = w.getnframes()
        fr = w.getframerate()
        data = struct.unpack("<" + "h" * n, w.readframes(n))
    return fr, list(data)


def nucleus(fr: int, samples: list[int], thr: int = 900) -> tuple[float, float]:
    hop = int(fr * 0.02)
    first = None
    last = None
    for i in range(0, len(samples) - hop, hop):
        peak = max(abs(s) for s in samples[i : i + hop])
        if peak > thr:
            t = i / fr
            if first is None:
                first = t
            last = t + hop / fr
    if first is None:
        return 0.0, len(samples) / fr
    pad = 0.04
    return max(0.0, first - pad), min(len(samples) / fr, last + pad)


def atempo_filter(ratio: float) -> str:
    parts = []
    r = ratio
    while r > 2.0:
        parts.append("atempo=2.0")
        r /= 2.0
    while r < 0.5:
        parts.append("atempo=0.5")
        r /= 0.5
    parts.append(f"atempo={r:.4f}")
    return ",".join(parts)


def silence(dest: Path, sec: float) -> None:
    run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "lavfi",
            "-i",
            "anullsrc=r=24000:cl=mono",
            "-t",
            f"{max(0.02, sec):.3f}",
            "-c:a",
            "pcm_s16le",
            str(dest),
        ]
    )


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--contract", required=True)
    p.add_argument("--audio-dir", required=True)
    p.add_argument("--placements", required=True)
    p.add_argument("--out-mp3", required=True)
    args = p.parse_args()

    contract = json.loads(Path(args.contract).read_text())
    spec = json.loads(Path(args.placements).read_text())
    audio_dir = Path(args.audio_dir)
    work = Path(args.out_mp3).parent / "_placework"
    work.mkdir(parents=True, exist_ok=True)

    by_id = {line["id"]: line for line in contract["lines"]}
    parts: list[Path] = []
    cursor = 0.0

    for i, place in enumerate(spec["placements"]):
        line = by_id[place["id"]]
        raw_wav = work / f"{line['id']}-raw.wav"
        to_wav(audio_dir / f"{line['id']}.mp3", raw_wav)
        fr, samples = samples_of(raw_wav)
        n0, n1 = nucleus(fr, samples)
        clipped = work / f"{line['id']}-clip.wav"
        run(
            [
                "ffmpeg",
                "-y",
                "-ss",
                f"{n0:.3f}",
                "-i",
                str(raw_wav),
                "-t",
                f"{max(0.12, n1 - n0):.3f}",
                "-c:a",
                "pcm_s16le",
                str(clipped),
            ]
        )
        start = float(place["startSec"])
        stretch_to = place.get("stretchTo")
        placed = work / f"{line['id']}-placed.wav"
        if stretch_to:
            want = max(0.2, float(stretch_to) - start)
            have = n1 - n0
            ratio = have / want
            ratio = min(1.18, max(0.84, ratio))
            run(
                [
                    "ffmpeg",
                    "-y",
                    "-i",
                    str(clipped),
                    "-filter:a",
                    atempo_filter(ratio),
                    str(placed),
                ]
            )
        else:
            run(["ffmpeg", "-y", "-i", str(clipped), str(placed)])
        _, placed_samples = samples_of(placed)
        dur = len(placed_samples) / 24000.0
        if start - cursor > 0.02:
            sil = work / f"sil{i}.wav"
            silence(sil, start - cursor)
            parts.append(sil)
        parts.append(placed)
        line["startSec"] = round(start, 3)
        line["endSec"] = round(start + dur, 3)
        cursor = line["endSec"]

    tail = max(0.2, float(spec.get("durationSec", 14.72)) - cursor)
    sil_t = work / "tail.wav"
    silence(sil_t, tail)
    parts.append(sil_t)
    contract["durationSec"] = round(cursor + tail, 3)

    lst = work / "list.txt"
    lst.write_text("".join(f"file '{p.resolve()}'\n" for p in parts))
    mix_wav = work / "mix.wav"
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
            "-c:a",
            "pcm_s16le",
            str(mix_wav),
        ]
    )
    out = Path(args.out_mp3)
    run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(mix_wav),
            "-c:a",
            "libmp3lame",
            "-b:a",
            "160k",
            "-ar",
            "24000",
            "-ac",
            "1",
            str(out),
        ]
    )
    Path(args.contract).write_text(json.dumps(contract, indent=2, ensure_ascii=False) + "\n")
    print(
        json.dumps(
            {
                "out": str(out),
                "durationSec": contract["durationSec"],
                "lines": [
                    {"id": l["id"], "startSec": l["startSec"], "endSec": l["endSec"]}
                    for l in contract["lines"]
                ],
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
