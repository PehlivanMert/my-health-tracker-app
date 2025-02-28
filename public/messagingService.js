// messagingService.js
import { messaging } from "./firebaseConfig";
import { getToken, onMessage } from "firebase/messaging";

// VAPID anahtarınızı .env dosyasından veya doğrudan buradan ekleyebilirsiniz.
const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export const requestFcmToken = async () => {
  try {
    const currentToken = await getToken(messaging, { vapidKey });
    if (currentToken) {
      console.log("FCM Token:", currentToken);
      // Bu token'ı sunucuya kaydedebilir veya Firestore'da kullanıcı belgesine ekleyebilirsiniz.
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

// Foreground mesajları dinleyelim:
export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
