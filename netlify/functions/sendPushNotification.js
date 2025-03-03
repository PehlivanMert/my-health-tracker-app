// sendPushNotification.js
// Bu dosya, Cloud Functions ortamında çalışır ve
// rutin, takvim, su ve takviye bildirimlerini gönderir.
// Rutin ve takvim bildirimleri global bildirim ayarından etkilenmez.
// Su bildirimleri "none", "smart" (akıllı) veya "custom" modlara göre hesaplanır.
// Takviye bildirimlerinde; eğer planlanmış bildirim saatleri belirlenmişse o saatlerde;
// aksi halde, kalan miktarın günlük kullanım bazında tahmini kalan gün sayısına göre bildirim gönderilir.

const admin = require("firebase-admin");
const fetch = require("node-fetch");

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL:
      process.env.FIREBASE_DATABASE_URL || serviceAccount.databaseURL,
  });
}

const db = admin.firestore();

const notificationOffsets = {
  "on-time": 0,
  "15-minutes": 15,
  "1-hour": 60,
  "1-day": 1440,
};

const waterNotificationOffsets = notificationOffsets;

// Global bildirim penceresi kontrolü – SU ve TAKVİYE için uygulanır.
// (Rutin ve takvim bildirimleri bu kontrolden etkilenmez.)
const isWithinNotificationWindow = (user) => {
  if (!user.notificationWindow) return true;
  const nowLocal = new Date().toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  });
  const [nowHour, nowMinute] = nowLocal.split(":").map(Number);
  const [startHour, startMinute] = user.notificationWindow.start
    .split(":")
    .map(Number);
  const [endHour, endMinute] = user.notificationWindow.end
    .split(":")
    .map(Number);
  const nowTotal = nowHour * 60 + nowMinute;
  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;
  return nowTotal >= startTotal && nowTotal <= endTotal;
};

const getUserWeather = async (lat, lon) => {
  try {
    const url = `${process.env.OPEN_METEO_API_URL}?latitude=${lat}&longitude=${lon}&current_weather=true`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.current_weather) {
      return data.current_weather.temperature;
    }
  } catch (error) {
    console.error("Hava durumu alınamadı:", error);
  }
  return null;
};

// Su bildirimleri için detaylı akıllı hesaplama.
// Eğer geçmiş veriler varsa, son 7 günün ortalama tüketim hızı hesaplanır ve
// kalan suyun bitiş zamanı bulunur. Ancak hesaplanan bitiş zamanı,
// global bildirim penceresinin sonuna kadar uzatılır. Hava sıcaklığı 25°C üzerindeyse aralıklar kısaltılır.
const estimateDetailedWaterTargetTime = async (user, waterData) => {
  const now = new Date();
  let computedFinishTime;
  if (waterData.history && waterData.history.length > 0) {
    const recentHistory = waterData.history.slice(-7);
    let totalIntake = 0;
    recentHistory.forEach((entry) => {
      totalIntake += entry.intake;
    });
    const avgPerDay = totalIntake / recentHistory.length; // ml/gün
    const activeMinutes = 12 * 60; // Varsayım: 12 saatlik aktif dönem
    let avgRate = avgPerDay / activeMinutes; // ml/dakika
    if (avgRate <= 0) {
      avgRate = waterData.glassSize / 15; // fallback
    }
    const remaining = waterData.dailyWaterTarget - waterData.waterIntake;
    const minutesNeeded = remaining / avgRate;
    computedFinishTime = new Date(now.getTime() + minutesNeeded * 60000);
  } else {
    let baseEstimateHours = 2;
    if (user.location && user.location.lat && user.location.lon) {
      const temp = await getUserWeather(user.location.lat, user.location.lon);
      if (temp !== null && temp >= 25) {
        baseEstimateHours = 1.5;
      }
    }
    computedFinishTime = new Date(now.getTime() + baseEstimateHours * 3600000);
  }
  if (user.notificationWindow && user.notificationWindow.end) {
    const todayStr = new Date(
      now.toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
    ).toLocaleDateString("en-CA");
    const windowEndStr = todayStr + "T" + user.notificationWindow.end + ":00";
    const windowEnd = new Date(windowEndStr);
    if (computedFinishTime < windowEnd) {
      computedFinishTime = windowEnd;
    }
  }
  return computedFinishTime;
};

// Su hatırlatma periyotlarını hesaplamak için.
// Kullanıcının global bildirim penceresi içinde, belirlenen aralıklarla (smart: varsayılan 2 saat,
// custom: kullanıcının girdiği aralık; ayrıca hava sıcaklığı 25°C üzerindeyse aralık 1.5 saate düşer)
// hatırlatma zamanlarını üretir.
const computeReminderTimes = async (user, waterData) => {
  if (!user.notificationWindow) return [];
  const nowTurkey = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
  );
  const todayStr = nowTurkey.toLocaleDateString("en-CA");
  const windowStart = new Date(
    todayStr + "T" + user.notificationWindow.start + ":00"
  );
  const windowEnd = new Date(
    todayStr + "T" + user.notificationWindow.end + ":00"
  );
  let intervalMinutes = 120; // varsayılan 2 saat
  if (
    waterData.waterNotificationOption === "custom" &&
    waterData.customNotificationInterval
  ) {
    intervalMinutes = Number(waterData.customNotificationInterval) * 60;
  } else if (waterData.waterNotificationOption === "smart") {
    const temp = await getUserWeather(user.location.lat, user.location.lon);
    if (temp && temp > 25) {
      intervalMinutes = 90; // 1.5 saat
    }
  }
  const reminderTimes = [];
  for (
    let t = windowStart.getTime();
    t <= windowEnd.getTime();
    t += intervalMinutes * 60000
  ) {
    reminderTimes.push(new Date(t));
  }
  return reminderTimes;
};

// Global bildirim penceresi içinde, şu andan sonraki ilk hatırlatma zamanını döndürür.
const getNextReminderTime = async (user, waterData) => {
  const reminderTimes = await computeReminderTimes(user, waterData);
  const now = new Date();
  for (const time of reminderTimes) {
    if (time > now) return time;
  }
  return null;
};

// Bu helper, hesaplanan periyodik hatırlatma zamanlarından yakınında ise true döner.
const shouldSendWaterReminder = async (user, waterData, now) => {
  const reminderTimes = await computeReminderTimes(user, waterData);
  for (const time of reminderTimes) {
    if (Math.abs(now - time) / 60000 < 1) return true;
  }
  return false;
};

exports.handler = async function (event, context) {
  try {
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();

    const usersSnapshot = await db.collection("users").get();
    const routineNotifications = [];
    const calendarNotifications = [];
    const waterNotifications = [];
    const supplementNotifications = [];

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();

      // Rutin Bildirimleri (global ayardan etkilenmez)
      if (userData.routines && Array.isArray(userData.routines)) {
        userData.routines.forEach((routine) => {
          if (!routine.notificationEnabled || routine.checked) return;
          const [localHour, localMinute] = routine.time.split(":").map(Number);
          const utcHour = (localHour - 3 + 24) % 24;
          const timeDiff = Math.abs(
            currentMinute + currentHour * 60 - (utcHour * 60 + localMinute)
          );
          if (timeDiff < 1) {
            routineNotifications.push({
              token: userData.fcmToken,
              data: {
                title: routine.title,
                body: `Şimdi ${routine.title} rutininin zamanı geldi!`,
                routineId: routine.id || "",
              },
            });
          }
        });
      }

      const eventsSnapshot = await db
        .collection("users")
        .doc(userDoc.id)
        .collection("calendarEvents")
        .get();
      eventsSnapshot.forEach((docSnap) => {
        const eventData = docSnap.data();
        if (!eventData.notification || eventData.notification === "none")
          return;
        const offsetMinutes = notificationOffsets[eventData.notification] || 0;
        const eventStart = eventData.start.toDate();
        const triggerTime = new Date(
          eventStart.getTime() - offsetMinutes * 60000
        );
        const timeDiff = Math.abs(now - triggerTime) / 60000;
        if (timeDiff < 1) {
          calendarNotifications.push({
            token: userData.fcmToken,
            data: {
              title: eventData.title,
              body: `Etkinlik: ${eventData.title} ${
                offsetMinutes > 0
                  ? `(${offsetMinutes} dakika önce)`
                  : "(tam zamanında)"
              } başlayacak.`,
              eventId: docSnap.id,
            },
          });
        }
      });

      // Global bildirim penceresi yalnızca SU ve TAKVİYE için uygulanır.
      if (!isWithinNotificationWindow(userData)) continue;

      // Su Bildirimleri
      try {
        const waterRef = db
          .collection("users")
          .doc(userDoc.id)
          .collection("water")
          .doc("current");
        const waterDoc = await getDoc(waterRef);
        if (waterDoc.exists()) {
          const waterData = waterDoc.data();
          if (waterData.waterNotificationOption === "none") {
            // Bildirim kapalı.
          } else if (waterData.waterIntake < waterData.dailyWaterTarget) {
            if (await shouldSendWaterReminder(userData, waterData, now)) {
              const nextReminder = await getNextReminderTime(
                userData,
                waterData
              );
              let messageDetail = "";
              if (waterData.waterNotificationOption === "custom") {
                messageDetail = `Her ${waterData.customNotificationInterval} saat`;
              } else {
                messageDetail = nextReminder
                  ? `Sonraki hatırlatma: ${nextReminder.toLocaleTimeString(
                      "tr-TR",
                      { hour: "2-digit", minute: "2-digit" }
                    )}`
                  : "";
              }
              waterNotifications.push({
                token: userData.fcmToken,
                data: {
                  title: "Su İçme Hatırlatması",
                  body: `Günlük su hedefin ${waterData.dailyWaterTarget} ml. ${messageDetail}. Su içmeyi unutmayın!`,
                  type: "water",
                },
              });
            }
          }
        }
      } catch (err) {
        console.error(`Kullanıcı ${userDoc.id} için su verisi alınamadı:`, err);
      }

      // Takviye Bildirimleri
      const suppSnapshot = await db
        .collection("users")
        .doc(userDoc.id)
        .collection("supplements")
        .get();
      let pendingSupplementsForBatch = [];
      suppSnapshot.forEach((docSnap) => {
        const suppData = docSnap.data();
        if (!suppData.notification || suppData.notification === "none") return;
        // Günlük kalan gün hesaplaması.
        if (suppData.dailyUsage > 0) {
          const estimatedRemainingDays =
            suppData.quantity / suppData.dailyUsage;
          const thresholds = [14, 7, 3, 1];
          const floorDays = Math.floor(estimatedRemainingDays);
          if (thresholds.includes(floorDays)) {
            supplementNotifications.push({
              token: userData.fcmToken,
              data: {
                title: `${suppData.name} Yakında Bitiyor!`,
                body: `Takviyeniz yaklaşık ${floorDays} gün sonra bitecek. Lütfen tazeleyin.`,
                supplementId: docSnap.id,
              },
            });
          }
        }
        // Planlanmış bildirim saatleri kontrolü.
        if (
          suppData.notificationSchedule &&
          Array.isArray(suppData.notificationSchedule) &&
          suppData.notificationSchedule.length > 0
        ) {
          suppData.notificationSchedule.forEach((scheduleTime) => {
            const [schedHour, schedMinute] = scheduleTime
              .split(":")
              .map(Number);
            const scheduledDate = new Date(now);
            scheduledDate.setHours(schedHour, schedMinute, 0, 0);
            if (now > scheduledDate && suppData.quantity > 0) {
              supplementNotifications.push({
                token: userData.fcmToken,
                data: {
                  title: `${suppData.name} Takviyesini Almayı Unuttunuz!`,
                  body: `Planlanan saatte (${scheduleTime}) almanız gereken takviyeyi henüz almadınız.`,
                  supplementId: docSnap.id,
                },
              });
            }
          });
        } else {
          // Planlama yoksa: Günlük kalan gün hesaplaması.
          if (suppData.dailyUsage > 0) {
            const estimatedDays = suppData.quantity / suppData.dailyUsage;
            if (estimatedDays <= 1) {
              supplementNotifications.push({
                token: userData.fcmToken,
                data: {
                  title: `${suppData.name} Takviyesi Kritik!`,
                  body: `Takviyeniz bugün bitmek üzere (kalan gün: ${estimatedDays.toFixed(
                    1
                  )}). Lütfen kontrol edin.`,
                  supplementId: docSnap.id,
                },
              });
            }
          }
        }
        if (suppData.quantity > 0) {
          pendingSupplementsForBatch.push(suppData.name);
        }
      });
      if (userData.notificationWindow) {
        const nowLocal = new Date().toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/Istanbul",
        });
        const [nowH, nowM] = nowLocal.split(":").map(Number);
        const nowTotal = nowH * 60 + nowM;
        const [endH, endM] = userData.notificationWindow.end
          .split(":")
          .map(Number);
        const endTotal = endH * 60 + endM;
        const remainingWindow = endTotal - nowTotal;
        if (
          remainingWindow > 0 &&
          remainingWindow <= 15 &&
          pendingSupplementsForBatch.length > 0
        ) {
          supplementNotifications.push({
            token: userData.fcmToken,
            data: {
              title: "Takviye Hatırlatması",
              body: `Bugün almanız gereken takviyeler: ${pendingSupplementsForBatch.join(
                ", "
              )}. Lütfen kontrol edin.`,
            },
          });
        }
      }
    }

    const allNotifications = [
      ...routineNotifications,
      ...calendarNotifications,
      ...waterNotifications,
      ...supplementNotifications,
    ];

    const sendResults = await Promise.all(
      allNotifications.map((msg) => admin.messaging().send(msg))
    );
    return { statusCode: 200, body: JSON.stringify({ results: sendResults }) };
  } catch (error) {
    console.error("Push bildirim gönderimi hatası:", error);
    return { statusCode: 500, body: error.toString() };
  }
};
