import { useModeStore } from "@/lib/mode/store";
import type { LearningModeId } from "./types";
import { SCENES, type LearningScene } from "./scenes-data";

export type {
  LearningScene,
  SceneLine,
  SubtitleTrack,
  VideoStyle,
} from "./scenes-data";

function currentMode(): LearningModeId | null {
  try {
    return useModeStore.getState().mode;
  } catch {
    return null;
  }
}

export function getScenesForMode(mode?: LearningModeId | null): LearningScene[] {
  const m = mode === undefined ? currentMode() : mode;
  if (!m) return SCENES.filter((s) => s.modesAllowed.includes("core_adult"));
  return SCENES.filter((s) => s.modesAllowed.includes(m));
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
  };
  return [...map.entries()]
    .map(([id, count]) => ({ id, label: labels[id] ?? id, count }))
    .sort((a, b) => b.count - a.count);
}
