// NotificationScheduler.js
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../auth/firebaseConfig";

// Türkiye saatini döndürür
export const getTurkeyTime = () => {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
  );
};

// Su verisini Firestore'dan doğru şekilde çeker
export const fetchWaterData = async (user) => {
  if (!user || !user.uid) return null;
  try {
    const ref = doc(db, "users", user.uid, "water", "current");
    const docSnap = await getDoc(ref);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        history: data.history ? Object.values(data.history) : [],
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error("Su verisini çekerken hata:", error);
    return null;
  }
};

// Dinamik su bildirim aralığını hesaplar
export const computeDynamicWaterInterval = async (user) => {
  const waterData = await fetchWaterData(user);
  if (!waterData) return 120;
  let intervalMinutes = 120;
  if (waterData.waterNotificationOption === "custom") {
    return Number(waterData.customNotificationInterval) * 60;
  } else if (waterData.waterNotificationOption === "smart") {
    const remaining = waterData.dailyWaterTarget - waterData.waterIntake;
    // Basit bir hesaplama: kalan suyu, 12 saatlik aktif periyoda böl
    const avgRate = remaining / (12 * 60);
    intervalMinutes = Math.max(30, Math.min(remaining / avgRate, 120));
  }
  return intervalMinutes;
};

// Su bildirim zamanlarını, kullanıcı bildirim penceresine göre hesaplar
export const computeWaterReminderTimes = async (user) => {
  const waterData = await fetchWaterData(user);
  if (!waterData || !user.notificationWindow) return [];
  const nowTurkey = getTurkeyTime();
  const todayStr = nowTurkey.toLocaleDateString("en-CA");
  const windowStart = new Date(
    `${todayStr}T${user.notificationWindow.start}:00`
  );
  const windowEnd = new Date(`${todayStr}T${user.notificationWindow.end}:00`);
  const dynamicInterval = await computeDynamicWaterInterval(user);
  let reminderTimes = [];
  let t = Math.max(windowStart.getTime(), nowTurkey.getTime());
  while (t <= windowEnd.getTime()) {
    reminderTimes.push(new Date(t));
    t += dynamicInterval * 60000;
  }
  return reminderTimes;
};

// Sonraki su bildirim zamanını döndürür
export const getNextWaterReminderTime = async (user) => {
  const reminderTimes = await computeWaterReminderTimes(user);
  const now = getTurkeyTime();
  for (const time of reminderTimes) {
    if (time > now) return time;
  }
  return null;
};

// Hesaplanan sonraki su bildirim zamanını Firestore'a kaydeder
export const saveNextWaterReminderTime = async (user) => {
  const nextReminder = await getNextWaterReminderTime(user);
  if (!nextReminder) return null;
  const waterDocRef = doc(db, "users", user.uid, "water", "current");
  await setDoc(
    waterDocRef,
    { nextWaterReminderTime: nextReminder.toISOString() },
    { merge: true }
  );
  return nextReminder;
};
