#!/usr/bin/env python3
"""6s 1080x1920 speak-shot: open/closed mouth flap + Ken Burns (fast ffmpeg)."""
from __future__ import annotations

import argparse
import subprocess
from pathlib import Path

W, H, FPS, DUR = 1080, 1920, 24, 6


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("closed", type=Path)
    ap.add_argument("open", type=Path)
    ap.add_argument("out", type=Path)
    ap.add_argument("--zoom", choices=["in", "out"], default="in")
    args = ap.parse_args()
    args.out.parent.mkdir(parents=True, exist_ok=True)

    # Pre-scale both stills to cover, then zoompan each, then blend with oscillating alpha.
    # Alpha: square-ish wave ~3.2Hz via if(lt(mod(t*3.2\\,1)\\,0.55)\\,1\\,0) with soft end.
    # filter_complex:
    # [0]scale+crop -> [c]; [1]scale+crop -> [o]
    # zoompan on each is heavy; simpler: scale both to WxH, loop for DUR, blend, then mild zoom via scale+crop animated.

    # Simpler fast path that works well:
    # loop each still as video, overlay open on closed with enable=between(mod(t*hz),0,duty)
    hz = 3.2
    duty = 0.55
    # end soft: after 5.2s force closed
    enable = f"lt(t\\,5.2)*lt(mod(t*{hz}\\,1)\\,{duty})"

    z_start, z_end = (1.0, 1.12) if args.zoom == "in" else (1.12, 1.0)
    # Use zoompan on blended stream once
    # Build: 
    # [0:v] scale cover, loop
    # [1:v] scale cover, loop  
    # overlay with enable
    # then zoompan

    fc = (
        f"[0:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1,fps={FPS},format=yuv420p,loop=loop=-1:size=1,setpts=N/{FPS}/TB[c];"
        f"[1:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1,fps={FPS},format=yuv420p,loop=loop=-1:size=1,setpts=N/{FPS}/TB[o];"
        f"[c][o]overlay=0:0:enable='{enable}'[spk];"
        f"[spk]scale=iw*1.2:ih*1.2,zoompan=z='min(1.0+0.00085*on,1.12)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s={W}x{H}:fps={FPS},format=yuv420p[v]"
    )
    if args.zoom == "out":
        fc = (
            f"[0:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1,fps={FPS},format=yuv420p,loop=loop=-1:size=1,setpts=N/{FPS}/TB[c];"
            f"[1:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1,fps={FPS},format=yuv420p,loop=loop=-1:size=1,setpts=N/{FPS}/TB[o];"
            f"[c][o]overlay=0:0:enable='{enable}'[spk];"
            f"[spk]scale=iw*1.2:ih*1.2,zoompan=z='if(eq(on,1),1.12,max(1.12-0.00085*on,1.0))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s={W}x{H}:fps={FPS},format=yuv420p[v]"
        )

    cmd = [
        "/usr/local/bin/ffmpeg",
        "-y",
        "-i",
        str(args.closed),
        "-i",
        str(args.open),
        "-filter_complex",
        fc,
        "-map",
        "[v]",
        "-t",
        str(DUR),
        "-r",
        str(FPS),
        "-an",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "17",
        "-profile:v",
        "high",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        str(args.out),
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"OK {args.out}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
