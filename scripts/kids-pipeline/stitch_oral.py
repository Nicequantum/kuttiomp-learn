#!/usr/bin/env python3
"""Synthesize line audio from phonetic scaffolds and stitch the oral clock.

Living recordings replace public/audio/kids/<id>.mp3 later; this script
is the scaffold path. Two voices: Friend Tan / Friend Teal.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import tempfile
from pathlib import Path

TAN_VOICE = "en-US-AndrewNeural"
TEAL_VOICE = "en-US-AvaNeural"
RATE = "-8%"


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def duration_sec(path: Path) -> float:
    # ffmpeg static builds here may lack ffprobe
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        wav = Path(tmp.name)
    try:
        run(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(path),
                "-ar",
                "24000",
                "-ac",
                "1",
                str(wav),
            ]
        )
        import wave

        with wave.open(str(wav), "rb") as w:
            return w.getnframes() / float(w.getframerate())
    finally:
        wav.unlink(missing_ok=True)


def synthesize(text: str, voice: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    raw = dest.with_suffix(".raw.mp3")
    subprocess.run(
        [
            "edge-tts",
            "--voice",
            voice,
            "--rate=-8%",
            "--text",
            text,
            "--write-media",
            str(raw),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
    )
    run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(raw),
            "-ar",
            "24000",
            "-ac",
            "1",
            "-b:a",
            "160k",
            str(dest),
        ]
    )
    raw.unlink(missing_ok=True)


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--contract", required=True)
    p.add_argument("--audio-dir", required=True)
    p.add_argument("--out-mp3", required=True)
    args = p.parse_args()

    contract_path = Path(args.contract)
    contract = json.loads(contract_path.read_text())
    audio_dir = Path(args.audio_dir)
    audio_dir.mkdir(parents=True, exist_ok=True)

    # Generate each line, then place on a 15s timeline with 0.28s gaps
    cursor = 0.40
    concat_parts: list[Path] = []
    work = audio_dir / "_stitch"
    work.mkdir(exist_ok=True)

    def silence(sec: float, name: str) -> Path:
        dest = work / name
        run(
            [
                "ffmpeg",
                "-y",
                "-f",
                "lavfi",
                "-i",
                "anullsrc=r=24000:cl=mono",
                "-t",
                f"{sec:.3f}",
                "-c:a",
                "libmp3lame",
                "-b:a",
                "160k",
                str(dest),
            ]
        )
        return dest

    concat_parts.append(silence(cursor, "pre.mp3"))

    for i, line in enumerate(contract["lines"]):
        voice = TAN_VOICE if line["speaker"] == "Friend Tan" else TEAL_VOICE
        spoken = line.get("phoneticScaffold") or line["narragansett"]
        dest = audio_dir / f"{line['id']}.mp3"
        synthesize(spoken, voice, dest)
        dur = duration_sec(dest)
        line["startSec"] = round(cursor, 3)
        line["endSec"] = round(cursor + dur, 3)
        line["audioPath"] = f"/audio/kids/{line['id']}.mp3"
        concat_parts.append(dest)
        cursor = line["endSec"] + 0.28
        if i < len(contract["lines"]) - 1:
            concat_parts.append(silence(0.28, f"gap{i}.mp3"))

    tail = max(0.2, 15.0 - cursor)
    concat_parts.append(silence(tail, "tail.mp3"))
    contract["durationSec"] = round(cursor + tail, 3)

    lst = work / "list.txt"
    lst.write_text("".join(f"file '{p.resolve()}'\n" for p in concat_parts))
    out = Path(args.out_mp3)
    out.parent.mkdir(parents=True, exist_ok=True)
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
    contract_path.write_text(json.dumps(contract, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({"out": str(out), "durationSec": contract["durationSec"], "lines": [
        {"id": l["id"], "startSec": l["startSec"], "endSec": l["endSec"]}
        for l in contract["lines"]
    ]}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
