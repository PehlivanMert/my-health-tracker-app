// NotificationManager.jsx
import { format } from "date-fns";
import { toast } from "react-toastify";

// Bildirim izni alma (değişmeden kalabilir)
export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Bildirim izni alınamadı.");
    }
  } catch (error) {
    console.error("Bildirim izni alınamadı:", error);
  }
};

// Artık yerel scheduleNotification fonksiyonunu kaldırıyoruz.
// Bunun yerine, backend’e bildirim planlama isteği gönderen fonksiyon:

export const schedulePushNotification = async (title, scheduledTime) => {
  // scheduledTime: JavaScript Date nesnesi veya ISO string formatında olmalı.
  const token = localStorage.getItem("fcmToken");
  if (!token) {
    console.error("FCM token bulunamadı. Lütfen token alın.");
    return null;
  }
  try {
    const response = await fetch(
      "http://localhost:3001/api/scheduleNotification",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          title,
          body: `⏰ ${title} için bildirim zamanı.`,
          scheduledTime, // ISO string veya Date nesnesi
        }),
      }
    );
    const data = await response.json();
    console.log("Planlanan bildirim:", data);
    return data.notificationId;
  } catch (error) {
    console.error("Bildirim planlanırken hata:", error);
    return null;
  }
};

// Sunucuda planlanan bildirimi iptal etmek için:
export const cancelPushNotification = async (notificationId) => {
  try {
    const response = await fetch(
      "http://localhost:3001/api/cancelNotification",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notificationId }),
      }
    );
    const data = await response.json();
    console.log("İptal edilen bildirim:", data);
    return data;
  } catch (error) {
    console.error("Bildirim iptali sırasında hata:", error);
  }
};

export const showToast = (message, type = "info") => {
  switch (type) {
    case "success":
      toast.success(message);
      break;
    case "error":
      toast.error(message);
      break;
    case "warning":
      toast.warning(message);
      break;
    default:
      toast.info(message);
  }
};
