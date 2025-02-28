import { toast } from "react-toastify";

const apiUrl = import.meta.env.PROD
  ? "/.netlify/functions/scheduleNotification"
  : "http://localhost:8888/.netlify/functions/scheduleNotification";

// NotificationManager.jsx
export const schedulePushNotification = async (
  title,
  scheduledTime,
  userId
) => {
  const token = localStorage.getItem("fcmToken");
  if (!token || !userId) {
    console.error("Eksik parametreler:", { token, userId });
    return null;
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        title,
        scheduledTime: new Date(scheduledTime).toISOString(),
        userId, // Bu parametreyi eklediğinizden emin olun
      }),
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    return await response.json();
  } catch (error) {
    console.error("Bildirim planlama hatası:", error);
    throw error;
  }
};

export const cancelPushNotification = async (notificationId) => {
  try {
    const response = await fetch("/.netlify/functions/cancelNotification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ notificationId }),
    });

    return await response.json();
  } catch (error) {
    console.error("İptal hatası:", error);
    return { success: false };
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
