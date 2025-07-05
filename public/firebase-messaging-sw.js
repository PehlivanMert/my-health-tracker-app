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
  
  // Bildirim türüne göre tab indeksi belirle
  let targetTab = 0; // Varsayılan: Ana sayfa
  if (data.type === "water" || data.type === "water-reset") {
    targetTab = 1; // Yaşam Takibi tab'ı
  } else if (data.type === "pomodoro") {
    targetTab = 0; // Rutin tab'ı
  } else if (data.routineId) {
    targetTab = 0; // Rutin tab'ı
  } else if (data.eventId) {
    targetTab = 4; // Takvim tab'ı
  } else if (data.supplementId) {
    targetTab = 1; // Yaşam Takibi tab'ı
  }
  
  // Tab bilgisini data'ya ekle
  const clickAction = "/"; // Ana sayfa URL'i
  
  self.registration.showNotification(title, { 
    body, 
    icon,
    data: {
      clickAction: clickAction,
      targetTab: targetTab,
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
  const targetTab = event.notification.data?.targetTab || 0;
  const notificationType = event.notification.data?.notificationType;
  const routineId = event.notification.data?.routineId;
  const eventId = event.notification.data?.eventId;
  const supplementId = event.notification.data?.supplementId;
  
  // Tab indeksine göre sayfa adını belirle
  let pageName = "Ana Sayfa";
  if (targetTab === 1) pageName = "Yaşam Takibi";
  else if (targetTab === 0) pageName = "Günlük Rutin";
  else if (targetTab === 4) pageName = "Takvim";
  
  console.log(`🎯 [NOTIFICATION CLICK] Bildirim türü: ${notificationType}, Yönlendirilecek tab: ${pageName} (Tab ${targetTab})`);
  
  // Mevcut açık pencereleri kontrol et
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      // Eğer uygulama zaten açıksa, o pencereyi odakla ve tab değiştir
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          console.log(`📱 [NOTIFICATION CLICK] Mevcut pencereye yönlendiriliyor: ${pageName} (Tab ${targetTab})`);
          
          // Önce pencereyi odakla
          client.focus();
          
          // Tab değişikliği mesajı gönder (kısa bir gecikme ile)
          setTimeout(() => {
            try {
              // Mesajı birden fazla kez göndermeyi dene
              const sendMessage = () => {
                client.postMessage({
                  type: 'SWITCH_TAB',
                  targetTab: targetTab,
                  timestamp: Date.now()
                });
                console.log(`✅ [NOTIFICATION CLICK] Tab değişikliği mesajı gönderildi (Tab ${targetTab})`);
              };
              
              // İlk mesajı hemen gönder
              sendMessage();
              
              // 500ms sonra tekrar dene
              setTimeout(sendMessage, 500);
              
              // 1 saniye sonra tekrar dene
              setTimeout(sendMessage, 1000);
              
              // 2 saniye sonra tekrar dene
              setTimeout(sendMessage, 2000);
              
              // 3 saniye sonra tekrar dene
              setTimeout(sendMessage, 3000);
              
            } catch (error) {
              console.error(`❌ [NOTIFICATION CLICK] Mesaj gönderme hatası:`, error);
            }
          }, 100);
          
          return;
        }
      }
      
      // Eğer uygulama açık değilse, yeni pencere aç
      if (self.clients.openWindow) {
        console.log(`🆕 [NOTIFICATION CLICK] Yeni pencere açılıyor: ${pageName} (Tab ${targetTab})`);
        return self.clients.openWindow(clickAction).then((newClient) => {
          // Yeni pencere açıldıktan sonra tab değişikliği mesajı gönder
          if (newClient) {
            setTimeout(() => {
              try {
                // Mesajı birden fazla kez göndermeyi dene
                const sendMessage = () => {
                  newClient.postMessage({
                    type: 'SWITCH_TAB',
                    targetTab: targetTab,
                    timestamp: Date.now()
                  });
                  console.log(`✅ [NOTIFICATION CLICK] Yeni pencereye tab değişikliği mesajı gönderildi (Tab ${targetTab})`);
                };
                
                // İlk mesajı gönder
                sendMessage();
                
                // 1 saniye sonra tekrar dene
                setTimeout(sendMessage, 1000);
                
                // 2 saniye sonra tekrar dene
                setTimeout(sendMessage, 2000);
                
              } catch (error) {
                console.error(`❌ [NOTIFICATION CLICK] Yeni pencereye mesaj gönderme hatası:`, error);
              }
            }, 3000); // Pencere yüklenmesi için daha uzun bekleme
          }
        }).catch((error) => {
          console.error(`❌ [NOTIFICATION CLICK] Yeni pencere açma hatası:`, error);
        });
      }
    }).catch((error) => {
      console.error(`❌ [NOTIFICATION CLICK] Genel hata:`, error);
    })
  );
});

// Ana uygulamadan gelen mesajları dinle
self.addEventListener('message', (event) => {
  console.log('📨 [SW MESSAGE] Ana uygulamadan mesaj alındı:', event.data);
  
  if (event.data && event.data.type === 'TEST_CONNECTION') {
    console.log('✅ [SW MESSAGE] Test bağlantısı başarılı');
    // Test mesajına yanıt gönder
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({
        type: 'TEST_RESPONSE',
        timestamp: Date.now(),
        status: 'connected'
      });
    } else {
      // Port yoksa, tüm client'lara mesaj gönder
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'TEST_RESPONSE',
            timestamp: Date.now(),
            status: 'connected'
          });
        });
      });
    }
  }
});

//ctrl+ k + c
//ctrl+ k + u
