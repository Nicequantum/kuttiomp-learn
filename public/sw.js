/* Kuttiomp Learn PWA — safe fetch (no broken redirects) */
const CACHE = "kuttiomp-learn-v3";

// Only static assets — never HTML routes that 307/redirect
const PRECACHE = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/scenery/sunset-woodland.webp",
  "/scenery/coastal-marsh.webp",
  "/scenery/forest-stream.webp",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        Promise.all(
          PRECACHE.map((url) =>
            cache.add(url).catch(() => {
              /* ignore missing asset */
            }),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept API (TTS) or navigations — avoids redirect / FetchEvent errors
  if (url.pathname.startsWith("/api/")) return;
  if (req.mode === "navigate") return;

  // Only cache same-origin static assets
  const isAsset =
    url.pathname.startsWith("/scenery/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/sw.js";

  if (!isAsset) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req);
      try {
        const res = await fetch(req, { redirect: "follow" });
        // Only store successful, non-redirect final responses
        if (res.ok && res.type === "basic" && !res.redirected) {
          cache.put(req, res.clone());
        }
        return res;
      } catch {
        if (cached) return cached;
        return new Response("Offline", { status: 503 });
      }
    }),
  );
});
