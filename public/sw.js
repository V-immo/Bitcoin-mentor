const CACHE_NAME = "btcmentor-v4";

// Installeer: skip waiting zodat nieuwe SW meteen actief wordt
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// Activeer: verwijder ALLE oude caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch: alleen push-notificaties ondersteunen, GEEN caching van assets
// Next.js assets hebben al een content-hash in hun bestandsnaam — die hoef je niet te cachen.
// Cachen van _next/static/ veroorzaakte witte pagina's na deploys.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // API calls: altijd live
  if (url.pathname.startsWith("/api/")) return;

  // _next/static/ assets: altijd live (hebben eigen hash in naam)
  if (url.pathname.startsWith("/_next/")) return;

  // Al het overige: network-first, geen cache fallback
  // (offline fallback weglaten voorkomt het serveren van verouderde HTML)
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: "Bitcoin Mentor", body: event.data.text() }; }

  event.waitUntil(
    self.registration.showNotification(data.title || "Bitcoin Mentor", {
      body: data.body || "",
      icon: data.icon || "/icon-192.png",
      badge: data.badge || "/icon-192.png",
      vibrate: [200, 100, 200],
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
