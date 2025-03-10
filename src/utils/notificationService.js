import { getToken } from "firebase/messaging";
import { messaging, db } from "../components/auth/firebaseConfig";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";

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
        // Yeni token'ı "fcmTokens" dizisine ekliyoruz.
        await updateDoc(userDocRef, { fcmTokens: arrayUnion(fcmToken) });
        console.log("✅ FCM Token başarıyla kaydedildi:", fcmToken);
      } else {
        console.warn("FCM token alınamadı, token boş.");
        // İsteğe bağlı: Hatalı tokenı diziden temizlemek için arrayRemove kullanılabilir.
      }
    } else {
      console.warn("Bildirim izni reddedildi.");
      // İzin reddedilirse, token temizleme işlemini gerçekleştirmek isteyebilirsiniz.
      // Örneğin: await updateDoc(userDocRef, { fcmTokens: [] });
    }
  } catch (error) {
    console.error("❌ FCM token alınamadı:", error);
    try {
      const userDocRef = doc(db, "users", user.uid);
      // Hata durumunda token dizisini temizleyebilirsiniz.
      // await updateDoc(userDocRef, { fcmTokens: [] });
    } catch (updateError) {
      console.error("Firestore token güncelleme hatası:", updateError);
    }
  }
};
