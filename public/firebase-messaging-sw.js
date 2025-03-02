importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js"
);

const CACHE_NAME = "wellness-tracker-v4";
const ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/logo4.jpeg",
  "/offline.html",
];

// Firebase konfigürasyon bilgilerini kopyalayın
const firebaseConfig = {
  apiKey: "AIzaSyD64A3LlceBtvBH2Uphg5yTUP9MgK1EeBc",
  authDomain: "my-health-tracker-application.firebaseapp.com",
  projectId: "my-health-tracker-application",
  storageBucket: "my-health-tracker-application.firebasestorage.app",
  messagingSenderId: "905993574620",
  appId: "1:905993574620:web:987e4b6f320a8d6aa5bc19",
  measurementId: "G-Y6V8X8JH7F",
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

/* =======================
   Caching Mekanizması
   ======================= */

// 1. Install event: ASSETS dizisindeki dosyaları önbelleğe ekle
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Install event");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Precaching assets");
      const cachePromises = ASSETS.map((url) =>
        fetch(url)
          .then((response) => {
            if (!response.ok) {
              throw new Error(`Failed to fetch ${url}`);
            }
            return cache.put(url, response);
          })
          .catch((error) => {
            console.error(`Caching failed for ${url}:`, error);
          })
      );
      return Promise.allSettled(cachePromises);
    })
  );
  self.skipWaiting();
});

// 2. Activate event: Eski önbellekleri temizle
self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activate event");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("[Service Worker] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch event: Önce önbellekten yanıtla, yoksa ağa başvur; navigasyon istekleri offline.html ile yanıtlasın
self.addEventListener("fetch", (event) => {
  // Sadece GET isteklerini işleyin
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request)
        .then((networkResponse) => {
          return networkResponse;
        })
        .catch(() => {
          // Eğer istek navigasyon tipi ise offline.html döndür
          if (event.request.mode === "navigate") {
            return caches.match("/offline.html");
          }
        });
    })
  );
});

/* =======================
   Firebase Background Messaging
   ======================= */

// Background mesajları dinle
messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );
  const { title, body, icon } = payload.notification;
  self.registration.showNotification(title, {
    body,
    icon: icon || "/logo4.jpeg",
  });
});

self.addEventListener("push", (event) => {
  let pushData = {};
  try {
    pushData = event.data ? event.data.json() : {}; // JSON formatına çevir
  } catch (error) {
    console.error("🔥 Push mesajı JSON formatında değil:", event.data.text());
    pushData = { title: "Hata!", body: event.data.text() }; // Hata ayıklama için düz metin göster
  }

  const notificationTitle = pushData.title || "Bilinmeyen Bildirim";
  const notificationOptions = {
    body: pushData.body || "İçerik bulunamadı",
    icon: pushData.icon || "/logo.jpeg",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

//ctrl+ k + c
//ctrl+ k + u
