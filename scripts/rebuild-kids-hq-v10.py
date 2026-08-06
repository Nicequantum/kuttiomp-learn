#!/usr/bin/env python3
"""Little Ones HQ v10 — cinematic quality + shared-clock lips + vocals.

All 12 clips. Does NOT destroy stills / motion-v7 / v6 backup.

Per shot:
  1. Body plate = I2V (motion-v7) if present, else HD Ken Burns from closed still
  2. Mouth = soft/open plate pick by residual + hybrid audio-text visemes
  3. Mux packaged oral into the same 6s timeline
  4. Concat → public/scenes/<clip>.mp4

Usage:
  python3 scripts/rebuild-kids-hq-v10.py
  python3 scripts/rebuild-kids-hq-v10.py greeting-kids meal-kids
"""
from __future__ import annotations

import argparse
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path("/workspace")
sys.path.insert(0, str(ROOT / "scripts"))
from rebuild_kids_lines import CLIPS  # noqa: E402

STILLS = ROOT / "film-kids" / "stills-v2"
MOTION7 = ROOT / "film-kids" / "motion-v7"
MOTION10 = ROOT / "film-kids" / "motion-v10"
SHOTS = ROOT / "film-kids" / "shots-v10"
EXPORT = ROOT / "film-kids" / "export-v10"
PUBLIC = ROOT / "public" / "scenes"
AUDIO = ROOT / "public" / "audio" / "kids"
COMPOSITE = ROOT / "scripts" / "composite-mouth-on-motion.py"
FF = "/usr/local/bin/ffmpeg"
W, H, DUR, FPS = 1080, 1920, 6.0, 24
NFRAMES = int(DUR * FPS)


def run(cmd: list, quiet: bool = True) -> None:
    print("+", " ".join(str(c) for c in cmd[:14]), "..." if len(cmd) > 14 else "", flush=True)
    kw = {}
    if quiet:
        kw["stdout"] = subprocess.DEVNULL
        kw["stderr"] = subprocess.DEVNULL
    subprocess.run(cmd, check=True, **kw)


def video_ok(path: Path) -> bool:
    if not path.exists() or path.stat().st_size < 80_000:
        return False
    r = subprocess.run(
        [FF, "-v", "error", "-xerror", "-i", str(path), "-frames:v", "2", "-f", "null", "-"],
        capture_output=True,
    )
    return r.returncode == 0


def pad_audio(src: Path, dst: Path, total: float = DUR) -> None:
    """Pad oral to exactly total seconds. Never use zero-length anullsrc concat."""
    dst.parent.mkdir(parents=True, exist_ok=True)
    run(
        [
            FF, "-y", "-i", str(src),
            "-af", f"apad=whole_dur={total:.3f},atrim=0:{total:.3f},asetpts=PTS-STARTPTS",
            "-ar", "24000", "-ac", "1", "-c:a", "pcm_s16le", str(dst),
        ]
    )


def ensure_hd_body(clip: str, i: int, zoom: str) -> Path:
    """Prefer I2V; else HD Ken Burns from closed still (full res, no soft upscale)."""
    # I2V path
    norm = MOTION7 / clip / f"{i:02d}-norm.mp4"
    raw = MOTION7 / clip / f"{i:02d}.mp4"
    if video_ok(norm):
        return norm
    if raw.exists() and raw.stat().st_size > 50_000:
        norm.parent.mkdir(parents=True, exist_ok=True)
        run(
            [
                FF, "-y", "-i", str(raw),
                "-vf", f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS},format=yuv420p",
                "-t", str(DUR), "-an",
                "-c:v", "libx264", "-preset", "medium", "-crf", "16",
                "-profile:v", "high", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
                str(norm),
            ]
        )
        if video_ok(norm):
            return norm

    # HD Ken Burns from closed still
    closed = STILLS / clip / "closed" / f"{i:02d}.jpg"
    out = MOTION10 / clip / f"{i:02d}.mp4"
    if video_ok(out):
        return out
    out.parent.mkdir(parents=True, exist_ok=True)
    # zoompan: gentle cinematic push; full 1080x1920 every frame
    if zoom == "in":
        zexpr = "min(1.0+0.00055*on,1.045)"
    else:
        zexpr = "if(eq(on,1),1.045,max(1.045-0.00055*on,1.0))"
    vf = (
        f"scale={W}:{H}:force_original_aspect_ratio=increase,"
        f"crop={W}:{H},"
        f"zoompan=z='{zexpr}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
        f"d={NFRAMES}:s={W}x{H}:fps={FPS},"
        f"format=yuv420p"
    )
    part = out.with_name(out.stem + ".part.mp4")
    run(
        [
            FF, "-y", "-loop", "1", "-i", str(closed),
            "-vf", vf, "-frames:v", str(NFRAMES), "-an",
            "-c:v", "libx264", "-preset", "medium", "-crf", "16",
            "-profile:v", "high", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
            str(part),
        ]
    )
    part.replace(out)
    if not video_ok(out):
        raise RuntimeError(f"HD body failed {out}")
    print(f"  HD kenburns {clip}/{i:02d}", flush=True)
    return out


def pick_mouth_plate(clip: str, i: int) -> Path:
    """Soft still when better aligned than open (stops head-nod glitch)."""
    import numpy as np
    from PIL import Image

    closed_p = STILLS / clip / "closed" / f"{i:02d}.jpg"
    open_p = STILLS / clip / "open" / f"{i:02d}.jpg"
    soft_p = STILLS / clip / "soft" / f"{i:02d}.jpg"
    if not soft_p.exists():
        return open_p

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

    c = load(closed_p)
    ro = res(c, load(open_p)) if open_p.exists() else 99.0
    rs = res(c, load(soft_p))
    choice = soft_p if rs <= ro + 0.15 else open_p
    print(f"  plate {clip}/{i:02d}: open={ro:.1f} soft={rs:.1f} → {choice.parent.name}", flush=True)
    return choice


def build_shot(clip: str, i: int, line_id: str, text: str) -> Path:
    zoom = "in" if i % 2 else "out"
    body = ensure_hd_body(clip, i, zoom)
    closed = STILLS / clip / "closed" / f"{i:02d}.jpg"
    plate = pick_mouth_plate(clip, i)
    audio = AUDIO / f"{line_id}.mp3"
    if not audio.exists():
        raise FileNotFoundError(audio)

    work = Path(tempfile.mkdtemp(prefix=f"v10-{clip}-{i:02d}-"))
    lead_wav = work / "oral.wav"
    pad_audio(audio, lead_wav)

    silent = SHOTS / clip / f"{i:02d}-silent.mp4"
    silent.parent.mkdir(parents=True, exist_ok=True)
    track = "on" if "motion-v7" in str(body) or "motion_v7" in str(body) else "off"
    # motion-v7 path detection
    if "motion-v7" in str(body.resolve()):
        track = "on"
    else:
        track = "off"

    run(
        [
            sys.executable, str(COMPOSITE),
            str(body), str(closed), str(plate), str(silent),
            "--text", text,
            "--audio", str(lead_wav),
            "--track", track,
        ],
        quiet=False,
    )

    out = SHOTS / clip / f"{i:02d}.mp4"
    run(
        [
            FF, "-y",
            "-i", str(silent),
            "-i", str(lead_wav),
            "-map", "0:v:0", "-map", "1:a:0",
            "-c:v", "copy",
            "-c:a", "aac", "-b:a", "160k", "-ar", "24000", "-ac", "1",
            "-shortest",
            "-movflags", "+faststart",
            str(out),
        ]
    )
    # verify audio energy
    raw = subprocess.check_output(
        [FF, "-v", "error", "-i", str(out), "-t", "4", "-ac", "1", "-ar", "8000", "-f", "s16le", "-"]
    )
    import struct
    samples = struct.unpack(f"<{len(raw)//2}h", raw)
    peak = max(abs(x) for x in samples) if samples else 0
    if peak < 500:
        raise RuntimeError(f"silent mux {out} peak={peak}")
    (SHOTS / clip / f"{i:02d}.fix.txt").write_text(
        f"v10 {clip} {line_id}\nbody={body}\nplate={plate}\naudio={audio.name} peak={peak}\n"
    )
    print(f"  OK shot {clip}/{i:02d} peak={peak}", flush=True)
    return out


def stitch(clip: str, shots: list[Path]) -> Path:
    EXPORT.mkdir(parents=True, exist_ok=True)
    lst = EXPORT / f"{clip}.txt"
    lst.write_text("".join(f"file '{p.resolve()}'\n" for p in shots))
    export = EXPORT / f"{clip}.mp4"
    run(
        [
            FF, "-y", "-f", "concat", "-safe", "0", "-i", str(lst),
            "-c:v", "libx264", "-preset", "medium", "-crf", "16",
            "-profile:v", "high", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "160k", "-ar", "24000",
            "-movflags", "+faststart",
            str(export),
        ]
    )
    public = PUBLIC / f"{clip}.mp4"
    run(["cp", "-f", str(export), str(public)])
    poster = PUBLIC / f"{clip}.jpg"
    run(
        [
            FF, "-y", "-ss", "0.5", "-i", str(export),
            "-frames:v", "1", "-q:v", "2", str(poster),
        ]
    )
    # verify
    r = subprocess.run([FF, "-i", str(public)], capture_output=True, text=True)
    has_a = "Audio:" in r.stderr
    print(f"OK {public} has_audio={has_a} size={public.stat().st_size}", flush=True)
    if not has_a:
        raise RuntimeError(f"no audio on {public}")
    return public


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("clips", nargs="*")
    args = ap.parse_args()
    only = args.clips if args.clips else list(CLIPS.keys())
    print("=== Little Ones HQ v10 ===", flush=True)
    for clip in only:
        if clip not in CLIPS:
            print("unknown", clip, file=sys.stderr)
            return 1
        print(f"\n######## {clip} ########", flush=True)
        shots = []
        for i, (lid, text) in enumerate(CLIPS[clip], 1):
            print(f"\n--- {clip} {i:02d} {lid} ---", flush=True)
            shots.append(build_shot(clip, i, lid, text))
        stitch(clip, shots)
    print("\nHQ V10 DONE", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
