import { useEffect, useState, type ReactNode } from "react";
import {
  getCorpusLoadState,
  hydrateCorpus,
  subscribeCorpus,
} from "@/lib/content/corpus";

/**
 * Boots public API corpus when VITE_API_BASE_URL is set.
 * Wraps the app tree so pages re-render after hydrate (sibling Outlet
 * previously stayed on the seed snapshot).
 */
export function CorpusHydrator({ children }: { children?: ReactNode }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    void hydrateCorpus().then((s) => {
      if (import.meta.env.DEV) {
        console.info("[corpus]", s.message, s);
      }
    });
    return subscribeCorpus(() => {
      setTick((n) => n + 1);
      if (import.meta.env.DEV) {
        console.info("[corpus]", getCorpusLoadState().message);
      }
    });
  }, []);

  return <>{children}</>;
}
