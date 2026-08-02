/**
 * PWA cleanup + optional re-register.
 * Production was broken by an old SW caching redirect responses for "/".
 * We always purge bad workers first; then install the cleanup SW once so
 * stuck clients self-heal even if this JS bundle was cached.
 */
export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const run = async () => {
    try {
      // 1) Drop every existing registration
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));

      // 2) Clear all Cache Storage
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }

      // 3) Install cleanup SW (unregisters itself after activate)
      // Cache-bust query so Vercel/CDN cannot serve the old intercepting SW
      await navigator.serviceWorker.register("/sw.js?v=cleanup-3", {
        updateViaCache: "none",
      });
    } catch {
      // Progressive enhancement — site works without SW
    }
  };

  if (document.readyState === "complete") {
    void run();
  } else {
    window.addEventListener("load", () => void run());
  }
}
