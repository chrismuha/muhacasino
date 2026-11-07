const CACHE_NAME = "muha-casino-shell-20261106-deal-duo-buttons-v149";
const APP_SHELL = [
  "./",
  "./index.html",
  "./statistics.html",
  "./release-notes.html",
  "./styles.css",
  "./about.css",
  "./home-info.css",
  "./launcher.js",
  "./statistics.js",
  "./interaction-lock.js",
  "./manifest.webmanifest",
  "./icons/casino-app-192-v5.png",
  "./icons/casino-app-512-v5.png",
  "./icons/casino-maskable-v5.png",
  "./icons/casino-touch-v5.png",
  "./icons/casino-mark-v5.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then((response) => response || caches.match("./index.html")))
    );
    return;
  }

  const url = new URL(event.request.url);
  const freshCode = url.origin === self.location.origin && /\.(?:css|m?js)$/.test(url.pathname);
  const fetchAndCache = () => fetch(event.request).then((response) => {
    if (response.ok && url.origin === self.location.origin) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)));
    }
    return response;
  });
  // Fresh HTML must not be paired with old layout code. Keep large artwork
  // cache-first; scripts and styles fetch fresh copies with an offline fallback.
  event.respondWith(freshCode
    ? fetchAndCache().catch(() => caches.match(event.request))
    : caches.match(event.request).then((cached) => cached || fetchAndCache())
  );
});
