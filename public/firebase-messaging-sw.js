importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js"
);

const CACHE_VERSION = new Date().getTime();
const CACHE_NAME = `wellness-tracker-v${CACHE_VERSION}`;
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
          .then(() => {
            return self.clients.matchAll({ type: "window" });
          })
          .then((clients) => {
            clients.forEach((client) => client.navigate(client.url));
          });
      })
  );
});

// Eski SW'nin beklemeden yenisiyle değişmesini sağlar
self.skipWaiting();

// 3. Fetch event: Önce önbellekten yanıtla, yoksa ağa başvur; navigasyon istekleri offline.html ile yanıtlasın
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // İsteğin başarılı olması durumunda, cache'i de güncelleyebilirsiniz.
          return response;
        })
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
  
  // Bildirim türüne göre yönlendirme URL'si belirle
  let clickAction = "/";
  if (data.type === "water" || data.type === "water-reset") {
    clickAction = "/wellness-tracker"; // Yaşam Takibi sayfası
  } else if (data.type === "pomodoro") {
    clickAction = "/daily-routine"; // Rutin sayfası
  } else if (data.routineId) {
    clickAction = "/daily-routine"; // Rutin sayfası
  } else if (data.eventId) {
    clickAction = "/calendar"; // Takvim sayfası
  } else if (data.supplementId) {
    clickAction = "/wellness-tracker"; // Yaşam Takibi sayfası
  }
  
  self.registration.showNotification(title, { 
    body, 
    icon,
    data: {
      clickAction: clickAction,
      notificationType: data.type,
      routineId: data.routineId,
      eventId: data.eventId,
      supplementId: data.supplementId
    }
  });
});

// Bildirime tıklama olayını dinle
self.addEventListener("notificationclick", (event) => {
  console.log("Bildirime tıklandı:", event.notification.data);
  
  event.notification.close();
  
  const clickAction = event.notification.data?.clickAction || "/";
  const notificationType = event.notification.data?.notificationType;
  const routineId = event.notification.data?.routineId;
  const eventId = event.notification.data?.eventId;
  const supplementId = event.notification.data?.supplementId;
  
  // Bildirim türüne göre sayfa adını belirle
  let pageName = "Ana Sayfa";
  if (clickAction === "/wellness-tracker") pageName = "Yaşam Takibi";
  else if (clickAction === "/daily-routine") pageName = "Günlük Rutin";
  else if (clickAction === "/calendar") pageName = "Takvim";
  
  console.log(`🎯 [NOTIFICATION CLICK] Bildirim türü: ${notificationType}, Yönlendirilecek sayfa: ${pageName} (${clickAction})`);
  
  // Mevcut açık pencereleri kontrol et
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      // Eğer uygulama zaten açıksa, o pencereyi odakla
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          console.log(`📱 [NOTIFICATION CLICK] Mevcut pencereye yönlendiriliyor: ${pageName}`);
          client.navigate(clickAction);
          return client.focus();
        }
      }
      
      // Eğer uygulama açık değilse, yeni pencere aç
      if (self.clients.openWindow) {
        console.log(`🆕 [NOTIFICATION CLICK] Yeni pencere açılıyor: ${pageName}`);
        return self.clients.openWindow(clickAction);
      }
    })
  );
});

//ctrl+ k + c
//ctrl+ k + u
