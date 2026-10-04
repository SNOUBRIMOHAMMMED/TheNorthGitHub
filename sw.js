/* Offline shell only. Never intercept external traffic or clear other apps' caches. */
const CACHE = "lifeos-v4-20261004-goal-time";
const ASSETS = [
  "north-brand.css",
  "north-brand.css?v=20261004-goal-time",
  "landing-motion.js",
  "landing-motion.js?v=3",
  "assets/north-summit.webp",
  "assets/north-bridge.webp",
  "assets/north-bridge-800.webp",
  "./",
  "index.html",
  "styles.css",
  "styles.css?v=auto2",
  "landing.css",
  "landing.css?v=auto2",
  "north-2026.css",
  "north-2026.css?v=1",
  "north-workspace.jpg",
  "executive.css",
  "executive.css?v=auto2",
  "auth.js",
  "auth.js?v=20261004-goal-time",
  "cloud-sync.js",
  "cloud-sync.js?v=20261004-goal-time",
  "core.js",
  "core.js?v=20261004-goal-time",
  "app.js",
  "app.js?v=20261004-goal-time",
  "workspace.js",
  "workspace.js?v=20261004-goal-time",
  "manifest.webmanifest",
  "brand-mark.svg",
  "icon-180.png",
  "icon-192.png",
  "icon-512.png",
];
self.addEventListener("install", (event) =>
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key.startsWith("lifeos-") && key !== CACHE)
          await caches.delete(key);
      await self.clients.claim();
    })(),
  ),
);
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin)
    return;
  const own = new URL("./", self.location.href);
  if (!url.pathname.startsWith(own.pathname)) return;
  const relative = url.pathname.slice(own.pathname.length);
  if (event.request.mode !== "navigate" && !ASSETS.includes(relative)) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE),
        key =
          event.request.mode === "navigate"
            ? new URL("index.html", own).href
            : event.request;
      try {
        const response = await fetch(event.request);
        if (response.ok) event.waitUntil(cache.put(key, response.clone()));
        return response;
      } catch {
        const saved = await cache.match(key);
        return (
          saved ||
          new Response("Offline resource unavailable", {
            status: 503,
            headers: { "Content-Type": "text/plain" },
          })
        );
      }
    })(),
  );
});

