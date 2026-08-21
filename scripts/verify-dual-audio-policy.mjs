#!/usr/bin/env node
/**
 * Pure language-clock policy unit checks (no browser).
 * Mirrors src/lib/audio/film-language-clock.ts — keep in sync.
 * Also proves speakWord contract order: living recording → machine TTS → browser.
 */
import { readFileSync } from "node:fs";

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL", msg);
    failed++;
  } else console.log("ok ", msg);
}

function computeFilmHasLanguageTrack(mediaHasAudio, languageFilm) {
  if (!languageFilm) return false;
  return mediaHasAudio === true || mediaHasAudio !== false;
}
function computeFilmAudioShouldPlay({
  isContinuous,
  ambientOn,
  filmHasLanguageTrack,
  oralOnly,
}) {
  return isContinuous && ambientOn && filmHasLanguageTrack && !oralOnly;
}
function computeFilmCarriesLanguage({
  isContinuous,
  ambientOn,
  filmHasLanguageTrack,
}) {
  return isContinuous && ambientOn && filmHasLanguageTrack;
}

// Path packs: leftover AAC must not become the language clock
{
  const track = computeFilmHasLanguageTrack(true, false);
  assert(track === false, "picture-only pack ignores AAC");
  assert(
    !computeFilmAudioShouldPlay({
      isContinuous: true,
      ambientOn: true,
      filmHasLanguageTrack: track,
      oralOnly: false,
    }),
    "Watch mutes picture-only path film",
  );
  assert(
    !computeFilmCarriesLanguage({
      isContinuous: true,
      ambientOn: true,
      filmHasLanguageTrack: track,
    }),
    "Watch uses oral/agent on path packs (does not suppress)",
  );
}

// Learn: never film audio
{
  const track = computeFilmHasLanguageTrack(true, true);
  assert(
    !computeFilmAudioShouldPlay({
      isContinuous: false,
      ambientOn: true,
      filmHasLanguageTrack: track,
      oralOnly: false,
    }),
    "Learn mutes film even with ambient on",
  );
  assert(
    !computeFilmCarriesLanguage({
      isContinuous: false,
      ambientOn: true,
      filmHasLanguageTrack: track,
    }),
    "Learn does not suppress oral via filmCarriesLanguage",
  );
}

// Story / upload language film: Watch ambient on → film plays, oral suppressed
{
  const track = computeFilmHasLanguageTrack(null, true);
  assert(track === true, "catalog language film assumed while probe null");
  assert(
    computeFilmAudioShouldPlay({
      isContinuous: true,
      ambientOn: true,
      filmHasLanguageTrack: track,
      oralOnly: false,
    }),
    "Watch ambient on unmutes language film (stories/uploads)",
  );
  assert(
    computeFilmCarriesLanguage({
      isContinuous: true,
      ambientOn: true,
      filmHasLanguageTrack: track,
    }),
    "Watch ambient on suppresses oral on language film",
  );
}

// Watch + ambient off: oral may fill
{
  const track = computeFilmHasLanguageTrack(true, true);
  assert(
    !computeFilmAudioShouldPlay({
      isContinuous: true,
      ambientOn: false,
      filmHasLanguageTrack: track,
      oralOnly: false,
    }),
    "Watch ambient off mutes film",
  );
  assert(
    !computeFilmCarriesLanguage({
      isContinuous: true,
      ambientOn: false,
      filmHasLanguageTrack: track,
    }),
    "Watch ambient off allows oral fill",
  );
}

// Silent probe on a language film
{
  const track = computeFilmHasLanguageTrack(false, true);
  assert(track === false, "silent probe overrides catalog language film");
}

// oralOnly never unmutes film
{
  assert(
    !computeFilmAudioShouldPlay({
      isContinuous: true,
      ambientOn: true,
      filmHasLanguageTrack: true,
      oralOnly: true,
    }),
    "oralOnly keeps film muted",
  );
}

// Public Lexicon Contract: living primaryAudioUrl before Grok / machine TTS
{
  const speakSrc = readFileSync(
    new URL("../src/lib/audio/speak.ts", import.meta.url),
    "utf8",
  );
  const start = speakSrc.indexOf("export async function speakWord");
  assert(start >= 0, "speakWord is exported");
  const body = speakSrc.slice(start);
  const primaryIdx = body.indexOf("opts.primaryAudioUrl");
  const grokNarrIdx = body.indexOf('grokSpeak(opts.narragansett');
  assert(primaryIdx >= 0, "speakWord considers primaryAudioUrl");
  assert(grokNarrIdx >= 0, "speakWord can fall back to machine TTS");
  assert(
    primaryIdx < grokNarrIdx,
    "living primaryAudioUrl is tried before Grok TTS",
  );
  const grokNarrGate = body.search(/if \(grokAvailable\) \{\s*\n\s*const ok = await grokSpeak\(opts\.narragansett/);
  assert(
    grokNarrGate < 0 || primaryIdx < grokNarrGate,
    "Grok narragansett path does not skip living recordings",
  );
  assert(
    /machine TTS|living speaker recording/i.test(speakSrc),
    "speakWord comments label TTS as machine, not a speaker",
  );
}

if (failed) {
  console.error(`\nverify-dual-audio-policy: ${failed} failure(s)`);
  process.exit(1);
}
console.log("\nverify-dual-audio-policy: all checks passed");
