// import ifadesini kaldırın ve vanilya IndexedDB kullanın
const CACHE_NAME = "wellness-tracker-v4";
const NOTIFICATION_DB = "scheduled-notifications";
const ASSETS = ["/", "/index.html"];

// Install event
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      // IndexedDB veritabanını açın
      const request = indexedDB.open(NOTIFICATION_DB, 1);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("notifications")) {
          db.createObjectStore("notifications", { keyPath: "id" });
        }
      };

      // Varlıkları önbelleğe alma işlemleri burada
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(ASSETS);
    })()
  );
});

// Veritabanı açmak için yardımcı fonksiyon
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(NOTIFICATION_DB, 1);

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

// Zamanlanmış bildirimleri yönet
async function scheduleNotificationInSW(notification) {
  const db = await openDB();
  const transaction = db.transaction("notifications", "readwrite");
  const store = transaction.objectStore("notifications");

  store.put(notification);

  const now = Date.now();
  const timeout = notification.time - now;

  if (timeout > 0) {
    const timeoutId = setTimeout(() => {
      triggerNotification(notification.title, notification.time);

      // Bildirimi veritabanından sil
      const deleteTransaction = db.transaction("notifications", "readwrite");
      const deleteStore = deleteTransaction.objectStore("notifications");
      deleteStore.delete(notification.id);
    }, timeout);

    // Timeout ID'yi sakla
    notification.timeoutId = timeoutId;
    store.put(notification);
  }
}

// Uygulama açıldığında eski bildirimleri kontrol et
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const db = await openDB();
      const transaction = db.transaction("notifications", "readonly");
      const store = transaction.objectStore("notifications");
      const notifications = await store.getAll();

      notifications.forEach(async (notification) => {
        const timeout = notification.time - Date.now();

        if (timeout > 0) {
          const timeoutId = setTimeout(() => {
            triggerNotification(notification.title, notification.time);

            // Bildirimi veritabanından sil
            const deleteTransaction = db.transaction(
              "notifications",
              "readwrite"
            );
            const deleteStore = deleteTransaction.objectStore("notifications");
            deleteStore.delete(notification.id);
          }, timeout);

          // Timeout ID'yi güncelle
          notification.timeoutId = timeoutId;
          const updateTransaction = db.transaction(
            "notifications",
            "readwrite"
          );
          const updateStore = updateTransaction.objectStore("notifications");
          updateStore.put(notification);
        } else {
          // Zamanı geçmiş bildirimleri sil
          const deleteTransaction = db.transaction(
            "notifications",
            "readwrite"
          );
          const deleteStore = deleteTransaction.objectStore("notifications");
          deleteStore.delete(notification.id);
        }
      });
    })()
  );
});

// Mesaj alıcısı
self.addEventListener("message", (event) => {
  if (event.data.type === "SCHEDULE_NOTIFICATION") {
    scheduleNotificationInSW(event.data.notification);
  }

  if (event.data.type === "CANCEL_NOTIFICATION") {
    openDB().then((db) => {
      const transaction = db.transaction("notifications", "readonly");
      const store = transaction.objectStore("notifications");

      store.get(event.data.id).then((notification) => {
        if (notification?.timeoutId) {
          clearTimeout(notification.timeoutId);
        }

        const deleteTransaction = db.transaction("notifications", "readwrite");
        const deleteStore = deleteTransaction.objectStore("notifications");
        deleteStore.delete(event.data.id);
      });
    });
  }
});

// Eksik triggerNotification fonksiyonu
function triggerNotification(title, time) {
  self.registration.showNotification(title, {
    body: `Hatırlatma zamanı: ${new Date(time).toLocaleTimeString()}`,
    icon: "/public/logo4.jpeg",
  });
}
