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
// Global bildirim penceresine dokunmuyoruz, ancak verinin string ise obje haline çeviriyoruz.
export const getGlobalNotificationWindow = async (user) => {
  try {
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      const data = userDoc.data();
      if (data.notificationWindow) {
        const windowObj =
          typeof data.notificationWindow === "string"
            ? JSON.parse(data.notificationWindow)
            : data.notificationWindow;
        console.log(
          "getGlobalNotificationWindow - Global bildirim penceresi alındı:",
          windowObj
        );
        return windowObj;
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

  let start = new Date(`${todayStr}T${windowObj.start}:00`);
  let end = new Date(`${todayStr}T${windowObj.end}:00`);

  // Overnight durumunda bitiş zamanını ertesi güne taşıyoruz.
  if (start.getTime() > end.getTime()) {
    end.setDate(end.getDate() + 1);
  }
  // Mevcut zaman pencere bitişinden sonra ise, pencereyi yarına taşıyoruz.
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

export const computeSupplementReminderTimes = async (suppData, user) => {
  const times = [];
  const now = getTurkeyTime();
  const todayStr = now.toLocaleDateString("en-CA");
  console.log(
    "computeSupplementReminderTimes - Bugünün tarihi (en-CA):",
    todayStr
  );

  // Tüketim kontrolü: Eğer günlük kullanım hedefine ulaşılmışsa bildirim zamanı hesaplanmaz.
  let consumptionReached = false;
  if (suppData.dailyUsage > 0) {
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
          "computeSupplementReminderTimes - Günlük kullanım hedefe ulaştı, bildirim oluşturulmayacak."
        );
      }
    } catch (error) {
      console.error(
        "computeSupplementReminderTimes - Consumption verisi alınırken hata:",
        error
      );
    }
  }
  if (consumptionReached) {
    return [];
  }

  // Global bildirim penceresi (değeri doğru; bu alana dokunmuyoruz)
  const globalNotifWindow = (await getGlobalNotificationWindow(user)) || {
    start: "08:00",
    end: "22:00",
  };
  const { windowStart, windowEnd } = computeWindowTimes(globalNotifWindow);

  // Manuel bildirim zamanı varsa
  if (
    suppData.notificationSchedule &&
    suppData.notificationSchedule.length > 0
  ) {
    suppData.notificationSchedule.forEach((timeStr) => {
      let scheduled = new Date(`${todayStr}T${timeStr}:00`);
      // Manuel zaman bugünden geçmişse, yarın için hesapla
      if (scheduled.getTime() <= now.getTime()) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toLocaleDateString("en-CA");
        const timeParts = timeStr.split(":");
        scheduled = new Date(
          `${tomorrowStr}T${timeParts[0]}:${timeParts[1]}:00`
        );
        console.log(
          "computeSupplementReminderTimes - Manuel olarak hesaplanan zaman (yarın):",
          scheduled
        );
      } else {
        console.log(
          "computeSupplementReminderTimes - Manuel olarak hesaplanan zaman:",
          scheduled
        );
      }
      times.push(scheduled);
    });
  }
  // Otomatik hesaplama: Günlük kullanım tanımlıysa
  else if (suppData.dailyUsage > 0) {
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
      console.log(
        "computeSupplementReminderTimes - estimatedRemainingDays eşik değeri tetiklendi:",
        flooredRemaining
      );
      if (globalNotifWindow && globalNotifWindow.end) {
        const windowEndTime = new Date(
          `${todayStr}T${globalNotifWindow.end}:00`
        );
        times.push(windowEndTime);
        console.log(
          `computeSupplementReminderTimes - ${flooredRemaining} günlük takviyen kaldı bildirimi için hesaplanan zaman (bildirim penceresi):`,
          windowEndTime
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
      console.log(
        "computeSupplementReminderTimes - Normal durumda, estimatedRemainingDays:",
        estimatedRemainingDays
      );
      if (globalNotifWindow && globalNotifWindow.end) {
        const windowEndTime = new Date(
          `${todayStr}T${globalNotifWindow.end}:00`
        );
        times.push(windowEndTime);
        console.log(
          "computeSupplementReminderTimes - Bildirim penceresi kullanılarak hesaplanan zaman:",
          windowEndTime
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

const TOLERANCE_MS = 60000; // 1 dakika tolerans

export const getNextSupplementReminderTime = async (suppData, user) => {
  const reminderTimes = await computeSupplementReminderTimes(suppData, user);
  console.log(
    "getNextSupplementReminderTime - Hesaplanan reminderTimes listesi:",
    reminderTimes
  );
  const now = getTurkeyTime();
  // Tolerans eklenerek, gelecekteki bildirim zamanı aranıyor.
  for (const time of reminderTimes) {
    if (time.getTime() > now.getTime() + TOLERANCE_MS) {
      console.log(
        "getNextSupplementReminderTime - Bulunan sonraki zaman:",
        time
      );
      return time;
    }
  }
  // Eğer bugünün tüm bildirim saatleri geçmişse, yarının ilk bildirim zamanını ayarla.
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
      "getNextSupplementReminderTime - Bugünün tüm bildirim saatleri geçmiş, yarın için ayarlandı:",
      tomorrowReminder
    );
    return tomorrowReminder;
  }
  console.warn(
    "getNextSupplementReminderTime - Gelecek bildirim zamanı bulunamadı"
  );
  return null;
};

// Bildirim gönderildikten sonra consumption veya trigger verilerini güncelleyip,
// saveNextSupplementReminderTime fonksiyonunu tekrar çağırmanız gerekir.
// Bu örnekte, saveNextSupplementReminderTime fonksiyonu, yeni hesaplanan zamanı Firestore'a kaydediyor.
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
    {
      nextSupplementReminderTime: nextReminder.toISOString(),
      // Bildirim gönderildikten sonra consumption veya trigger verilerini güncellemek isterseniz,
      // burada ilgili alanları (ör. lastNotificationTriggers) sıfırlayabilir veya güncelleyebilirsiniz.
    },
    { merge: true }
  );
  console.log(
    "saveNextSupplementReminderTime - Kaydedilen sonraki takviye bildirimi zamanı:",
    nextReminder.toISOString()
  );
  return nextReminder;
};
