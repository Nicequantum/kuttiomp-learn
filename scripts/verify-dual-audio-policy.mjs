#!/usr/bin/env node
/**
 * Pure dual-audio policy unit checks (no browser).
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
  return mediaHasAudio === true || (languageFilm && mediaHasAudio !== false);
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

// Learn: never film audio, never film carries language
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

// Watch + ambient + language: film plays, oral suppressed
{
  const track = computeFilmHasLanguageTrack(null, true); // catalog assume before probe
  assert(track === true, "catalog language film assumed while probe null");
  assert(
    computeFilmAudioShouldPlay({
      isContinuous: true,
      ambientOn: true,
      filmHasLanguageTrack: track,
      oralOnly: false,
    }),
    "Watch ambient on unmutes film",
  );
  assert(
    computeFilmCarriesLanguage({
      isContinuous: true,
      ambientOn: true,
      filmHasLanguageTrack: track,
    }),
    "Watch ambient on suppresses oral",
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

// Probe proves silent → no language track even if catalog said yes
{
  const track = computeFilmHasLanguageTrack(false, true);
  assert(track === false, "silent probe overrides catalog language film");
  assert(
    !computeFilmCarriesLanguage({
      isContinuous: true,
      ambientOn: true,
      filmHasLanguageTrack: track,
    }),
    "silent film does not suppress oral",
  );
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
