const CACHE = "velvetmotion-v2";
const PRECACHE = ["/manifest.json"];

function isDesktopHost() {
  return (
    self.location.hostname === "tauri.localhost" ||
    self.location.protocol === "tauri:"
  );
}

self.addEventListener("install", (e) => {
  if (isDesktopHost()) {
    e.waitUntil(self.skipWaiting());
    return;
  }
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  if (isDesktopHost()) {
    e.waitUntil(
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .then(() => self.registration.unregister())
        .then(() => self.clients.claim())
        .catch(() => {})
    );
    return;
  }
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (isDesktopHost()) return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (e.request.method !== "GET") return;
  if (!url.pathname.startsWith("/portraits/")) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone)).catch(() => {});
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(e.request);
        return cached || Response.error();
      })
  );
});
