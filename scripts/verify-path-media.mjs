#!/usr/bin/env node
/**
 * Path media acceptance — all 48 masters + packaged oral packs.
 *
 * Checks:
 *  1) Every *-kids|student|adult|elder.mp4 exists under public/scenes
 *  2) Each master has an AAC (or other) audio stream
 *  3) Each of 5×6s slots has non-silent peak (max_volume > -40 dB)
 *  4) Catalog oral packs under public/audio/{kids,student,adult,elder} exist + peak
 *
 * Usage: node scripts/verify-path-media.mjs
 * Exit 0 = all pass; non-zero = failures listed.
 */
import { readdirSync, existsSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = new URL("..", import.meta.url).pathname;
const SCENES = join(ROOT, "public/scenes");
const AUDIO = join(ROOT, "public/audio");
const FFMPEG = process.env.FFMPEG || "/usr/local/bin/ffmpeg";

const PATHS = ["kids", "student", "adult", "elder"];
const SLOTS = 5;
const SLOT_SEC = 6;
const MIN_PEAK_DB = -40; // silence is typically -91 dB
const MIN_ORAL_PEAK_DB = -45;

let failed = 0;
let warned = 0;

function fail(msg) {
  console.error("FAIL", msg);
  failed++;
}
function warn(msg) {
  console.warn("WARN", msg);
  warned++;
}
function ok(msg) {
  console.log("ok ", msg);
}

function hasAudioStream(mp4) {
  const r = spawnSync(FFMPEG, ["-i", mp4], { encoding: "utf8" });
  const err = `${r.stdout || ""}\n${r.stderr || ""}`;
  return /Stream #\d+:\d+.*Audio:/.test(err);
}

function maxVolumeDb(input, ss, duration) {
  const args = ["-hide_banner", "-nostats"];
  if (ss != null) args.push("-ss", String(ss));
  if (duration != null) args.push("-t", String(duration));
  args.push("-i", input, "-af", "volumedetect", "-f", "null", "-");
  const r = spawnSync(FFMPEG, args, { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  const out = `${r.stdout || ""}\n${r.stderr || ""}`;
  const m = out.match(/max_volume:\s*([-\d.]+)\s*dB/);
  if (!m) return null;
  return Number(m[1]);
}

function listPathMasters() {
  if (!existsSync(SCENES)) return [];
  return readdirSync(SCENES)
    .filter((f) => /-(kids|student|adult|elder)\.mp4$/.test(f))
    .map((f) => join(SCENES, f))
    .sort();
}

function expectedCount() {
  // 12 scenes × 4 paths
  return 48;
}

console.log("=== verify-path-media ===");
console.log(`ffmpeg: ${FFMPEG}`);

const masters = listPathMasters();
if (masters.length !== expectedCount()) {
  fail(`expected ${expectedCount()} path masters, found ${masters.length}`);
} else {
  ok(`${masters.length} path masters present`);
}

for (const path of PATHS) {
  const n = masters.filter((m) => basename(m).endsWith(`-${path}.mp4`)).length;
  if (n !== 12) fail(`${path}: expected 12 masters, found ${n}`);
  else ok(`${path}: 12 masters`);
}

for (const mp4 of masters) {
  const name = basename(mp4);
  const st = statSync(mp4);
  if (st.size < 100_000) {
    fail(`${name}: file too small (${st.size} bytes)`);
    continue;
  }
  if (!hasAudioStream(mp4)) {
    fail(`${name}: no audio stream`);
    continue;
  }

  let silentSlots = 0;
  const peaks = [];
  for (let i = 0; i < SLOTS; i++) {
    const ss = i * SLOT_SEC;
    const peak = maxVolumeDb(mp4, ss, SLOT_SEC);
    peaks.push(peak);
    if (peak == null) {
      fail(`${name}: slot ${i} volumedetect failed`);
      silentSlots++;
    } else if (peak <= MIN_PEAK_DB) {
      fail(`${name}: slot ${i} silent/low peak ${peak.toFixed(1)} dB (need > ${MIN_PEAK_DB})`);
      silentSlots++;
    }
  }
  if (silentSlots === 0) {
    ok(
      `${name}: AAC + slots [${peaks.map((p) => (p == null ? "?" : p.toFixed(0))).join(", ")}] dB`,
    );
  }
}

// Oral packs — at least the files referenced by path scenes (glob all mp3 under each pack)
for (const path of PATHS) {
  const dir = join(AUDIO, path);
  if (!existsSync(dir)) {
    fail(`missing oral pack dir public/audio/${path}`);
    continue;
  }
  const files = readdirSync(dir).filter((f) => f.endsWith(".mp3"));
  if (files.length < 60) {
    fail(`public/audio/${path}: expected ≥60 mp3, found ${files.length}`);
  } else {
    ok(`public/audio/${path}: ${files.length} mp3`);
  }
  // Sample peak on first 5 files (full pack would be slow)
  const sample = files.slice(0, 5).sort();
  for (const f of sample) {
    const p = join(dir, f);
    const peak = maxVolumeDb(p, null, null);
    if (peak == null) fail(`${path}/${f}: volumedetect failed`);
    else if (peak <= MIN_ORAL_PEAK_DB)
      fail(`${path}/${f}: low peak ${peak.toFixed(1)} dB`);
    else ok(`${path}/${f}: peak ${peak.toFixed(1)} dB`);
  }
}

// Kids greeting oral k1–k5 mandatory (scene 1)
for (const id of ["k1", "k2", "k3", "k4", "k5"]) {
  const p = join(AUDIO, "kids", `${id}.mp3`);
  if (!existsSync(p)) fail(`missing kids oral ${id}.mp3`);
  else {
    const peak = maxVolumeDb(p, null, null);
    if (peak == null || peak <= MIN_ORAL_PEAK_DB)
      fail(`kids/${id}.mp3 bad peak ${peak}`);
    else ok(`kids/${id}.mp3 peak ${peak.toFixed(1)} dB`);
  }
}

console.log("");
if (failed) {
  console.error(`verify-path-media: ${failed} failure(s), ${warned} warning(s)`);
  process.exit(1);
}
console.log(`verify-path-media: all checks passed (${warned} warning(s))`);
