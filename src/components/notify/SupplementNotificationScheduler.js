import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../auth/firebaseConfig";

// Türkiye saatini döndürür
export const getTurkeyTime = () => {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
  );
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

  return { windowStart: start, windowEnd: end };
};

export const computeSupplementReminderTimes = async (suppData, user) => {
  const times = [];
  const now = getTurkeyTime();
  const todayStr = now.toLocaleDateString("en-CA");

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
      if (consumed >= suppData.dailyUsage) {
        consumptionReached = true;
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
  }
  const { windowStart, windowEnd } = computeWindowTimes(globalNotifWindow);
  
  // Dinamik gün sonu özeti zamanı hesaplama
  const windowEndHour = windowEnd.getHours();
  const windowEndMinute = windowEnd.getMinutes();
  const windowEndTotal = windowEndHour * 60 + windowEndMinute;
  
  let summaryTime;
  
  // Eğer pencere bitişi gece yarısından önceyse (00:00'dan önce)
  if (windowEndTotal > 0 && windowEndTotal < 24 * 60) {
    // Pencere bitişinden 1 dakika önce
    const summaryTimeTotal = windowEndTotal - 1;
    summaryTime = new Date(todayStr + 'T' + 
    `${Math.floor(summaryTimeTotal / 60).toString().padStart(2, '0')}:${(summaryTimeTotal % 60).toString().padStart(2, '0')}:00`);
  } else {
    // Pencere bitişi gece yarısı (00:00) veya sonrasıysa, günün sonu (23:59)
    summaryTime = new Date(todayStr + 'T23:59:00');
  }

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
      }
      times.push(scheduled);
    });
  }
  // Otomatik hesaplama: Günlük kullanım tanımlıysa
  else if (suppData.dailyUsage > 0) {
    const estimatedRemainingDays = suppData.quantity / suppData.dailyUsage;
    const flooredRemaining = Math.floor(estimatedRemainingDays);

    if (flooredRemaining === 0) {
      // Takviyenin bittiğine dair bildirim (örneğin 1 dakika sonrası)
      const finishedTime = new Date(now.getTime() + 1 * 60000);
      times.push(finishedTime);
    } else if ([14, 7, 3, 1].includes(flooredRemaining)) {
      if (globalNotifWindow && globalNotifWindow.end) {
        const windowEndTime = new Date(
          `${todayStr}T${globalNotifWindow.end}:00`
        );
        times.push(windowEndTime);
      } else {
        const defaultTime = new Date(now.getTime() + 60 * 60000);
        times.push(defaultTime);
      }
    } else {
      // Normal durumda artık pencere bitişi bildirimi göndermiyoruz, sadece dinamik gün sonu özeti
      // Dinamik gün sonu özeti zamanını ekle
      times.push(summaryTime);
    }
  } else {
    console.warn(
      "computeSupplementReminderTimes - Hiçbir bildirim zamanı hesaplanamadı: dailyUsage yok veya 0"
    );
  }

  times.sort((a, b) => a - b);
  return times;
};

const TOLERANCE_MS = 60000; // 1 dakika tolerans

export const getNextSupplementReminderTime = async (suppData, user) => {
  const reminderTimes = await computeSupplementReminderTimes(suppData, user);
  const now = getTurkeyTime();
  
  // Gece yarısı özeti için özel kontrol (23:59)
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // Eğer şu an 23:58-23:59 arasındaysa ve gece yarısı özeti varsa
  if (currentHour === 23 && currentMinute >= 58) {
    const midnightSummary = reminderTimes.find(time => {
      const timeHour = time.getHours();
      const timeMinute = time.getMinutes();
      return timeHour === 23 && timeMinute === 59;
    });
    
    if (midnightSummary) {
      return midnightSummary;
    }
  }
  
  // Tolerans eklenerek, gelecekteki bildirim zamanı aranıyor.
  for (const time of reminderTimes) {
    if (time.getTime() > now.getTime() + TOLERANCE_MS) {
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
  // notificationSchedule varsa, en yakın zamanı bul ve kaydet
  if (suppData.notificationSchedule && suppData.notificationSchedule.length > 0) {
    // En yakın zamanı bul
    const now = getTurkeyTime();
    const todayStr = now.toLocaleDateString("en-CA");
    // Tüm saatleri bugünün tarihiyle Date objesine çevir
    const times = suppData.notificationSchedule.map((timeStr) => {
      let scheduled = new Date(`${todayStr}T${timeStr}:00`);
      // Eğer saat geçmişse, yarın için hesapla
      if (scheduled.getTime() <= now.getTime()) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toLocaleDateString("en-CA");
        const timeParts = timeStr.split(":");
        scheduled = new Date(
          `${tomorrowStr}T${timeParts[0]}:${timeParts[1]}:00`
        );
      }
      return scheduled;
    });
    // Gelecekteki en yakın zamanı bul
    const futureTimes = times.filter((t) => t.getTime() > now.getTime());
    let nextReminder = null;
    if (futureTimes.length > 0) {
      nextReminder = futureTimes.sort((a, b) => a - b)[0];
    } else if (times.length > 0) {
      // Hepsi geçmişse, yarının ilk zamanı
      nextReminder = times.sort((a, b) => a - b)[0];
    }
    const suppDocRef = doc(db, "users", user.uid, "supplements", suppData.id);
    if (nextReminder) {
      await setDoc(
        suppDocRef,
        {
          nextSupplementReminderTime: nextReminder.toISOString(),
          notificationsLastCalculated: new Date(),
        },
        { merge: true }
      );
      return nextReminder;
    } else {
      await setDoc(
        suppDocRef,
        {
          nextSupplementReminderTime: null,
          notificationsLastCalculated: new Date(),
        },
        { merge: true }
      );
      return null;
    }
  }
  // ... eski otomatik hesaplama kodu ...
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
  return nextReminder;
};
