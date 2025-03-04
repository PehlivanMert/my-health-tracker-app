import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../auth/firebaseConfig";

// Türkiye zamanını döndürür
export const getTurkeyTime = () => {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
  );
};

// Firestore'dan water/current belgesini getirir
export const fetchWaterData = async (user) => {
  if (!user || !user.uid) return null;

  try {
    const ref = doc(db, "users", user.uid, "water", "current");
    const docSnap = await getDoc(ref);

    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log("Firestore'dan alınan su verisi:", data);
      return data;
    } else {
      console.warn("Su verisi bulunamadı.");
      return null;
    }
  } catch (error) {
    console.error("Su verisini çekerken hata oluştu:", error);
    return null;
  }
};

// Firestore'dan su tüketim geçmişini alır
export const fetchWaterHistory = async (user) => {
  if (!user || !user.uid) return [];

  try {
    const ref = doc(db, "users", user.uid, "water", "current");
    const docSnap = await getDoc(ref);

    if (docSnap.exists() && docSnap.data().history) {
      const history = Object.values(docSnap.data().history);
      console.log("Firestore'dan alınan su geçmişi:", history);
      return history;
    } else {
      console.warn("Su geçmişi bulunamadı.");
      return [];
    }
  } catch (error) {
    console.error("Su geçmişini çekerken hata oluştu:", error);
    return [];
  }
};

// Su bildirim aralığını hesaplar
export const computeDynamicWaterInterval = async (user) => {
  const waterData = await fetchWaterData(user);
  const history = await fetchWaterHistory(user);

  if (!waterData) {
    console.warn("Su verisi yok, varsayılan aralık: 120 dk");
    return 120;
  }

  let intervalMinutes = 120;

  if (
    waterData.waterNotificationOption === "custom" &&
    waterData.customNotificationInterval
  ) {
    return Number(waterData.customNotificationInterval) * 60;
  } else if (waterData.waterNotificationOption === "smart") {
    if (history.length > 0) {
      const recentHistory = history.slice(-7);
      const totalIntake = recentHistory.reduce(
        (sum, entry) => sum + (entry.intake || 0),
        0
      );
      const avgPerDay =
        recentHistory.length > 0 ? totalIntake / recentHistory.length : 0;

      const activeMinutes = 12 * 60;
      let avgRate = avgPerDay / activeMinutes;

      if (avgRate <= 0) {
        avgRate = waterData.glassSize / 15;
      }

      const remaining = waterData.dailyWaterTarget - waterData.waterIntake;
      const expectedMinutes = remaining / avgRate;
      const remainingGlasses = Math.ceil(remaining / waterData.glassSize);
      intervalMinutes = expectedMinutes / Math.max(remainingGlasses, 1);

      intervalMinutes = Math.max(30, Math.min(intervalMinutes, 120));
    }
  }

  return intervalMinutes;
};

// Kullanıcının bildirim penceresi içinde su hatırlatma zamanlarını hesaplar
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

  const reminderTimes = [];
  let t = Math.max(windowStart.getTime(), nowTurkey.getTime());
  while (t <= windowEnd.getTime()) {
    reminderTimes.push(new Date(t));
    t += dynamicInterval * 60000;
  }
  return reminderTimes;
};

// Sonraki su hatırlatma zamanını hesaplar
export const getNextWaterReminderTime = async (user) => {
  const reminderTimes = await computeWaterReminderTimes(user);
  const now = getTurkeyTime();

  for (const time of reminderTimes) {
    if (time > now) return time;
  }
  return null;
};

// Sonraki su hatırlatma zamanını Firestore’a kaydeder
export const saveNextWaterReminderTime = async (user) => {
  const nextReminder = await getNextWaterReminderTime(user);
  if (!nextReminder) return null;

  const waterDocRef = doc(db, "users", user.uid, "water", "current");
  await setDoc(
    waterDocRef,
    { nextWaterReminderTime: nextReminder.toISOString() },
    { merge: true }
  );

  console.log("Kaydedilen su hatırlatma zamanı:", nextReminder.toISOString());
  return nextReminder;
};
