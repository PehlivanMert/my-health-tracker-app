// firebase-messaging-sw.js
// Bu dosya public klasörünün kök dizininde yer almalı

importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js"
);

// Firebase konfigürasyonu (değerleri doğrudan yazın)
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
    icon: "/public/logo4.jpeg",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Bildirim tıklama olayını yönet
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url === "/" && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow("/");
      }
    })
  );
});
