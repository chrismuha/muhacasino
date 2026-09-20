const CACHE_NAME = "muha-casino-shell-20260920-realistic-jackpots-v16";
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
  "./icons/muha-casino-192-v3.png",
  "./icons/muha-casino-512-v3.png",
  "./icons/muha-casino-maskable-v3.png",
  "./icons/muha-casino-touch-v3.png",
  "./icons/rounded-browser-icon-v3.png"
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

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      if (response.ok && new URL(event.request.url).origin === self.location.origin) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      }
      return response;
    }))
  );
});
