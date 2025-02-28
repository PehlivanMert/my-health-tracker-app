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
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: localStorage.getItem("fcmToken"),
        title,
        scheduledTime: new Date(scheduledTime).toISOString(), // Tarihi ISO formatına çevir
        userId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Bildirim planlanamadı");
    }

    return await response.json();
  } catch (error) {
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
