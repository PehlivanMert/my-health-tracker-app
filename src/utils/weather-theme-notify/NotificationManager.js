// NotificationManager.js
import { format } from "date-fns";

export const requestNotificationPermission = () => {
  if ("Notification" in window) {
    Notification.requestPermission();
  }
};

export const triggerNotification = (title, time) => {
  if (Notification.permission === "granted") {
    try {
      // Ses bildirimi
      const audio = new Audio("/notification.mp3");
      audio.play().catch((error) => console.error("Ses çalınamadı:", error));

      // Görsel bildirim
      new Notification(`🔔 Hatırlatıcı: ${title}`, {
        body: `⏰ Başlangıç saati: ${time}`,
        icon: "/logo192.svg",
        vibrate: [200, 100, 200],
        requireInteraction: true,
      });

      // Geçici bildirim badge'i
      const notificationBadge = document.createElement("div");
      notificationBadge.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: var(--primary-accent);
        color: var(--body-color);
        padding: 12px 18px;
        border-radius: 8px;
        box-shadow: var(--box-shadow);
        animation: slideIn 0.3s ease-out;
      `;
      notificationBadge.textContent = "Yeni hatırlatıcı aktif!";
      document.body.appendChild(notificationBadge);

      setTimeout(() => {
        notificationBadge.remove();
      }, 3000);
    } catch (error) {
      console.error("Bildirim hatası:", error);
    }
  }
};

// Bildirim zamanlamaları
export const notificationIntervals = {
  "15-minutes": 15 * 60000,
  "1-hour": 60 * 60000,
  "1-day": 24 * 60 * 60000,
  "on-time": 0, // Vaktinde bildirim için 0 değeri
};

// **Bildirim Zamanlayıcı**
export const scheduleNotification = (title, startTime, notifyType) => {
  if (notifyType && notifyType !== "none") {
    const interval = notificationIntervals[notifyType]; // Kullanıcı tarafından seçilen aralık
    const notificationTime = new Date(startTime - interval);

    if (notifyType === "on-time") {
      setTimeout(() => {
        triggerNotification(title, format(startTime, "HH:mm"));
      }, startTime - Date.now());
    } else if (notificationTime > Date.now()) {
      const timeoutDuration = notificationTime - Date.now();
      setTimeout(() => {
        triggerNotification(title, format(startTime, "HH:mm"));
      }, timeoutDuration);
    }
  }
};
