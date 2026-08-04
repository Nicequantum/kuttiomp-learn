#!/bin/sh
# Stitch film-v3 shots into continuous one-day-story.mp4
set -eu
ROOT=/workspace/artifacts/film-v3
OUT_DIR=/tmp/film-v3-stitch
FINAL=/workspace/public/scenes/long/one-day-story.mp4
POSTER=/workspace/public/scenes/long/one-day-story.jpg
mkdir -p "$OUT_DIR/norm" "$OUT_DIR"

LIST="$OUT_DIR/list.txt"
: > "$LIST"

# Prefer numbered shots; require consecutive from 000
n=0
missing=0
while true; do
  # find any matching shot file
  f=$(ls "$ROOT/shots"/$(printf '%03d' "$n")_*.mp4 2>/dev/null | head -1 || true)
  if [ -z "$f" ]; then
    missing=$((missing + 1))
    # allow small gaps? stop after first missing
    break
  fi
  norm="$OUT_DIR/norm/$(printf '%03d' "$n").mp4"
  if [ ! -f "$norm" ] || [ "$f" -nt "$norm" ]; then
    ffmpeg -y -i "$f" -an \
      -vf "scale=480:720:force_original_aspect_ratio=increase,crop=480:720,fps=20,format=yuv420p" \
      -c:v libx264 -preset veryfast -crf 26 -movflags +faststart \
      "$norm" >/dev/null 2>&1
  fi
  echo "file '$norm'" >> "$LIST"
  n=$((n + 1))
done

if [ "$n" -lt 10 ]; then
  echo "Not enough shots: $n" >&2
  exit 1
fi

echo "Stitching $n shots..."
ffmpeg -y -f concat -safe 0 -i "$LIST" -c copy "$OUT_DIR/raw.mp4" 2>"$OUT_DIR/concat.log"
# light recompress for deploy size
ffmpeg -y -i "$OUT_DIR/raw.mp4" -an \
  -c:v libx264 -preset medium -crf 28 -movflags +faststart \
  "$FINAL" 2>"$OUT_DIR/final.log"
# poster from ~10%
ffmpeg -y -ss 30 -i "$FINAL" -frames:v 1 -q:v 3 "$POSTER" 2>/dev/null || true
dur=$(ffmpeg -i "$FINAL" 2>&1 | sed -n 's/.*Duration: \([^,]*\).*/\1/p' | head -1)
size=$(wc -c < "$FINAL")
echo "DONE shots=$n duration=$dur bytes=$size out=$FINAL"
