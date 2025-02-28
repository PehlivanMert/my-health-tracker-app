// sw.js

importScripts(
  "https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js"
);

const CACHE_NAME = "wellness-tracker-v4";
const NOTIFICATION_DB = "scheduled-notifications";
const ASSETS = [
  "/",
  "/index.html",
  "/public/manifest.json",
  "/public/logo4.jpeg",
  "/offline.html",
  "/src/App.jsx",
  "/src/app.css",
  "/src/main.jsx",
];

// Firebase konfigürasyon bilgilerini sabitlerle tanımlıyoruz.
firebase.initializeApp({
  apiKey: __FIREBASE_API_KEY__,
  authDomain: __FIREBASE_AUTH_DOMAIN__,
  projectId: __FIREBASE_PROJECT_ID__,
  storageBucket: __FIREBASE_STORAGE_BUCKET__,
  messagingSenderId: __FIREBASE_MESSAGING_SENDER_ID__,
  appId: __FIREBASE_APP_ID__,
  measurementId: __FIREBASE_MEASUREMENT_ID__,
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  console.log("Arka plan mesajı alındı:", payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || "/logo192.png",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
