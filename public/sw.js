// import ifadesini kaldırın ve vanilya IndexedDB kullanın
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

// sw.js
self.addEventListener("install", (event) => {
  console.log("Service Worker yüklendi");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker etkin");
  return self.clients.claim();
});

// Sunucudan gelen push mesajını dinle ve bildirimi göster
self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: "Bildirim", body: event.data.text() };
    }
  }
  const title = data.title || "Bildirim";
  const options = {
    body: data.body || "Yeni bir bildirim var.",
    icon: data.icon || "/logo192.svg",
    data: data.url || "/",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Bildirime tıklanınca yapılacak işlemler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === event.notification.data && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data);
        }
      })
  );
});
