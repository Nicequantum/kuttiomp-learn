#!/usr/bin/env python3
"""Little Ones HQ v11 — continuous body + shared-clock lips + verified audio.

Architecture (HQ_V11.md):

  oral mp3 (public/audio/kids/<id>.mp3)  →  sole time authority
  closed still  →  I2V continuous body (mouth-calm)  →  motion-v11/ | motion-v7
  open plate (if residual ≤ 7) else soft else procedural jaw
  hybrid visemes (text shapes × audio window)  →  ROI composite
  mux oral AAC  →  stitch  →  public/scenes/<clip>.mp4

Phases (A–F):
  A  Preflight oral peaks + still inventory
  B  Ensure continuous I2V body (normalize; never Ken Burns primary)
  C  Pick mouth plate with residual gate (open ≤7 else soft else procedural)
  D  Face-tracked hybrid viseme composite on body
  E  Mux oral AAC; fail closed if silent slot
  F  Stitch + acceptance (duration, 5 audio slots, continuous body, no residual morph)

Usage:
  python3 scripts/rebuild-kids-hq-v11.py
  python3 scripts/rebuild-kids-hq-v11.py meal-kids greeting-kids
  python3 scripts/rebuild-kids-hq-v11.py --force meal-kids
  python3 scripts/rebuild-kids-hq-v11.py --body-only meal-kids
"""
from __future__ import annotations

import argparse
import re
import struct
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path("/workspace")
sys.path.insert(0, str(ROOT / "scripts"))
from rebuild_kids_lines import CLIPS  # noqa: E402

STILLS = ROOT / "film-kids" / "stills-v2"
MOTION7 = ROOT / "film-kids" / "motion-v7"
MOTION11 = ROOT / "film-kids" / "motion-v11"
SHOTS = ROOT / "film-kids" / "shots-v11"
EXPORT = ROOT / "film-kids" / "export-v11"
PUBLIC = ROOT / "public" / "scenes"
AUDIO = ROOT / "public" / "audio" / "kids"
COMPOSITE = ROOT / "scripts" / "composite-mouth-on-motion.py"
FF = "/usr/local/bin/ffmpeg"
W, H, DUR, FPS = 1080, 1920, 6.0, 24
MAX_RESIDUAL = 7.0
MIN_ORAL_PEAK = 500
MIN_BODY_MOTION = 2.5  # mean |Δ| on 4fps 180×320 gray — Ken Burns ~1.2, I2V ≥3
MIN_MASTER_DUR, MAX_MASTER_DUR = 29.85, 30.15
# greeting + count keep motion-v7 plates; everything else prefers motion-v11
V7_CLIPS = frozenset({"greeting-kids", "count-kids"})


def run(cmd: list, quiet: bool = True) -> None:
    print("+", " ".join(str(c) for c in cmd[:16]), "..." if len(cmd) > 16 else "", flush=True)
    kw = {}
    if quiet:
        kw["stdout"] = subprocess.DEVNULL
        kw["stderr"] = subprocess.DEVNULL
    subprocess.run(cmd, check=True, **kw)


def video_ok(path: Path, min_bytes: int = 80_000) -> bool:
    if not path.exists() or path.stat().st_size < min_bytes:
        return False
    r = subprocess.run(
        [FF, "-v", "error", "-xerror", "-i", str(path), "-frames:v", "2", "-f", "null", "-"],
        capture_output=True,
    )
    return r.returncode == 0


def probe_duration(path: Path) -> float | None:
    r = subprocess.run([FF, "-i", str(path)], capture_output=True, text=True)
    m = re.search(r"Duration: (\d+):(\d+):(\d+\.\d+)", r.stderr or "")
    if not m:
        return None
    h, mi, s = m.groups()
    return int(h) * 3600 + int(mi) * 60 + float(s)


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


def peak_audio(path: Path, t0: float = 0.0, t1: float | None = None) -> int:
    cmd = [FF, "-v", "error"]
    if t0 > 0:
        cmd += ["-ss", f"{t0:.3f}"]
    cmd += ["-i", str(path)]
    if t1 is not None:
        cmd += ["-t", f"{t1 - t0:.3f}"]
    cmd += ["-ac", "1", "-ar", "8000", "-f", "s16le", "-"]
    raw = subprocess.check_output(cmd)
    if len(raw) < 2:
        return 0
    samples = struct.unpack(f"<{len(raw) // 2}h", raw)
    return max(abs(x) for x in samples) if samples else 0


def body_motion_score(path: Path, seconds: float = 6.0) -> float:
    """Mean absolute frame-to-frame delta on downscaled gray. Continuous I2V ≫ still+zoom."""
    import numpy as np

    raw = subprocess.check_output(
        [
            FF, "-v", "error", "-i", str(path),
            "-vf", "fps=4,scale=180:320,format=gray",
            "-t", f"{seconds:.2f}", "-f", "rawvideo", "-",
        ]
    )
    h, w = 320, 180
    frames = np.frombuffer(raw, dtype=np.uint8)
    nfr = len(frames) // (h * w)
    if nfr < 3:
        return 0.0
    f = frames[: nfr * h * w].reshape(nfr, h, w).astype(np.float32)
    return float(np.mean(np.abs(f[1:] - f[:-1])))


def normalize_body(src: Path, dst: Path, force: bool = False) -> Path:
    """Scale/crop any I2V plate to 1080x1920 @ 24fps, 6.0s, silent."""
    dst.parent.mkdir(parents=True, exist_ok=True)
    if not force and video_ok(dst):
        return dst
    part = dst.with_name(dst.stem + ".part.mp4")
    vf = (
        f"scale={W}:{H}:force_original_aspect_ratio=increase,"
        f"crop={W}:{H},fps={FPS},format=yuv420p,"
        f"unsharp=5:5:0.4:5:5:0.0"
    )
    run(
        [
            FF, "-y", "-i", str(src),
            "-vf", vf, "-t", str(DUR), "-an",
            "-c:v", "libx264", "-preset", "medium", "-crf", "16",
            "-profile:v", "high", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
            str(part),
        ]
    )
    part.replace(dst)
    if not video_ok(dst):
        raise RuntimeError(f"normalize failed {dst}")
    return dst


def _try_norm(raw: Path, norm: Path, force: bool) -> Path | None:
    if not force and video_ok(norm):
        return norm
    if raw.exists() and raw.stat().st_size > 50_000:
        return normalize_body(raw, norm, force=force)
    return None


def ensure_body(clip: str, i: int, force: bool = False) -> Path:
    """Prefer continuous I2V: motion-v7 for greeting/count, motion-v11 otherwise.

    Ken Burns / motion-v10 is NOT a shipping body. Fail closed if no I2V plate.
    """
    order: list[tuple[Path, Path]]
    v7n, v7r = MOTION7 / clip / f"{i:02d}-norm.mp4", MOTION7 / clip / f"{i:02d}.mp4"
    v11n, v11r = MOTION11 / clip / f"{i:02d}-norm.mp4", MOTION11 / clip / f"{i:02d}.mp4"
    if clip in V7_CLIPS:
        order = [(v7r, v7n), (v11r, v11n)]
    else:
        order = [(v11r, v11n), (v7r, v7n)]

    for raw, norm in order:
        got = _try_norm(raw, norm, force=force)
        if got is None:
            continue
        score = body_motion_score(got)
        if score < MIN_BODY_MOTION:
            raise RuntimeError(
                f"body not continuous for {clip}/{i:02d}: motionΔ={score:.2f} "
                f"(need ≥{MIN_BODY_MOTION}) path={got} — still+zoom is not shippable"
            )
        return got

    raise FileNotFoundError(
        f"No continuous I2V body for {clip}/{i:02d}. "
        f"Place 6s mouth-calm I2V at {v11r} (or motion-v7 for greeting/count), then re-run."
    )


def pick_mouth_plate(clip: str, i: int) -> tuple[Path, dict]:
    """Prefer OPEN when residual ≤ 7; soft as escape; never silent morph of misaligned open."""
    import numpy as np
    from PIL import Image
    from kids_animation_lib import phase_shift, shift_image, face_residual

    closed_p = STILLS / clip / "closed" / f"{i:02d}.jpg"
    open_p = STILLS / clip / "open" / f"{i:02d}.jpg"
    soft_p = STILLS / clip / "soft" / f"{i:02d}.jpg"
    if not closed_p.exists():
        raise FileNotFoundError(closed_p)

    def load(p: Path):
        im = Image.open(p).convert("RGB")
        s = max(W / im.width, H / im.height)
        nw, nh = int(round(im.width * s)), int(round(im.height * s))
        im = im.resize((nw, nh), Image.Resampling.LANCZOS)
        l, t = (nw - W) // 2, (nh - H) // 2
        return np.asarray(im.crop((l, t, l + W, t + H)), dtype=np.float32)

    def residual(a, b):
        dy, dx = phase_shift(a, b)
        al = shift_image(b, dy, dx)
        ra = face_residual(a, al)
        rb = face_residual(a, b)
        return min(ra, rb)

    c = load(closed_p)
    ro = residual(c, load(open_p)) if open_p.exists() else 99.0
    rs = residual(c, load(soft_p)) if soft_p.exists() else 99.0

    # open first when safe — soft was ~½ mouth_delta of open
    if open_p.exists() and ro <= MAX_RESIDUAL:
        choice, tag, mode = open_p, f"open res={ro:.1f}", "open"
    elif soft_p.exists() and rs <= MAX_RESIDUAL:
        choice, tag, mode = soft_p, f"soft res={rs:.1f} (open={ro:.1f} over gate)", "soft"
    elif open_p.exists() or soft_p.exists():
        # residual over gate → still pass plate; composite-mouth uses procedural jaw
        # (build_mouth_bank residual gate). Never full-frame morph of misaligned open.
        choice = soft_p if soft_p.exists() and rs <= ro else open_p
        tag = f"procedural-jaw path (open={ro:.1f} soft={rs:.1f} over {MAX_RESIDUAL})"
        mode = "procedural-fallback"
    else:
        choice, tag, mode = closed_p, "closed-only (no open/soft)", "closed-only"

    meta = {"open": ro, "soft": rs, "mode": mode, "tag": tag, "plate": str(choice)}
    print(f"  plate {clip}/{i:02d}: open={ro:.1f} soft={rs:.1f} → {tag}", flush=True)
    return choice, meta


def build_shot(clip: str, i: int, line_id: str, text: str, force: bool = False) -> Path:
    body = ensure_body(clip, i, force=force)
    closed = STILLS / clip / "closed" / f"{i:02d}.jpg"
    plate, plate_meta = pick_mouth_plate(clip, i)
    audio = AUDIO / f"{line_id}.mp3"
    if not audio.exists():
        raise FileNotFoundError(audio)
    oral_peak = peak_audio(audio)
    if oral_peak < MIN_ORAL_PEAK:
        raise RuntimeError(f"oral file silent: {audio} peak={oral_peak}")

    work = Path(tempfile.mkdtemp(prefix=f"v11-{clip}-{i:02d}-"))
    lead_wav = work / "oral.wav"
    pad_audio(audio, lead_wav)

    silent = SHOTS / clip / f"{i:02d}-silent.mp4"
    silent.parent.mkdir(parents=True, exist_ok=True)

    # Face-track on real I2V always; kenburns/static off
    track = "on"
    body_s = str(body.resolve())
    if "kenburns" in body_s or "motion-v10" in body_s or "motion-v8" in body_s:
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
    if not video_ok(silent, min_bytes=50_000):
        raise RuntimeError(f"composite produced bad silent {silent}")

    out = SHOTS / clip / f"{i:02d}.mp4"
    part = out.with_name(out.stem + ".part.mp4")
    run(
        [
            FF, "-y",
            "-i", str(silent),
            "-i", str(lead_wav),
            "-map", "0:v:0", "-map", "1:a:0",
            "-c:v", "copy",
            "-c:a", "aac", "-b:a", "160k", "-ar", "24000", "-ac", "1",
            "-t", str(DUR),
            "-movflags", "+faststart",
            str(part),
        ]
    )
    part.replace(out)

    peak = peak_audio(out, 0.0, 4.5)
    if peak < MIN_ORAL_PEAK:
        raise RuntimeError(f"silent mux {out} peak={peak}")
    (SHOTS / clip / f"{i:02d}.fix.txt").write_text(
        f"v11 {clip} {line_id}\n"
        f"body={body}\n"
        f"plate={plate} mode={plate_meta['mode']}\n"
        f"audio={audio.name} peak={peak} oral_peak={oral_peak}\n"
        f"body_motion={body_motion_score(body):.2f}\n"
    )
    print(
        f"  OK shot {clip}/{i:02d} peak={peak} body={body.parent.parent.name}/{body.name}",
        flush=True,
    )
    return out


def stitch(clip: str, shots: list[Path]) -> Path:
    EXPORT.mkdir(parents=True, exist_ok=True)
    lst = EXPORT / f"{clip}.txt"
    lst.write_text("".join(f"file '{p.resolve()}'\n" for p in shots))
    export = EXPORT / f"{clip}.mp4"
    part = export.with_name(export.stem + ".part.mp4")
    run(
        [
            FF, "-y", "-f", "concat", "-safe", "0", "-i", str(lst),
            "-c:v", "libx264", "-preset", "medium", "-crf", "16",
            "-profile:v", "high", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "160k", "-ar", "24000",
            "-movflags", "+faststart",
            str(part),
        ]
    )
    part.replace(export)

    public = PUBLIC / f"{clip}.mp4"
    run(["cp", "-f", str(export), str(public)])
    poster = PUBLIC / f"{clip}.jpg"
    run([FF, "-y", "-ss", "0.5", "-i", str(export), "-frames:v", "1", "-q:v", "2", str(poster)])

    # ── Phase F acceptance (fail closed) ──────────────────────────────────
    r = subprocess.run([FF, "-i", str(public)], capture_output=True, text=True)
    info = (r.stderr or "") + (r.stdout or "")
    if "Audio:" not in info:
        raise RuntimeError(f"no audio on {public}")

    dur = probe_duration(public)
    if dur is None or not (MIN_MASTER_DUR <= dur <= MAX_MASTER_DUR):
        raise RuntimeError(f"duration out of range on {public}: {dur}")

    slot_peaks = [peak_audio(public, i * 6.0, i * 6.0 + 5.5) for i in range(5)]
    if any(p < MIN_ORAL_PEAK for p in slot_peaks):
        raise RuntimeError(f"silent slot on {public}: {slot_peaks}")

    # Continuous body on first shot window of master
    mscore = body_motion_score(public, seconds=6.0)
    if mscore < MIN_BODY_MOTION:
        raise RuntimeError(
            f"master body not continuous {public}: motionΔ={mscore:.2f} "
            f"(Ken Burns / still+zoom not shippable)"
        )

    print(
        f"OK {public} dur={dur:.2f}s slots={slot_peaks} bodyΔ={mscore:.2f} "
        f"size={public.stat().st_size}",
        flush=True,
    )
    return public


def preflight(clip: str) -> list[str]:
    """Phase A: oral peaks + stills present. Does not generate bodies."""
    missing: list[str] = []
    for i, (lid, _text) in enumerate(CLIPS[clip], 1):
        audio = AUDIO / f"{lid}.mp3"
        if not audio.exists():
            missing.append(f"audio missing {lid}")
        elif peak_audio(audio) < MIN_ORAL_PEAK:
            missing.append(f"audio silent {lid} peak={peak_audio(audio)}")
        closed = STILLS / clip / "closed" / f"{i:02d}.jpg"
        if not closed.exists():
            missing.append(f"still missing {closed}")
    return missing


def body_only(clip: str, force: bool = False) -> list[str]:
    """Phase B only: normalize I2V bodies; report missing continuous plates."""
    missing: list[str] = []
    for i, (_lid, _text) in enumerate(CLIPS[clip], 1):
        try:
            body = ensure_body(clip, i, force=force)
            score = body_motion_score(body)
            print(f"  body {clip}/{i:02d} → {body} motionΔ={score:.2f}", flush=True)
        except (FileNotFoundError, RuntimeError) as e:
            missing.append(str(e))
    return missing


def main() -> int:
    ap = argparse.ArgumentParser(description="Little Ones HQ v11 rebuild")
    ap.add_argument("clips", nargs="*")
    ap.add_argument("--force", action="store_true", help="re-normalize bodies + rebuild shots")
    ap.add_argument(
        "--body-only",
        action="store_true",
        help="Phase B only: ensure/normalize continuous I2V bodies",
    )
    args = ap.parse_args()
    only = args.clips if args.clips else list(CLIPS.keys())
    print("=== Little Ones HQ v11 ===", flush=True)
    print(f"clips={only} force={args.force} body_only={args.body_only}", flush=True)

    hard_fail: list[str] = []
    built: list[str] = []

    for clip in only:
        if clip not in CLIPS:
            print("unknown", clip, file=sys.stderr)
            return 1
        print(f"\n######## {clip} ########", flush=True)

        # Phase A
        miss_a = preflight(clip)
        if miss_a:
            for m in miss_a:
                hard_fail.append(f"{clip}: {m}")
            print("  PREFLIGHT FAIL:", "; ".join(miss_a), flush=True)
            continue

        if args.body_only:
            miss_b = body_only(clip, force=args.force)
            if miss_b:
                for m in miss_b:
                    hard_fail.append(f"{clip}: {m}")
            continue

        # Phase B preflight (bodies must exist + continuous before building)
        miss_b: list[str] = []
        for i, (_lid, _text) in enumerate(CLIPS[clip], 1):
            try:
                ensure_body(clip, i, force=False)
            except (FileNotFoundError, RuntimeError) as e:
                miss_b.append(str(e))
        if miss_b:
            for m in miss_b:
                hard_fail.append(f"{clip}: {m}")
            print("  BODY FAIL (fail closed):", flush=True)
            for m in miss_b:
                print("   -", m, flush=True)
            continue

        # Phases C–E
        try:
            shots: list[Path] = []
            for i, (lid, text) in enumerate(CLIPS[clip], 1):
                print(f"\n--- {clip} {i:02d} {lid} ---", flush=True)
                shots.append(build_shot(clip, i, lid, text, force=args.force))
            # Phase F
            stitch(clip, shots)
            built.append(clip)
        except Exception as e:
            hard_fail.append(f"{clip}: {e}")
            print(f"  BUILD FAIL: {e}", flush=True)

    print("\n=== HQ V11 SUMMARY ===", flush=True)
    print("built:", ", ".join(built) if built else "(none)", flush=True)
    if hard_fail:
        print("FAILED (fail closed):", flush=True)
        for m in hard_fail:
            print(" -", m, flush=True)
        print(
            "\nI2V: animate film-kids/stills-v2/<clip>/closed/NN.jpg → "
            "film-kids/motion-v11/<clip>/NN.mp4 (6s, mouth soft-closed, body gesture).",
            flush=True,
        )
        return 2

    print("\nHQ V11 DONE", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
