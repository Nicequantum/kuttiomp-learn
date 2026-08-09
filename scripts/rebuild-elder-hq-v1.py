#!/usr/bin/env python3
"""Elder Path HQ v1 — robust shared-clock lips + continuous body.

Lessons from Little Ones + Young Path:

  1. Oral is the sole clock — normalize (trim silence → fixed lead) then bake + mux
     the *same* WAV so lips and language cannot drift.
  2. Hybrid visemes: text shapes warped onto real audio window, open amount gated
     by RMS energy (silent frames stay nearly closed).
  3. Open-plate residual gate (≤ 5.0 preferred) — else procedural jaw (no glitch morph).
  4. Always face-track mouth ROI on body plates.
  5. Continuous body: I2V preferred, else strong body-life + amplify if weak.
  6. Masters carry AAC language — player uses filmCarriesLanguage (no dual TTS echo).

Usage:
  python3 scripts/rebuild-elder-hq-v1.py
  python3 scripts/rebuild-elder-hq-v1.py council-elder
  python3 scripts/rebuild-elder-hq-v1.py --force discourse-elder
  python3 scripts/rebuild-elder-hq-v1.py --prepare-audio
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
from rebuild_elder_lines import CLIPS  # noqa: E402
from kids_animation_lib import normalize_oral_slot  # noqa: E402

STILLS = ROOT / "film-elder" / "stills"
MOTION = ROOT / "film-elder" / "motion"
SHOTS = ROOT / "film-elder" / "shots"
EXPORT = ROOT / "film-elder" / "export"
PUBLIC = ROOT / "public" / "scenes"
AUDIO = ROOT / "public" / "audio" / "elder"
COMPOSITE = ROOT / "scripts" / "composite-mouth-on-motion.py"
BODY_LIFE = ROOT / "scripts" / "render-kids-body-life.py"
FF = "/usr/local/bin/ffmpeg"
W, H, DUR, FPS = 1080, 1920, 6.0, 24
MAX_RESIDUAL = 5.0  # stricter than kids/student 7.0 — less glitch morph
MIN_ORAL_PEAK = 500
MIN_BODY_MOTION = 2.0
MIN_MASTER_DUR, MAX_MASTER_DUR = 29.85, 30.15
ORAL_LEAD = 0.22


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


def amplify_body_motion(src: Path, dst: Path) -> Path:
    dst.parent.mkdir(parents=True, exist_ok=True)
    part = dst.with_name(dst.stem + ".part.mp4")
    vf = (
        f"scale={W}:{H},"
        f"zoompan=z='min(1.035,1+0.005*on/24)':"
        f"x='iw/2-(iw/zoom/2)+1.0*sin(on/18)':"
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


def normalize_body(src: Path, dst: Path, force: bool = False) -> Path:
    dst.parent.mkdir(parents=True, exist_ok=True)
    if not force and video_ok(dst):
        return dst
    part = dst.with_name(dst.stem + ".part.mp4")
    vf = (
        f"scale={W}:{H}:force_original_aspect_ratio=increase,"
        f"crop={W}:{H},fps={FPS},format=yuv420p,"
        f"unsharp=5:5:0.35:5:5:0.0"
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
    out.parent.mkdir(parents=True, exist_ok=True)
    zoom = "in" if i % 2 else "out"
    run(
        [
            sys.executable, str(BODY_LIFE), str(closed), str(out),
            "--line-id", line_id, "--zoom", zoom,
        ],
        quiet=False,
    )
    if not video_ok(out, min_bytes=50_000):
        raise RuntimeError(f"procedural body invalid {out}")
    return out


def ensure_body(clip: str, i: int, line_id: str, force: bool = False) -> Path:
    raw = MOTION / clip / f"{i:02d}.mp4"
    norm = MOTION / clip / f"{i:02d}-norm.mp4"
    bodylife = MOTION / clip / f"{i:02d}-bodylife.mp4"
    closed = STILLS / clip / "closed" / f"{i:02d}.jpg"

    if video_ok(norm):
        score = body_motion_score(norm)
        if score >= MIN_BODY_MOTION:
            return norm

    if raw.exists() and raw.stat().st_size >= 50_000:
        got = normalize_body(raw, norm, force=True)
        score = body_motion_score(got)
        if score >= MIN_BODY_MOTION:
            print(f"  body {clip}/{i:02d} I2V motionΔ={score:.2f}", flush=True)
            return got

    if video_ok(bodylife):
        score = body_motion_score(bodylife)
        if score >= MIN_BODY_MOTION:
            print(f"  body {clip}/{i:02d} reuse bodylife motionΔ={score:.2f}", flush=True)
            return bodylife

    amp_p = MOTION / clip / f"{i:02d}-amp.mp4"
    if video_ok(amp_p):
        score = body_motion_score(amp_p)
        if score >= MIN_BODY_MOTION:
            print(f"  body {clip}/{i:02d} reuse amp motionΔ={score:.2f}", flush=True)
            return amp_p

    if not closed.exists():
        raise FileNotFoundError(closed)
    got = render_procedural_body(closed, bodylife, line_id, i)
    score = body_motion_score(got)
    if score < MIN_BODY_MOTION:
        print(f"  body {clip}/{i:02d} weak motionΔ={score:.2f} → boost count", flush=True)
        got = render_procedural_body(closed, bodylife, "ca5", i)
        score = body_motion_score(got)
    if score < MIN_BODY_MOTION:
        print(f"  body {clip}/{i:02d} still weak motionΔ={score:.2f} → amplify", flush=True)
        amp = MOTION / clip / f"{i:02d}-amp.mp4"
        got = amplify_body_motion(got, amp)
        score = body_motion_score(got)
    if score < MIN_BODY_MOTION:
        raise RuntimeError(f"body not continuous {clip}/{i:02d}: motionΔ={score:.2f}")
    print(f"  body {clip}/{i:02d} motionΔ={score:.2f} path={got.name}", flush=True)
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
        return min(face_residual(a, al), face_residual(a, b))

    c = load(closed_p)
    ro = residual(c, load(open_p)) if open_p.exists() else 99.0
    rs = residual(c, load(soft_p)) if soft_p.exists() else 99.0

    # Prefer open only when residual is tight — otherwise procedural jaw (no glitch)
    if open_p.exists() and ro <= MAX_RESIDUAL:
        choice, tag, mode = open_p, f"open res={ro:.1f}", "open"
    elif soft_p.exists() and rs <= MAX_RESIDUAL:
        choice, tag, mode = soft_p, f"soft res={rs:.1f}", "soft"
    elif open_p.exists() or soft_p.exists():
        choice = soft_p if soft_p.exists() and rs <= ro else (open_p if open_p.exists() else closed_p)
        tag = f"procedural-jaw (open={ro:.1f} soft={rs:.1f} > {MAX_RESIDUAL})"
        mode = "procedural-fallback"
    else:
        choice, tag, mode = closed_p, "closed-only procedural jaw", "closed-only"

    meta = {"open": ro, "soft": rs, "mode": mode, "tag": tag, "plate": str(choice)}
    print(f"  plate {clip}/{i:02d}: open={ro:.1f} soft={rs:.1f} → {tag}", flush=True)
    return choice, meta


def ensure_oral(line_id: str, force: bool = False) -> Path:
    """Normalized oral at AUDIO/line_id.mp3 — shared clock for bake + mux.

    Prefers already-normalized pack audio. If only a raw seed exists under
    film-elder/audio-raw/<id>.mp3, normalize it into the pack slot.
    """
    out = AUDIO / f"{line_id}.mp3"
    if not force and out.exists() and peak_audio(out) >= MIN_ORAL_PEAK:
        return out
    raw = ROOT / "film-elder" / "audio-raw" / f"{line_id}.mp3"
    seed = raw if raw.exists() else out
    if not seed.exists():
        raise FileNotFoundError(
            f"missing elder oral for {line_id} — run: python3 scripts/prepare_elder_audio.py"
        )
    # Always re-normalize into out so lead is locked even if seed was already in AUDIO
    work = out.with_suffix(".norm-src.mp3")
    if seed.resolve() != out.resolve():
        work.write_bytes(seed.read_bytes())
        src = work
    else:
        # seed is out itself — copy to temp then rewrite
        tmp = out.with_suffix(".bak.mp3")
        tmp.write_bytes(out.read_bytes())
        src = tmp
    meta = normalize_oral_slot(src, out, lead=ORAL_LEAD, total=DUR)
    for p in (work, out.with_suffix(".bak.mp3")):
        p.unlink(missing_ok=True)
    peak = peak_audio(out)
    if peak < MIN_ORAL_PEAK:
        raise RuntimeError(f"normalized oral silent {out} peak={peak}")
    print(f"  oral {line_id} lead={ORAL_LEAD} meta={meta} peak={peak}", flush=True)
    return out


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
    oral_mp3 = ensure_oral(line_id, force=force)

    work = Path(tempfile.mkdtemp(prefix=f"ev1-{clip}-{i:02d}-"))
    # Decode same normalized oral to WAV for composite + mux (identical samples)
    lead_wav = work / "oral.wav"
    run(
        [
            FF, "-y", "-i", str(oral_mp3),
            "-af", f"apad=whole_dur={DUR:.3f},atrim=0:{DUR:.3f},asetpts=PTS-STARTPTS",
            "-ar", "24000", "-ac", "1", "-c:a", "pcm_s16le", str(lead_wav),
        ]
    )

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
        raise RuntimeError(f"composite bad silent {silent}")

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
        f"elder-v1 {clip} {line_id}\n"
        f"body={body}\n"
        f"plate={plate} mode={plate_meta['mode']}\n"
        f"oral={oral_mp3.name} peak={peak} lead={ORAL_LEAD}\n"
        f"body_motion={body_motion_score(body):.2f}\n"
        f"text={text}\n"
    )
    print(f"  OK shot {clip}/{i:02d} peak={peak} plate={plate_meta['mode']}", flush=True)
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
        raise RuntimeError(f"master body not continuous {public}: motionΔ={mscore:.2f}")

    print(
        f"OK {public} dur={dur:.2f}s slots={slot_peaks} bodyΔ={mscore:.2f} "
        f"size={public.stat().st_size}",
        flush=True,
    )
    return public


def prepare_all_audio(force: bool = False) -> None:
    for clip, lines in CLIPS.items():
        for lid, _n, _e in lines:
            ensure_oral(lid, force=force)


def preflight(clip: str) -> list[str]:
    missing: list[str] = []
    for i, (lid, _n, _e) in enumerate(CLIPS[clip], 1):
        try:
            oral = ensure_oral(lid)
            if peak_audio(oral) < MIN_ORAL_PEAK:
                missing.append(f"audio silent {lid}")
        except Exception as e:
            missing.append(f"audio {lid}: {e}")
        closed = STILLS / clip / "closed" / f"{i:02d}.jpg"
        if not closed.exists():
            missing.append(f"still missing {closed}")
    return missing


def main() -> int:
    ap = argparse.ArgumentParser(description="Elder Path HQ v1 rebuild")
    ap.add_argument("clips", nargs="*")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--prepare-audio", action="store_true")
    args = ap.parse_args()

    if args.prepare_audio:
        print("=== prepare adult oral slots ===", flush=True)
        prepare_all_audio(force=args.force)
        print("DONE audio", flush=True)
        return 0

    only = args.clips if args.clips else list(CLIPS.keys())
    print("=== Elder Path HQ v1 ===", flush=True)
    print(f"clips={only} force={args.force} residual≤{MAX_RESIDUAL} lead={ORAL_LEAD}", flush=True)

    hard_fail: list[str] = []
    built: list[str] = []

    for clip in only:
        if clip not in CLIPS:
            print("unknown", clip, file=sys.stderr)
            return 1
        print(f"\n######## {clip} ########", flush=True)

        miss = preflight(clip)
        if miss:
            for m in miss:
                hard_fail.append(f"{clip}: {m}")
            print("  PREFLIGHT FAIL:", "; ".join(miss), flush=True)
            continue

        public = PUBLIC / f"{clip}.mp4"
        if not args.force and video_ok(public, min_bytes=200_000):
            try:
                dur = probe_duration(public)
                if dur is not None and MIN_MASTER_DUR <= dur <= MAX_MASTER_DUR:
                    slots = [peak_audio(public, i * 6.0, i * 6.0 + 5.5) for i in range(5)]
                    mscore = body_motion_score(public, seconds=6.0)
                    if all(p >= MIN_ORAL_PEAK for p in slots) and mscore >= MIN_BODY_MOTION:
                        print(f"  reuse master {public}", flush=True)
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

    print("\n=== ELDER HQ V1 SUMMARY ===", flush=True)
    print("built:", ", ".join(built) if built else "(none)", flush=True)
    if hard_fail:
        print("FAILED:", flush=True)
        for m in hard_fail:
            print(" -", m, flush=True)
        return 2
    print("\nELDER HQ V1 DONE", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
