// NotificationScheduler.js
import { doc, setDoc } from "firebase/firestore";
import { db } from "../auth/firebaseConfig";

// Türkiye zamanını döndürür
export const getTurkeyTime = () => {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
  );
};

// Su bildirim moduna göre dinamik bildirim aralığı hesaplar (dakika cinsinden)
export const computeDynamicWaterInterval = async (user, waterData) => {
  let intervalMinutes = 120;
  if (
    waterData.waterNotificationOption === "custom" &&
    waterData.customNotificationInterval
  ) {
    return Number(waterData.customNotificationInterval) * 60;
  } else if (waterData.waterNotificationOption === "smart") {
    if (waterData.history && waterData.history.length > 0) {
      const recentHistory = waterData.history.slice(-7);
      const totalIntake = recentHistory.reduce(
        (sum, entry) => sum + entry.intake,
        0
      );
      const avgPerDay = totalIntake / recentHistory.length;
      const activeMinutes = 12 * 60; // 12 saatlik aktif dönem
      let avgRate = avgPerDay / activeMinutes; // ml/dakika
      if (avgRate <= 0) {
        avgRate = waterData.glassSize / 15; // yedek oran
      }
      const remaining = waterData.dailyWaterTarget - waterData.waterIntake;
      const expectedMinutes = remaining / avgRate;
      const remainingGlasses = Math.ceil(remaining / waterData.glassSize);
      intervalMinutes = expectedMinutes / Math.max(remainingGlasses, 1);
      // Aralık anatomik gerçeklik için 30-120 dakika sınırında tutulur
      intervalMinutes = Math.max(30, Math.min(intervalMinutes, 120));
    } else {
      // Geçmiş veri yoksa varsayılan 2 saat
      intervalMinutes = 120;
    }
  }
  return intervalMinutes;
};

// Kullanıcının bildirim penceresi içinde, dinamik aralığa göre su hatırlatma zamanlarını hesaplar
export const computeWaterReminderTimes = async (user, waterData) => {
  if (!user.notificationWindow) return [];
  const nowTurkey = getTurkeyTime();
  const todayStr = nowTurkey.toLocaleDateString("en-CA");
  const windowStart = new Date(
    `${todayStr}T${user.notificationWindow.start}:00`
  );
  const windowEnd = new Date(`${todayStr}T${user.notificationWindow.end}:00`);
  const dynamicInterval = await computeDynamicWaterInterval(user, waterData);
  const reminderTimes = [];
  let t = Math.max(windowStart.getTime(), nowTurkey.getTime());
  while (t <= windowEnd.getTime()) {
    reminderTimes.push(new Date(t));
    t += dynamicInterval * 60000;
  }
  return reminderTimes;
};

// Sonraki su hatırlatma zamanını hesaplar
export const getNextWaterReminderTime = async (user, waterData) => {
  const reminderTimes = await computeWaterReminderTimes(user, waterData);
  const now = new Date();
  for (const time of reminderTimes) {
    if (time > now) return time;
  }
  return null;
};

// Hesaplanan sonraki hatırlatma zamanını Firestore’daki kullanıcının water/current belgesine kaydeder
export const saveNextWaterReminderTime = async (user, waterData) => {
  const nextReminder = await getNextWaterReminderTime(user, waterData);
  if (!nextReminder) return null;
  const waterDocRef = doc(db, "users", user.uid, "water", "current");
  await setDoc(
    waterDocRef,
    { nextWaterReminderTime: nextReminder.toISOString() },
    { merge: true }
  );
  return nextReminder;
};
