import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_MODE,
  MODES,
  type LearningMode,
  type ModeMeta,
} from "./modes";

type ModeState = {
  mode: LearningMode | null;
  hasOnboarded: boolean;
  setMode: (mode: LearningMode) => void;
  completeOnboarding: (mode: LearningMode) => void;
  resetOnboarding: () => void;
  meta: () => ModeMeta | null;
};

export const useModeStore = create<ModeState>()(
  persist(
    (set, get) => ({
      mode: null,
      hasOnboarded: false,
      setMode: (mode) => {
        set({ mode });
        if (typeof document !== "undefined") {
          document.documentElement.dataset.mode = mode;
        }
      },
      completeOnboarding: (mode) => {
        set({ mode, hasOnboarded: true });
        if (typeof document !== "undefined") {
          document.documentElement.dataset.mode = mode;
        }
      },
      resetOnboarding: () => set({ mode: null, hasOnboarded: false }),
      meta: () => {
        const m = get().mode;
        return m ? MODES[m] : null;
      },
    }),
    {
      name: "kuttiomp-learn-mode",
      onRehydrateStorage: () => (state) => {
        if (state?.mode && typeof document !== "undefined") {
          document.documentElement.dataset.mode = state.mode;
        }
      },
    },
  ),
);

export function applyModeToDocument(mode: LearningMode | null) {
  if (typeof document === "undefined") return;
  if (mode) document.documentElement.dataset.mode = mode;
  else delete document.documentElement.dataset.mode;
}

export function resolveMode(mode: LearningMode | null): LearningMode {
  return mode ?? DEFAULT_MODE;
}
