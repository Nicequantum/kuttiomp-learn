#!/usr/bin/env python3
"""Generate Elder Path oral seeds then normalize into public/audio/elder.

Prefer edge-tts (Christopher, slow). Fall back to gTTS slow.
These are practice scaffolds until living speakers replace the same filenames.
"""
from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path

ROOT = Path("/workspace")
sys.path.insert(0, str(ROOT / "scripts"))
from rebuild_elder_lines import CLIPS  # noqa: E402
from kids_animation_lib import normalize_oral_slot  # noqa: E402

RAW = ROOT / "film-elder" / "audio-raw"
PACK = ROOT / "public" / "audio" / "elder"
VOICE = "en-US-ChristopherNeural"
RATE = "-22%"
LEAD = 0.22
DUR = 6.0


def tts_edge(text: str, out: Path) -> None:
    part = out.with_suffix(".part.mp3")
    cmd = [
        "edge-tts",
        "--voice", VOICE,
        f"--rate={RATE}",
        "--text", text,
        "--write-media", str(part),
    ]
    subprocess.run(cmd, check=True, capture_output=True, text=True)
    part.replace(out)


def tts_gtts(text: str, out: Path) -> None:
    from gtts import gTTS
    part = out.with_suffix(".part.mp3")
    # space-split long compound forms slightly for clearer cadence
    gTTS(text=text, lang="en", slow=True).save(str(part))
    part.replace(out)


def tts(text: str, out: Path) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    last = None
    for attempt in range(3):
        try:
            tts_edge(text, out)
            return
        except Exception as e:
            last = e
            time.sleep(0.6 * (attempt + 1))
    print(f"  edge-tts fail → gTTS: {last}", flush=True)
    tts_gtts(text, out)


def main() -> int:
    force = "--force" in sys.argv
    RAW.mkdir(parents=True, exist_ok=True)
    PACK.mkdir(parents=True, exist_ok=True)
    n = 0
    for clip, lines in CLIPS.items():
        for lid, nar, _eng in lines:
            raw = RAW / f"{lid}.mp3"
            pack = PACK / f"{lid}.mp3"
            if force or not raw.exists() or raw.stat().st_size < 800:
                print(f"tts {lid}: {nar}", flush=True)
                tts(nar, raw)
            if force or not pack.exists() or pack.stat().st_size < 800:
                meta = normalize_oral_slot(raw, pack, lead=LEAD, total=DUR)
                print(f"  pack {lid} {meta}", flush=True)
            n += 1
    print(f"DONE elder oral slots={n}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
