import { format } from "date-fns";

// Zamanlanmış bildirimleri takip etmek için nesne
const scheduledTimeouts = {};

export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
    }
  } catch (error) {
    console.error("Bildirim izni alınamadı:", error);
  }
};

export const triggerNotification = (title, time) => {
  if (Notification.permission === "granted") {
    try {
      const audio = new Audio("/notification.mp3");
      audio.play().catch((error) => console.error("Ses çalınamadı:", error));

      new Notification(`🔔 Hatırlatıcı: ${title}`, {
        body: `⏰ Başlangıç saati: ${time}`,
        icon: "/logo192.svg",
        vibrate: [200, 100, 200],
        requireInteraction: true,
      });

      // Bildirim badge'i
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

      setTimeout(() => notificationBadge.remove(), 3000);
    } catch (error) {
      console.error("Bildirim hatası:", error);
    }
  }
};

export const notificationIntervals = {
  "15-minutes": 15 * 60000,
  "1-hour": 60 * 60000,
  "1-day": 24 * 60 * 60000,
  "on-time": 0,
};

export const scheduleNotification = (title, startTime, notifyType) => {
  if (!notifyType || notifyType === "none") return null;

  const interval = notificationIntervals[notifyType];
  const notificationTime = new Date(startTime - interval);
  let timeoutId = null;

  if (notifyType === "on-time") {
    timeoutId = setTimeout(() => {
      triggerNotification(title, format(startTime, "HH:mm"));
    }, startTime - Date.now());
  } else if (notificationTime > Date.now()) {
    const timeoutDuration = notificationTime - Date.now();
    timeoutId = setTimeout(() => {
      triggerNotification(title, format(startTime, "HH:mm"));
    }, timeoutDuration);
  }

  if (timeoutId) {
    scheduledTimeouts[timeoutId] = true;
    return timeoutId;
  }
  return null;
};

// Bildirim iptal fonksiyonu
export const cancelScheduledNotifications = (timeoutId) => {
  if (timeoutId && scheduledTimeouts[timeoutId]) {
    clearTimeout(timeoutId);
    delete scheduledTimeouts[timeoutId];
  }
};

// Tüm zamanlanmış bildirimleri temizle
export const clearAllNotifications = () => {
  Object.keys(scheduledTimeouts).forEach((timeoutId) => {
    clearTimeout(Number(timeoutId));
    delete scheduledTimeouts[timeoutId];
  });
};
