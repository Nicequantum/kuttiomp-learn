import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WordProgress = {
  heard: number;
  revealed: number;
  practiced: boolean;
  lastAt?: string;
};

type ProgressState = {
  heardIds: string[];
  practicedIds: string[];
  completedPaths: string[];
  completedScenes: string[];
  completedDayActs: string[];
  completedStories: string[];
  wordProgress: Record<string, WordProgress>;
  lastListenWordId: string | null;
  lastListenIndex: number;
  lastSceneId: string | null;
  lastDayActId: string | null;
  lastStoryId: string | null;
  lastStoryPositionSec: number;
  markHeard: (id: string) => void;
  markRevealed: (id: string) => void;
  markPracticed: (id: string) => void;
  setListenCursor: (wordId: string, index: number) => void;
  completePath: (pathId: string) => void;
  completeScene: (sceneId: string) => void;
  completeDayAct: (actId: string) => void;
  completeStory: (storyId: string) => void;
  setLastScene: (sceneId: string) => void;
  setLastDayAct: (actId: string) => void;
  setStoryPosition: (storyId: string, sec: number) => void;
  clearStoryPosition: (storyId?: string) => void;
  clearDemoProgress: () => void;
  stats: () => {
    heard: number;
    practiced: number;
    paths: number;
    scenes: number;
    dayActs: number;
    stories: number;
    stage: number;
  };
};

function stageFromCounts(
  heard: number,
  practiced: number,
  paths: number,
  scenes: number,
  dayActs: number,
  stories: number,
) {
  if (
    practiced >= 80 ||
    paths >= 6 ||
    scenes >= 6 ||
    dayActs >= 8 ||
    stories >= 1
  )
    return 4;
  if (practiced >= 40 || paths >= 4 || scenes >= 4 || dayActs >= 5) return 3;
  if (practiced >= 15 || paths >= 2 || scenes >= 2 || dayActs >= 2) return 2;
  if (heard >= 5 || practiced >= 3 || scenes >= 1 || dayActs >= 1) return 1;
  return 1;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      heardIds: [],
      practicedIds: [],
      completedPaths: [],
      completedScenes: [],
      completedDayActs: [],
      completedStories: [],
      wordProgress: {},
      lastListenWordId: null,
      lastListenIndex: 0,
      lastSceneId: null,
      lastDayActId: null,
      lastStoryId: null,
      lastStoryPositionSec: 0,
      markHeard: (id) =>
        set((s) => {
          const prev = s.wordProgress[id] ?? {
            heard: 0,
            revealed: 0,
            practiced: false,
          };
          const heardIds = s.heardIds.includes(id)
            ? s.heardIds
            : [...s.heardIds, id];
          return {
            heardIds,
            lastListenWordId: id,
            wordProgress: {
              ...s.wordProgress,
              [id]: {
                ...prev,
                heard: prev.heard + 1,
                lastAt: new Date().toISOString(),
              },
            },
          };
        }),
      markRevealed: (id) =>
        set((s) => {
          const prev = s.wordProgress[id] ?? {
            heard: 0,
            revealed: 0,
            practiced: false,
          };
          return {
            wordProgress: {
              ...s.wordProgress,
              [id]: {
                ...prev,
                revealed: prev.revealed + 1,
                lastAt: new Date().toISOString(),
              },
            },
          };
        }),
      markPracticed: (id) =>
        set((s) => {
          const prev = s.wordProgress[id] ?? {
            heard: 0,
            revealed: 0,
            practiced: false,
          };
          const practicedIds = s.practicedIds.includes(id)
            ? s.practicedIds
            : [...s.practicedIds, id];
          return {
            practicedIds,
            wordProgress: {
              ...s.wordProgress,
              [id]: {
                ...prev,
                practiced: true,
                lastAt: new Date().toISOString(),
              },
            },
          };
        }),
      setListenCursor: (wordId, index) =>
        set({ lastListenWordId: wordId, lastListenIndex: index }),
      completePath: (pathId) =>
        set((s) => ({
          completedPaths: s.completedPaths.includes(pathId)
            ? s.completedPaths
            : [...s.completedPaths, pathId],
        })),
      completeScene: (sceneId) =>
        set((s) => ({
          completedScenes: s.completedScenes.includes(sceneId)
            ? s.completedScenes
            : [...s.completedScenes, sceneId],
          lastSceneId: sceneId,
        })),
      completeDayAct: (actId) =>
        set((s) => ({
          completedDayActs: s.completedDayActs.includes(actId)
            ? s.completedDayActs
            : [...s.completedDayActs, actId],
          lastDayActId: actId,
        })),
      completeStory: (storyId) =>
        set((s) => ({
          completedStories: s.completedStories.includes(storyId)
            ? s.completedStories
            : [...s.completedStories, storyId],
          lastStoryId: storyId,
          lastStoryPositionSec: 0,
        })),
      setLastScene: (sceneId) => set({ lastSceneId: sceneId }),
      setLastDayAct: (actId) => set({ lastDayActId: actId }),
      setStoryPosition: (storyId, sec) =>
        set({
          lastStoryId: storyId,
          lastStoryPositionSec: Math.max(0, sec),
        }),
      clearStoryPosition: (storyId) =>
        set((s) => {
          if (storyId && s.lastStoryId && s.lastStoryId !== storyId) return s;
          return { lastStoryPositionSec: 0 };
        }),
      clearDemoProgress: () =>
        set({
          heardIds: [],
          practicedIds: [],
          completedPaths: [],
          completedScenes: [],
          completedDayActs: [],
          completedStories: [],
          wordProgress: {},
          lastListenWordId: null,
          lastListenIndex: 0,
          lastSceneId: null,
          lastDayActId: null,
          lastStoryId: null,
          lastStoryPositionSec: 0,
        }),
      stats: () => {
        const s = get();
        const heard = s.heardIds.length;
        const practiced = s.practicedIds.length;
        const paths = s.completedPaths.length;
        const scenes = s.completedScenes.length;
        const dayActs = s.completedDayActs.length;
        const stories = s.completedStories.length;
        return {
          heard,
          practiced,
          paths,
          scenes,
          dayActs,
          stories,
          stage: stageFromCounts(
            heard,
            practiced,
            paths,
            scenes,
            dayActs,
            stories,
          ),
        };
      },
    }),
    { name: "kuttiomp-progress-v4" },
  ),
);
