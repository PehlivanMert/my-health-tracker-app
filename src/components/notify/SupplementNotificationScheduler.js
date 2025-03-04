// SupplementNotificationScheduler.js
import { doc, setDoc } from "firebase/firestore";
import { db } from "../auth/firebaseConfig";

// Türkiye saatini döndürür
export const getTurkeyTime = () => {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
  );
};

// Takviye bildirim zamanlarını hesaplar
export const computeSupplementReminderTimes = (suppData, user) => {
  const times = [];
  const now = getTurkeyTime();
  const todayStr = now.toLocaleDateString("en-CA");

  // Manuel bildirim zamanı varsa
  if (
    suppData.notificationSchedule &&
    suppData.notificationSchedule.length > 0
  ) {
    suppData.notificationSchedule.forEach((timeStr) => {
      const scheduled = new Date(`${todayStr}T${timeStr}:00`);
      times.push(scheduled);
    });
    console.log(
      "computeSupplementReminderTimes - Manuel bildirim zamanları:",
      times
    );
  }
  // Otomatik hesaplama: Günlük kullanım tanımlıysa
  else if (suppData.dailyUsage > 0) {
    const estimatedRemainingDays = suppData.quantity / suppData.dailyUsage;
    if (estimatedRemainingDays <= 1) {
      times.push(new Date(now.getTime() + 1 * 60000));
      console.log(
        "computeSupplementReminderTimes - Kritik durum, 1 dakika sonrası:",
        times
      );
    } else {
      if (user.notificationWindow && user.notificationWindow.end) {
        const windowEnd = new Date(
          `${todayStr}T${user.notificationWindow.end}:00`
        );
        times.push(windowEnd);
        console.log(
          "computeSupplementReminderTimes - Bildirim penceresi kullanıldı:",
          times
        );
      } else {
        times.push(new Date(now.getTime() + 60 * 60000));
        console.log(
          "computeSupplementReminderTimes - Varsayılan 1 saat sonrası:",
          times
        );
      }
    }
  }
  times.sort((a, b) => a - b);
  console.log(
    "computeSupplementReminderTimes - Sıralanmış bildirim zamanları:",
    times
  );
  return times;
};

// Gelecek takviye bildirim zamanını döndürür
export const getNextSupplementReminderTime = (suppData, user) => {
  const reminderTimes = computeSupplementReminderTimes(suppData, user);
  const now = getTurkeyTime();
  for (const time of reminderTimes) {
    if (time > now) {
      console.log(
        "getNextSupplementReminderTime - Bulunan sonraki zaman:",
        time
      );
      return time;
    }
  }
  console.warn(
    "getNextSupplementReminderTime - Gelecek bildirim zamanı bulunamadı"
  );
  return null;
};

// Hesaplanan sonraki takviye bildirim zamanını ilgili supplement dokümanına kaydeder
export const saveNextSupplementReminderTime = async (user, suppData) => {
  const nextReminder = getNextSupplementReminderTime(suppData, user);
  if (!nextReminder) {
    console.warn(
      "saveNextSupplementReminderTime - Sonraki bildirim zamanı hesaplanamadı"
    );
    return null;
  }
  const suppDocRef = doc(db, "users", user.uid, "supplements", suppData.id);
  await setDoc(
    suppDocRef,
    { nextSupplementReminderTime: nextReminder.toISOString() },
    { merge: true }
  );
  console.log(
    "saveNextSupplementReminderTime - Kaydedilen sonraki takviye bildirimi zamanı:",
    nextReminder.toISOString()
  );
  return nextReminder;
};
