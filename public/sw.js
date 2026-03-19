const CACHE_NAME = "phrasebridge-shell-v2";
const PRECACHE_URLS = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

const PRECACHE_PATHS = new Set(PRECACHE_URLS);

const isCacheAllowed = (request, requestUrl) => {
  if (request.mode === "navigate" || request.destination === "document") {
    return false;
  }

  if (requestUrl.pathname.startsWith("/api/")) {
    return false;
  }

  if (requestUrl.pathname === "/sw.js") {
    return false;
  }

  if (requestUrl.pathname.startsWith("/_next/data/")) {
    return false;
  }

  if (PRECACHE_PATHS.has(requestUrl.pathname)) {
    return true;
  }

  if (requestUrl.pathname.startsWith("/_next/static/")) {
    return true;
  }

  return false;
};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(request.url);
  const isSameOrigin = requestUrl.origin === self.location.origin;

  if (!isSameOrigin) {
    return;
  }

  if (!isCacheAllowed(request, requestUrl)) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });

        return response;
      });
    })
  );
});
