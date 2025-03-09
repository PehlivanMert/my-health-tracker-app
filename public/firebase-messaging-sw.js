// firebase-messaging-sw.js
import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";
import firebaseConfig from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

/* =======================
   Caching Mekanizması
   ======================= */

const CACHE_VERSION = new Date().getTime();
const CACHE_NAME = `wellness-tracker-v${CACHE_VERSION}`;
const ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/logo4.jpeg",
  "/offline.html",
];

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
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("[Service Worker] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        return self.clients
          .claim()
          .then(() => self.clients.matchAll({ type: "window" }))
          .then((clients) => {
            clients.forEach((client) => client.navigate(client.url));
          });
      })
  );
  self.skipWaiting();
});

// 3. Fetch event: Önce önbellekten yanıtla, yoksa ağa başvur; navigasyon istekleri offline.html ile yanıtlasın
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => response)
        .catch(() => caches.match("/offline.html"))
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return cachedResponse || fetch(event.request);
      })
    );
  }
});

/* =======================
   Firebase Background Messaging
   ======================= */

// Background mesajları dinle
onBackgroundMessage(messaging, (payload) => {
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

// Push event dinleyicisi (ekstra)
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
    console.log("Push event verisi:", data);
  } catch (e) {
    console.error("Push event verisi JSON formatında değil:", e);
    return;
  }
  // Eğer veri, iç içe bir data objesi içeriyorsa, bunu kullanın.
  if (data.data) {
    data = data.data;
  }
  const title = data.title || "Bilinmeyen Bildirim";
  const body = data.body || "İçerik bulunamadı";
  const icon = data.icon || "/logo4.jpeg";
  self.registration.showNotification(title, { body, icon });
});
