/* VelvetMotion service worker — cache shell + proactive notification support */
const CACHE = "vm-shell-v1";
const SHELL = ["/", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).catch(() => caches.match("/")))
  );
});

/* Proactive: page can postMessage { type: 'show-notification', title, body, characterId } */
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "show-notification") {
    self.registration.showNotification(data.title || "She texted you",
      {
        body: data.body || "Open VelvetMotion",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        data: { characterId: data.characterId || "" },
        tag: data.characterId ? `vm-${data.characterId}` : "vm-proactive",
      }
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const id = event.notification.data?.characterId;
  const url = id ? `/?view=chat&id=${encodeURIComponent(id)}` : "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const c of clients) {
        if ("focus" in c) {
          c.navigate?.(url);
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
