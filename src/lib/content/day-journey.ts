import { useModeStore } from "@/lib/mode/store";
import type { LearningModeId } from "./types";
import {
  DAY_ACTS,
  DAY_JOURNEY,
  type DayAct,
  type DayActId,
} from "./day-journey-data";
import { resolveCommunityMedia } from "@/lib/media/community-media";

export type { DayAct, DayActId } from "./day-journey-data";
export { DAY_JOURNEY, DAY_ACTS } from "./day-journey-data";

function currentMode(): LearningModeId | null {
  try {
    return useModeStore.getState().mode;
  } catch {
    return null;
  }
}

export function getDayActsForMode(mode?: LearningModeId | null): DayAct[] {
  const m = mode === undefined ? currentMode() : mode;
  const list = !m
    ? DAY_ACTS.filter((a) => a.modesAllowed.includes("core_adult"))
    : DAY_ACTS.filter((a) => a.modesAllowed.includes(m));
  return [...list].sort((a, b) => a.order - b.order);
}

export function getDayActById(id: string): DayAct | undefined {
  const act = DAY_ACTS.find((a) => a.id === id);
  if (!act) return undefined;
  const mode = currentMode();
  if (!mode) return act;
  if (!act.modesAllowed.includes(mode)) return undefined;
  return act;
}

export function getNextDayAct(
  currentId: string,
  mode?: LearningModeId | null,
): DayAct | undefined {
  const list = getDayActsForMode(mode);
  const idx = list.findIndex((a) => a.id === currentId);
  if (idx < 0 || idx >= list.length - 1) return undefined;
  return list[idx + 1];
}

export function getPrevDayAct(
  currentId: string,
  mode?: LearningModeId | null,
): DayAct | undefined {
  const list = getDayActsForMode(mode);
  const idx = list.findIndex((a) => a.id === currentId);
  if (idx <= 0) return undefined;
  return list[idx - 1];
}

export function getDayJourneyStats(mode?: LearningModeId | null) {
  const acts = getDayActsForMode(mode);
  const filmSec = acts.reduce((s, a) => s + a.durationSec, 0);
  const practiceSec = acts.reduce((s, a) => s + a.practiceSec, 0);
  const lines = acts.reduce((s, a) => s + a.lines.length, 0);
  return {
    actCount: acts.length,
    filmSec,
    practiceSec,
    lines,
    filmMin: Math.round(filmSec / 60),
    practiceMin: Math.round(practiceSec / 60),
    meta: DAY_JOURNEY,
  };
}

export async function resolveDayActVideoSrc(
  act: DayAct,
): Promise<{ src: string; fromUpload: boolean }> {
  const r = await resolveCommunityMedia({
    packagedSrc: act.videoSrc,
    uploadSrc: act.uploadSrc,
  });
  return { src: r.src, fromUpload: r.fromUpload };
}

/** Convert a DayAct into a LearningScene-shaped object for ScenePlayer reuse */
export function dayActAsScene(act: DayAct) {
  return {
    id: act.id,
    title: act.title,
    summary: act.summary,
    chapter: act.chapters.join(" · "),
    chapterNum: act.chapterNums[0] ?? 0,
    domain: act.domains[0] ?? "other",
    sensitivity: act.sensitivity,
    style: "cinematic" as const,
    modesAllowed: act.modesAllowed,
    videoSrc: act.videoSrc,
    posterSrc: act.posterSrc,
    uploadSrc: act.uploadSrc,
    durationSec: act.practiceSec,
    lines: act.lines,
    reconstructionNote: act.reconstructionNote,
    tags: ["full-day", ...act.domains],
    series: "Full Day",
    mediaStatus: "ready" as const,
    pathOrder: act.order,
  };
}
