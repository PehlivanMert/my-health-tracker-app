// NotificationScheduler.js
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../auth/firebaseConfig";

// Türkiye saatini döndürür
export const getTurkeyTime = () => {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
  );
};

export const fetchUserNotificationWindow = async (user) => {
  if (!user || !user.uid) return null;
  try {
    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);
    return userDoc.exists() ? userDoc.data().notificationWindow : null;
  } catch (error) {
    console.error("fetchUserNotificationWindow hatası:", error);
    return null;
  }
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
    let remaining = waterData.dailyWaterTarget - waterData.waterIntake;
    let numGlassesRemaining = Math.ceil(remaining / waterData.glassSize);
    const nowTurkey = getTurkeyTime();
    const todayStr = nowTurkey.toLocaleDateString("en-CA");
    let windowEnd;
    if (waterData.notificationWindow && waterData.notificationWindow.end) {
      windowEnd = new Date(
        `${todayStr}T${waterData.notificationWindow.end}:00`
      );
      if (nowTurkey > windowEnd) {
        windowEnd.setDate(windowEnd.getDate() + 1);
      }
    } else {
      windowEnd = new Date(`${todayStr}T22:00:00`);
      if (nowTurkey > windowEnd) {
        windowEnd.setDate(windowEnd.getDate() + 1);
      }
    }
    const remainingWindowMinutes = (windowEnd - nowTurkey) / 60000;
    if (numGlassesRemaining > 0) {
      intervalMinutes = Math.floor(
        remainingWindowMinutes / numGlassesRemaining
      );
      intervalMinutes = Math.max(15, intervalMinutes); // Minimum 15 dakika
    } else {
      intervalMinutes = 60; // Varsayılan
    }
    console.log("computeDynamicWaterInterval - Smart mod hesaplaması:", {
      remaining,
      numGlassesRemaining,
      remainingWindowMinutes,
      intervalMinutes,
    });
    return intervalMinutes;
  }
  return intervalMinutes;
};

// Su bildirim zamanlarını hesaplar (notificationWindow'e göre)
export const computeWaterReminderTimes = async (user) => {
  const waterData = await fetchWaterData(user);
  // Eğer user.notificationWindow yoksa, ana kullanıcı dokümanından çekelim.
  const notificationWindow =
    waterData && waterData.notificationWindow
      ? waterData.notificationWindow
      : await fetchUserNotificationWindow(user);
  if (!waterData || !notificationWindow) {
    console.warn(
      "computeWaterReminderTimes - Eksik veri (waterData veya notificationWindow)"
    );
    return [];
  }
  const nowTurkey = getTurkeyTime();
  const todayStr = nowTurkey.toLocaleDateString("en-CA");
  const windowStart = new Date(`${todayStr}T${notificationWindow.start}:00`);
  const windowEnd = new Date(`${todayStr}T${notificationWindow.end}:00`);
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
