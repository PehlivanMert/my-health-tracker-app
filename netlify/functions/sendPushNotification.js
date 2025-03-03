// sendPushNotification.js
// Bu dosya, Cloud Functions ortamında çalışır ve
// rutin, takvim, su ve takviye bildirimlerini gönderir.
// İyileştirmeler:
// • Firestore okuma işlemleri paralel hale getirilerek maliyet optimize edildi.
// • Su bildirimlerinde, geçmiş veriye göre dinamik (insan anatomisine uygun) aralık hesaplanarak periyodik bildirimler gönderilir.
// • Takviye bildirimlerinde, planlanmış bildirimler yalnızca ±1 dakika hassasiyetiyle kontrol edilir.
// • Global bildirim penceresi, kullanıcının ayarladığı saat değerlerini doğru şekilde uygular.

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

// Takvim bildirimleri için offsetler
const notificationOffsets = {
  "on-time": 0,
  "15-minutes": 15,
  "1-hour": 60,
  "1-day": 1440,
};

// Yardımcı: Türkiye saatini döndürür
const getTurkeyTime = () => {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
  );
};

// Kullanıcının global bildirim penceresinde olup olmadığını kontrol eder
const isWithinNotificationWindow = (user) => {
  if (!user.notificationWindow) return true;
  const nowTurkey = getTurkeyTime();
  const [nowHour, nowMinute] = nowTurkey
    .toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
    .split(":")
    .map(Number);
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

// Kullanıcının konumuna göre güncel sıcaklığı getirir
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

// Su bildirimlerinde kullanılacak dinamik aralık hesaplaması
const computeDynamicWaterInterval = async (user, waterData) => {
  // Varsayılan: 120 dakika
  let intervalMinutes = 120;
  if (
    waterData.waterNotificationOption === "custom" &&
    waterData.customNotificationInterval
  ) {
    return Number(waterData.customNotificationInterval) * 60;
  } else if (waterData.waterNotificationOption === "smart") {
    if (waterData.history && waterData.history.length > 0) {
      const recentHistory = waterData.history.slice(-7);
      let totalIntake = 0;
      recentHistory.forEach((entry) => {
        totalIntake += entry.intake;
      });
      const avgPerDay = totalIntake / recentHistory.length;
      const activeMinutes = 12 * 60; // varsayılan 12 saatlik aktif dönem
      let avgRate = avgPerDay / activeMinutes; // ml/dakika
      if (avgRate <= 0) {
        avgRate = waterData.glassSize / 15; // yedek oran
      }
      const remaining = waterData.dailyWaterTarget - waterData.waterIntake;
      const expectedMinutes = remaining / avgRate;
      const remainingGlasses = Math.ceil(remaining / waterData.glassSize);
      intervalMinutes = expectedMinutes / Math.max(remainingGlasses, 1);
      // Anatomik gerçeklik için aralık 30 ile 120 dakika arasında sınırlandırılır
      intervalMinutes = Math.max(30, Math.min(intervalMinutes, 120));
    } else {
      // Geçmiş veri yoksa: sıcaklık etkisini uygula
      let baseHours = 2;
      if (user.location && user.location.lat && user.location.lon) {
        const temp = await getUserWeather(user.location.lat, user.location.lon);
        if (temp !== null && temp > 25) {
          baseHours = 1.5;
        }
      }
      intervalMinutes = baseHours * 60;
    }
  }
  return intervalMinutes;
};

// Global bildirim penceresi içinde, dinamik aralığa göre su hatırlatma zamanlarını hesaplar
const computeWaterReminderTimes = async (user, waterData) => {
  if (!user.notificationWindow) return [];
  const nowTurkey = getTurkeyTime();
  const todayStr = nowTurkey.toLocaleDateString("en-CA");
  const windowStart = new Date(
    `${todayStr}T${user.notificationWindow.start}:00`
  );
  const windowEnd = new Date(`${todayStr}T${user.notificationWindow.end}:00`);
  const dynamicInterval = await computeDynamicWaterInterval(user, waterData);
  const reminderTimes = [];
  // Bildirimler, pencere başlangıcı ile şimdiki zaman arasından başlatılır
  let t = Math.max(windowStart.getTime(), nowTurkey.getTime());
  while (t <= windowEnd.getTime()) {
    reminderTimes.push(new Date(t));
    t += dynamicInterval * 60000;
  }
  return reminderTimes;
};

const getNextWaterReminderTime = async (user, waterData) => {
  const reminderTimes = await computeWaterReminderTimes(user, waterData);
  const now = new Date();
  for (const time of reminderTimes) {
    if (time > now) return time;
  }
  return null;
};

// Su hatırlatmasının şimdi gönderilip gönderilmeyeceğini kontrol eder (±1 dakika hassasiyeti)
const shouldSendWaterReminder = async (user, waterData, now) => {
  const reminderTimes = await computeWaterReminderTimes(user, waterData);
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
    const notificationsToSend = [];

    // Tüm kullanıcıları getir (optimizasyon için filtreleme yapılabilir)
    const usersSnapshot = await db.collection("users").get();

    await Promise.all(
      usersSnapshot.docs.map(async (userDoc) => {
        const userData = userDoc.data();
        const fcmToken = userData.fcmToken;
        if (!fcmToken) return; // FCM token yoksa atla

        // Rutin Bildirimleri (global ayardan bağımsız)
        if (userData.routines && Array.isArray(userData.routines)) {
          userData.routines.forEach((routine) => {
            if (!routine.notificationEnabled || routine.checked) return;
            // Rutin zamanı, Türkiye saat dilimine göre UTC'ye dönüştürülür (+3 fark varsayılır)
            const [localHour, localMinute] = routine.time
              .split(":")
              .map(Number);
            const utcHour = (localHour - 3 + 24) % 24;
            const routineTimeInMinutes = utcHour * 60 + localMinute;
            const currentTimeInMinutes = currentHour * 60 + currentMinute;
            if (Math.abs(currentTimeInMinutes - routineTimeInMinutes) < 1) {
              notificationsToSend.push({
                token: fcmToken,
                data: {
                  title: routine.title,
                  body: `Şimdi ${routine.title} rutininin zamanı geldi!`,
                  routineId: routine.id || "",
                },
              });
            }
          });
        }

        // Takvim Bildirimleri (global ayardan bağımsız)
        try {
          const eventsSnapshot = await db
            .collection("users")
            .doc(userDoc.id)
            .collection("calendarEvents")
            .get();
          eventsSnapshot.forEach((docSnap) => {
            const eventData = docSnap.data();
            if (!eventData.notification || eventData.notification === "none")
              return;
            const offsetMinutes =
              notificationOffsets[eventData.notification] || 0;
            const eventStart = eventData.start.toDate();
            const triggerTime = new Date(
              eventStart.getTime() - offsetMinutes * 60000
            );
            if (Math.abs(now - triggerTime) / 60000 < 1) {
              notificationsToSend.push({
                token: fcmToken,
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
        } catch (err) {
          console.error(`Kullanıcı ${userDoc.id} için takvim hatası:`, err);
        }

        // Global bildirim penceresi yalnızca SU ve TAKVİYE için geçerli
        if (!isWithinNotificationWindow(userData)) return;

        // Su Bildirimleri
        try {
          const waterRef = db
            .collection("users")
            .doc(userDoc.id)
            .collection("water")
            .doc("current");
          const waterDoc = await waterRef.get();
          if (waterDoc.exists()) {
            const waterData = waterDoc.data();
            if (
              waterData.waterNotificationOption !== "none" &&
              waterData.waterIntake < waterData.dailyWaterTarget
            ) {
              if (await shouldSendWaterReminder(userData, waterData, now)) {
                const nextReminder = await getNextWaterReminderTime(
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
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}`
                    : "";
                }
                notificationsToSend.push({
                  token: fcmToken,
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
          console.error(
            `Kullanıcı ${userDoc.id} için su hatırlatma hatası:`,
            err
          );
        }

        // Takviye Bildirimleri
        try {
          const suppSnapshot = await db
            .collection("users")
            .doc(userDoc.id)
            .collection("supplements")
            .get();
          let pendingSupplements = [];
          suppSnapshot.forEach((docSnap) => {
            const suppData = docSnap.data();
            if (!suppData.notification || suppData.notification === "none")
              return;
            // Eğer planlanmış bildirim saatleri varsa, yalnızca şu an (±1 dakika) o saatte gönder
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
                if (
                  Math.abs(now - scheduledDate) / 60000 < 1 &&
                  suppData.quantity > 0
                ) {
                  notificationsToSend.push({
                    token: fcmToken,
                    data: {
                      title: `${suppData.name} Takviyesini Almayı Unuttunuz!`,
                      body: `Planlanan saatte (${scheduleTime}) almanız gereken takviyeyi henüz almadınız.`,
                      supplementId: docSnap.id,
                    },
                  });
                }
              });
            } else if (suppData.dailyUsage > 0) {
              // Planlanmış zaman yoksa, kalan gün eşiğine göre bildirim gönder
              const estimatedRemainingDays =
                suppData.quantity / suppData.dailyUsage;
              const thresholds = [14, 7, 3, 1];
              const floorDays = Math.floor(estimatedRemainingDays);
              if (thresholds.includes(floorDays)) {
                notificationsToSend.push({
                  token: fcmToken,
                  data: {
                    title: `${suppData.name} Yakında Bitiyor!`,
                    body: `Takviyeniz yaklaşık ${floorDays} gün sonra bitecek. Lütfen tazeleyin.`,
                    supplementId: docSnap.id,
                  },
                });
              } else if (estimatedRemainingDays <= 1) {
                notificationsToSend.push({
                  token: fcmToken,
                  data: {
                    title: `${suppData.name} Takviyesi Kritik!`,
                    body: `Takviyeniz bugün bitmek üzere (kalan gün: ${estimatedRemainingDays.toFixed(
                      1
                    )}). Lütfen kontrol edin.`,
                    supplementId: docSnap.id,
                  },
                });
              }
            }
            if (suppData.quantity > 0) {
              pendingSupplements.push(suppData.name);
            }
          });
          // Eğer global bildirim penceresinin bitimine 15 dakika kalmışsa, toplu takviye hatırlatma gönder
          if (userData.notificationWindow) {
            const nowTurkey = getTurkeyTime();
            const [nowH, nowM] = nowTurkey
              .toLocaleTimeString("tr-TR", {
                hour: "2-digit",
                minute: "2-digit",
              })
              .split(":")
              .map(Number);
            const nowTotal = nowH * 60 + nowM;
            const [endH, endM] = userData.notificationWindow.end
              .split(":")
              .map(Number);
            const endTotal = endH * 60 + endM;
            const remainingWindow = endTotal - nowTotal;
            if (
              remainingWindow > 0 &&
              remainingWindow <= 15 &&
              pendingSupplements.length > 0
            ) {
              notificationsToSend.push({
                token: fcmToken,
                data: {
                  title: "Takviye Hatırlatması",
                  body: `Bugün almanız gereken takviyeler: ${pendingSupplements.join(
                    ", "
                  )}. Lütfen kontrol edin.`,
                },
              });
            }
          }
        } catch (err) {
          console.error(
            `Kullanıcı ${userDoc.id} için takviye hatırlatma hatası:`,
            err
          );
        }
      })
    );

    // Tüm bildirimleri paralel olarak gönder
    const sendResults = await Promise.all(
      notificationsToSend.map((msg) => admin.messaging().send(msg))
    );
    return { statusCode: 200, body: JSON.stringify({ results: sendResults }) };
  } catch (error) {
    console.error("Push bildirim gönderimi hatası:", error);
    return { statusCode: 500, body: error.toString() };
  }
};
