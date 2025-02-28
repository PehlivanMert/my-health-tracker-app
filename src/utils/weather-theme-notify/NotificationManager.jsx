const apiUrl = import.meta.env.PROD
  ? "/.netlify/functions/scheduleNotification"
  : "http://localhost:8888/.netlify/functions/scheduleNotification";

export const schedulePushNotification = async (title, scheduledTime) => {
  const token = localStorage.getItem("fcmToken");
  if (!token) {
    console.error("FCM token bulunamadı");
    return null;
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        title,
        scheduledTime: new Date(scheduledTime).toISOString(),
      }),
    });

    if (!response.ok) throw new Error("Bildirim planlanamadı");

    const data = await response.json();
    return data.notificationId;
  } catch (error) {
    console.error("Bildirim hatası:", error);
    return null;
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
