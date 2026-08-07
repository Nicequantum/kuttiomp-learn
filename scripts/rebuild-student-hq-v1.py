#!/usr/bin/env python3
"""Young Path HQ v1 — continuous body + shared-clock lips + verified audio.

Parallel to Little Ones HQ v11; does not touch kids masters.

  oral mp3 (public/audio/student/<id>.mp3)  →  sole time authority
  closed still  →  I2V body (preferred) or procedural body-life  →  film-student/motion/
  open plate (if residual ≤ 7) else soft else procedural jaw
  hybrid visemes  →  ROI composite → mux AAC → stitch → public/scenes/

Usage:
  python3 scripts/rebuild-student-hq-v1.py
  python3 scripts/rebuild-student-hq-v1.py meal-student
  python3 scripts/rebuild-student-hq-v1.py --body-only
  python3 scripts/rebuild-student-hq-v1.py --force greeting-student
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
from rebuild_student_lines import CLIPS  # noqa: E402

STILLS = ROOT / "film-student" / "stills"
MOTION = ROOT / "film-student" / "motion"
SHOTS = ROOT / "film-student" / "shots"
EXPORT = ROOT / "film-student" / "export"
PUBLIC = ROOT / "public" / "scenes"
AUDIO = ROOT / "public" / "audio" / "student"
COMPOSITE = ROOT / "scripts" / "composite-mouth-on-motion.py"
BODY_LIFE = ROOT / "scripts" / "render-kids-body-life.py"
FF = "/usr/local/bin/ffmpeg"
W, H, DUR, FPS = 1080, 1920, 6.0, 24
MAX_RESIDUAL = 7.0
MIN_ORAL_PEAK = 500
MIN_BODY_MOTION = 2.3
MIN_MASTER_DUR, MAX_MASTER_DUR = 29.85, 30.15


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


def render_procedural_body(closed: Path, out: Path, line_id: str, i: int) -> Path:
    """Body-life fallback when continuous I2V is missing (Hybrid v8 path)."""
    out.parent.mkdir(parents=True, exist_ok=True)
    zoom = "in" if i % 2 else "out"
    run(
        [
            sys.executable,
            str(BODY_LIFE),
            str(closed),
            str(out),
            "--line-id",
            line_id,
            "--zoom",
            zoom,
        ],
        quiet=False,
    )
    if not video_ok(out, min_bytes=50_000):
        raise RuntimeError(f"procedural body invalid {out}")
    return out



def amplify_body_motion(src: Path, dst: Path) -> Path:
    """Last-resort continuous motion: gentle zoompan on an existing body plate."""
    dst.parent.mkdir(parents=True, exist_ok=True)
    part = dst.with_name(dst.stem + ".part.mp4")
    vf = (
        f"scale={W}:{H},"
        f"zoompan=z='min(1.06,1+0.01*on/24)':"
        f"x='iw/2-(iw/zoom/2)+3*sin(on/14)':"
        f"y='ih/2-(ih/zoom/2)':"
        f"d=1:s={W}x{H}:fps={FPS},format=yuv420p"
    )
    run(
        [
            FF, "-y", "-i", str(src),
            "-vf", vf, "-t", str(DUR), "-an",
            "-c:v", "libx264", "-preset", "fast", "-crf", "16",
            "-profile:v", "high", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
            str(part),
        ]
    )
    part.replace(dst)
    if not video_ok(dst, min_bytes=50_000):
        raise RuntimeError(f"amplify body failed {dst}")
    return dst


def ensure_body(clip: str, i: int, line_id: str, force: bool = False) -> Path:
    """Prefer I2V plate; fall back to procedural body-life so rebuild can ship."""
    raw = MOTION / clip / f"{i:02d}.mp4"
    norm = MOTION / clip / f"{i:02d}-norm.mp4"
    bodylife = MOTION / clip / f"{i:02d}-bodylife.mp4"
    closed = STILLS / clip / "closed" / f"{i:02d}.jpg"

    if not force and video_ok(norm):
        score = body_motion_score(norm)
        if score >= MIN_BODY_MOTION:
            return norm

    if raw.exists() and raw.stat().st_size >= 50_000:
        got = normalize_body(raw, norm, force=True)
        score = body_motion_score(got)
        if score >= MIN_BODY_MOTION:
            print(f"  body {clip}/{i:02d} I2V motionΔ={score:.2f}", flush=True)
            return got
        print(
            f"  body {clip}/{i:02d} I2V too still motionΔ={score:.2f} → procedural",
            flush=True,
        )

    if not force and video_ok(bodylife):
        score = body_motion_score(bodylife)
        if score >= MIN_BODY_MOTION:
            print(f"  body {clip}/{i:02d} reuse bodylife motionΔ={score:.2f}", flush=True)
            return bodylife

    if not closed.exists():
        raise FileNotFoundError(closed)
    got = render_procedural_body(closed, bodylife, line_id, i)
    score = body_motion_score(got)
    if score < MIN_BODY_MOTION:
        print(
            f"  body {clip}/{i:02d} weak motionΔ={score:.2f} → boost count",
            flush=True,
        )
        got = render_procedural_body(closed, bodylife, "cs5", i)
        score = body_motion_score(got)
    if score < MIN_BODY_MOTION:
        print(
            f"  body {clip}/{i:02d} still weak motionΔ={score:.2f} → amplify zoom",
            flush=True,
        )
        amp = MOTION / clip / f"{i:02d}-amp.mp4"
        got = amplify_body_motion(got, amp)
        score = body_motion_score(got)
    if score < MIN_BODY_MOTION:
        raise RuntimeError(
            f"body not continuous for {clip}/{i:02d}: motionΔ={score:.2f} "
            f"(need ≥{MIN_BODY_MOTION}) path={got}"
        )
    print(f"  body {clip}/{i:02d} procedural motionΔ={score:.2f}", flush=True)
    return got


def pick_mouth_plate(clip: str, i: int) -> tuple[Path, dict]:
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

    if open_p.exists() and ro <= MAX_RESIDUAL:
        choice, tag, mode = open_p, f"open res={ro:.1f}", "open"
    elif soft_p.exists() and rs <= MAX_RESIDUAL:
        choice, tag, mode = soft_p, f"soft res={rs:.1f}", "soft"
    elif open_p.exists() or soft_p.exists():
        choice = soft_p if soft_p.exists() and rs <= ro else open_p
        tag = f"procedural-jaw path (open={ro:.1f} soft={rs:.1f})"
        mode = "procedural-fallback"
    else:
        choice, tag, mode = closed_p, "closed-only (procedural jaw)", "closed-only"

    meta = {"open": ro, "soft": rs, "mode": mode, "tag": tag, "plate": str(choice)}
    print(f"  plate {clip}/{i:02d}: open={ro:.1f} soft={rs:.1f} → {tag}", flush=True)
    return choice, meta


def build_shot(clip: str, i: int, line_id: str, text: str, force: bool = False) -> Path:
    out = SHOTS / clip / f"{i:02d}.mp4"
    if not force and video_ok(out, min_bytes=80_000):
        peak = peak_audio(out, 0.0, 4.5)
        if peak >= MIN_ORAL_PEAK:
            print(f"  reuse shot {clip}/{i:02d} peak={peak}", flush=True)
            return out

    body = ensure_body(clip, i, line_id, force=force)
    closed = STILLS / clip / "closed" / f"{i:02d}.jpg"
    plate, plate_meta = pick_mouth_plate(clip, i)
    audio = AUDIO / f"{line_id}.mp3"
    if not audio.exists():
        raise FileNotFoundError(audio)
    oral_peak = peak_audio(audio)
    if oral_peak < MIN_ORAL_PEAK:
        raise RuntimeError(f"oral file silent: {audio} peak={oral_peak}")

    work = Path(tempfile.mkdtemp(prefix=f"sv1-{clip}-{i:02d}-"))
    lead_wav = work / "oral.wav"
    pad_audio(audio, lead_wav)

    silent = SHOTS / clip / f"{i:02d}-silent.mp4"
    silent.parent.mkdir(parents=True, exist_ok=True)

    run(
        [
            sys.executable, str(COMPOSITE),
            str(body), str(closed), str(plate), str(silent),
            "--text", text,
            "--audio", str(lead_wav),
            "--track", "on",
        ],
        quiet=False,
    )
    if not video_ok(silent, min_bytes=50_000):
        raise RuntimeError(f"composite produced bad silent {silent}")

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
        f"student-v1 {clip} {line_id}\n"
        f"body={body}\n"
        f"plate={plate} mode={plate_meta['mode']}\n"
        f"audio={audio.name} peak={peak} oral_peak={oral_peak}\n"
        f"body_motion={body_motion_score(body):.2f}\n"
    )
    print(f"  OK shot {clip}/{i:02d} peak={peak}", flush=True)
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

    mscore = body_motion_score(public, seconds=6.0)
    if mscore < MIN_BODY_MOTION:
        raise RuntimeError(
            f"master body not continuous {public}: motionΔ={mscore:.2f}"
        )

    print(
        f"OK {public} dur={dur:.2f}s slots={slot_peaks} bodyΔ={mscore:.2f} "
        f"size={public.stat().st_size}",
        flush=True,
    )
    return public


def preflight(clip: str) -> list[str]:
    missing: list[str] = []
    for i, (lid, _nar, _eng) in enumerate(CLIPS[clip], 1):
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
    missing: list[str] = []
    for i, (lid, _n, _e) in enumerate(CLIPS[clip], 1):
        try:
            body = ensure_body(clip, i, lid, force=force)
            score = body_motion_score(body)
            print(f"  body {clip}/{i:02d} → {body} motionΔ={score:.2f}", flush=True)
        except (FileNotFoundError, RuntimeError) as e:
            missing.append(str(e))
    return missing


def main() -> int:
    ap = argparse.ArgumentParser(description="Young Path Student HQ v1 rebuild")
    ap.add_argument("clips", nargs="*")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--body-only", action="store_true")
    args = ap.parse_args()
    only = args.clips if args.clips else list(CLIPS.keys())
    print("=== Young Path HQ v1 ===", flush=True)
    print(f"clips={only} force={args.force} body_only={args.body_only}", flush=True)

    hard_fail: list[str] = []
    built: list[str] = []

    for clip in only:
        if clip not in CLIPS:
            print("unknown", clip, file=sys.stderr)
            return 1
        print(f"\n######## {clip} ########", flush=True)

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

        # Skip full rebuild if public master already passes acceptance
        public = PUBLIC / f"{clip}.mp4"
        if not args.force and video_ok(public, min_bytes=200_000):
            try:
                dur = probe_duration(public)
                if dur is not None and MIN_MASTER_DUR <= dur <= MAX_MASTER_DUR:
                    slots = [peak_audio(public, i * 6.0, i * 6.0 + 5.5) for i in range(5)]
                    mscore = body_motion_score(public, seconds=6.0)
                    if all(p >= MIN_ORAL_PEAK for p in slots) and mscore >= MIN_BODY_MOTION:
                        print(
                            f"  reuse master {public} dur={dur:.2f} slots={slots} "
                            f"bodyΔ={mscore:.2f}",
                            flush=True,
                        )
                        built.append(clip)
                        continue
            except Exception as e:
                print(f"  master check failed, rebuilding: {e}", flush=True)

        try:
            shots: list[Path] = []
            for i, (lid, nar, _eng) in enumerate(CLIPS[clip], 1):
                print(f"\n--- {clip} {i:02d} {lid} ---", flush=True)
                shots.append(build_shot(clip, i, lid, nar, force=args.force))
            stitch(clip, shots)
            built.append(clip)
        except Exception as e:
            hard_fail.append(f"{clip}: {e}")
            print(f"  BUILD FAIL: {e}", flush=True)

    print("\n=== STUDENT HQ V1 SUMMARY ===", flush=True)
    print("built:", ", ".join(built) if built else "(none)", flush=True)
    if hard_fail:
        print("FAILED (fail closed):", flush=True)
        for m in hard_fail:
            print(" -", m, flush=True)
        return 2

    print("\nSTUDENT HQ V1 DONE", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
