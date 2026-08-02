/* Intentionally inert — previous SW versions broke production.
   Immediately unregister and clear caches if this file is still installed. */
self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(Promise.resolve());
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
    })(),
  );
});
// Never call event.respondWith — do not intercept network
