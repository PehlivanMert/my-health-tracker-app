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

// Global bildirim penceresini Firestore'dan alır..
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
  // Yerel tarihi 'en-CA' formatıyla alarak Türkiye yerel tarihini elde ediyoruz.
  const todayStr = now.toLocaleDateString("en-CA", {
    timeZone: "Europe/Istanbul",
  });

  let start, end;
  // Eğer pencere overnight ise (başlangıç saati bitiş saatinden sonra)
  if (windowObj.start > windowObj.end) {
    // Bugünkü pencere bitişini hesaplayalım
    const todayEnd = new Date(`${todayStr}T${windowObj.end}:00`);
    // Eğer şu an pencere bitişinden önceyse, bu demektir ki pencere dün başlamış.
    if (now < todayEnd) {
      // Dünün tarihi
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString("en-CA", {
        timeZone: "Europe/Istanbul",
      });
      start = new Date(`${yesterdayStr}T${windowObj.start}:00`);
      end = todayEnd;
    } else {
      // Aksi halde, pencere bugünden başlayıp yarına kadar sürer.
      start = new Date(`${todayStr}T${windowObj.start}:00`);
      end = new Date(`${todayStr}T${windowObj.end}:00`);
      end.setDate(end.getDate() + 1);
    }
  } else {
    // Overnight değilse, normal şekilde bugünkü start ve end
    start = new Date(`${todayStr}T${windowObj.start}:00`);
    end = new Date(`${todayStr}T${windowObj.end}:00`);
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
  let globalNotifWindow = await getGlobalNotificationWindow(user);
  if (!globalNotifWindow) {
    globalNotifWindow = { start: "08:00", end: "22:00" };
    console.log("computeSupplementReminderTimes - Varsayılan bildirim penceresi kullanılıyor:", globalNotifWindow);
  }
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
  // Eğer notificationSchedule varsa, nextSupplementReminderTime'a gerek yok
  if (suppData.notificationSchedule && suppData.notificationSchedule.length > 0) {
    console.log(
      "saveNextSupplementReminderTime - notificationSchedule kullanılıyor, nextSupplementReminderTime kaydedilmiyor"
    );
    return null;
  }
  
  const nextReminder = await getNextSupplementReminderTime(suppData, user);
  if (!nextReminder) {
    console.warn(
      "saveNextSupplementReminderTime - Sonraki bildirim zamanı hesaplanamadı"
    );
    return null;
  }
  const suppDocRef = doc(db, "users", user.uid, "supplements", suppData.id);
  
  // Sadece gerekli alanları kaydet
  const updateData = {
    nextSupplementReminderTime: nextReminder.toISOString(),
    notificationsLastCalculated: new Date(),
  };
  
  await setDoc(suppDocRef, updateData, { merge: true });
  console.log(
    "saveNextSupplementReminderTime - Kaydedilen sonraki takviye bildirimi zamanı:",
    nextReminder.toISOString()
  );
  return nextReminder;
};
