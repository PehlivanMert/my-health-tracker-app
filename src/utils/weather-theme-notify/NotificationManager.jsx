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

const triggerNotification = (title, time) => {
  if (Notification.permission === "granted") {
    self.registration.showNotification(`🔔 Hatırlatıcı: ${title}`, {
      body: `⏰ Başlangıç saati: ${format(new Date(time), "HH:mm")}`,
      icon: "/logo192.svg",
      vibrate: [200, 100, 200],
      requireInteraction: true,
      actions: [
        { action: "snooze", title: "10 Dakika Ertele" },
        { action: "dismiss", title: "Kapat" },
      ],
    });
  }
};

export const notificationIntervals = {
  "15-minutes": 15 * 60000,
  "1-hour": 60 * 60000,
  "1-day": 24 * 60 * 60000,
  "on-time": 0,
};

export const scheduleNotification = async (title, startTime, notifyType) => {
  if (!notifyType || notifyType === "none") return null;

  const interval = notificationIntervals[notifyType];
  const notificationTime = new Date(startTime - interval);
  const notificationId = `notif-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.ready;
    registration.active.postMessage({
      type: "SCHEDULE_NOTIFICATION",
      notification: {
        id: notificationId,
        title: title,
        time: notificationTime.getTime(),
        body: `⏰ Başlangıç saati: ${format(startTime, "HH:mm")}`,
      },
    });
  }

  return notificationId;
};

// Bildirim gösterme fonksiyonu
export const showToast = (message, type = "info") => {
  const toast = document.createElement("div");
  const colors = {
    success: "#4CAF50",
    error: "#FF5252",
    info: "#2196F3",
    warning: "#FFA726",
  };

  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${colors[type]};
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    gap: 8px;
    animation: slideIn 0.3s ease-out;
    z-index: 9999;
  `;

  toast.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      ${
        type === "success"
          ? `
        <path d="M20 6L9 17L4 12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      `
          : type === "error"
          ? `
        <path d="M18 6L6 18M6 6L18 18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      `
          : `
        <path d="M12 2V14M12 22V18" stroke="white" stroke-width="2" stroke-linecap="round"/>
      `
      }
    </svg>
    ${message}
  `;

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
};

// Bildirim iptal fonksiyonu
export const cancelScheduledNotifications = async (notificationId) => {
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.ready;
    registration.active.postMessage({
      type: "CANCEL_NOTIFICATION",
      id: notificationId,
    });
  }
};

// Tüm zamanlanmış bildirimleri temizle
export const clearAllNotifications = () => {
  Object.keys(scheduledTimeouts).forEach((timeoutId) => {
    clearTimeout(Number(timeoutId));
    delete scheduledTimeouts[timeoutId];
  });
};
