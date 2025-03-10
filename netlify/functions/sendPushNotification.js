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

// Takvim bildirimleri için offsetler (dakika cinsinden)
const notificationOffsets = {
  "on-time": 0,
  "15-minutes": 15,
  "1-hour": 60,
  "1-day": 1440,
};

// Türkiye saatini döndürür
const getTurkeyTime = () => {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
  );
};

// Cache TTL: 15 dakika (900.000 ms)
const CACHE_TTL = 900000;

// Global cache değişkenleri
let cachedUsers = null;
let cachedUsersTimestamp = 0;
const calendarEventsCache = {};
const waterCache = {};
const supplementsCache = {};

// Cache'lenmiş kullanıcıları alır
const getCachedUsers = async () => {
  const nowMillis = Date.now();
  if (cachedUsers && nowMillis - cachedUsersTimestamp < CACHE_TTL) {
    console.log("Kullanıcılar ve Rutinler cache'den alınıyor.");
    return cachedUsers;
  }
  console.log("Kullanıcılar ve Rutinler Firestore'dan çekiliyor.");
  const snapshot = await db.collection("users").get();
  cachedUsers = snapshot.docs;
  cachedUsersTimestamp = nowMillis;
  return cachedUsers;
};

// Cache'lenmiş takvim verilerini alır
const getCachedCalendarEvents = async (userId) => {
  const nowMillis = Date.now();
  if (
    calendarEventsCache[userId] &&
    nowMillis - calendarEventsCache[userId].timestamp < CACHE_TTL
  ) {
    console.log(`Takvim verileri cache'den alınıyor (user: ${userId}).`);
    return calendarEventsCache[userId].data;
  }
  console.log(`Takvim verileri Firestore'dan çekiliyor (user: ${userId}).`);
  const snapshot = await db
    .collection("users")
    .doc(userId)
    .collection("calendarEvents")
    .get();
  calendarEventsCache[userId] = { data: snapshot, timestamp: nowMillis };
  return snapshot;
};

// Cache'lenmiş su verilerini alır
const getCachedWater = async (userId) => {
  const nowMillis = Date.now();
  if (
    waterCache[userId] &&
    nowMillis - waterCache[userId].timestamp < CACHE_TTL
  ) {
    console.log(`Su verileri cache'den alınıyor (user: ${userId}).`);
    return waterCache[userId].data;
  }
  console.log(`Su verileri Firestore'dan çekiliyor (user: ${userId}).`);
  const snapshot = await db
    .collection("users")
    .doc(userId)
    .collection("water")
    .doc("current")
    .get();
  waterCache[userId] = { data: snapshot, timestamp: nowMillis };
  return snapshot;
};

// Cache'lenmiş supplement verilerini alır
const getCachedSupplements = async (userId) => {
  const nowMillis = Date.now();
  if (
    supplementsCache[userId] &&
    nowMillis - supplementsCache[userId].timestamp < CACHE_TTL
  ) {
    console.log(`Supplement verileri cache'den alınıyor (user: ${userId}).`);
    return supplementsCache[userId].data;
  }
  console.log(`Supplement verileri Firestore'dan çekiliyor (user: ${userId}).`);
  const snapshot = await db
    .collection("users")
    .doc(userId)
    .collection("supplements")
    .get();
  supplementsCache[userId] = { data: snapshot, timestamp: nowMillis };
  return snapshot;
};

exports.handler = async function (event, context) {
  try {
    const now = getTurkeyTime();
    const notificationsToSend = [];

    // Cache’lenmiş kullanıcıları alıyoruz (15 dakikalık TTL)
    const userDocs = await getCachedUsers();

    // Kullanıcılar arası işlemleri paralel yürütüyoruz
    await Promise.all(
      userDocs.map(async (userDoc) => {
        const userData = userDoc.data();
        const fcmTokens = userData.fcmTokens; // Artık token dizisi kullanılıyor
        if (!fcmTokens || fcmTokens.length === 0) return;

        // ---------- Rutin Bildirimleri ----------
        if (userData.routines && Array.isArray(userData.routines)) {
          userData.routines.forEach((routine) => {
            if (!routine.notificationEnabled || routine.checked) return;
            const [routineHour, routineMinute] = routine.time
              .split(":")
              .map(Number);
            const routineTime = new Date(now);
            routineTime.setHours(routineHour, routineMinute, 0, 0);
            if (Math.abs(now - routineTime) / 60000 < 0.3) {
              console.log(
                `sendPushNotification - Kullanıcı ${userDoc.id} için rutin bildirimi zamanı:`,
                routineTime
              );
              notificationsToSend.push({
                tokens: fcmTokens,
                data: {
                  title: "Rutin Hatırlatması",
                  body: `Şimdi ${routine.title} rutininin zamanı geldi!`,
                  routineId: routine.id || "",
                },
              });
            }
          });
        }

        // ---------- Cache'lenmiş Subcollection Sorgularını Paralel Çalıştırma ----------
        const [calendarSnapshot, waterSnap, suppSnapshot] = await Promise.all([
          getCachedCalendarEvents(userDoc.id).catch((err) => {
            console.error(`Kullanıcı ${userDoc.id} için takvim hatası:`, err);
            return null;
          }),
          getCachedWater(userDoc.id).catch((err) => {
            console.error(
              `Kullanıcı ${userDoc.id} için su hatırlatma hatası:`,
              err
            );
            return null;
          }),
          getCachedSupplements(userDoc.id).catch((err) => {
            console.error(
              `Kullanıcı ${userDoc.id} için takviye hatırlatma hatası:`,
              err
            );
            return null;
          }),
        ]);

        // ---------- Takvim Bildirimleri (Global bildirim penceresinden bağımsız) ----------
        if (calendarSnapshot) {
          calendarSnapshot.forEach((docSnap) => {
            const eventData = docSnap.data();
            if (!eventData.notification || eventData.notification === "none")
              return;
            const offsetMinutes =
              notificationOffsets[eventData.notification] || 0;
            const eventStart = eventData.start.toDate();
            const eventStartTurkey = new Date(
              eventStart.toLocaleString("en-US", {
                timeZone: "Europe/Istanbul",
              })
            );
            console.log(
              `sendPushNotification - Kullanıcı ${userDoc.id} için su bildirimi zamanı:`,
              eventData.title
            );
            const triggerTime = new Date(
              eventStartTurkey.getTime() - offsetMinutes * 60000
            );
            if (Math.abs(now - triggerTime) / 60000 < 0.3) {
              console.log(
                `sendPushNotification - Kullanıcı ${userDoc.id} için takvim bildirimi zamanı:`,
                triggerTime
              );
              notificationsToSend.push({
                tokens: fcmTokens,
                data: {
                  title: "Takvim Etkinliği Hatırlatması",
                  body: `Etkinlik: ${eventData.title} ${
                    offsetMinutes > 0
                      ? `(${offsetMinutes} dakika sonra)`
                      : "(şimdi)"
                  } başlayacak.`,
                  eventId: docSnap.id,
                },
              });
            }
          });
        }

        // ---------- Global Bildirim Penceresi Kontrolü (Su ve Takviye bildirimleri için) ----------
        let isWithinNotificationWindow = true;
        if (userData.notificationWindow) {
          const [nowHour, nowMinute] = now
            .toLocaleTimeString("tr-TR", {
              hour: "2-digit",
              minute: "2-digit",
            })
            .split(":")
            .map(Number);
          const nowTotal = nowHour * 60 + nowMinute;
          const [startH, startM] = userData.notificationWindow.start
            .split(":")
            .map(Number);
          const [endH, endM] = userData.notificationWindow.end
            .split(":")
            .map(Number);
          const startTotal = startH * 60 + startM;
          const endTotal = endH * 60 + endM;
          if (!(nowTotal >= startTotal && nowTotal <= endTotal)) {
            console.log(
              `Kullanıcı ${userDoc.id} için bildirim penceresi dışında: ${nowTotal} - ${startTotal}-${endTotal}`
            );
            isWithinNotificationWindow = false;
          }
        }

        // ---------- Su Bildirimleri (Global bildirim penceresi kontrolü geçerse) ----------
        if (isWithinNotificationWindow && waterSnap && waterSnap.exists) {
          const waterData = waterSnap.data();
          if (waterData && waterData.nextWaterReminderTime) {
            const nextReminder = new Date(waterData.nextWaterReminderTime);
            const nextReminderTurkey = new Date(
              nextReminder.toLocaleString("en-US", {
                timeZone: "Europe/Istanbul",
              })
            );
            console.log(
              `sendPushNotification - Kullanıcı ${userDoc.id} için su bildirimi zamanı:`,
              nextReminderTurkey
            );
            if (Math.abs(now - nextReminderTurkey) / 60000 < 0.6) {
              notificationsToSend.push({
                tokens: fcmTokens,
                data: {
                  title: "Su İçme Hatırlatması",
                  body:
                    waterData.nextWaterReminderMessage ||
                    `Günlük su hedefin ${waterData.dailyWaterTarget} ml. Su içmeyi unutma!`,
                  nextWaterReminderTime: waterData.nextWaterReminderTime,
                  nextWaterReminderMessage: waterData.nextWaterReminderMessage,
                  type: "water",
                },
              });
            }
          }
        }

        // ---------- Takviye Bildirimleri (Global bildirim penceresi kontrolü geçerse) ----------
        if (isWithinNotificationWindow && suppSnapshot) {
          suppSnapshot.forEach((docSnap) => {
            const suppData = docSnap.data();
            if (
              suppData.notification !== "none" &&
              suppData.nextSupplementReminderTime &&
              suppData.quantity > 0
            ) {
              const nextReminder = new Date(
                suppData.nextSupplementReminderTime
              );
              const nextReminderTurkey = new Date(
                nextReminder.toLocaleString("en-US", {
                  timeZone: "Europe/Istanbul",
                })
              );
              console.log(
                `sendPushNotification - Kullanıcı ${userDoc.id} için takviye bildirimi zamanı:`,
                nextReminderTurkey
              );
              if (Math.abs(now - nextReminderTurkey) / 60000 < 0.3) {
                console.log(
                  `sendPushNotification - Kullanıcı ${userDoc.id} için takviye bildirimi zamanı:`,
                  nextReminderTurkey
                );
                const estimatedRemainingDays = Math.floor(
                  suppData.quantity / suppData.dailyUsage
                );
                let title = "";
                let body = "";
                if (estimatedRemainingDays === 0) {
                  title = `${suppData.name} Takviyen Bitti!`;
                  body = `Takviyen tamamen tükendi. Lütfen yenilemeyi unutmayın.`;
                } else if ([14, 7, 3, 1].includes(estimatedRemainingDays)) {
                  title = `${suppData.name} Takviyeden ${estimatedRemainingDays} Gün Kaldı!`;
                  body = `Takviyeden ${estimatedRemainingDays} gün kaldı. Zamanında almayı unutmayın.`;
                } else {
                  title = `${suppData.name} Takviyesini Almayı Unutmayın!`;
                  body = `Belirlenen saatte (${nextReminderTurkey.toLocaleTimeString(
                    "tr-TR",
                    { hour: "2-digit", minute: "2-digit" }
                  )}) almanız gereken takviyeyi henüz almadınız.`;
                }
                notificationsToSend.push({
                  tokens: fcmTokens,
                  data: {
                    title,
                    body,
                    supplementId: docSnap.id,
                  },
                });
              }
            }
          });
        }
      })
    );

    // Tüm bildirim mesajlarını paralel olarak multicast kullanarak gönderiyoruz
    const sendResults = await Promise.all(
      notificationsToSend.map((msg) =>
        admin
          .messaging()
          .sendMulticast(msg)
          .catch((err) => {
            console.error("Bildirim gönderme hatası:", err, "Mesaj:", msg);
            return err;
          })
      )
    );
    console.log(
      "sendPushNotification - Gönderilen bildirim sonuçları:",
      sendResults
    );
    return {
      statusCode: 200,
      body: JSON.stringify({ results: sendResults }),
    };
  } catch (error) {
    console.error(
      "sendPushNotification - Push bildirim gönderimi hatası:",
      error
    );
    return { statusCode: 500, body: error.toString() };
  }
};
