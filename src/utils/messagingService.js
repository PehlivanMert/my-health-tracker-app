// src/utils/messagingService.js
import { messaging } from "../components/auth/firebaseConfig";
import { getToken, onMessage } from "firebase/messaging";

const vapidKey =
  "BAERVtP-aq1O8XA5905JfPlUgPhx05at0wRTKO3uyZ9cF7kf8bYX74T_zvWvovpOLOFqU3wvgt8vs7rtr6x8BvA";

export const requestFcmToken = async () => {
  try {
    const currentToken = await getToken(messaging, { vapidKey });
    if (currentToken) {
      console.log("FCM Token:", currentToken);
      localStorage.setItem("fcmToken", currentToken);
      return currentToken;
    } else {
      console.warn(
        "No registration token available. Request permission to generate one."
      );
      return null;
    }
  } catch (error) {
    console.error("An error occurred while retrieving token. ", error);
    return null;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });

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
