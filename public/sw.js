// sw.js
const CACHE_NAME = "wellness-tracker-v4";
const ASSETS = [
  "/",
  "/index.html",
  "/public/manifest.json",
  "/public/logo4.jpeg",
  "/offline.html",
];

// Install event: Statik varlıkları önbelleğe al
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Fetch event: Önbellekten döndür, yoksa network'den çek, hata durumunda offline sayfası
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return (
        response ||
        fetch(event.request).catch(() => caches.match("/offline.html"))
      );
    })
  );
});

// Activate event: Eski önbellekleri temizle
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      )
    )
  );
});
