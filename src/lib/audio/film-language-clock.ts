/**
 * Single language clock policy for ScenePlayer.
 *
 * Watch + ambient + language film → film carries language (mute oral).
 * Learn always uses oral; film stays muted.
 * Ambient off / silent probe → oral may fill the current line.
 */

import type { LearningScene } from "@/lib/content/scenes-data";

export type ProgressKind = "scene" | "day-act" | "story";

export type LanguageFilmOpts = {
  continuousFilm: boolean;
  progressKind: ProgressKind;
  fromUpload: boolean;
};

/**
 * HQ cinematic packs + long films bake Narragansett into the picture track.
 * Catalog flag — do not wait on flaky browser audioTracks heuristics.
 */
export function sceneHasLanguageFilm(
  scene: LearningScene,
  opts: LanguageFilmOpts,
): boolean {
  if (opts.fromUpload) return true;
  if (opts.continuousFilm) return true;
  if (opts.progressKind === "story" || opts.progressKind === "day-act")
    return true;
  if (scene.tags?.includes("speak")) return true;
  const series = scene.series ?? "";
  return (
    series === "Little Ones" ||
    series === "Young Path" ||
    series === "Adult Path" ||
    series === "Elder Path"
  );
}

/** Proven or catalog-assumed language track (covers Watch start race). */
export function computeFilmHasLanguageTrack(
  mediaHasAudio: boolean | null,
  languageFilm: boolean,
): boolean {
  return mediaHasAudio === true || (languageFilm && mediaHasAudio !== false);
}

/**
 * Unmute film only in Watch with ambient on + language track.
 * Learn always mutes — oral is the single language clock.
 */
export function computeFilmAudioShouldPlay(opts: {
  isContinuous: boolean;
  ambientOn: boolean;
  filmHasLanguageTrack: boolean;
  oralOnly: boolean;
}): boolean {
  return (
    opts.isContinuous &&
    opts.ambientOn &&
    opts.filmHasLanguageTrack &&
    !opts.oralOnly
  );
}

/**
 * Suppress oral when film already carries language (Watch + ambient).
 * If user mutes film soundtrack, oral may fill the gap.
 */
export function computeFilmCarriesLanguage(opts: {
  isContinuous: boolean;
  ambientOn: boolean;
  filmHasLanguageTrack: boolean;
}): boolean {
  return (
    opts.isContinuous && opts.ambientOn && opts.filmHasLanguageTrack
  );
}
