/**
 * Single language clock policy for ScenePlayer.
 *
 * Path packs (Little Ones / Young / Adult / Elder) are PICTURE ONLY.
 * Their muxed AAC is a leftover scaffold voice and must never play —
 * Learn and Watch both speak through the oral path (Voice Agent when
 * configured, else the packaged oral that matches that agent bake).
 *
 * Community uploads, Full Day, and long Stories may still carry language
 * on the film; oral is suppressed only then.
 */

import type { LearningScene } from "@/lib/content/scenes-data";

export type ProgressKind = "scene" | "day-act" | "story";

export type LanguageFilmOpts = {
  continuousFilm: boolean;
  progressKind: ProgressKind;
  fromUpload: boolean;
};

const PATH_SERIES = new Set([
  "Little Ones",
  "Young Path",
  "Adult Path",
  "Elder Path",
]);

export function isPathPictureOnly(scene: LearningScene): boolean {
  const series = scene.series ?? "";
  if (PATH_SERIES.has(series)) return true;
  if (scene.tags?.includes("speak") && scene.tags?.includes("hq")) return true;
  return false;
}

/**
 * True only when the film is allowed to be the language clock.
 * Path reconstructions are never language films (picture-only).
 */
export function sceneHasLanguageFilm(
  scene: LearningScene,
  opts: LanguageFilmOpts,
): boolean {
  if (isPathPictureOnly(scene) && !opts.fromUpload) return false;
  if (opts.fromUpload) return true;
  if (opts.continuousFilm) return true;
  if (opts.progressKind === "story" || opts.progressKind === "day-act")
    return true;
  return false;
}

/**
 * Proven language track. Picture-only packs ignore AAC entirely so a
 * leftover scaffold voice cannot suppress the programmed agent.
 */
export function computeFilmHasLanguageTrack(
  mediaHasAudio: boolean | null,
  languageFilm: boolean,
): boolean {
  if (!languageFilm) return false;
  return mediaHasAudio === true || mediaHasAudio !== false;
}

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

export function computeFilmCarriesLanguage(opts: {
  isContinuous: boolean;
  ambientOn: boolean;
  filmHasLanguageTrack: boolean;
}): boolean {
  return opts.isContinuous && opts.ambientOn && opts.filmHasLanguageTrack;
}
