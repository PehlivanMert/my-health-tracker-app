const CACHE_NAME = "wellness-tracker-v4"; // Versiyon güncellendi
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
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.error("Cache hatası:", err);
        console.error("Aşağıdaki kaynaklar yüklenemedi:");
        ASSETS.forEach((asset) => {
          fetch(asset)
            .then(() => console.log(`${asset} başarıyla yüklendi`))
            .catch(() => console.error(`${asset} yüklenemedi`));
        });
      })
  );
});

// Activate event: Eski cache'leri temizle ve kontrolü ele al
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        );
      })
      .then(() => self.clients.claim())
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
        return response; // Cache'de varsa döndür
      }

      return fetch(request)
        .then((fetchResponse) => {
          // Eğer geçerli bir yanıt değilse, yanıtı önbelleğe almadan döndür
          if (
            !fetchResponse ||
            fetchResponse.status !== 200 ||
            fetchResponse.type !== "basic"
          ) {
            return fetchResponse;
          }

          // Kopyasını cache'e kaydet
          const responseToCache = fetchResponse.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => {
              cache.put(request, responseToCache);
            })
            .catch((error) => {
              console.error("Cache put hatası:", error);
            });

          return fetchResponse;
        })
        .catch(() => {
          // Çevrimdışı sayfayı göster
          return caches.match("/offline.html");
        });
    })
  );
});

// Push Notification Handling
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data.json();
  } catch (error) {
    console.error("Push verisi okunamadı:", error);
  }
  const options = {
    body: data.body || "Bildirim içeriği mevcut değil.",
    icon: "/public/logo4.jpeg",
    badge: "/public/logo4.jpeg",
    vibrate: [200, 100, 200],
    data: { url: data.url || "/" },
  };
  event.waitUntil(
    self.registration.showNotification(data.title || "Bildirim", options)
  );
});

// Notification click event: Bildirim tıklandığında belirlenen URL'yi aç
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
