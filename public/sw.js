/**
 * One-shot cleanup worker.
 * Previous versions intercepted "/" (307 → /welcome) and broke production.
 * This file unregisters itself and wipes caches so the site works again.
 */
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(Promise.resolve());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      for (const client of clients) {
        client.navigate(client.url);
      }
    })(),
  );
});

// Do not intercept any fetches — navigations must hit the network directly
self.addEventListener("fetch", () => {
  /* no-op: let browser handle everything */
});
