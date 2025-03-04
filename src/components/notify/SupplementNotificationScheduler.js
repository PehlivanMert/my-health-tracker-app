// SupplementNotificationScheduler.js
import { doc, setDoc } from "firebase/firestore";
import { db } from "../auth/firebaseConfig";

// Türkiye saatini döndürür
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

  // Eğer kullanıcı manuel bildirim saati girmişse
  if (
    suppData.notificationSchedule &&
    suppData.notificationSchedule.length > 0
  ) {
    suppData.notificationSchedule.forEach((timeStr) => {
      const scheduled = new Date(`${todayStr}T${timeStr}:00`);
      times.push(scheduled);
    });
  }
  // Otomatik hesaplama: Günlük kullanım tanımlıysa
  else if (suppData.dailyUsage > 0) {
    const estimatedRemainingDays = suppData.quantity / suppData.dailyUsage;
    if (estimatedRemainingDays <= 1) {
      // Kritik durumda hemen hatırlatma (1 dakika sonrası)
      times.push(new Date(now.getTime() + 1 * 60000));
    } else {
      if (user.notificationWindow && user.notificationWindow.end) {
        const windowEnd = new Date(
          `${todayStr}T${user.notificationWindow.end}:00`
        );
        times.push(windowEnd);
      } else {
        times.push(new Date(now.getTime() + 60 * 60000));
      }
    }
  }
  times.sort((a, b) => a - b);
  return times;
};

// Şu an için geçerli (gelecek) takviye bildirim zamanını döndürür
export const getNextSupplementReminderTime = (suppData, user) => {
  const reminderTimes = computeSupplementReminderTimes(suppData, user);
  const now = getTurkeyTime();
  for (const time of reminderTimes) {
    if (time > now) return time;
  }
  return null;
};

// Hesaplanan sonraki takviye bildirim zamanını ilgili supplement belgesine kaydeder
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
