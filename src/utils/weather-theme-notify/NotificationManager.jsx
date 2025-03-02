import { format } from "date-fns";

/**
 * Bildirim izni isteme fonksiyonu.
 * Bu fonksiyon, FCM token alma süreci (notificationService.js içerisinde) öncesinde çağrılabilir.
 */
export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      console.log("Bildirim izni verildi.");
    } else {
      console.warn("Bildirim izni reddedildi.");
    }
  } catch (error) {
    console.error("Bildirim izni alınamadı:", error);
  }
};

/**
 * Kullanıcıya toast mesajı gösterme fonksiyonu.
 * Bu fonksiyon, bildirim aç/kapat gibi işlemlerin geri bildirimini sağlamak amacıyla kullanılabilir.
 */
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
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      ${
        type === "success"
          ? `<path d="M20 6L9 17L4 12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
          : type === "error"
          ? `<path d="M18 6L6 18M6 6L18 18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
          : `<path d="M12 2V14M12 22V18" stroke="white" stroke-width="2" stroke-linecap="round"/>`
      }
    </svg>
    ${message}
  `;

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
};

/*
 * NOT:
 * Eski lokal bildirim zamanlama fonksiyonları (scheduleNotification, cancelScheduledNotifications,
 * clearAllNotifications, triggerNotification) tamamen kaldırıldı.
 * Artık push bildirim gönderimi Netlify Scheduled Functions ve Firebase Messaging üzerinden yapılacak.
 */
