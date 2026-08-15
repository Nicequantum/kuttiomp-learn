#!/usr/bin/env node
/**
 * Pure language-clock policy unit checks (no browser).
 * Mirrors src/lib/audio/film-language-clock.ts — keep in sync.
 */
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

if (failed) {
  console.error(`\nverify-dual-audio-policy: ${failed} failure(s)`);
  process.exit(1);
}
console.log("\nverify-dual-audio-policy: all checks passed");
