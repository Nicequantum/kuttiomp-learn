import { useModeStore } from "@/lib/mode/store";
import type { LearningModeId } from "./types";
import { LONG_STORIES, type LongStory } from "./long-stories-data";
import type { LearningScene } from "./scenes-data";

export type { LongStory } from "./long-stories-data";
export { LONG_STORIES } from "./long-stories-data";

function currentMode(): LearningModeId | null {
  try {
    return useModeStore.getState().mode;
  } catch {
    return null;
  }
}

export function getLongStories(mode?: LearningModeId | null): LongStory[] {
  const m = mode === undefined ? currentMode() : mode;
  if (!m) return LONG_STORIES.filter((s) => s.modesAllowed.includes("core_adult"));
  return LONG_STORIES.filter((s) => s.modesAllowed.includes(m));
}

export function getLongStoryById(id: string): LongStory | undefined {
  const story = LONG_STORIES.find((s) => s.id === id);
  if (!story) return undefined;
  const mode = currentMode();
  if (!mode) return story;
  if (!story.modesAllowed.includes(mode)) return undefined;
  return story;
}

export async function resolveLongStoryVideoSrc(
  story: LongStory,
): Promise<{ src: string; fromUpload: boolean }> {
  if (typeof window === "undefined") {
    return { src: story.videoSrc, fromUpload: false };
  }
  try {
    const res = await fetch(story.uploadSrc, { method: "HEAD" });
    if (res.ok) {
      const len = res.headers.get("content-length");
      if (!len || Number(len) > 10_000) {
        return { src: story.uploadSrc, fromUpload: true };
      }
    }
  } catch {
    /* default */
  }
  return { src: story.videoSrc, fromUpload: false };
}

export function longStoryAsScene(story: LongStory): LearningScene {
  return {
    id: story.id,
    title: story.title,
    summary: story.summary,
    chapter: "Long story",
    chapterNum: 0,
    domain: "other",
    sensitivity: story.sensitivity,
    style: "cinematic",
    modesAllowed: story.modesAllowed,
    videoSrc: story.videoSrc,
    posterSrc: story.posterSrc,
    uploadSrc: story.uploadSrc,
    durationSec: story.practiceSec,
    lines: story.lines,
    reconstructionNote: story.reconstructionNote,
    tags: ["long-story", "narrative"],
    series: "Long stories",
    mediaStatus: "ready",
    pathOrder: 1,
  };
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}h ${rm}m`;
  }
  return s > 0 ? `${m} min ${s}s` : `${m} min`;
}
