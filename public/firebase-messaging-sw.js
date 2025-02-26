// firebase-messaging-sw.js
// Bu dosya public klasörüne kök dizinde kaydedilmeli

importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js"
);

// Firebase konfigürasyonu - bu değerleri ortam değişkenlerinden alınamayacağı için doğrudan yazmalısınız
firebase.initializeApp({
  apiKey: "AIzaSyD64A3LlceBtvBH2Uphg5yTUP9MgK1EeBc",
  authDomain: "my-health-tracker-application.firebaseapp.com",
  projectId: "my-health-tracker-application",
  storageBucket: "my-health-tracker-application.firebasestorage.app",
  messagingSenderId: "905993574620",
  appId: "1:905993574620:web:987e4b6f320a8d6aa5bc19",
  measurementId: "G-Y6V8X8JH7F",
});

const messaging = firebase.messaging();

// Arka plan bildirimlerini işle
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Arka plan mesajı alındı:", payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/logo4.jpeg",
  };

  // Bildirim göster
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Bildirim tıklama olayını yönet
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // Tıklanınca uygulamayı aç
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((windowClients) => {
      // Açık bir pencere varsa kullan
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === "/" && "focus" in client) {
          return client.focus();
        }
      }

      // Açık pencere yoksa yeni pencere aç
      if (clients.openWindow) {
        return clients.openWindow("/");
      }
    })
  );
});

// Standart service worker fonksiyonları
// Önbelleğe alma ve çevrimdışı çalışma
const CACHE_NAME = "wellness-tracker-v4";
const ASSETS = ["/", "/index.html"];

// Install event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Fetch event
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return (
        response ||
        fetch(event.request).catch(() => {
          return caches.match("/offline.html");
        })
      );
    })
  );
});

// Activate event
self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
