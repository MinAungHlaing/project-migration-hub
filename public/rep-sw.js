const CACHE_NAME = "gtm-rep-shell-v1";
const APP_PATH = "/rep";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.add(APP_PATH))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("gtm-rep-shell-") && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate" && (url.pathname === APP_PATH || url.pathname === `${APP_PATH}/`)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put(APP_PATH, copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(APP_PATH)) || new Response("Offline app shell is not cached yet. Open /rep while online first.", {
          status: 503,
          headers: { "content-type": "text/plain; charset=utf-8" },
        })),
    );
    return;
  }

  if (url.pathname.startsWith("/assets/") || url.pathname === "/rep-icon.svg" || url.pathname === "/rep.webmanifest") {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      }),
    );
  }
});
