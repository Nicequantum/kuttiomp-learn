import { useModeStore } from "@/lib/mode/store";
import type { LearningModeId } from "./types";
import { SCENES, type LearningScene } from "./scenes-data";

export type {
  LearningScene,
  SceneLine,
  SubtitleTrack,
  VideoStyle,
  MediaStatus,
} from "./scenes-data";

function currentMode(): LearningModeId | null {
  try {
    return useModeStore.getState().mode;
  } catch {
    return null;
  }
}

function sortByPath(scenes: LearningScene[]): LearningScene[] {
  return [...scenes].sort((a, b) => {
    const ao = a.pathOrder ?? a.chapterNum * 10;
    const bo = b.pathOrder ?? b.chapterNum * 10;
    if (ao !== bo) return ao - bo;
    return a.chapterNum - b.chapterNum || a.title.localeCompare(b.title);
  });
}

export function getScenesForMode(mode?: LearningModeId | null): LearningScene[] {
  const m = mode === undefined ? currentMode() : mode;
  const list = !m
    ? SCENES.filter((s) => s.modesAllowed.includes("core_adult"))
    : SCENES.filter((s) => s.modesAllowed.includes(m));
  return sortByPath(list);
}

export function getSceneById(id: string): LearningScene | undefined {
  const scene = SCENES.find((s) => s.id === id);
  if (!scene) return undefined;
  const mode = currentMode();
  if (!mode) return scene;
  if (!scene.modesAllowed.includes(mode)) return undefined;
  return scene;
}

export function getSceneDomains(): { id: string; label: string; count: number }[] {
  const scenes = getScenesForMode();
  const map = new Map<string, number>();
  for (const s of scenes) {
    map.set(s.domain, (map.get(s.domain) ?? 0) + 1);
  }
  const labels: Record<string, string> = {
    kinship: "People",
    food: "Food",
    movement: "Travel",
    weather: "Weather",
    water: "Water",
    tools: "Trade",
    time: "Numbers & time",
    flora: "Land & life",
    other: "Talk",
  };
  return [...map.entries()]
    .map(([id, count]) => ({ id, label: labels[id] ?? id, count }))
    .sort((a, b) => b.count - a.count);
}

export function getSceneSeries(): { id: string; count: number }[] {
  const map = new Map<string, number>();
  for (const s of getScenesForMode()) {
    const key = s.series ?? "Other";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function getSceneChapters(): {
  chapterNum: number;
  chapter: string;
  count: number;
}[] {
  const map = new Map<number, { chapter: string; count: number }>();
  for (const s of getScenesForMode()) {
    const prev = map.get(s.chapterNum);
    if (prev) prev.count += 1;
    else map.set(s.chapterNum, { chapter: s.chapter, count: 1 });
  }
  return [...map.entries()]
    .map(([chapterNum, v]) => ({
      chapterNum,
      chapter: v.chapter,
      count: v.count,
    }))
    .sort((a, b) => a.chapterNum - b.chapterNum);
}

export function getNextScene(
  currentId: string,
  mode?: LearningModeId | null,
): LearningScene | undefined {
  const list = getScenesForMode(mode);
  const idx = list.findIndex((s) => s.id === currentId);
  if (idx < 0 || idx >= list.length - 1) return undefined;
  return list[idx + 1];
}

export function getPrevScene(
  currentId: string,
  mode?: LearningModeId | null,
): LearningScene | undefined {
  const list = getScenesForMode(mode);
  const idx = list.findIndex((s) => s.id === currentId);
  if (idx <= 0) return undefined;
  return list[idx - 1];
}

/** First unfinished scene in path order, or first scene if all done. */
export function getRecommendedScene(
  completedIds: string[],
  mode?: LearningModeId | null,
): LearningScene | undefined {
  const list = getScenesForMode(mode);
  if (list.length === 0) return undefined;
  const next = list.find((s) => !completedIds.includes(s.id));
  return next ?? list[0];
}

export function getSceneProgress(
  completedIds: string[],
  mode?: LearningModeId | null,
): { total: number; done: number; percent: number } {
  const list = getScenesForMode(mode);
  const total = list.length;
  const done = list.filter((s) => completedIds.includes(s.id)).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return { total, done, percent };
}

/**
 * Prefer community upload when the browser can load it; fall back to packaged video.
 * Call from client components only.
 */
export async function resolveSceneVideoSrc(
  scene: LearningScene,
): Promise<{ src: string; fromUpload: boolean }> {
  if (typeof window === "undefined") {
    return { src: scene.videoSrc, fromUpload: false };
  }
  try {
    const res = await fetch(scene.uploadSrc, { method: "HEAD" });
    if (res.ok) {
      const len = res.headers.get("content-length");
      // ignore tiny README / empty
      if (!len || Number(len) > 10_000) {
        return { src: scene.uploadSrc, fromUpload: true };
      }
    }
  } catch {
    /* use default */
  }
  return { src: scene.videoSrc, fromUpload: false };
}
