// NotificationScheduler.js
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../auth/firebaseConfig";

// Türkiye saatini döndürür
export const getTurkeyTime = () => {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
  );
};

// Su verisini Firestore'dan çeker
export const fetchWaterData = async (user) => {
  if (!user || !user.uid) return null;
  try {
    const ref = doc(db, "users", user.uid, "water", "current");
    const docSnap = await getDoc(ref);
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log("fetchWaterData - Alınan veriler:", data);
      return {
        ...data,
        history: data.history ? Object.values(data.history) : [],
      };
    } else {
      console.warn("fetchWaterData - Su verisi bulunamadı");
      return null;
    }
  } catch (error) {
    console.error("fetchWaterData - Hata:", error);
    return null;
  }
};

// Dinamik su bildirim aralığını hesaplar
export const computeDynamicWaterInterval = async (user) => {
  const waterData = await fetchWaterData(user);
  if (!waterData) return 120;
  let intervalMinutes = 120;
  if (waterData.waterNotificationOption === "custom") {
    console.log(
      "computeDynamicWaterInterval - Custom mod kullanılıyor:",
      waterData.customNotificationInterval
    );
    return Number(waterData.customNotificationInterval) * 60;
  } else if (waterData.waterNotificationOption === "smart") {
    const remaining = waterData.dailyWaterTarget - waterData.waterIntake;
    const avgRate = remaining / (12 * 60);
    intervalMinutes = Math.max(30, Math.min(remaining / avgRate, 120));
    console.log("computeDynamicWaterInterval - Smart mod hesaplaması:", {
      remaining,
      avgRate,
      intervalMinutes,
    });
  }
  return intervalMinutes;
};

// Su bildirim zamanlarını hesaplar (notificationWindow'e göre)
export const computeWaterReminderTimes = async (user) => {
  const waterData = await fetchWaterData(user);
  if (!waterData || !user.notificationWindow) {
    console.warn(
      "computeWaterReminderTimes - Eksik veri (waterData veya notificationWindow)"
    );
    return [];
  }
  const nowTurkey = getTurkeyTime();
  const todayStr = nowTurkey.toLocaleDateString("en-CA");
  const windowStart = new Date(
    `${todayStr}T${user.notificationWindow.start}:00`
  );
  const windowEnd = new Date(`${todayStr}T${user.notificationWindow.end}:00`);
  const dynamicInterval = await computeDynamicWaterInterval(user);
  console.log(
    "computeWaterReminderTimes - Hesaplanan dinamik aralık:",
    dynamicInterval
  );
  let reminderTimes = [];
  let t = Math.max(windowStart.getTime(), nowTurkey.getTime());
  while (t <= windowEnd.getTime()) {
    reminderTimes.push(new Date(t));
    t += dynamicInterval * 60000;
  }
  console.log(
    "computeWaterReminderTimes - Oluşan reminder zamanları:",
    reminderTimes
  );
  return reminderTimes;
};

// Sonraki su bildirim zamanını döndürür
export const getNextWaterReminderTime = async (user) => {
  const reminderTimes = await computeWaterReminderTimes(user);
  const now = getTurkeyTime();
  for (const time of reminderTimes) {
    if (time > now) {
      console.log("getNextWaterReminderTime - Bulunan sonraki zaman:", time);
      return time;
    }
  }
  console.warn("getNextWaterReminderTime - Gelecek bildirim zamanı bulunamadı");
  return null;
};

// Hesaplanan sonraki su bildirim zamanını Firestore'a kaydeder
export const saveNextWaterReminderTime = async (user) => {
  const nextReminder = await getNextWaterReminderTime(user);
  if (!nextReminder) {
    console.warn(
      "saveNextWaterReminderTime - Sonraki bildirim zamanı hesaplanamadı"
    );
    return null;
  }
  const waterDocRef = doc(db, "users", user.uid, "water", "current");
  await setDoc(
    waterDocRef,
    { nextWaterReminderTime: nextReminder.toISOString() },
    { merge: true }
  );
  console.log(
    "saveNextWaterReminderTime - Kaydedilen sonraki bildirim zamanı:",
    nextReminder.toISOString()
  );
  return nextReminder;
};
