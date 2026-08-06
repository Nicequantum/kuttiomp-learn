#!/usr/bin/env python3
"""Surgical greeting-kids fix (P0–P2 from LIVE_QA_AUDIT).

Does NOT touch other clips. Pipeline:
  1. Prefer soft still when face residual is better than open (fixes 04/05 glitch)
  2. Mouth composite on motion-v7 I2V driven by packaged kids audio RMS
  3. Mux same audio into each 6s shot (shared clock)
  4. Concat → public/scenes/greeting-kids.mp4 + poster

Usage:
  python3 scripts/fix-greeting-kids-v9.py
"""
from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path("/workspace")
CLIP = "greeting-kids"
LINES = [
    ("k1", "Ascowequassunnúmmis"),
    ("k2", "Askuttaaquompsín"),
    ("k3", "Asnpaumpmaúntam"),
    ("k4", "Cowaúnckamish"),
    ("k5", "Taubotneanawáyean"),
]
STILLS = ROOT / "film-kids/stills-v2" / CLIP
MOTION = ROOT / "film-kids/motion-v7" / CLIP
SHOTS = ROOT / "film-kids/shots-v9" / CLIP
EXPORT = ROOT / "film-kids/export-v9"
PUBLIC = ROOT / "public/scenes"
AUDIO = ROOT / "public/audio/kids"
COMPOSITE = ROOT / "scripts/composite-mouth-on-motion.py"
FF = "/usr/local/bin/ffmpeg"
W, H, DUR, FPS = 1080, 1920, 6.0, 24
# Audio starts this many seconds into each 6s shot (mouth + soundtrack share this lead)
AUDIO_LEAD = 0.0  # lead baked into public/audio/kids/*.mp3


def run(cmd: list[str], quiet: bool = False) -> None:
    print("+", " ".join(str(c) for c in cmd[:14]), "..." if len(cmd) > 14 else "", flush=True)
    kwargs = {}
    if quiet:
        kwargs["stdout"] = subprocess.DEVNULL
        kwargs["stderr"] = subprocess.DEVNULL
    subprocess.run(cmd, check=True, **kwargs)


def audio_dur(path: Path) -> float:
    r = subprocess.run([FF, "-i", str(path)], capture_output=True, text=True)
    for line in r.stderr.splitlines():
        if "Duration:" in line:
            part = line.split("Duration:")[1].split(",")[0].strip()
            h, m, s = part.split(":")
            return int(h) * 3600 + int(m) * 60 + float(s)
    return 2.0


def pad_audio_to_shot(src: Path, dst: Path, lead: float = AUDIO_LEAD, total: float = DUR) -> None:
    """Silence lead + oral + silence pad → exactly total seconds, mono wav.

    NOTE: lead=0 must NOT use anullsrc+concat (zero-length concat zeros the track).
    """
    dst.parent.mkdir(parents=True, exist_ok=True)
    if lead <= 0.001:
        run(
            [
                FF, "-y",
                "-i", str(src),
                "-af", f"apad=whole_dur={total:.3f},atrim=0:{total:.3f},asetpts=PTS-STARTPTS",
                "-ar", "24000",
                "-ac", "1",
                "-c:a", "pcm_s16le",
                str(dst),
            ],
            quiet=True,
        )
        return
    run(
        [
            FF, "-y",
            "-f", "lavfi", "-t", f"{lead:.3f}", "-i", "anullsrc=r=24000:cl=mono",
            "-i", str(src),
            "-filter_complex",
            f"[0:a][1:a]concat=n=2:v=0:a=1,apad=whole_dur={total:.3f},atrim=0:{total:.3f},asetpts=PTS-STARTPTS[a]",
            "-map", "[a]",
            "-ar", "24000",
            "-ac", "1",
            "-c:a", "pcm_s16le",
            str(dst),
        ],
        quiet=True,
    )


def pick_mouth_plate(i: int) -> Path:
    """Prefer soft still when it exists and is better aligned than open (greeting 04/05)."""
    closed = STILLS / "closed" / f"{i:02d}.jpg"
    open_p = STILLS / "open" / f"{i:02d}.jpg"
    soft_p = STILLS / "soft" / f"{i:02d}.jpg"
    if not soft_p.exists():
        return open_p
    # quick residual via PIL+numpy
    import numpy as np
    from PIL import Image

    def load(p: Path):
        im = Image.open(p).convert("RGB")
        s = max(W / im.width, H / im.height)
        nw, nh = int(round(im.width * s)), int(round(im.height * s))
        im = im.resize((nw, nh), Image.Resampling.LANCZOS)
        l, t = (nw - W) // 2, (nh - H) // 2
        return np.asarray(im.crop((l, t, l + W, t + H)), dtype=np.float32)

    def res(a, b):
        y0, y1 = int(H * 0.22), int(H * 0.70)
        return float(np.mean(np.abs(a[y0:y1] - b[y0:y1])))

    c = load(closed)
    ro = res(c, load(open_p))
    rs = res(c, load(soft_p))
    choice = soft_p if rs <= ro + 0.15 else open_p  # soft wins ties (pose-safer)
    print(f"  plate {i:02d}: open_res={ro:.2f} soft_res={rs:.2f} → {choice.parent.name}", flush=True)
    return choice


def ensure_motion(i: int) -> Path:
    norm = MOTION / f"{i:02d}-norm.mp4"
    raw = MOTION / f"{i:02d}.mp4"
    if norm.exists() and norm.stat().st_size > 100_000:
        return norm
    if not raw.exists():
        raise FileNotFoundError(f"missing motion for greeting shot {i}")
    run(
        [
            FF, "-y", "-i", str(raw),
            "-vf", f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS},format=yuv420p",
            "-t", str(DUR), "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "17",
            "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(norm),
        ],
        quiet=True,
    )
    return norm


def composite_shot(i: int, line_id: str, text: str) -> Path:
    motion = ensure_motion(i)
    closed = STILLS / "closed" / f"{i:02d}.jpg"
    mouth_plate = pick_mouth_plate(i)
    audio = AUDIO / f"{line_id}.mp3"
    if not audio.exists():
        raise FileNotFoundError(audio)
    silent = SHOTS / f"{i:02d}-silent.mp4"
    silent.parent.mkdir(parents=True, exist_ok=True)
    # Shift audio peaks: composite reads audio from t=0; we delay peaks by using
    # a lead-padded wav so RMS aligns with AUDIO_LEAD on the video timeline.
    work = Path(tempfile.mkdtemp(prefix=f"greet-{i:02d}-"))
    lead_wav = work / "lead.wav"
    pad_audio_to_shot(audio, lead_wav, lead=AUDIO_LEAD, total=DUR)

    run(
        [
            sys.executable, str(COMPOSITE),
            str(motion), str(closed), str(mouth_plate), str(silent),
            "--text", text,
            "--audio", str(lead_wav),
            "--track", "on",
        ],
    )
    # Mux: silent video + lead-padded oral audio
    out = SHOTS / f"{i:02d}.mp4"
    run(
        [
            FF, "-y",
            "-i", str(silent),
            "-i", str(lead_wav),
            "-map", "0:v:0", "-map", "1:a:0",
            "-c:v", "copy",
            "-c:a", "aac", "-b:a", "128k", "-ar", "24000", "-ac", "1",
            "-shortest",
            "-movflags", "+faststart",
            str(out),
        ],
        quiet=True,
    )
    # side-car note
    note = SHOTS / f"{i:02d}.fix.txt"
    note.write_text(
        f"v9 surgical greeting\nline={line_id} text={text}\n"
        f"audio={audio.name} lead={AUDIO_LEAD} plate={mouth_plate}\n"
        f"aduration={audio_dur(audio):.2f}s\n"
    )
    return out


def stitch(shot_paths: list[Path]) -> Path:
    EXPORT.mkdir(parents=True, exist_ok=True)
    lst = EXPORT / f"{CLIP}.txt"
    lst.write_text("".join(f"file '{p.resolve()}'\n" for p in shot_paths))
    export = EXPORT / f"{CLIP}.mp4"
    # re-encode audio concat safety (copy may fail across shot aac)
    run(
        [
            FF, "-y", "-f", "concat", "-safe", "0", "-i", str(lst),
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "17",
            "-c:a", "aac", "-b:a", "128k", "-ar", "24000",
            "-movflags", "+faststart",
            str(export),
        ],
        quiet=True,
    )
    public = PUBLIC / f"{CLIP}.mp4"
    run(["cp", "-f", str(export), str(public)])
    poster = PUBLIC / f"{CLIP}.jpg"
    run(
        [
            FF, "-y", "-ss", "0.5", "-i", str(export),
            "-frames:v", "1", "-q:v", "2", str(poster),
        ],
        quiet=True,
    )
    return public


def main() -> int:
    print("=== surgical fix greeting-kids v9 (P0–P2) ===", flush=True)
    for lid, _ in LINES:
        a = AUDIO / f"{lid}.mp3"
        if not a.exists():
            print(f"MISSING audio {a}", file=sys.stderr)
            return 1
    shots: list[Path] = []
    for i, (lid, text) in enumerate(LINES, 1):
        print(f"\n--- shot {i:02d} {lid} {text} ---", flush=True)
        shots.append(composite_shot(i, lid, text))
    public = stitch(shots)
    # verify audio present
    r = subprocess.run([FF, "-i", str(public)], capture_output=True, text=True)
    has_a = "Audio:" in r.stderr
    print(f"\nOK {public} has_audio={has_a}", flush=True)
    if not has_a:
        print("FAIL: master still silent", file=sys.stderr)
        return 2
    print("GREETING V9 DONE", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
