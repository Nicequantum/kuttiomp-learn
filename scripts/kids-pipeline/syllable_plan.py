#!/usr/bin/env python3
"""Syllable plan from phonetic scaffolds.

The hyphenated scaffold is the beat list. We never count letters.
Living recordings keep the same line ids; only the audio file changes.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

SPLIT = re.compile(r"[-–—,/]+|\s+")


def syllables_of(line: dict) -> list[str]:
    raw = (line.get("phoneticScaffold") or line["narragansett"]).strip()
    return [p for p in SPLIT.split(raw) if p]


def plan_lines(contract: dict) -> list[dict]:
    out = []
    for line in contract["lines"]:
        sylls = syllables_of(line)
        start = float(line["startSec"])
        end = float(line["endSec"])
        dur = max(0.2, end - start)
        out.append(
            {
                "id": line["id"],
                "speaker": line["speaker"],
                "narragansett": line["narragansett"],
                "english": line["english"],
                "syllables": sylls,
                "syllableCount": len(sylls),
                "startSec": start,
                "endSec": end,
                "durationSec": round(dur, 3),
                "secPerSyllable": round(dur / max(1, len(sylls)), 3),
            }
        )
    return out


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: syllable_plan.py <contract.json>", file=sys.stderr)
        return 2
    contract = json.loads(Path(sys.argv[1]).read_text())
    plan = plan_lines(contract)
    print(json.dumps({"clipId": contract["clipId"], "lines": plan}, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
