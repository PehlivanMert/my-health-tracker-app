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

        // Geçersiz tokenları filtrele
        const validTokens = currentTokens.filter(
          (token) => !invalidTokens.includes(token)
        );

        // Sadece değişiklik varsa güncelle
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

exports.handler = async function (event, context) {
  try {
    const now = getTurkeyTime();
    const notificationsToSend = [];

    // Cache'lenmiş kullanıcıları alıyoruz (15 dakikalık TTL)
    const userDocs = await getCachedUsers();

    // Kullanıcılar arası işlemleri paralel yürütüyoruz
    await Promise.all(
      userDocs.map(async (userDoc) => {
        const userData = userDoc.data();
        const fcmTokens = userData.fcmTokens; // Token dizisi kullanılıyor
        if (!fcmTokens || fcmTokens.length === 0) return;

        // Kullanıcıya ait bildirimleri toplamak için yerel dizi
        let notificationsForThisUser = [];

        // ---------- Rutin Bildirimleri ----------
        if (userData.routines && Array.isArray(userData.routines)) {
          // Bugünün tarihini YYYY-MM-DD formatında alıyoruz.
          const currentDateStr = new Date().toISOString().split("T")[0];

          userData.routines.forEach((routine) => {
            // Eğer bildirimler kapalıysa, rutin tamamlanmışsa veya rutinin tarihi bugünün tarihi değilse bildirim gönderme.
            if (
              !routine.notificationEnabled ||
              routine.completed ||
              routine.date !== currentDateStr
            )
              return;

            // Başlangıç zamanına bildirim
            const [startHour, startMinute] = routine.time
              .split(":")
              .map(Number);
            const startTime = new Date(now);
            startTime.setHours(startHour, startMinute, 0, 0);
            if (Math.abs(now - startTime) / 60000 < 0.5) {
              console.log(
                `sendPushNotification - Kullanıcı ${userDoc.id} için başlangıç zamanı bildirimi:`,
                startTime
              );
              notificationsForThisUser.push({
                tokens: fcmTokens,
                data: {
                  title: "Rutin Başlangıç Hatırlatması",
                  body: `Şimdi ${routine.title} rutini başlayacak!`,
                  routineId: routine.id || "",
                },
              });
            }

            // Bitiş zamanı varsa, bitiş zamanına bildirim
            if (routine.endTime) {
              const [endHour, endMinute] = routine.endTime
                .split(":")
                .map(Number);
              const endTime = new Date(now);
              endTime.setHours(endHour, endMinute, 0, 0);
              if (Math.abs(now - endTime) / 60000 < 0.5) {
                console.log(
                  `sendPushNotification - Kullanıcı ${userDoc.id} için bitiş zamanı bildirimi:`,
                  endTime
                );
                notificationsForThisUser.push({
                  tokens: fcmTokens,
                  data: {
                    title: "Rutin Bitiş Hatırlatması",
                    body: `Şimdi ${routine.title} rutini sona erecek!`,
                    routineId: routine.id || "",
                  },
                });
              }
            }
          });
        }

        // ---------- Pomodoro Bildirimleri (Advanced Timer targetTime kullanarak) ----------
        const advancedTimerDoc = await db
          .collection("users")
          .doc(userDoc.id)
          .collection("advancedTimer")
          .doc("state")
          .get();

        if (advancedTimerDoc.exists) {
          const timerState = advancedTimerDoc.data();
          if (timerState.targetTime) {
            // targetTime Firestore'da saklanan milisaniye değeri (ör. 1742257035585)
            const targetTimeDate = new Date(timerState.targetTime);
            // Türkiye saatine dönüştürün
            const targetTimeTurkey = new Date(
              targetTimeDate.toLocaleString("en-US", {
                timeZone: "Europe/Istanbul",
              })
            );
            // Şu anki Türkiye zamanı
            const nowTurkey = new Date(
              now.toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
            );
            // Eğer fark 0.5 dakika (30 saniye) içindeyse bildirim gönder
            if (Math.abs(nowTurkey - targetTimeTurkey) / 60000 < 0.5) {
              console.log(
                `sendPushNotification - Kullanıcı ${userDoc.id} için Pomodoro hedef zamanı bildirimi:`,
                targetTimeTurkey
              );
              notificationsForThisUser.push({
                tokens: fcmTokens,
                data: {
                  title: "Pomodoro Bildirimi",
                  body: "Pomodoro süreniz tamamlandı!",
                  type: "pomodoro",
                },
              });
            }
          }
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

        // ---------- Global Bildirim Penceresi Kontrolü (Su ve Takviye bildirimleri için) ----------
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
            // Bildirim gönderimini atla
            return;
          }
        }

        // ---------- Su Bildirimleri (Global bildirim penceresi kontrolü geçerse) ----------
        if (isWithinNotificationWindow && waterSnap && waterSnap.exists) {
          const waterData = waterSnap.data();

          // Mevcut su bildirim zamanı (nextWaterReminderTime) için bildirim:
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

          // GECE YARISI RESET BİLDİRİMİ: Eğer mevcut zaman gece yarısına yakınsa (±1 dakika)
          const midnight = new Date(now);
          midnight.setHours(0, 0, 0, 0);
          if (Math.abs(now.getTime() - midnight.getTime()) < 60000) {
            let resetMessage = "";
            if (waterData.waterIntake >= waterData.dailyWaterTarget) {
              // Başarı mesajları (10 adet)
              const successMessages = [
                "Harika! Bugün su hedefini gerçekleştirdin!",
                "Mükemmel, su hedefin tamamlandı!",
                "Tebrikler! Vücudun için gereken suyu aldın!",
                "Su hedefine ulaştın, sağlığın için büyük bir adım!",
                "Bugün suyu tamamlama başarın takdire şayan!",
                "Su hedefini aştın, süper bir performans!",
                "Bugün su içmeyi ihmal etmedin, tebrikler!",
                "Sağlığın için harika bir gün, su hedefine ulaştın!",
                "Günlük su hedefin tamamlandı, mükemmel!",
                "Bugün su hedefine ulaşman motivasyonunu artırıyor!",
              ];
              resetMessage =
                successMessages[
                  Math.floor(Math.random() * successMessages.length)
                ];
            } else {
              // Başarısız mesajlar (10 adet)
              const failMessages = [
                `Bugün ${waterData.waterIntake} ml su içtin, hedefin ${waterData.dailyWaterTarget} ml. Yarın daha iyi yapabilirsin!`,
                `Su hedefin ${waterData.dailyWaterTarget} ml idi, ancak bugün sadece ${waterData.waterIntake} ml içtin.`,
                `Hedefin ${waterData.dailyWaterTarget} ml, bugün ${waterData.waterIntake} ml su içtin. Biraz daha çabalayalım!`,
                `Yeterince su içemedin: ${waterData.waterIntake} ml / ${waterData.dailyWaterTarget} ml.`,
                `Bugün su hedefine ulaşamadın (${waterData.waterIntake} / ${waterData.dailyWaterTarget} ml). Yarın şansın daha iyi olsun!`,
                `Hedefin ${waterData.dailyWaterTarget} ml, ancak bugün ${waterData.waterIntake} ml su içtin. Daha fazlasını dene!`,
                `Su alımında eksik kaldın: ${waterData.waterIntake} ml içtin, hedefin ${waterData.dailyWaterTarget} ml.`,
                `Günlük hedefin ${waterData.dailyWaterTarget} ml, bugün ${waterData.waterIntake} ml su içtin. Hedefe yaklaşabilirsin!`,
                `Bugün su alımın hedefin altındaydı (${waterData.waterIntake} / ${waterData.dailyWaterTarget} ml). Yarın daha iyi yap!`,
                `Su hedefin ${waterData.dailyWaterTarget} ml, fakat bugün sadece ${waterData.waterIntake} ml içtin. Bir sonraki sefer daha dikkatli!`,
              ];
              resetMessage =
                failMessages[Math.floor(Math.random() * failMessages.length)];
            }
            console.log(
              `sendPushNotification - Kullanıcı ${userDoc.id} için gece yarısı su reset bildirimi zamanı:`,
              now
            );
            notificationsForThisUser.push({
              tokens: fcmTokens,
              data: {
                title: "Günlük Su Reset Bildirimi",
                body: resetMessage,
                type: "water-reset",
              },
            });
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

        // Kullanıcıya ait bildirimler varsa, kullanıcı ID'si ile birlikte ekle
        if (notificationsForThisUser.length > 0) {
          notificationsToSend.push({
            userId: userDoc.id,
            notifications: notificationsForThisUser,
          });
        }
      })
    );

    // Tüm bildirim mesajlarını, her token için ayrı ayrı gönder ve geçersiz tokenları temizle
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
