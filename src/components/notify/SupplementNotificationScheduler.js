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

  // (1) Manuel bildirim zamanı varsa (günlük kullanım hatırlatması için)
  if (
    suppData.notificationSchedule &&
    suppData.notificationSchedule.length > 0
  ) {
    suppData.notificationSchedule.forEach((timeStr) => {
      let scheduled = new Date(`${todayStr}T${timeStr}:00`);
      // Eğer hesaplanan zaman geçmişse, ertesi güne al
      if (scheduled < now) {
        scheduled.setDate(scheduled.getDate() + 1);
      }
      times.push(scheduled);
      console.log("Manuel olarak hesaplanan bildirim zamanı:", scheduled);
    });
  }
  // (2) Manuel zaman yoksa ve günlük kullanım tanımlıysa, varsayılan hatırlatma zamanı
  else if (suppData.dailyUsage > 0) {
    let defaultTime;
    if (user.notificationWindow && user.notificationWindow.end) {
      defaultTime = new Date(`${todayStr}T${user.notificationWindow.end}:00`);
      if (defaultTime < now) {
        defaultTime.setDate(defaultTime.getDate() + 1);
      }
    } else {
      defaultTime = new Date(now.getTime() + 60 * 60000);
    }
    times.push(defaultTime);
    console.log("Varsayılan günlük hatırlatma zamanı:", defaultTime);
  }

  // (3) Ek düşük miktar (expiration) bildirimleri: kalan gün 14, 7, 3 veya 1 olduğunda uyarı gönder
  if (suppData.dailyUsage > 0) {
    const remainingDays = suppData.quantity / suppData.dailyUsage;
    const thresholds = [14, 7, 3, 1];
    thresholds.forEach((threshold) => {
      if (Math.floor(remainingDays) === threshold) {
        // Bildirimi, notificationWindow başlangıcına veya yoksa 5 dakika sonrasına ayarla
        let lowQtyTime;
        if (user.notificationWindow && user.notificationWindow.start) {
          lowQtyTime = new Date(
            `${todayStr}T${user.notificationWindow.start}:00`
          );
          if (lowQtyTime < now) {
            lowQtyTime.setDate(lowQtyTime.getDate() + 1);
          }
        } else {
          lowQtyTime = new Date(now.getTime() + 5 * 60000);
        }
        times.push(lowQtyTime);
        console.log(
          `Düşük miktar uyarısı için (${threshold} gün kaldı) hesaplanan zaman:`,
          lowQtyTime
        );
      }
    });
  }

  times.sort((a, b) => a - b);
  console.log("Tüm hesaplanan takviye bildirim zamanları:", times);
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
  // Bugünkü tüm bildirim saatleri geçmişse, yarın ilk zamanı ayarla
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
