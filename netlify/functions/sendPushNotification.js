// sendPushNotification.js
// Bu dosya, Cloud Functions ortamında çalışır ve
// rutin, takvim, su ve takviye bildirimlerini gönderir.
// İyileştirmeler:
// • Firestore okuma işlemleri paralel hale getirilerek maliyet optimize edildi.
// • Su bildirimlerinde, geçmiş veriye göre veya kullanıcı tarafından belirlenen aralığa göre dinamik (insan anatomisine uygun) aralık hesaplanarak periyodik bildirimler gönderilir.
// • Takviye bildirimlerinde, planlanmış bildirimler yalnızca ±1 dakika hassasiyetiyle kontrol edilir; ayrıca kalan gün eşiği (14, 7, 3, 1) baz alınır.
// • Global bildirim penceresi, kullanıcının ayarladığı saat değerlerine göre uygulanır (rutin ve takvim hariç).

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
  // Eğer bildirim penceresi tanımlı değilse, tüm zamanlarda bildirimi kabul et.
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
  // Eğer kullanıcı custom modda ise, belirlenen aralık esas alınır.
  if (
    waterData.waterNotificationOption === "custom" &&
    waterData.customNotificationInterval
  ) {
    return Number(waterData.customNotificationInterval) * 60;
  } else if (waterData.waterNotificationOption === "smart") {
    // Smart modda, kullanıcının profil verileri ve hava durumu dikkate alınarak zaman-of-day segmentasyonu yapılır.
    const nowTurkey = getTurkeyTime();
    const currentHour = nowTurkey.getHours();
    let smartInterval;
    if (currentHour >= 6 && currentHour < 12) {
      smartInterval = 60; // sabah
    } else if (currentHour >= 12 && currentHour < 18) {
      smartInterval = 90; // öğle
    } else {
      smartInterval = 110; // akşam
    }
    // İsteğe bağlı: Ek hesaplamalar yapılabilir; burada doğrudan segment değerleri kullanılıyor.
    return smartInterval;
  }
  // Varsayılan
  return 120;
};

// Global bildirim penceresi içinde, dinamik aralığa göre su hatırlatma zamanlarını hesaplar.
// Ayrıca, eğer waterData.notificationTimes (kullanıcı tarafından belirlenen saatler) tanımlıysa onları da hesaba katar.
const computeWaterReminderTimes = async (user, waterData) => {
  // Global pencereyi kullanıyoruz.
  if (!user.notificationWindow) return [];
  const nowTurkey = getTurkeyTime();
  const todayStr = nowTurkey.toLocaleDateString("en-CA");
  const windowStart = new Date(
    `${todayStr}T${user.notificationWindow.start}:00`
  );
  const windowEnd = new Date(`${todayStr}T${user.notificationWindow.end}:00`);

  let reminderTimes = [];
  // Eğer kullanıcı custom interval modunu seçmişse:
  if (
    waterData.waterNotificationOption === "custom" &&
    waterData.customNotificationInterval
  ) {
    const customInterval = Number(waterData.customNotificationInterval) * 60;
    let t = Math.max(windowStart.getTime(), nowTurkey.getTime());
    while (t <= windowEnd.getTime()) {
      reminderTimes.push(new Date(t));
      t += customInterval * 60000;
    }
  } else if (waterData.waterNotificationOption === "smart") {
    // Smart modda, dinamik aralık segmentasyonuna göre hesaplanır.
    const interval = await computeDynamicWaterInterval(user, waterData);
    let t = Math.max(windowStart.getTime(), nowTurkey.getTime());
    while (t <= windowEnd.getTime()) {
      reminderTimes.push(new Date(t));
      t += interval * 60000;
    }
  }
  // Eğer kullanıcı tarafından belirlenmiş direkt saatler (notificationTimes) varsa, bunları da ekleyelim.
  if (
    waterData.notificationTimes &&
    Array.isArray(waterData.notificationTimes)
  ) {
    waterData.notificationTimes.forEach((timeStr) => {
      const scheduledTime = new Date(`${todayStr}T${timeStr}:00`);
      reminderTimes.push(scheduledTime);
    });
  }
  // Tekrar sıralama
  reminderTimes.sort((a, b) => a - b);
  return reminderTimes;
};

const getNextWaterReminderTime = async (user, waterData) => {
  const reminderTimes = await computeWaterReminderTimes(user, waterData);
  const now = getTurkeyTime();
  for (const time of reminderTimes) {
    if (time > now) return time;
  }
  return null;
};

// Su hatırlatmasının şimdi gönderilip gönderilmeyeceğini (±1 dakika hassasiyetiyle) kontrol eder.
const shouldSendWaterReminder = async (user, waterData, now) => {
  const reminderTimes = await computeWaterReminderTimes(user, waterData);
  for (const time of reminderTimes) {
    if (Math.abs(now - time) / 60000 < 1) return true;
  }
  return false;
};

// Takvim bildirimleri için offset'leri uygulayarak, yalnızca şu an ile 5 dakika içindeki etkinlikleri getirir.
const processCalendarNotifications = async (userId, fcmToken, now) => {
  const notifications = [];
  try {
    const fiveMinutesLater = new Date(now.getTime() + 5 * 60 * 1000);
    const eventsSnapshot = await db
      .collection("users")
      .doc(userId)
      .collection("calendarEvents")
      .where("start", ">=", admin.firestore.Timestamp.fromDate(now))
      .where(
        "start",
        "<=",
        admin.firestore.Timestamp.fromDate(fiveMinutesLater)
      )
      .get();
    eventsSnapshot.forEach((docSnap) => {
      const eventData = docSnap.data();
      if (!eventData.notification || eventData.notification === "none") return;
      const offsetMinutes = notificationOffsets[eventData.notification] || 0;
      const eventStart = eventData.start.toDate();
      const triggerTime = new Date(
        eventStart.getTime() - offsetMinutes * 60000
      );
      if (Math.abs(now - triggerTime) / 60000 < 1) {
        notifications.push({
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
    console.error(`Kullanıcı ${userId} için takvim hatası:`, err);
  }
  return notifications;
};

// Takviye bildirimleri için:
// - Eğer kullanıcının belirlediği bildirim saatleri varsa, bu saatlerde (±1 dakika hassasiyetiyle) bildirim gönderilir.
// - Ayrıca, takviyenin kalan gün sayısı (quantity/dailyUsage) 14, 7, 3 veya 1’e eşit olduğunda bildirim tetiklenir.
const processSupplementNotifications = async (userId, fcmToken, now) => {
  const notifications = [];
  try {
    const suppSnapshot = await db
      .collection("users")
      .doc(userId)
      .collection("supplements")
      .get();
    suppSnapshot.forEach((docSnap) => {
      const suppData = docSnap.data();
      if (!suppData.notification || suppData.notification === "none") return;
      // Eğer kullanıcı, planlanmış bildirim saatlerini girmişse
      if (
        suppData.notificationSchedule &&
        Array.isArray(suppData.notificationSchedule) &&
        suppData.notificationSchedule.length > 0
      ) {
        suppData.notificationSchedule.forEach((scheduleTime) => {
          const todayStr = now.toLocaleDateString("en-CA");
          const scheduledTime = new Date(`${todayStr}T${scheduleTime}:00`);
          if (
            Math.abs(now - scheduledTime) / 60000 < 1 &&
            suppData.quantity > 0
          ) {
            notifications.push({
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
        // Bildirim saatleri belirlenmemişse, kalan gün hesaplanır.
        const estimatedRemainingDays = suppData.quantity / suppData.dailyUsage;
        const thresholds = [14, 7, 3, 1];
        const floorDays = Math.floor(estimatedRemainingDays);
        if (thresholds.includes(floorDays)) {
          notifications.push({
            token: fcmToken,
            data: {
              title: `${suppData.name} Yakında Bitiyor!`,
              body: `Takviyeniz yaklaşık ${floorDays} gün sonra bitecek. Lütfen tazeleyin.`,
              supplementId: docSnap.id,
            },
          });
        } else if (estimatedRemainingDays <= 1) {
          notifications.push({
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
    // Ayrıca, eğer global bildirim penceresinin bitimine 15 dakika kalmışsa, tüm pending takviyeleri toplu hatırlat.
    if (notifications.length === 0) {
      // Opsiyonel toplu bildirim mantığı eklenebilir.
    }
  } catch (err) {
    console.error(`Kullanıcı ${userId} için takviye hatırlatma hatası:`, err);
  }
  return notifications;
};

// Bildirimleri 500’lü batch’ler halinde gönderir.
const sendNotificationsInBatches = async (notifications) => {
  const batchSize = 500;
  for (let i = 0; i < notifications.length; i += batchSize) {
    const batch = notifications.slice(i, i + batchSize);
    await Promise.all(batch.map((msg) => admin.messaging().send(msg)));
  }
};

// Ana handler – optimize edilmiş okuma ve bildirim tetikleme mantığı.
exports.handler = async function (event, context) {
  try {
    const now = getTurkeyTime();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    let notificationsToSend = [];

    // Tüm kullanıcıları getir (optimizasyon için burada filtreleme yapılabilir)
    const usersSnapshot = await db.collection("users").get();

    await Promise.all(
      usersSnapshot.docs.map(async (userDoc) => {
        const userData = userDoc.data();
        const userId = userDoc.id;
        const fcmToken = userData.fcmToken;
        if (!fcmToken) return; // FCM token yoksa atla

        // Rutin Bildirimleri (global ayardan bağımsız)
        if (userData.routines && Array.isArray(userData.routines)) {
          userData.routines.forEach((routine) => {
            if (!routine.notificationEnabled || routine.checked) return;
            const [localHour, localMinute] = routine.time
              .split(":")
              .map(Number);
            // Türkiye saati baz alınarak UTC dönüşümü (+3 fark varsayılır)
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
        const calendarNotifications = await processCalendarNotifications(
          userId,
          fcmToken,
          now
        );
        notificationsToSend = notificationsToSend.concat(calendarNotifications);

        // Global bildirim penceresi yalnızca SU ve TAKVİYE için geçerli
        if (!isWithinNotificationWindow(userData)) return;

        // Su Bildirimleri
        try {
          const waterRef = db
            .collection("users")
            .doc(userId)
            .collection("water")
            .doc("current");
          const waterDoc = await waterRef.get();
          if (waterDoc.exists()) {
            const waterData = waterDoc.data();
            if (
              waterData.waterNotificationOption !== "none" &&
              waterData.waterIntake < waterData.dailyWaterTarget
            ) {
              if (
                (await shouldSendWaterReminder(userData, waterData, now)) ||
                waterData.waterIntake === 0 ||
                waterData.waterIntake < waterData.dailyWaterTarget * 0.3
              ) {
                // Eğer custom veya smart modda ise, mesaj detayını ekleyebiliriz (isteğe bağlı)
                notificationsToSend.push({
                  token: fcmToken,
                  data: {
                    title: "Su İçme Hatırlatması",
                    body: `Günlük su hedefin ${waterData.dailyWaterTarget} ml. Su içmeyi unutmayın!`,
                    type: "water",
                  },
                });
              }
            }
          }
        } catch (err) {
          console.error(`Kullanıcı ${userId} için su hatırlatma hatası:`, err);
        }

        // Takviye Bildirimleri
        try {
          const supplementNotifications = await processSupplementNotifications(
            userId,
            fcmToken,
            now
          );
          notificationsToSend = notificationsToSend.concat(
            supplementNotifications
          );
        } catch (err) {
          console.error(
            `Kullanıcı ${userId} için takviye hatırlatma hatası:`,
            err
          );
        }
      })
    );

    // Bildirimleri 500'lük batch'ler halinde gönder.
    if (notificationsToSend.length > 0) {
      await sendNotificationsInBatches(notificationsToSend);
    }
    return {
      statusCode: 200,
      body: JSON.stringify({ notificationsSent: notificationsToSend.length }),
    };
  } catch (error) {
    console.error("Push bildirim gönderimi hatası:", error);
    return { statusCode: 500, body: error.toString() };
  }
};
