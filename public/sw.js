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
  apiKey: "AIzaSyD0y2-1t3l3v8jxjv6m4UoVlN8JXr7xJjM",
  authDomain: "wellness-tracker-3b9e0.firebaseapp.com",
  projectId: "wellness-tracker-3b9e0",
  storageBucket: "wellness-tracker-3b9e0.appspot.com",
  messagingSenderId: "1080066742840",
  appId: "1:1080066742840:web:7b6f0e5f0b5b0b0b8c2d7a",
  measurementId: "G-3L3V3Z0Z8Y",
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
