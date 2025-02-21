const CACHE_NAME = "wellness-tracker-v3"; // Versiyonu artırın
const ASSETS = [
  "/",
  "/index.html",
  "/public/manifest.json",
  "/public/logo4.jpeg",
  "/offline.html",
  "/src/App.jsx", // JSX dosya yolu
  "/src/app.css", // CSS dosya yolu
  "/src/main.jsx", // Ana entry point
];

// Install event: Cache kaynaklarını yükle
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((err) => {
        console.error("Cache hatası:", err);
        console.error("Aşağıdaki kaynaklar yüklenemedi:");
        ASSETS.forEach((asset) => {
          fetch(asset)
            .then(() => console.log(`${asset} başarıyla yüklendi`))
            .catch(() => console.error(`${asset} yüklenemedi`));
        });
      });
    })
  );
});

// Fetch event: İstekleri yönet ve cache'i kullan
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Yalnızca GET isteklerini ve http/https şemalarını işle
  if (request.method !== "GET" || !request.url.startsWith("http")) {
    return;
  }

  event.respondWith(
    caches.match(request).then((response) => {
      if (response) {
        return response; // Eğer cache'de varsa, onu döndür
      }

      return fetch(request)
        .then((fetchResponse) => {
          // Eğer yanıt kısmi içerik içeriyorsa (206), önbelleğe alma işlemini atla
          if (fetchResponse.status === 206) {
            return fetchResponse;
          }
          const responseToCache = fetchResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return fetchResponse;
        })
        .catch(() => {
          return caches.match("/offline.html");
        });
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

// Notification click event: Bildirim tıklandığında bir URL aç
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
