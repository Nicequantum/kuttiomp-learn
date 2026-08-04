#!/bin/sh
# Thin wrapper — full stitcher is scripts/stitch-film-v4.py
set -eu
cd /workspace
python3 scripts/stitch-film-v4.py
