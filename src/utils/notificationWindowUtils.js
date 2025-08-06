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
  
  try {
    // Sadece ana kullanıcı dokümanında sakla
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, { notificationWindow: window }, { merge: true });
    
    // Tüm supplementler için bildirim zamanlarını güncelle
    for (const supp of supplements) {
      await saveNextSupplementReminderTime(user, supp);
    }
    
    console.log("Bildirim ayarları başarıyla güncellendi:", window);
  } catch (error) {
    console.error("Bildirim ayarları güncelleme hatası:", error);
    throw error;
  }
};
