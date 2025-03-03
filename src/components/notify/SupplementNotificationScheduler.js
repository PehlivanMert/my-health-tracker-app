// SupplementNotificationScheduler.js
import { doc, setDoc } from "firebase/firestore";
import { db } from "../auth/firebaseConfig";

// Türkiye zamanını döndürür
export const getTurkeyTime = () => {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
  );
};

// Belirlenmiş takviye bildirim zamanlarını hesaplar
export const computeSupplementReminderTimes = (suppData, user) => {
  const times = [];
  const now = getTurkeyTime();
  const todayStr = now.toLocaleDateString("en-CA");

  // Eğer kullanıcı takvime göre bildirim belirlemişse (örn: ["08:00", "14:00"])
  if (
    suppData.notificationSchedule &&
    suppData.notificationSchedule.length > 0
  ) {
    suppData.notificationSchedule.forEach((timeStr) => {
      const scheduled = new Date(`${todayStr}T${timeStr}:00`);
      times.push(scheduled);
    });
  }
  // Otomatik hesaplama: Eğer günlük kullanım tanımlıysa
  else if (suppData.dailyUsage > 0) {
    const estimatedRemainingDays = suppData.quantity / suppData.dailyUsage;
    if (estimatedRemainingDays <= 1) {
      // Kritik durumda ise hemen (örneğin 1 dakika sonraya) hatırlatma ayarla
      times.push(new Date(now.getTime() + 1 * 60000));
    } else {
      // Bildirim penceresi tanımlıysa, pencere bitiminde hatırlatma ayarla
      if (user.notificationWindow && user.notificationWindow.end) {
        const windowEnd = new Date(
          `${todayStr}T${user.notificationWindow.end}:00`
        );
        times.push(windowEnd);
      } else {
        // Yoksa varsayılan olarak 1 saat sonra
        times.push(new Date(now.getTime() + 60 * 60000));
      }
    }
  }
  // Eğer hiçbir bildirim zamanı belirlenemiyorsa boş array döner

  // Zamanları artan sırada sıralayın
  times.sort((a, b) => a - b);
  return times;
};

// Belirlenen zamanlardan, şu an için geçerli olan (gelecek) zamanı döndürür
export const getNextSupplementReminderTime = (suppData, user) => {
  const reminderTimes = computeSupplementReminderTimes(suppData, user);
  const now = getTurkeyTime();
  for (const time of reminderTimes) {
    if (time > now) return time;
  }
  return null;
};

// Hesaplanan sonraki hatırlatma zamanını, ilgili supplement dokümanına kaydeder
export const saveNextSupplementReminderTime = async (user, suppData) => {
  const nextReminder = getNextSupplementReminderTime(suppData, user);
  if (!nextReminder) return null;
  const suppDocRef = doc(db, "users", user.uid, "supplements", suppData.id);
  await setDoc(
    suppDocRef,
    { nextSupplementReminderTime: nextReminder.toISOString() },
    { merge: true }
  );
  return nextReminder;
};
