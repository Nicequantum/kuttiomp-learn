#!/usr/bin/env python3
"""Lock Tan (left child) to a closed mouth so only Teal speaks."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path("/workspace")
sys.path.insert(0, str(ROOT / "scripts"))
from kids_animation_lib import FFMPEG, H, W, load_cover, shift_image  # noqa: E402

FPS = 24
# Left listener only — never touch Teal on the right.
X0, X1 = int(W * 0.16), int(W * 0.48)
Y0, Y1 = int(H * 0.40), int(H * 0.56)


def listener_mask() -> np.ndarray:
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    cx = (X0 + X1) * 0.5
    cy = (Y0 + Y1) * 0.52
    rx = (X1 - X0) * 0.42
    ry = (Y1 - Y0) * 0.40
    d = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2
    m = np.clip(1.0 - d, 0.0, 1.0) ** 1.35
    m[:, X1:] = 0.0
    m[:, : max(0, X0 - 20)] = 0.0
    # Feather
    im = Image.fromarray((m * 255).astype(np.uint8), "L")
    im = im.filter(ImageFilter.GaussianBlur(radius=7))
    a = np.asarray(im, dtype=np.float32) / 255.0
    a[:, int(W * 0.50) :] = 0.0
    return a[..., None]


def left_band(img: np.ndarray) -> np.ndarray:
    band = img[int(H * 0.22) : int(H * 0.62), X0:X1].mean(axis=2)
    return band - band.mean()


def track_left(ref: np.ndarray, frame: np.ndarray) -> tuple[int, int]:
    b = left_band(frame)
    if b.shape != ref.shape:
        return 0, 0
    fa = np.fft.fft2(ref)
    fb = np.fft.fft2(b)
    R = fa * np.conj(fb)
    R /= np.abs(R) + 1e-9
    r = np.fft.ifft2(R)
    peak = np.unravel_index(int(np.argmax(np.abs(r))), r.shape)
    dy, dx = int(peak[0]), int(peak[1])
    if dy > r.shape[0] // 2:
        dy -= r.shape[0]
    if dx > r.shape[1] // 2:
        dx -= r.shape[1]
    return int(np.clip(dy, -28, 28)), int(np.clip(dx, -22, 22))


def main() -> int:
    motion = Path(sys.argv[1])
    closed = Path(sys.argv[2])
    out = Path(sys.argv[3])
    still = load_cover(closed)
    mask = listener_mask()
    ref = left_band(still)
    frame_n = W * H * 3

    pin = subprocess.Popen(
        [
            FFMPEG, "-v", "error", "-i", str(motion),
            "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-",
        ],
        stdout=subprocess.PIPE,
    )
    out.parent.mkdir(parents=True, exist_ok=True)
    pout = subprocess.Popen(
        [
            FFMPEG, "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
            "-r", str(FPS), "-i", "-",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "16",
            "-pix_fmt", "yuv420p", "-an", "-movflags", "+faststart", str(out),
        ],
        stdin=subprocess.PIPE,
    )
    assert pin.stdout and pout.stdin
    n = 0
    sdy = sdx = 0.0
    while True:
        buf = pin.stdout.read(frame_n)
        if not buf or len(buf) < frame_n:
            break
        frame = np.frombuffer(buf, dtype=np.uint8).reshape(H, W, 3).astype(np.float32)
        dy, dx = track_left(ref, frame)
        sdy = 0.65 * sdy + 0.35 * dy
        sdx = 0.65 * sdx + 0.35 * dx
        closed_s = shift_image(still, int(round(sdy)), int(round(sdx)))
        mask_s = shift_image(mask, int(round(sdy)), int(round(sdx)))
        mask_s[:, int(W * 0.50) :] = 0.0
        a = np.clip(mask_s * 0.92, 0.0, 1.0)
        mixed = frame * (1.0 - a) + closed_s * a
        pout.stdin.write(np.clip(mixed, 0, 255).astype(np.uint8).tobytes())
        n += 1
    pin.stdout.close()
    pout.stdin.close()
    pin.wait()
    rc = pout.wait()
    print(f"LISTENER_LOCKED frames={n} rc={rc} -> {out}", flush=True)
    return 0 if rc == 0 and n > 10 else 1


if __name__ == "__main__":
    raise SystemExit(main())
