// const CACHE_NAME = "wellness-tracker-v1";
// const ASSETS = [
//   "/",
//   "/index.html",
//   "/static/js/main.*.jsx",
//   "/static/css/main.*.css",
//   "/logo192.png",
//   "/logo512.png",
// ];

// self.addEventListener("install", (event) => {
//   event.waitUntil(
//     caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
//   );
// });

// self.addEventListener("fetch", (event) => {
//   event.respondWith(
//     caches
//       .match(event.request)
//       .then((response) => response || fetch(event.request))
//   );
// });

// // Çıkış (logout) mesajını dinle ve cache'i temizle
// self.addEventListener("message", (event) => {
//   if (event.data && event.data.type === "LOGOUT") {
//     caches.delete(CACHE_NAME).then((success) => {
//       console.log("Cache temizlendi:", success);
//     });
//   }
// });
