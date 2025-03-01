import { getToken } from "firebase/messaging";
import { messaging, db } from "../components/auth/firebaseConfig";
import { doc, updateDoc } from "firebase/firestore";

export const requestNotificationPermissionAndSaveToken = async (user) => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const fcmToken = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      });
      if (fcmToken) {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, { fcmToken });
        console.log("✅ FCM Token başarıyla kaydedildi:", fcmToken);
      }
    }
  } catch (error) {
    console.error("❌ FCM token alınamadı:", error);
  }
};
