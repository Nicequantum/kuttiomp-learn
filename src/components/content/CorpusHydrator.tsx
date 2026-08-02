import { useEffect, useState } from "react";
import {
  getCorpusLoadState,
  hydrateCorpus,
  subscribeCorpus,
} from "@/lib/content/corpus";

/**
 * Boots public API corpus when VITE_API_BASE_URL is set.
 * Safe no-op on demo seed-only deploys.
 */
export function CorpusHydrator() {
  const [, setTick] = useState(0);

  useEffect(() => {
    void hydrateCorpus();
    return subscribeCorpus(() => setTick((n) => n + 1));
  }, []);

  // Dev-only console breadcrumb; no UI chrome required
  useEffect(() => {
    const s = getCorpusLoadState();
    if (import.meta.env.DEV) {
      console.info("[corpus]", s.message, s);
    }
  });

  return null;
}
