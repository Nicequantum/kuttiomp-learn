#!/usr/bin/env python3
"""Speaker-aware snap of oral lines onto visual mouth bursts.

Never places a speaker's words on the other face. If no same-speaker
burst exists near a line, that line stays where the oral clock put it.

Burst map format (JSON):
{
  "bursts": [
    {"speaker": "Friend Tan", "startSec": 0.9, "endSec": 2.1},
    ...
  ]
}

Visual bursts are authored from frame QA until an automatic scorer
is trustworthy on photoreal faces.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import wave
from pathlib import Path


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def duration_sec(path: Path) -> float:
    wav = path.with_suffix(".probe.wav")
    run(["ffmpeg", "-y", "-i", str(path), "-ar", "24000", "-ac", "1", str(wav)])
    with wave.open(str(wav), "rb") as w:
        d = w.getnframes() / float(w.getframerate())
    wav.unlink(missing_ok=True)
    return d


def atempo_chain(ratio: float) -> str:
    # ffmpeg atempo accepts 0.5–2.0; chain if needed
    filters = []
    r = ratio
    while r > 2.0:
        filters.append("atempo=2.0")
        r /= 2.0
    while r < 0.5:
        filters.append("atempo=0.5")
        r /= 0.5
    filters.append(f"atempo={r:.4f}")
    return ",".join(filters)


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--contract", required=True)
    p.add_argument("--bursts", required=True)
    p.add_argument("--audio-dir", required=True)
    p.add_argument("--out-mp3", required=True)
    p.add_argument("--report", required=True)
    p.add_argument("--max-shift", type=float, default=0.55)
    p.add_argument("--min-tempo", type=float, default=0.82)
    p.add_argument("--max-tempo", type=float, default=1.22)
    args = p.parse_args()

    contract = json.loads(Path(args.contract).read_text())
    bursts = json.loads(Path(args.bursts).read_text())["bursts"]
    audio_dir = Path(args.audio_dir)
    work = Path(args.out_mp3).parent / "_alignwork"
    work.mkdir(parents=True, exist_ok=True)

    unused = [dict(b) for b in bursts]
    placements = []
    for line in contract["lines"]:
        src = audio_dir / f"{line['id']}.mp3"
        oral_dur = duration_sec(src)
        same = [b for b in unused if b["speaker"] == line["speaker"]]
        chosen = None
        for b in same:
            mid = (b["startSec"] + b["endSec"]) / 2
            if abs(mid - (line["startSec"] + line["endSec"]) / 2) <= args.max_shift + oral_dur:
                chosen = b
                break
        if chosen is None:
            placements.append(
                {
                    "id": line["id"],
                    "snapped": False,
                    "startSec": line["startSec"],
                    "endSec": line["endSec"],
                    "reason": "no same-speaker burst in window",
                }
            )
            continue
        unused.remove(chosen)
        burst_dur = max(0.25, chosen["endSec"] - chosen["startSec"])
        tempo = oral_dur / burst_dur
        tempo = min(args.max_tempo, max(args.min_tempo, tempo))
        dest = work / f"{line['id']}-snap.mp3"
        run(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(src),
                "-filter:a",
                atempo_chain(tempo),
                "-ar",
                "24000",
                "-ac",
                "1",
                str(dest),
            ]
        )
        new_dur = duration_sec(dest)
        start = chosen["startSec"]
        line["startSec"] = round(start, 3)
        line["endSec"] = round(start + new_dur, 3)
        placements.append(
            {
                "id": line["id"],
                "snapped": True,
                "startSec": line["startSec"],
                "endSec": line["endSec"],
                "tempo": round(tempo, 3),
                "burst": chosen,
            }
        )

    # rebuild 15s oral from placed files + silence
    parts = []
    cursor = 0.0

    def sil(sec: float, name: str) -> Path:
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
                f"{max(0.02, sec):.3f}",
                "-c:a",
                "libmp3lame",
                "-b:a",
                "160k",
                str(dest),
            ]
        )
        return dest

    for i, line in enumerate(contract["lines"]):
        gap = line["startSec"] - cursor
        if gap > 0.02:
            parts.append(sil(gap, f"gap{i}.mp3"))
        snap = work / f"{line['id']}-snap.mp3"
        src = snap if snap.exists() else audio_dir / f"{line['id']}.mp3"
        parts.append(src)
        cursor = line["endSec"]
    tail = max(0.2, float(contract["durationSec"]) - cursor)
    parts.append(sil(tail, "tail.mp3"))
    contract["durationSec"] = round(cursor + tail, 3)

    lst = work / "list.txt"
    lst.write_text("".join(f"file '{p.resolve()}'\n" for p in parts))
    out = Path(args.out_mp3)
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
    Path(args.contract).write_text(json.dumps(contract, indent=2, ensure_ascii=False) + "\n")
    report = {"placements": placements, "out": str(out), "durationSec": contract["durationSec"]}
    Path(args.report).write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
    snapped = sum(1 for p in placements if p["snapped"])
    return 0 if snapped else 1


if __name__ == "__main__":
    raise SystemExit(main())
