#!/usr/bin/env python3
"""Generate or re-normalize oral for kids/student/adult/elder.

Voice priority:
  1) XAI Voice Agent  (XAI_API_KEY + XAI_VOICE_AGENT_ID)  — preferred
  2) Grok REST TTS    (XAI_API_KEY + XAI_TTS_VOICE)
  3) edge-tts Christopher -22%  (offline scaffold)
  4) gTTS slow fallback

Always finishes with normalize_oral_slot(lead=0.22) into public/audio/<path>/.

Usage:
  python3 scripts/prepare_all_path_audio.py
  python3 scripts/prepare_all_path_audio.py --paths elder kids
  python3 scripts/prepare_all_path_audio.py --normalize-only
  python3 scripts/prepare_all_path_audio.py --force
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path("/workspace")
sys.path.insert(0, str(ROOT / "scripts"))
from kids_animation_lib import normalize_oral_slot  # noqa: E402

LEAD = 0.22
DUR = 6.0
EDGE_VOICE = "en-US-ChristopherNeural"
EDGE_RATE = "-22%"

PATH_CLIPS = {
    "kids": "rebuild_kids_lines",
    "student": "rebuild_student_lines",
    "adult": "rebuild_adult_lines",
    "elder": "rebuild_elder_lines",
}


def load_clips(path_name: str) -> dict[str, list[tuple[str, str, str]]]:
    mod = __import__(PATH_CLIPS[path_name])
    return mod.CLIPS


def pack_dir(path_name: str) -> Path:
    return ROOT / "public" / "audio" / path_name


def raw_dir(path_name: str) -> Path:
    return ROOT / f"film-{path_name if path_name != 'kids' else 'kids'}" / "audio-raw"


def tts_edge(text: str, out: Path) -> None:
    part = out.with_suffix(".part.mp3")
    cmd = [
        "edge-tts",
        "--voice", EDGE_VOICE,
        "--rate="+EDGE_RATE if False else "--rate="+EDGE_RATE,
        "--text", text,
        "--write-media", str(part),
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    part.replace(out)


def tts_gtts(text: str, out: Path) -> None:
    from gtts import gTTS
    part = out.with_suffix(".part.mp3")
    gTTS(text=text, lang="en", slow=True).save(str(part))
    part.replace(out)


def tts_xai_rest(text: str, out: Path, api_key: str, voice_id: str) -> None:
    body = json.dumps({
        "text": text,
        "voice_id": voice_id,
        "language": "en",
        "speed": 0.78,
    }).encode()
    req = urllib.request.Request(
        "https://api.x.ai/v1/tts",
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "audio/mpeg, audio/*, application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=45) as r:
        data = r.read()
    if len(data) < 500:
        raise RuntimeError(f"xai tts short response {len(data)}")
    out.write_bytes(data)


def is_agent_id(s: str | None) -> bool:
    return bool(s and s.startswith("agent_"))


def tts_agent(text: str, out: Path, api_key: str, agent_id: str) -> None:
    """Call in-process agent-speak via a tiny node helper if available, else raise."""
    # Prefer python websocket path mirroring agent-speak.server.ts is heavy;
    # use a small node one-shot if present.
    helper = ROOT / "scripts" / "agent-speak-once.mjs"
    if not helper.exists():
        raise RuntimeError("agent helper missing")
    env = os.environ.copy()
    env["XAI_API_KEY"] = api_key
    env["XAI_VOICE_AGENT_ID"] = agent_id
    r = subprocess.run(
        ["node", str(helper), text, str(out)],
        capture_output=True,
        text=True,
        env=env,
        timeout=40,
    )
    if r.returncode != 0 or not out.exists() or out.stat().st_size < 500:
        raise RuntimeError(r.stderr[-400:] if r.stderr else "agent speak failed")


def synthesize(text: str, raw: Path, force: bool) -> str:
    if not force and raw.exists() and raw.stat().st_size > 800:
        return "reuse-raw"
    raw.parent.mkdir(parents=True, exist_ok=True)
    api_key = (os.environ.get("XAI_API_KEY") or "").strip()
    agent_id = (os.environ.get("XAI_VOICE_AGENT_ID") or "").strip()
    tts_voice = (os.environ.get("XAI_TTS_VOICE") or "ara").strip()
    if is_agent_id(tts_voice) and not agent_id:
        agent_id = tts_voice
        tts_voice = "ara"

    last = None
    if api_key and is_agent_id(agent_id):
        try:
            tts_agent(text, raw, api_key, agent_id)
            return "xai-voice-agent"
        except Exception as e:
            last = e
            print(f"  agent fail → rest/edge: {e}", flush=True)
    if api_key:
        try:
            tts_xai_rest(text, raw, api_key, tts_voice if not is_agent_id(tts_voice) else "ara")
            return "xai-grok-tts"
        except Exception as e:
            last = e
            print(f"  rest tts fail → edge: {e}", flush=True)
    try:
        tts_edge(text, raw)
        return "edge-tts"
    except Exception as e:
        last = e
        print(f"  edge fail → gTTS: {e}", flush=True)
    tts_gtts(text, raw)
    return "gtts"


def process_path(path_name: str, *, force: bool, normalize_only: bool) -> None:
    clips = load_clips(path_name)
    pack = pack_dir(path_name)
    pack.mkdir(parents=True, exist_ok=True)
    raw_root = ROOT / f"film-{ 'kids' if path_name=='kids' else path_name }" / "audio-raw"
    raw_root.mkdir(parents=True, exist_ok=True)

    n = 0
    for _clip, lines in clips.items():
        for row in lines:
            if len(row) == 2:
                lid, narr = row
            else:
                lid, narr, _eng = row
            out = pack / f"{lid}.mp3"
            raw = raw_root / f"{lid}.mp3"
            if normalize_only:
                seed = out if out.exists() else raw
                if not seed.exists():
                    print(f"  SKIP missing {path_name}/{lid}")
                    continue
                # normalize in place via temp
                tmp = out.with_suffix(".seed.mp3")
                tmp.write_bytes(seed.read_bytes())
                normalize_oral_slot(tmp, out, lead=LEAD, total=DUR)
                tmp.unlink(missing_ok=True)
                print(f"  norm {path_name}/{lid}", flush=True)
                n += 1
                continue

            src = synthesize(narr, raw, force=force)
            normalize_oral_slot(raw, out, lead=LEAD, total=DUR)
            print(f"  {src:16s} {path_name}/{lid}  {narr[:40]}", flush=True)
            n += 1
            time.sleep(0.05)
    print(f"DONE {path_name}: {n} lines", flush=True)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--paths", nargs="*", default=list(PATH_CLIPS.keys()))
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--normalize-only", action="store_true")
    args = ap.parse_args()
    print(
        f"=== prepare oral paths={args.paths} force={args.force} "
        f"normalize_only={args.normalize_only} lead={LEAD} ===",
        flush=True,
    )
    print(
        f"agent={'yes' if os.environ.get('XAI_VOICE_AGENT_ID') else 'no'} "
        f"xai_key={'yes' if os.environ.get('XAI_API_KEY') else 'no'}",
        flush=True,
    )
    for p in args.paths:
        if p not in PATH_CLIPS:
            print("unknown path", p)
            return 1
        process_path(p, force=args.force, normalize_only=args.normalize_only)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
