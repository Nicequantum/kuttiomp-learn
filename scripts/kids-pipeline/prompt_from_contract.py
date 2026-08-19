#!/usr/bin/env python3
"""Build a timed I2V prompt from a Little Ones clip contract.

Mouth beats come from phonetic syllables, not letter counts.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from syllable_plan import plan_lines


CAST_LOOK = {
    "Friend Tan": "the child in the tan hide tunic on the left",
    "Friend Teal": "the child in the teal hide tunic on the right",
}


def build_prompt(contract: dict) -> str:
    beats: list[str] = []
    plan = plan_lines(contract)
    duration = float(contract["durationSec"])
    prev_end = 0.0
    if plan[0]["startSec"] > 0.25:
        beats.append(
            f"From 0.0s to {plan[0]['startSec']:.1f}s both mouths stay calmly closed."
        )
        prev_end = plan[0]["startSec"]
    for i, line in enumerate(plan):
        who = CAST_LOOK.get(line["speaker"], line["speaker"])
        other = (
            CAST_LOOK["Friend Teal"]
            if line["speaker"] == "Friend Tan"
            else CAST_LOOK["Friend Tan"]
        )
        if line["startSec"] - prev_end > 0.2 and i > 0:
            beats.append(
                f"From {prev_end:.1f}s to {line['startSec']:.1f}s both mouths stay closed; no one speaks."
            )
        syll = ", ".join(line["syllables"])
        beats.append(
            f"From {line['startSec']:.1f}s to {line['endSec']:.1f}s ONLY {who} speaks "
            f"“{line['narragansett']}” ({line['english']}). "
            f"Exactly {line['syllableCount']} mouth openings, one per syllable: {syll}. "
            f"{other} keeps lips fully sealed."
        )
        prev_end = line["endSec"]
    if duration - prev_end > 0.15:
        beats.append(
            f"From {prev_end:.1f}s to {duration:.1f}s both mouths stay closed; they rest."
        )
    return (
        "Single locked camera, no cuts, photoreal cinematic, same two children "
        "in the same positions as the still. Mouths move only while that child "
        "is the speaker. "
        + " ".join(beats)
        + " No overlapping speech. Gentle breeze, golden morning light."
    )


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: prompt_from_contract.py <contract.json>", file=sys.stderr)
        return 2
    contract = json.loads(Path(sys.argv[1]).read_text())
    print(build_prompt(contract))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
