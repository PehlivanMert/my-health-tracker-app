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

// Cache TTL: 10 dakika (600.000 ms)
const CACHE_TTL = 600000;

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

// sendEachForMulticast: Her bir token için ayrı ayrı bildirim gönderir ve geçersiz tokenları takip eder
const sendEachForMulticast = async (msg, userId) => {
  const { tokens, data } = msg;
  const sendPromises = tokens.map((token) =>
    admin
      .messaging()
      .send({
        token,
        data,
      })
      .then(() => ({ token, valid: true }))
      .catch((error) => {
        console.log(`Token hatası (${token}):`, error.code);
        // Geçersiz token, kayıtlı olmayan token veya kullanıcının uygulamayı kaldırdığı durumlar
        const invalidTokenErrors = [
          "messaging/invalid-registration-token",
          "messaging/registration-token-not-registered",
          "messaging/invalid-argument",
          "messaging/unregistered",
        ];
        const shouldRemove = invalidTokenErrors.includes(error.code);
        return { token, valid: false, shouldRemove, errorCode: error.code };
      })
  );

  const results = await Promise.all(sendPromises);

  // Geçersiz tokenları belirle
  const invalidTokens = results
    .filter((result) => result.shouldRemove)
    .map((result) => result.token);

  // Eğer geçersiz tokenlar varsa, bunları kullanıcı dökümanından kaldır
  if (invalidTokens.length > 0 && userId) {
    try {
      const userRef = db.collection("users").doc(userId);
      // Transaction içinde tokenları güvenli bir şekilde kaldır
      await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) return;
        const userData = userDoc.data();
        const currentTokens = userData.fcmTokens || [];
        const validTokens = currentTokens.filter(
          (token) => !invalidTokens.includes(token)
        );
        if (validTokens.length !== currentTokens.length) {
          console.log(
            `Kullanıcı ${userId} için ${
              currentTokens.length - validTokens.length
            } geçersiz token kaldırıldı`
          );
          transaction.update(userRef, { fcmTokens: validTokens });
          // Kullanıcı cache'ini sıfırla
          cachedUsers = null;
        }
      });
    } catch (err) {
      console.error(
        `Kullanıcı ${userId} için FCM tokenları temizlenemedi:`,
        err
      );
    }
  }
  return results;
};

// ─── Ana Push Bildirim Gönderim Fonksiyonu ─────────────────────────────
exports.handler = async function (event, context) {
  try {
    const now = getTurkeyTime();
    const notificationsToSend = [];

    // Cache'lenmiş kullanıcıları alıyoruz (15 dakikalık TTL)
    const userDocs = await getCachedUsers();

    await Promise.all(
      userDocs.map(async (userDoc) => {
        const userData = userDoc.data();
        const fcmTokens = userData.fcmTokens;
        if (!fcmTokens || fcmTokens.length === 0) return;

        let notificationsForThisUser = [];

        // Rutin Bildirimleri
        if (userData.routines && Array.isArray(userData.routines)) {
          userData.routines.forEach((routine) => {
            if (!routine.notificationEnabled || routine.checked) return;
            const [routineHour, routineMinute] = routine.time
              .split(":")
              .map(Number);
            const routineTime = new Date(now);
            routineTime.setHours(routineHour, routineMinute, 0, 0);
            if (Math.abs(now - routineTime) / 60000 < 0.5) {
              console.log(
                `sendPushNotification - Kullanıcı ${userDoc.id} için rutin bildirimi zamanı:`,
                routineTime
              );
              notificationsForThisUser.push({
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

        // Subcollection Sorgularını paralel çalıştır
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

        // Takvim Bildirimleri (Global bildirim penceresinden bağımsız)
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
              `sendPushNotification - Kullanıcı ${userDoc.id} için takvim bildirimi zamanı:`,
              eventData.title
            );
            const triggerTime = new Date(
              eventStartTurkey.getTime() - offsetMinutes * 60000
            );
            if (Math.abs(now - triggerTime) / 60000 < 0.5) {
              console.log(
                `sendPushNotification - Kullanıcı ${userDoc.id} için takvim bildirimi zamanı:`,
                triggerTime
              );
              notificationsForThisUser.push({
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

        // Global Bildirim Penceresi Kontrolü (Su ve Takviye için)
        let isWithinNotificationWindow = true;
        if (userData.notificationWindow) {
          const [nowHour, nowMinute] = now
            .toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
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
          if (startTotal < endTotal) {
            isWithinNotificationWindow =
              nowTotal >= startTotal && nowTotal <= endTotal;
          } else {
            isWithinNotificationWindow =
              nowTotal >= startTotal || nowTotal <= endTotal;
          }
          if (!isWithinNotificationWindow) {
            console.log(
              `Kullanıcı ${userDoc.id} için bildirim penceresi dışında: ${nowTotal} - ${startTotal}-${endTotal}`
            );
            return;
          }
        }

        // Su Bildirimleri
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
            if (Math.abs(now - nextReminderTurkey) / 60000 < 0.5) {
              notificationsForThisUser.push({
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

        // Takviye Bildirimleri
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
              if (Math.abs(now - nextReminderTurkey) / 60000 < 0.5) {
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
                notificationsForThisUser.push({
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

        if (notificationsForThisUser.length > 0) {
          notificationsToSend.push({
            userId: userDoc.id,
            notifications: notificationsForThisUser,
          });
        }
      })
    );

    const sendResults = await Promise.all(
      notificationsToSend.map(async (userNotifications) => {
        try {
          const { userId, notifications } = userNotifications;
          const results = await Promise.all(
            notifications.map((notification) =>
              sendEachForMulticast(notification, userId)
            )
          );
          return { userId, results };
        } catch (err) {
          console.error("Bildirim gönderme hatası:", err);
          return err;
        }
      })
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

// ─────────────────────────────────────────────────────────────
// Scheduled Update Fonksiyonu
// Bu fonksiyon, Cloud Scheduler veya benzeri mekanizmalarla her dakika tetiklenir.
// Su ve takviye bildirimlerinin zamanlarının geçmiş olup olmadığını kontrol eder.
// Eğer geçmişse, ilgili saveNextWaterReminderTime veya saveNextSupplementReminderTime fonksiyonlarını çağırarak güncelleme yapar.
exports.scheduledUpdateNotifications = async (event, context) => {
  try {
    const now = getTurkeyTime();
    console.log("Scheduled update tetiklendi. Şu anki Türkiye zamanı:", now);

    const userDocs = await getCachedUsers();

    await Promise.all(
      userDocs.map(async (userDoc) => {
        const userId = userDoc.id;
        // Su bildirimlerini kontrol et
        const waterRef = db
          .collection("users")
          .doc(userId)
          .collection("water")
          .doc("current");
        const waterSnap = await getDoc(waterRef);
        if (waterSnap.exists()) {
          const waterData = waterSnap.data();
          if (waterData.nextWaterReminderTime) {
            const nextReminderTime = new Date(waterData.nextWaterReminderTime);
            if (now.getTime() > nextReminderTime.getTime() + 60000) {
              console.log(
                `Kullanıcı ${userId} için su bildirimi süresi geçmiş. Güncelleniyor...`
              );
              await saveNextWaterReminderTime({ uid: userId });
            }
          }
        }
        // Takviye bildirimlerini kontrol et
        const suppSnapshot = await getCachedSupplements(userId);
        if (suppSnapshot) {
          suppSnapshot.forEach(async (docSnap) => {
            const suppData = docSnap.data();
            if (suppData.nextSupplementReminderTime) {
              const nextSuppReminder = new Date(
                suppData.nextSupplementReminderTime
              );
              if (now.getTime() > nextSuppReminder.getTime() + 60000) {
                console.log(
                  `Kullanıcı ${userId}, Supplement ${docSnap.id} için bildirim süresi geçmiş. Güncelleniyor...`
                );
                await saveNextSupplementReminderTime(
                  { uid: userId },
                  { id: docSnap.id, ...suppData }
                );
              }
            }
          });
        }
      })
    );

    console.log("Scheduled update tamamlandı.");
    return null;
  } catch (error) {
    console.error("scheduledUpdateNotifications hatası:", error);
    return null;
  }
};

// ─────────────────────────────────────────────────────────────
// Yardımcı Fonksiyon: getNextSupplementReminderTime
// Bu fonksiyon, suppData ve kullanıcı bilgilerine göre takviyeye ait gelecek bildirim zamanını hesaplar.
// Örneğin; eğer suppData'da mevcut bir nextSupplementReminderTime varsa ve hala gelecekte ise onu döndürebilir,
// aksi halde varsayılan olarak 1 saat sonraki zamanı hesaplayabilir.
const getNextSupplementReminderTime = async (suppData, user) => {
  const now = getTurkeyTime();
  if (suppData.nextSupplementReminderTime) {
    const scheduled = new Date(suppData.nextSupplementReminderTime);
    if (scheduled.getTime() > now.getTime() + 60000) {
      return scheduled;
    }
  }
  // Varsayılan olarak, 1 saat sonrasını hesaplayalım
  return new Date(now.getTime() + 3600000);
};

// ─────────────────────────────────────────────────────────────
// Takviye Bildirim Zamanını Kaydeden Fonksiyon
// Kullanıcı ve supplement verilerine göre gelecek takviye bildirimi zamanını hesaplar ve Firestore'a kaydeder.
exports.saveNextSupplementReminderTime = async (user, suppData) => {
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
      // İsterseniz buraya consumption veya trigger verilerini güncelleyebilirsiniz.
    },
    { merge: true }
  );
  console.log(
    "saveNextSupplementReminderTime - Kaydedilen sonraki takviye bildirimi zamanı:",
    nextReminder.toISOString()
  );
  return nextReminder;
};

// ─────────────────────────────────────────────────────────────
// Su Bildirim Zamanını Kaydeden Fonksiyon
// Kullanıcının su verilerinden, gelecek su bildirimi zamanını hesaplar ve Firestore'a kaydeder.
exports.saveNextWaterReminderTime = async (user) => {
  const waterRef = doc(db, "users", user.uid, "water", "current");
  const waterSnap = await getDoc(waterRef);
  let reminderTimes = [];
  if (waterSnap.exists() && waterSnap.data().reminderTimes) {
    reminderTimes = waterSnap.data().reminderTimes.map((r) => ({
      ...r,
      time: new Date(r.time),
    }));
  }

  const now = getTurkeyTime();
  reminderTimes = reminderTimes.filter(
    (r) => r.time.getTime() > now.getTime() + 60000
  );
  if (reminderTimes.length === 0) {
    console.log(
      "saveNextWaterReminderTime - Reminders boş, yeniden hesaplanıyor."
    );
    // computeWaterReminderTimes fonksiyonunuz, su bildirim zamanlarını hesaplayıp döndüren fonksiyondur.
    reminderTimes = await computeWaterReminderTimes(user);
  }
  if (reminderTimes.length > 0) {
    const nextReminder = reminderTimes[0];
    await setDoc(
      waterRef,
      {
        nextWaterReminderTime: nextReminder.time.toISOString(),
        nextWaterReminderMessage: nextReminder.message,
        reminderTimes: reminderTimes.map((obj) => ({
          time: obj.time.toISOString(),
          message: obj.message,
        })),
      },
      { merge: true }
    );
    console.log(
      "saveNextWaterReminderTime - Kaydedilen sonraki bildirim zamanı:",
      nextReminder
    );
    return nextReminder;
  } else {
    await setDoc(
      waterRef,
      {
        nextWaterReminderTime: null,
        nextWaterReminderMessage: null,
        reminderTimes: [],
      },
      { merge: true }
    );
    console.warn(
      "saveNextWaterReminderTime - Sonraki bildirim zamanı hesaplanamadı"
    );
    return null;
  }
};
