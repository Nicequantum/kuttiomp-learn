/**
 * Service workers are DISABLED for now.
 * An earlier SW cached HTTP redirects and broke production
 * (FetchEvent redirect errors + 404s on /assets/*).
 *
 * We only purge existing workers/caches so production heals.
 * PWA "Add to Home Screen" still works via manifest (iOS).
 */

export async function purgeServiceWorkers(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  } catch {
    /* ignore */
  }

  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* ignore */
  }
}

/** @deprecated No longer registers a SW — only purges broken ones */
export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  const run = () => {
    void purgeServiceWorkers();
  };
  if (document.readyState === "complete") run();
  else window.addEventListener("load", run);
}
