#!/usr/bin/env python3
"""Language-first mux: sequential Narragansett lines into master MP4."""
from __future__ import annotations
import array, json, math, random, shutil, subprocess, sys, tempfile, wave
from pathlib import Path

ROOT = Path("/workspace")
SRC = ROOT / "public/scenes/long/one-day-story.mp4"
MANIFEST = ROOT / "public/audio/one-day/manifest.json"
AUDIO_DIR = ROOT / "public/audio/one-day"
EXPORT = ROOT / "film-v5/export/one-day-story-v5-master.mp4"
PRACTICE = 900.0
SR = 44100

def run(cmd, check=True):
    r = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if check and r.returncode != 0:
        print(r.stderr[-2000:]); raise RuntimeError(r.returncode)
    return r

def vid_dur(path):
    r = run(["ffmpeg", "-i", str(path)], check=False)
    for line in r.stderr.splitlines():
        if "Duration" in line:
            p = line.split("Duration:")[1].split(",")[0].strip()
            h, m, s = p.split(":")
            return int(h) * 3600 + int(m) * 60 + float(s)
    raise RuntimeError("dur")

def main(video_in: Path | None = None):
    src = Path(video_in) if video_in else SRC
    if not src.exists():
        raise SystemExit(f"missing {src}")
    dur = vid_dur(src)
    scale = dur / PRACTICE
    work = Path(tempfile.mkdtemp(prefix="langseq-"))
    lines = json.loads(MANIFEST.read_text())
    total = int(round(dur * SR))
    timeline = array.array("h", [0] * total)

    def decode(mp3: Path) -> array.array:
        wav = work / (mp3.stem + ".wav")
        run(["ffmpeg", "-y", "-i", str(mp3), "-ac", "1", "-ar", str(SR), "-sample_fmt", "s16", str(wav)])
        with wave.open(str(wav), "rb") as w:
            a = array.array("h"); a.frombytes(w.readframes(w.getnframes())); return a

    placed = 0
    for row in lines:
        mp3 = AUDIO_DIR / f"{row['id']}.mp3"
        if not mp3.exists(): continue
        start_i = int(round(float(row["startSec"]) * scale * SR))
        if start_i >= total: continue
        samples = decode(mp3)
        boosted = array.array("h")
        for x in samples:
            y = int(x * 2.2)
            y = 32767 if y > 32767 else (-32768 if y < -32768 else y)
            boosted.append(y)
        end_i = min(total, start_i + len(boosted))
        for i, s in enumerate(range(start_i, end_i)):
            y = timeline[s] + boosted[i]
            timeline[s] = 32767 if y > 32767 else (-32768 if y < -32768 else y)
        placed += 1
    random.seed(3)
    for i in range(total):
        y = timeline[i] + int(random.gauss(0, 180))
        timeline[i] = 32767 if y > 32767 else (-32768 if y < -32768 else y)
    lang = work / "language.wav"
    with wave.open(str(lang), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(timeline.tobytes())
    out = work / "master.mp4"
    run(["ffmpeg","-y","-i",str(src),"-i",str(lang),"-map","0:v:0","-map","1:a:0","-c:v","copy","-c:a","aac","-b:a","192k","-ar",str(SR),"-shortest","-movflags","+faststart",str(out)])
    shutil.copy(out, SRC); shutil.copy(out, EXPORT)
    print(f"placed={placed} dur={dur:.2f} -> {SRC}")

if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else None)
