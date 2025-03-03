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

// Türkiye saatini döndüren yardımcı
const getTurkeyTime = () =>
  new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));

// Kullanıcının global bildirim penceresini kontrol eder; eğer tanımlı değilse varsayılan 08:00-22:00 kullanır.
const isWithinNotificationWindow = (user) => {
  const window = user.notificationWindow || { start: "08:00", end: "22:00" };
  const nowTurkey = getTurkeyTime();
  const [nowHour, nowMinute] = nowTurkey
    .toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
    .split(":")
    .map(Number);
  const [startHour, startMinute] = window.start.split(":").map(Number);
  const [endHour, endMinute] = window.end.split(":").map(Number);
  const nowTotal = nowHour * 60 + nowMinute;
  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;
  return nowTotal >= startTotal && nowTotal <= endTotal;
};

// Kullanıcının konumuna ve güncel hava durumuna göre çevresel bağlam bilgisini getirir.
const getUserEnvironmentalContext = async (user) => {
  const context = {
    temperature: 22,
    activityLevel: "normal",
    timeContext: "day",
  };
  try {
    if (user.location && user.location.lat && user.location.lon) {
      const url = `${process.env.OPEN_METEO_API_URL}?latitude=${user.location.lat}&longitude=${user.location.lon}&current_weather=true`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.current_weather) {
        context.temperature = data.current_weather.temperature;
        const weatherCode = data.current_weather.weathercode;
        if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(weatherCode)) {
          context.activityLevel = "low";
        } else if (context.temperature > 30) {
          context.activityLevel = "low";
        } else if (
          context.temperature > 18 &&
          context.temperature < 28 &&
          [0, 1, 2, 3].includes(weatherCode)
        ) {
          context.activityLevel = "high";
        }
      }
    }
    const nowTurkey = getTurkeyTime();
    const hour = nowTurkey.getHours();
    if (hour >= 6 && hour < 9) {
      context.timeContext = "morning";
    } else if (hour >= 12 && hour < 14) {
      context.timeContext = "lunch";
    } else if (hour >= 17 && hour < 20) {
      context.timeContext = "evening";
    } else if (hour >= 22 || hour < 6) {
      context.timeContext = "night";
      context.activityLevel = "low";
    }
  } catch (error) {
    console.error("Error getting environmental context:", error);
  }
  return context;
};

// Kullanıcının su içme geçmişini analiz edip en yoğun saatleri tespit eder.
const analyzeWaterHabits = (waterHistory = []) => {
  if (!waterHistory || waterHistory.length < 5) return null;
  const hourlyDistribution = Array(24).fill(0);
  let totalEntries = 0;
  const recentHistory = waterHistory.slice(-14);
  recentHistory.forEach((entry) => {
    if (entry.timestamp) {
      const entryTime = entry.timestamp.toDate
        ? entry.timestamp.toDate()
        : new Date(entry.timestamp);
      const entryHour = entryTime.getHours();
      hourlyDistribution[entryHour]++;
      totalEntries++;
    }
  });
  if (totalEntries === 0) return null;
  const normalizedDistribution = hourlyDistribution.map(
    (count) => count / totalEntries
  );
  const peakHours = normalizedDistribution
    .map((val, idx) => ({ hour: idx, value: val }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .filter((peak) => peak.value > 0);
  return {
    peakHours,
    hourlyDistribution: normalizedDistribution,
  };
};

// Biyolojik uyumlu hidrasyon algoritması; kullanıcının kilo, yaş, boy (BMI), sıcaklık, günün saati ve aktivite bilgilerine göre su içme aralığını hesaplar.
const computeDynamicWaterInterval = async (user, waterData) => {
  if (
    waterData.waterNotificationOption === "custom" &&
    waterData.customNotificationInterval
  ) {
    return Number(waterData.customNotificationInterval) * 60;
  } else if (waterData.waterNotificationOption === "smart") {
    let intervalMinutes = 120;
    const envContext = await getUserEnvironmentalContext(user);
    let weight = user.profile && user.profile.weight ? user.profile.weight : 70;
    let age = user.profile && user.profile.age ? user.profile.age : 30;
    let height =
      user.profile && user.profile.height ? user.profile.height : 170;
    let baseRate = 0.55 * weight; // ml/dakika
    const activityMultiplier = { low: 0.8, normal: 1.0, high: 1.3 };
    baseRate *= activityMultiplier[envContext.activityLevel] || 1.0;
    if (envContext.temperature > 30) {
      baseRate *= 1.4;
    } else if (envContext.temperature > 25) {
      baseRate *= 1.2;
    } else if (envContext.temperature < 10) {
      baseRate *= 0.9;
    }
    const nowTurkey = getTurkeyTime();
    const hour = nowTurkey.getHours();
    if (hour >= 6 && hour < 10) {
      baseRate *= 1.3;
    } else if (hour >= 22 || hour < 6) {
      baseRate *= 0.5;
    }
    if (age > 50) {
      baseRate *= 0.9;
    } else if (age < 18) {
      baseRate *= 1.1;
    }
    const bmi = weight / Math.pow(height / 100, 2);
    if (bmi > 25) {
      baseRate *= 1.1;
    } else if (bmi < 18.5) {
      baseRate *= 0.9;
    }
    let glassSize = waterData.glassSize || 250;
    let computedInterval = Math.round(glassSize / baseRate);
    const habits = waterData.history
      ? analyzeWaterHabits(waterData.history)
      : null;
    if (habits && habits.peakHours.length > 0) {
      const currentHour = nowTurkey.getHours();
      const isNearPeakHour = habits.peakHours.some(
        (peak) => Math.abs(peak.hour - currentHour) <= 1 && peak.value > 0.15
      );
      if (isNearPeakHour) {
        computedInterval = Math.round(computedInterval * 0.8);
      }
    }
    intervalMinutes = Math.max(5, Math.min(computedInterval, 120));
    const remaining = Math.max(
      0,
      waterData.dailyWaterTarget - waterData.waterIntake
    );
    const percentCompleted =
      (waterData.waterIntake / waterData.dailyWaterTarget) * 100;
    if (percentCompleted < 30 && envContext.timeContext === "evening") {
      intervalMinutes = Math.round(intervalMinutes * 0.7);
    } else if (percentCompleted > 80) {
      intervalMinutes = Math.round(intervalMinutes * 1.3);
    }
    return intervalMinutes;
  }
  return 120;
};

// Global bildirim penceresine göre su hatırlatma zamanlarını hesaplar.
const computeWaterReminderTimes = async (user, waterData) => {
  const windowStartStr =
    (user.notificationWindow && user.notificationWindow.start) || "08:00";
  const windowEndStr =
    (user.notificationWindow && user.notificationWindow.end) || "22:00";
  const nowTurkey = getTurkeyTime();
  const todayStr = nowTurkey.toLocaleDateString("en-CA");
  const windowStart = new Date(`${todayStr}T${windowStartStr}:00`);
  const windowEnd = new Date(`${todayStr}T${windowEndStr}:00`);
  const dynamicInterval = await computeDynamicWaterInterval(user, waterData);
  const reminderTimes = [];
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

// Kullanıcının meşgul olup olmadığını kontrol eder.
const isUserBusy = async (userId, checkTime = null) => {
  try {
    const now = checkTime || getTurkeyTime();
    const startOfHour = new Date(now);
    startOfHour.setMinutes(0, 0, 0);
    const endOfHour = new Date(startOfHour);
    endOfHour.setHours(endOfHour.getHours() + 1);
    const eventsSnapshot = await db
      .collection("users")
      .doc(userId)
      .collection("calendarEvents")
      .where("start", "<=", admin.firestore.Timestamp.fromDate(endOfHour))
      .where("end", ">=", admin.firestore.Timestamp.fromDate(startOfHour))
      .limit(1)
      .get();
    return !eventsSnapshot.empty;
  } catch (err) {
    console.error("Error checking if user is busy:", err);
    return false;
  }
};

// Bildirimleri 500’lü batch’ler halinde gönderir.
const sendNotificationsInBatches = async (notifications) => {
  const batchSize = 500;
  for (let i = 0; i < notifications.length; i += batchSize) {
    const batch = notifications.slice(i, i + batchSize);
    await Promise.all(batch.map((msg) => admin.messaging().send(msg)));
  }
};

exports.handler = async function (event, context) {
  try {
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    const notificationsToSend = [];

    // 5 dakikalık önbellekleme ile tüm kullanıcıları getir (optimizasyon)
    let cachedUsers = null;
    let cacheTimestamp = 0;
    const CACHE_DURATION = 5 * 60 * 1000; // 5 dakika
    if (!cachedUsers || Date.now() - cacheTimestamp > CACHE_DURATION) {
      cachedUsers = await db.collection("users").get();
      cacheTimestamp = Date.now();
    }

    await Promise.all(
      cachedUsers.docs.map(async (userDoc) => {
        const userData = userDoc.data();
        const userId = userDoc.id;
        const fcmToken = userData.fcmToken;
        if (!fcmToken) return;

        // Rutin bildirimleri
        if (userData.routines && Array.isArray(userData.routines)) {
          userData.routines.forEach((routine) => {
            if (!routine.notificationEnabled || routine.checked) return;
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

        // Takvim bildirimleri
        try {
          const eventsSnapshot = await db
            .collection("users")
            .doc(userId)
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
                  title: `${eventData.title} - ${
                    offsetMinutes === 0
                      ? "Şu anda başlıyor"
                      : offsetMinutes === 15
                      ? "15 dakika içinde başlayacak"
                      : offsetMinutes === 60
                      ? "1 saat içinde başlayacak"
                      : "Yarın başlayacak"
                  }`,
                  body:
                    eventData.description ||
                    `Etkinlik: ${eventData.title} ${
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
          console.error(`Calendar error for user ${userId}:`, err);
        }

        // Global bildirim penceresi (su ve takviye için) kontrolü
        if (!isWithinNotificationWindow(userData)) return;

        // Su bildirimleri
        try {
          const waterRef = db
            .collection("users")
            .doc(userId)
            .collection("water")
            .doc("current");
          const waterDoc = await waterRef.get();
          if (waterDoc.exists) {
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
          console.error(`Water notification error for user ${userId}:`, err);
        }

        // Takviye bildirimleri
        try {
          const suppSnapshot = await db
            .collection("users")
            .doc(userId)
            .collection("supplements")
            .get();
          suppSnapshot.forEach((docSnap) => {
            const suppData = docSnap.data();
            if (!suppData.notification || suppData.notification === "none")
              return;
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
          });
        } catch (err) {
          console.error(
            `Supplement notification error for user ${userId}:`,
            err
          );
        }
      })
    );

    if (notificationsToSend.length > 0) {
      await sendNotificationsInBatches(notificationsToSend);
    }
    return { status: "success", notificationsSent: notificationsToSend.length };
  } catch (error) {
    console.error("Error in handler:", error);
    return { status: "error", error: error.message };
  }
};

// Yardımcı: Su hatırlatma zamanının gönderilip gönderilmeyeceğini kontrol eder.
const shouldSendWaterReminder = async (user, waterData, now) => {
  const isBusy = await isUserBusy(user.id || user.uid);
  if (isBusy) return false;
  const reminderTimes = await computeWaterReminderTimes(user, waterData);
  for (const time of reminderTimes) {
    if (Math.abs(now - time) / 60000 < 1) return true;
  }
  return false;
};
