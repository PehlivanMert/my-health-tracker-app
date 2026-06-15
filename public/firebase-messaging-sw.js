importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js"
);

import { precacheAndRoute } from 'workbox-precaching';

// Inject point for VitePWA
precacheAndRoute(self.__WB_MANIFEST || []);

// Eski statik dizi yerine workbox kullanacağız
const CACHE_VERSION = new Date().getTime();
const CACHE_NAME = `wellness-tracker-v${CACHE_VERSION}`;

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
   Firebase Background Messaging
   ======================= */

// Background mesajları dinle
messaging.onBackgroundMessage((payload) => {
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
  } catch (e) {
    // console.error("Push event verisi JSON formatında değil:", e);
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
  
  event.notification.close();
  
  const clickAction = event.notification.data?.clickAction || "/";
  const targetTab = event.notification.data?.targetTab || 0;
  const notificationType = event.notification.data?.notificationType;
  const routineId = event.notification.data?.routineId;
  const eventId = event.notification.data?.eventId;
  const supplementId = event.notification.data?.supplementId;
  
  // Platform algılama
  const platform = detectPlatform();
  
  // Tab indeksine göre sayfa adını belirle
  let pageName = "Ana Sayfa";
  if (targetTab === 1) pageName = "Yaşam Takibi";
  else if (targetTab === 0) pageName = "Günlük Rutin";
  else if (targetTab === 4) pageName = "Takvim";
  
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      
      // Mevcut açık pencereleri kontrol et
      for (const client of clients) {
        
        if (client.url.includes(self.location.origin)) {
          
          // Platform bazlı yönlendirme
          handlePlatformNavigation(client, targetTab, platform);
          return;
        }
      }
      
      // Eğer uygulama açık değilse, yeni pencere aç
      
      const baseUrl = self.location.origin;
      const urlWithTab = `${baseUrl}/?tab=${targetTab}&notification=true&timestamp=${Date.now()}`;
      
      return self.clients.openWindow(urlWithTab).then((newClient) => {
        if (newClient) {
          
          // Yeni pencere açıldıktan sonra platform bazlı yönlendirme
          setTimeout(() => {
            handlePlatformNavigation(newClient, targetTab, platform);
          }, 1000); // Pencere yüklenmesi için bekleme
        }
      }).catch((error) => {
        // console.error(`❌ [NOTIFICATION CLICK] Yeni pencere açma hatası:`, error);
        
        // Fallback: Basit URL açma
        try {
          window.open(urlWithTab, '_blank');
        } catch (fallbackError) {
          // console.error(`❌ [NOTIFICATION CLICK] Fallback açma hatası:`, fallbackError);
        }
      });
    }).catch((error) => {
      // console.error(`❌ [NOTIFICATION CLICK] Genel hata:`, error);
      
      // Son çare: Basit URL açma
      try {
        const baseUrl = self.location.origin;
        const urlWithTab = `${baseUrl}/?tab=${targetTab}&notification=true&timestamp=${Date.now()}`;
        window.open(urlWithTab, '_blank');
      } catch (fallbackError) {
        // console.error(`❌ [NOTIFICATION CLICK] Son çare açma hatası:`, fallbackError);
      }
    })
  );
});

// Ana uygulamadan gelen mesajları dinle
self.addEventListener('message', (event) => {
  
  if (event.data && event.data.type === 'TEST_CONNECTION') {
    // console.log('✅ [SW MESSAGE] Test bağlantısı başarılı');
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

// Platform algılama fonksiyonu
const detectPlatform = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isAndroid = /android/.test(userAgent);
  const isMobile = /mobile|android|iphone|ipad|ipod|blackberry|windows phone/.test(userAgent);
  
  // PWA kontrolü
  const isInStandaloneMode = () =>
    (window.matchMedia &&
      window.matchMedia("(display-mode: standalone)").matches) ||
    navigator.standalone === true;
  
  const pwaMode = isInStandaloneMode();
  
  if (isIOS && pwaMode) {
    return 'ios-pwa';
  } else if (isAndroid && pwaMode) {
    return 'android-pwa';
  } else if (isMobile) {
    return 'mobile-web';
  } else {
    return 'desktop-web';
  }
};

// Platform bazlı yönlendirme fonksiyonu
const handlePlatformNavigation = (client, targetTab, platform) => {
  
  const baseUrl = self.location.origin;
  const urlWithTab = `${baseUrl}/?tab=${targetTab}&notification=true&timestamp=${Date.now()}`;
  
  // Platform bazlı yönlendirme stratejileri
  switch (platform) {
    case 'ios-pwa':
      // iOS PWA için özel strateji
      
      // 1. Önce pencereyi odakla
      if ("focus" in client) {
        client.focus();
      }
      
      // 2. URL ile yönlendir
      client.navigate(urlWithTab).catch(error => {
        // console.log(`📱 [IOS PWA] Navigate hatası (normal):`, error);
      });
      
      // 3. Mesajlaşma ile tab değiştir (birden fazla deneme)
      const sendIOSMessage = () => {
        try {
          client.postMessage({
            type: 'SWITCH_TAB',
            targetTab: targetTab,
            timestamp: Date.now(),
            source: 'ios_pwa_notification',
            platform: platform
          });
          // console.log(`✅ [IOS PWA] Tab değişikliği mesajı gönderildi (Tab ${targetTab})`);
        } catch (error) {
          // console.error(`❌ [IOS PWA] Mesaj gönderme hatası:`, error);
        }
      };
      
      // Agresif mesajlaşma stratejisi
      sendIOSMessage();
      setTimeout(sendIOSMessage, 100);
      setTimeout(sendIOSMessage, 500);
      setTimeout(sendIOSMessage, 1000);
      setTimeout(sendIOSMessage, 2000);
      setTimeout(sendIOSMessage, 3000);
      break;
      
    case 'android-pwa':
      // Android PWA için strateji
      
      if ("focus" in client) {
        client.focus();
      }
      
      client.navigate(urlWithTab).catch(error => {
        // console.log(`🤖 [ANDROID PWA] Navigate hatası:`, error);
      });
      
      const sendAndroidMessage = () => {
        try {
          client.postMessage({
            type: 'SWITCH_TAB',
            targetTab: targetTab,
            timestamp: Date.now(),
            source: 'android_pwa_notification',
            platform: platform
          });
          // console.log(`✅ [ANDROID PWA] Tab değişikliği mesajı gönderildi (Tab ${targetTab})`);
        } catch (error) {
          // console.error(`❌ [ANDROID PWA] Mesaj gönderme hatası:`, error);
        }
      };
      
      sendAndroidMessage();
      setTimeout(sendAndroidMessage, 200);
      setTimeout(sendAndroidMessage, 1000);
      setTimeout(sendAndroidMessage, 2000);
      break;
      
    case 'mobile-web':
      // Mobil web için strateji
      
      if ("focus" in client) {
        client.focus();
      }
      
      const sendMobileMessage = () => {
        try {
          client.postMessage({
            type: 'SWITCH_TAB',
            targetTab: targetTab,
            timestamp: Date.now(),
            source: 'mobile_web_notification',
            platform: platform
          });
          // console.log(`✅ [MOBILE WEB] Tab değişikliği mesajı gönderildi (Tab ${targetTab})`);
        } catch (error) {
          // console.error(`❌ [MOBILE WEB] Mesaj gönderme hatası:`, error);
        }
      };
      
      sendMobileMessage();
      setTimeout(sendMobileMessage, 100);
      setTimeout(sendMobileMessage, 500);
      break;
      
    default:
      // Desktop web için strateji
      
      if ("focus" in client) {
        client.focus();
      }
      
      const sendDesktopMessage = () => {
        try {
          client.postMessage({
            type: 'SWITCH_TAB',
            targetTab: targetTab,
            timestamp: Date.now(),
            source: 'desktop_web_notification',
            platform: platform
          });
          // console.log(`✅ [DESKTOP WEB] Tab değişikliği mesajı gönderildi (Tab ${targetTab})`);
        } catch (error) {
          // console.error(`❌ [DESKTOP WEB] Mesaj gönderme hatası:`, error);
        }
      };
      
      sendDesktopMessage();
      break;
  }
};

//ctrl+ k + c
//ctrl+ k + u
