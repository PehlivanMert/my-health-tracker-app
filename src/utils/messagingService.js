// src/utils/messagingService.js
import { messaging } from "../components/auth/firebaseConfig";
import { getToken, onMessage } from "firebase/messaging";

const vapidKey =
  "BAERVtP-aq1O8XA5905JfPlUgPhx05at0wRTKO3uyZ9cF7kf8bYX74T_zvWvovpOLOFqU3wvgt8vs7rtr6x8BvA";

export const requestFcmToken = async () => {
  try {
    // Önce servis çalışanının kaydolduğundan emin ol
    const registration = await navigator.serviceWorker.ready;

    const currentToken = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (currentToken) {
      localStorage.setItem("fcmToken", currentToken);
      return currentToken;
    } else {
      console.warn("Token alınamadı. İzin gerekiyor.");
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        return await requestFcmToken(); // Recursive retry
      }
      return null;
    }
  } catch (error) {
    console.error("Token alma hatası:", error);
    return null;
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
