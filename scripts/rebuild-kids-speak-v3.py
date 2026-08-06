#!/usr/bin/env python3
"""Rebuild Little Ones: Phase A/B ROI mouth + Ken Burns → 1080×1920.

Default --mode roi: align open→closed, blend mouth region only.
Falls back to closed-only if faces are too misaligned (no head-nod glitch).
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path("/workspace")
STILLS = ROOT / "film-kids" / "stills-v2"
SHOTS = ROOT / "film-kids" / "shots-v2"
EXPORT = ROOT / "film-kids" / "export-v2"
PUBLIC = ROOT / "public" / "scenes"
AUDIO_KIDS = ROOT / "public" / "audio" / "kids"
SPEAK = ROOT / "scripts" / "speak-kenburns-shot.py"
FFMPEG = "/usr/local/bin/ffmpeg"
W, H = 1080, 1920

# Default: roi (safe). Override: python rebuild… --mode none|full
MOUTH_MODE = "roi"

CLIPS: dict[str, list[tuple[str, str]]] = {
    "greeting-kids": [
        ("k1", "Ascowequassunnúmmis"),
        ("k2", "Askuttaaquompsín"),
        ("k3", "Asnpaumpmaúntam"),
        ("k4", "Cowaúnckamish"),
        ("k5", "Taubotneanawáyean"),
    ],
    "meal-kids": [
        ("mk1", "Niccàwkatone"),
        ("mk2", "Nip, or nipéwese"),
        ("mk3", "Namitch, commetesímmin"),
        ("mk4", "Téaquacumméich"),
        ("mk5", "Taubotneanawáyean"),
    ],
    "count-kids": [
        ("ck1", "Nquít"),
        ("ck2", "Neèse"),
        ("ck3", "Nìsh"),
        ("ck4", "Yòh"),
        ("ck5", "Napánna"),
    ],
    "family-kids": [
        ("fkids1", "Nósh"),
        ("fkids2", "Okásu"),
        ("fkids3", "Nippápoos"),
        ("fkids4", "Hômes"),
        ("fkids5", "Wénise"),
    ],
    "home-kids": [
        ("hk1", "Wetu"),
        ("hk2", "Wetuômuck"),
        ("hk3", "Wunnégin"),
        ("hk4", "Nkàtaquaum"),
        ("hk5", "Cowwêtuck"),
    ],
    "day-kids": [
        ("dk1", "Páshisha"),
        ("dk2", "Mautàbon"),
        ("dk3", "Nummáttaqúaw"),
        ("dk4", "Wayaàwi"),
        ("dk5", "Póppakunnetch"),
    ],
    "seasons-kids": [
        ("sk1", "Séquan"),
        ("sk2", "Néepun"),
        ("sk3", "Taquònck"),
        ("sk4", "Papóne"),
        ("sk5", "Aukeeteámitch"),
    ],
    "birds-kids": [
        ("bk1", "Hònck"),
        ("bk2", "Néyhom"),
        ("bk3", "Chógan"),
        ("bk4", "Wunnùp"),
        ("bk5", "Paupock"),
    ],
    "water-kids": [
        ("wk1", "Nip"),
        ("wk2", "Namaùus"),
        ("wk3", "Ntaûmen"),
        ("wk4", "Wunnágehan"),
        ("wk5", "Nickquénum"),
    ],
    "sleep-kids": [
        ("skids1", "Yo nickowémen?"),
        ("skids2", "Wunnégin, cówish"),
        ("skids3", "Nkàtaquaum"),
        ("skids4", "Cowwêtuck"),
        ("skids5", "Mattannauke"),
    ],
    "path-kids": [
        ("pk1", "Kokotemíinnea méyi"),
        ("pk2", "Peemáyagât"),
        ("pk3", "Mishimmáyagat"),
        ("pk4", "Taubotneanawáyean"),
        ("pk5", "Nickquénum"),
    ],
    "land-kids": [
        ("lk1", "Aûke"),
        ("lk2", "Ewáchim neash"),
        ("lk3", "Scannémeneash"),
        ("lk4", "Aukeeteaûmen"),
        ("lk5", "Sókenug"),
    ],
}


def run(cmd: list[str], quiet: bool = False) -> None:
    print("+", " ".join(str(c) for c in cmd[:14]), "..." if len(cmd) > 14 else "", flush=True)
    kwargs = {}
    if quiet:
        kwargs["stdout"] = subprocess.DEVNULL
        kwargs["stderr"] = subprocess.DEVNULL
    subprocess.run(cmd, check=True, **kwargs)


def build_shots(clip: str, mouth_mode: str) -> list[Path]:
    lines = CLIPS[clip]
    base = STILLS / clip
    out_dir = SHOTS / clip
    out_dir.mkdir(parents=True, exist_ok=True)
    paths: list[Path] = []
    for i, (line_id, text) in enumerate(lines, 1):
        closed = base / "closed" / f"{i:02d}.jpg"
        open_m = base / "open" / f"{i:02d}.jpg"
        if not closed.exists() or not open_m.exists():
            raise FileNotFoundError(f"missing stills for {clip} shot {i}")
        out = out_dir / f"{i:02d}.mp4"
        zoom = "in" if i % 2 else "out"
        audio = AUDIO_KIDS / f"{line_id}.mp3"
        cmd = [
            sys.executable,
            str(SPEAK),
            str(closed),
            str(open_m),
            str(out),
            "--zoom",
            zoom,
            "--text",
            text,
            "--mode",
            mouth_mode,
        ]
        if audio.exists():
            cmd.extend(["--audio", str(audio)])
        run(cmd)
        paths.append(out)
    return paths


def concat_and_ship(clip: str, shots: list[Path]) -> None:
    EXPORT.mkdir(parents=True, exist_ok=True)
    lst = EXPORT / f"{clip}.txt"
    lst.write_text("".join(f"file '{s.resolve()}'\n" for s in shots))
    export = EXPORT / f"{clip}.mp4"
    public_mp4 = PUBLIC / f"{clip}.mp4"
    public_jpg = PUBLIC / f"{clip}.jpg"
    run(
        [
            FFMPEG,
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(lst),
            "-c",
            "copy",
            "-movflags",
            "+faststart",
            str(export),
        ],
        quiet=True,
    )
    run(["cp", "-f", str(export), str(public_mp4)])
    run(
        [
            FFMPEG,
            "-y",
            "-ss",
            "0.4",
            "-i",
            str(export),
            "-frames:v",
            "1",
            "-vf",
            f"scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2",
            "-q:v",
            "2",
            str(public_jpg),
        ],
        quiet=True,
    )
    print(f"OK {clip} → {public_mp4}", flush=True)


def main() -> int:
    args = sys.argv[1:]
    mouth_mode = MOUTH_MODE
    if "--mode" in args:
        i = args.index("--mode")
        mouth_mode = args[i + 1]
        args = args[:i] + args[i + 2 :]
    only = args if args else list(CLIPS.keys())
    print(f"Mouth mode: {mouth_mode}", flush=True)
    for clip in only:
        if clip not in CLIPS:
            print(f"unknown clip: {clip}", file=sys.stderr)
            return 1
        print(f"\n=== {clip} ===", flush=True)
        shots = build_shots(clip, mouth_mode)
        concat_and_ship(clip, shots)
    print("\nALL DONE", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
