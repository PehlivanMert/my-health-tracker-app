// SupplementNotificationScheduler.js
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../auth/firebaseConfig";

// Türkiye saatini döndürür
export const getTurkeyTime = () => {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
  );
  console.log("getTurkeyTime - Şu anki Türkiye zamanı:", now);
  return now;
};

// Global bildirim penceresini Firestore'dan alır.
// Artık kullanıcı dokümanını okuyup, içerisindeki notificationWindow alanını döndürüyoruz.
export const getGlobalNotificationWindow = async (user) => {
  try {
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      const data = userDoc.data();
      if (data.notificationWindow) {
        console.log(
          "getGlobalNotificationWindow - Global bildirim penceresi alındı:",
          data.notificationWindow
        );
        return data.notificationWindow;
      } else {
        console.warn(
          "getGlobalNotificationWindow - Global bildirim penceresi bulunamadı for user:",
          user.uid
        );
        return null;
      }
    } else {
      console.warn(
        "getGlobalNotificationWindow - Kullanıcı dokümanı bulunamadı for user:",
        user.uid
      );
      return null;
    }
  } catch (error) {
    console.error(
      "getGlobalNotificationWindow - Global bildirim penceresi alınırken hata:",
      error
    );
    return null;
  }
};

const computeWindowTimes = (windowObj) => {
  const now = getTurkeyTime();
  const todayStr = now.toISOString().split("T")[0];

  // Bugünün tarihine göre başlangıç ve bitiş zamanlarını oluşturuyoruz.
  let start = new Date(`${todayStr}T${windowObj.start}:00`);
  let end = new Date(`${todayStr}T${windowObj.end}:00`);

  // Eğer başlangıç saati bitiş saatinden büyükse (overnight durum), bitiş zamanını ertesi güne ayarlıyoruz.
  if (start.getTime() > end.getTime()) {
    end.setDate(end.getDate() + 1);
  }

  // Eğer mevcut zaman pencere bitişinden sonra ise, pencereyi bir sonraki güne taşıyoruz.
  if (now.getTime() > end.getTime()) {
    start.setDate(start.getDate() + 1);
    end.setDate(end.getDate() + 1);
  }

  console.log(
    "computeWindowTimes - Pencere başlangıcı:",
    start,
    "Bitişi:",
    end
  );
  return { windowStart: start, windowEnd: end };
};

// Takviye bildirim zamanlarını hesaplar
export const computeSupplementReminderTimes = async (suppData, user) => {
  const times = [];
  const now = getTurkeyTime();
  const todayStr = now.toLocaleDateString("en-CA");
  console.log(
    "computeSupplementReminderTimes - Bugünün tarihi (en-CA):",
    todayStr
  );

  // Global bildirim penceresini çekiyoruz ve overnight durumunu işliyoruz.
  const globalNotifWindow = await getGlobalNotificationWindow(user);
  const { windowStart, windowEnd } = computeWindowTimes(
    globalNotifWindow || { start: "08:00", end: "22:00" }
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
    // Önce Firestore'dan bugünkü tüketim verisini alıp, günlük kullanım hedefiyle karşılaştırıyoruz.
    let consumptionReached = false;
    try {
      const consumptionDocRef = doc(
        db,
        "users",
        user.uid,
        "stats",
        "supplementConsumption"
      );
      const consumptionDoc = await getDoc(consumptionDocRef);
      let consumed = 0;
      if (consumptionDoc.exists()) {
        const consumptionData = consumptionDoc.data();
        const todayConsumption = consumptionData[todayStr] || {};
        consumed = todayConsumption[suppData.name] || 0;
      }
      console.log(
        "computeSupplementReminderTimes - Günlük tüketim verisi:",
        suppData.name,
        "consumed:",
        consumed,
        "dailyUsage:",
        suppData.dailyUsage
      );
      if (consumed >= suppData.dailyUsage) {
        consumptionReached = true;
        console.log(
          "computeSupplementReminderTimes - Günlük kullanım hedefe ulaştı, otomatik bildirim oluşturulmayacak."
        );
      }
    } catch (error) {
      console.error(
        "computeSupplementReminderTimes - Consumption verisi alınırken hata:",
        error
      );
    }

    if (!consumptionReached) {
      // Hedefe ulaşılmadıysa otomatik bildirim zamanlarını hesaplıyoruz.
      const estimatedRemainingDays = suppData.quantity / suppData.dailyUsage;
      console.log(
        "computeSupplementReminderTimes - estimatedRemainingDays:",
        estimatedRemainingDays
      );
      const flooredRemaining = Math.floor(estimatedRemainingDays);

      if (flooredRemaining === 0) {
        // Takviyenin bittiğine dair bildirim (örneğin 1 dakika sonrası)
        const finishedTime = new Date(now.getTime() + 1 * 60000);
        times.push(finishedTime);
        console.log(
          "computeSupplementReminderTimes - estimatedRemainingDays 0: Takviyen bitmiştir bildirimi için hesaplanan zaman:",
          finishedTime
        );
      } else if ([14, 7, 3, 1].includes(flooredRemaining)) {
        // Belirlenen eşik değerlerinden biri tetikleniyorsa (örn. 14, 7, 3 veya 1 günlük takviyen kaldı)
        console.log(
          "computeSupplementReminderTimes - estimatedRemainingDays eşik değeri tetiklendi:",
          flooredRemaining
        );
        if (globalNotifWindow && globalNotifWindow.end) {
          const windowEnd = new Date(`${todayStr}T${globalNotifWindow.end}:00`);
          times.push(windowEnd);
          console.log(
            `computeSupplementReminderTimes - ${flooredRemaining} günlük takviyen kaldı bildirimi için hesaplanan zaman (bildirim penceresi):`,
            windowEnd
          );
        } else {
          const defaultTime = new Date(now.getTime() + 60 * 60000);
          times.push(defaultTime);
          console.log(
            `computeSupplementReminderTimes - ${flooredRemaining} günlük takviyen kaldı bildirimi için hesaplanan zaman (varsayılan 1 saat sonrası):`,
            defaultTime
          );
        }
      } else {
        // Diğer durumlarda normal otomatik bildirim zamanı
        console.log(
          "computeSupplementReminderTimes - Normal durumda, estimatedRemainingDays:",
          estimatedRemainingDays
        );
        if (globalNotifWindow && globalNotifWindow.end) {
          const windowEnd = new Date(`${todayStr}T${globalNotifWindow.end}:00`);
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
export const getNextSupplementReminderTime = async (suppData, user) => {
  const reminderTimes = await computeSupplementReminderTimes(suppData, user);
  console.log(
    "getNextSupplementReminderTime - Hesaplanan reminderTimes listesi:",
    reminderTimes
  );
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
  const nextReminder = await getNextSupplementReminderTime(suppData, user);
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
