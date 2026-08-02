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
  wordProgress: Record<string, WordProgress>;
  /** Last word opened in listen/focus — resume support */
  lastListenWordId: string | null;
  lastListenIndex: number;
  markHeard: (id: string) => void;
  markRevealed: (id: string) => void;
  markPracticed: (id: string) => void;
  setListenCursor: (wordId: string, index: number) => void;
  completePath: (pathId: string) => void;
  clearDemoProgress: () => void;
  stats: () => {
    heard: number;
    practiced: number;
    paths: number;
    stage: number;
  };
};

function stageFromCounts(heard: number, practiced: number, paths: number) {
  if (practiced >= 80 || paths >= 6) return 4;
  if (practiced >= 40 || paths >= 4) return 3;
  if (practiced >= 15 || paths >= 2) return 2;
  if (heard >= 5 || practiced >= 3) return 1;
  return 1;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      heardIds: [],
      practicedIds: [],
      completedPaths: [],
      wordProgress: {},
      lastListenWordId: null,
      lastListenIndex: 0,
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
      clearDemoProgress: () =>
        set({
          heardIds: [],
          practicedIds: [],
          completedPaths: [],
          wordProgress: {},
          lastListenWordId: null,
          lastListenIndex: 0,
        }),
      stats: () => {
        const s = get();
        return {
          heard: s.heardIds.length,
          practiced: s.practicedIds.length,
          paths: s.completedPaths.length,
          stage: stageFromCounts(
            s.heardIds.length,
            s.practicedIds.length,
            s.completedPaths.length,
          ),
        };
      },
    }),
    { name: "kuttiomp-learn-progress" },
  ),
);
