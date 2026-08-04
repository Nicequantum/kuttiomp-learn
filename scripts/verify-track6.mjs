#!/usr/bin/env node
/**
 * Verify Track 6 I2V keyshots exist and the long film is the expected duration.
 */
import { existsSync, statSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const status = JSON.parse(
  readFileSync("/workspace/film-build/logs/track6-i2v-status.json", "utf8"),
);
const shotsDir = "/workspace/film-build/shots";
const film = "/workspace/public/scenes/long/one-day-story.mp4";

let ok = true;
if (status.remaining?.length) {
  console.error("FAIL remaining keyshots:", status.remaining);
  ok = false;
}
for (const file of Object.keys(status.mapping || {})) {
  const p = `${shotsDir}/${file}`;
  if (!existsSync(p)) {
    console.error("FAIL missing shot", p);
    ok = false;
  }
}
if (!existsSync(film)) {
  console.error("FAIL missing film", film);
  ok = false;
} else {
  const out = execSync(`ffmpeg -i ${film} 2>&1 || true`, { encoding: "utf8" });
  const m = out.match(/Duration: (\d+):(\d+):(\d+)/);
  if (!m) {
    console.error("FAIL could not read duration");
    ok = false;
  } else {
    const sec = +m[1] * 3600 + +m[2] * 60 + +m[3];
    console.log("film duration sec", sec, "size", statSync(film).size);
    if (sec < 1500) {
      console.error("FAIL film too short");
      ok = false;
    }
  }
}
console.log(
  ok ? "PASS track6 20/20 I2V keyshots + full film" : "FAIL track6 verification",
);
process.exit(ok ? 0 : 1);
