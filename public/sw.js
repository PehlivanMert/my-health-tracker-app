const CACHE_NAME = "wellness-tracker-v3"; // Versiyonu artırın
const ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/logo4.jpeg",
  "/offline.html", // Offline sayfasını ekleyin
  "/src/App.jsx", // JSX dosya yolu
  "/src/app.css", // CSS dosya yolu
  "/src/main.jsx", // Ana entry point
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache
        .addAll(ASSETS)
        .then(() => console.log("Tüm kaynaklar cache'lendi"))
        .catch((err) => console.error("Cache hatası:", err));
    })
  );
});

// Fetch event için güncellenmiş mantık
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches
      .match(event.request)
      .then((response) => {
        // Online ise network'ten getir + cache'e ekle
        return (
          response ||
          fetch(event.request).then((fetchResponse) => {
            return caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request.url, fetchResponse.clone());
              return fetchResponse;
            });
          })
        );
      })
      .catch(() => {
        // Offline durumda özel sayfa
        return caches.match("/offline.html");
      })
  );
});

// Push Notification Handling
self.addEventListener("push", (event) => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: "/logo4.jpeg",
    badge: "/logo4.jpeg",
    vibrate: [200, 100, 200],
    data: { url: data.url },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
