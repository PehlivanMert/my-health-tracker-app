// firebase-messaging-sw.js
importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js"
);

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

// Background mesajları dinle
messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );
  const { title, body, icon } = payload.notification;
  self.registration.showNotification(title, {
    body,
    icon: icon || "/logo192.svg",
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
    icon: pushData.icon || "/logo192.png",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
