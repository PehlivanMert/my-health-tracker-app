import { getToken } from "firebase/messaging";
import { messaging, db } from "../components/auth/firebaseConfig";
import { doc, updateDoc } from "firebase/firestore";

export const requestNotificationPermissionAndSaveToken = async (user) => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      console.log("Bildirim izni verildi.");
      const fcmToken = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      });

      if (fcmToken) {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, { fcmToken });
        console.log("✅ FCM Token başarıyla kaydedildi:", fcmToken);
      } else {
        console.warn("FCM token alınamadı, token boş.");
        // Hatalı token varsa Firestore'dan temizleyelim.
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, { fcmToken: null });
      }
    } else {
      console.warn("Bildirim izni reddedildi.");
      // İzin reddedilirse, varsa eski token'ı temizleyelim.
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, { fcmToken: null });
    }
  } catch (error) {
    console.error("❌ FCM token alınamadı:", error);
    // Hata durumunda eski token'ı temizlemeye çalışalım.
    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, { fcmToken: null });
    } catch (updateError) {
      console.error("Firestore token güncelleme hatası:", updateError);
    }
  }
};
