// SupplementNotificationScheduler.js
import { doc, setDoc } from "firebase/firestore";
import { db } from "../auth/firebaseConfig";

// Türkiye saatini döndürür
export const getTurkeyTime = () => {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
  );
  console.log("getTurkeyTime - Şu anki Türkiye zamanı:", now);
  return now;
};

// Takviye bildirim zamanlarını hesaplar
export const computeSupplementReminderTimes = (suppData, user) => {
  const times = [];
  const now = getTurkeyTime();
  const todayStr = now.toLocaleDateString("en-CA");
  console.log(
    "computeSupplementReminderTimes - Bugünün tarihi (en-CA):",
    todayStr
  );

  // Manuel bildirim zamanı varsa
  if (
    suppData.notificationSchedule &&
    suppData.notificationSchedule.length > 0
  ) {
    suppData.notificationSchedule.forEach((timeStr) => {
      const scheduled = new Date(`${todayStr}T${timeStr}:00`);
      times.push(scheduled);
      console.log(
        "computeSupplementReminderTimes - Manuel olarak hesaplanan zaman:",
        scheduled
      );
    });
  }
  // Otomatik hesaplama: Günlük kullanım tanımlıysa
  else if (suppData.dailyUsage > 0) {
    const estimatedRemainingDays = suppData.quantity / suppData.dailyUsage;
    console.log(
      "computeSupplementReminderTimes - estimatedRemainingDays:",
      estimatedRemainingDays
    );
    if (estimatedRemainingDays <= 1) {
      const autoTime = new Date(now.getTime() + 1 * 60000);
      times.push(autoTime);
      console.log(
        "computeSupplementReminderTimes - Kritik durum, 1 dakika sonrası hesaplanan zaman:",
        autoTime
      );
    } else {
      if (user.notificationWindow && user.notificationWindow.end) {
        const windowEnd = new Date(
          `${todayStr}T${user.notificationWindow.end}:00`
        );
        times.push(windowEnd);
        console.log(
          "computeSupplementReminderTimes - Bildirim penceresi kullanılarak hesaplanan zaman:",
          windowEnd
        );
      } else {
        const autoTime = new Date(now.getTime() + 60 * 60000);
        times.push(autoTime);
        console.log(
          "computeSupplementReminderTimes - Varsayılan 1 saat sonrası hesaplanan zaman:",
          autoTime
        );
      }
    }
  } else {
    console.warn(
      "computeSupplementReminderTimes - Hiçbir bildirim zamanı hesaplanamadı: dailyUsage yok veya 0"
    );
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
  // Eğer bugünkü tüm bildirim saatleri geçmişse, yarının ilk bildirim zamanını ayarla
  if (reminderTimes.length > 0) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const firstTime = reminderTimes[0];
    const tomorrowDateStr = tomorrow.toLocaleDateString("en-CA");
    const timeParts = firstTime
      .toLocaleTimeString("en-US", { hour12: false })
      .split(":");
    const tomorrowReminder = new Date(
      `${tomorrowDateStr}T${timeParts[0]}:${timeParts[1]}:00`
    );
    console.log(
      "getNextSupplementReminderTime - Bugün geç, yarın için ayarlandı:",
      tomorrowReminder
    );
    return tomorrowReminder;
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
