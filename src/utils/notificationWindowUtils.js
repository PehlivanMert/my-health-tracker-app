// src/utils/notificationWindowUtils.js
import { doc, setDoc } from "firebase/firestore";
import { db } from "../components/auth/firebaseConfig";
import { saveNextSupplementReminderTime } from "../components/notify/SupplementNotificationScheduler";

export const handleSaveNotificationWindow = async (
  user,
  supplements,
  window
) => {
  if (!user || !user.uid) {
    console.error("User bilgisi eksik!");
    return;
  }
  const userRef = doc(db, "users", user.uid);
  const waterRef = doc(db, "users", user.uid, "water", "current");
  try {
    // Global kullanıcı dokümanını güncelle
    await setDoc(userRef, { notificationWindow: window }, { merge: true });
    // Aynı ayarı water dokümanına da yansıt
    await setDoc(waterRef, { notificationWindow: window }, { merge: true });
    // Tüm supplementler için bildirim zamanlarını güncelle
    for (const supp of supplements) {
      await saveNextSupplementReminderTime(user, supp);
    }
    console.log("Bildirim ayarları başarıyla güncellendi:", window);
  } catch (error) {
    console.error("Bildirim ayarları güncelleme hatası:", error);
  }
};
