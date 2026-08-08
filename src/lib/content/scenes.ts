import { useModeStore } from "@/lib/mode/store";
import type { LearningModeId } from "./types";
import { SCENES, type LearningScene } from "./scenes-data";
import { resolveCommunityMedia } from "@/lib/media/community-media";

export type {
  LearningScene,
  SceneLine,
  SubtitleTrack,
  VoiceTrack,
  PlayMode,
  VideoStyle,
  MediaStatus,
  MediaWindow,
} from "./scenes-data";

function currentMode(): LearningModeId | null {
  try {
    return useModeStore.getState().mode;
  } catch {
    return null;
  }
}

function sortByPath(a: LearningScene, b: LearningScene) {
  const ao = a.pathOrder ?? a.chapterNum * 10;
  const bo = b.pathOrder ?? b.chapterNum * 10;
  if (ao !== bo) return ao - bo;
  return a.title.localeCompare(b.title);
}

/**
 * Little Ones: only Hello Kid Friends pack (same two cartoon friends).
 * Young Learner: only Young Path (same two friends as teens).
 * Core Adult: Adult Path pack + daily-life catalog (excludes age-locked packs).
 * Elder: only Elder Path (solemn public discourse — not living ceremony).
 */
export function getScenesForMode(mode?: LearningModeId | null): LearningScene[] {
  const m = mode === undefined ? currentMode() : mode;
  let list: LearningScene[];
  if (!m) {
    list = SCENES.filter((s) => s.modesAllowed.includes("core_adult"));
  } else if (m === "little_ones") {
    list = SCENES.filter(
      (s) =>
        s.modesAllowed.includes("little_ones") &&
        (s.series === "Little Ones" || (s.tags ?? []).includes("kids")),
    );
  } else if (m === "young_learner") {
    list = SCENES.filter(
      (s) =>
        s.modesAllowed.includes("young_learner") &&
        (s.series === "Young Path" || (s.tags ?? []).includes("student")),
    );
  } else if (m === "core_adult") {
    list = SCENES.filter(
      (s) =>
        s.modesAllowed.includes("core_adult") &&
        s.series !== "Little Ones" &&
        s.series !== "Young Path" &&
        s.series !== "Elder Path" &&
        !(s.tags ?? []).includes("kids") &&
        !(s.tags ?? []).includes("student") &&
        !(s.tags ?? []).includes("elder-path"),
    );
  } else if (m === "elder") {
    list = SCENES.filter(
      (s) =>
        s.modesAllowed.includes("elder") &&
        (s.series === "Elder Path" || (s.tags ?? []).includes("elder-path")),
    );
  } else {
    list = SCENES.filter((s) => s.modesAllowed.includes(m));
  }
  return [...list].sort(sortByPath);
}

export function getSceneById(id: string): LearningScene | undefined {
  const scene = SCENES.find((s) => s.id === id);
  if (!scene) return undefined;
  const mode = currentMode();
  if (!mode) return scene;
  if (!scene.modesAllowed.includes(mode)) return undefined;
  if (
    mode === "little_ones" &&
    scene.series !== "Little Ones" &&
    !(scene.tags ?? []).includes("kids")
  ) {
    return undefined;
  }
  if (
    mode === "young_learner" &&
    scene.series !== "Young Path" &&
    !(scene.tags ?? []).includes("student")
  ) {
    return undefined;
  }
  if (
    mode === "core_adult" &&
    (scene.series === "Little Ones" ||
      scene.series === "Young Path" ||
      scene.series === "Elder Path" ||
      (scene.tags ?? []).includes("kids") ||
      (scene.tags ?? []).includes("student") ||
      (scene.tags ?? []).includes("elder-path"))
  ) {
    return undefined;
  }
  if (
    mode === "elder" &&
    scene.series !== "Elder Path" &&
    !(scene.tags ?? []).includes("elder-path")
  ) {
    return undefined;
  }
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
    flora: "Land",
    governance: "Council",
    medicine: "Care",
    fauna: "Hunt",
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
  num: number;
  title: string;
  count: number;
}[] {
  const map = new Map<number, { title: string; count: number }>();
  for (const s of getScenesForMode()) {
    const prev = map.get(s.chapterNum);
    map.set(s.chapterNum, {
      title: s.chapter,
      count: (prev?.count ?? 0) + 1,
    });
  }
  return [...map.entries()]
    .map(([num, v]) => ({ num, title: v.title, count: v.count }))
    .sort((a, b) => a.num - b.num);
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

export function getRecommendedScene(
  completedIds: string[],
  mode?: LearningModeId | null,
): LearningScene | undefined {
  const list = getScenesForMode(mode);
  return list.find((s) => !completedIds.includes(s.id)) ?? list[0];
}

/**
 * Prefer community upload when the browser can load a real video file.
 * Call from client components only.
 */
export async function resolveSceneVideoSrc(
  scene: LearningScene,
): Promise<{ src: string; fromUpload: boolean }> {
  const r = await resolveCommunityMedia({
    packagedSrc: scene.videoSrc,
    uploadSrc: scene.uploadSrc,
  });
  return { src: r.src, fromUpload: r.fromUpload };
}
