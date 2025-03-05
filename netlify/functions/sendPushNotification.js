// sendPushNotification.js
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

exports.handler = async function (event, context) {
  try {
    const now = getTurkeyTime();
    const notificationsToSend = [];

    // Tüm kullanıcıları getir
    const usersSnapshot = await db.collection("users").get();

    await Promise.all(
      usersSnapshot.docs.map(async (userDoc) => {
        const userData = userDoc.data();
        const fcmToken = userData.fcmToken;
        if (!fcmToken) return;

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

        // ---------- Takvim Bildirimleri ----------
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
            const eventStartTurkey = new Date(
              eventStart.toLocaleString("en-US", {
                timeZone: "Europe/Istanbul",
              })
            );
            const triggerTime = new Date(
              eventStartTurkey.getTime() - offsetMinutes * 60000
            );
            if (Math.abs(now - triggerTime) / 60000 < 0.3) {
              notificationsToSend.push({
                token: fcmToken,
                data: {
                  title: eventData.title,
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
        } catch (err) {
          console.error(`Kullanıcı ${userDoc.id} için takvim hatası:`, err);
        }

        // ---------- Global Bildirim Penceresi Kontrolü ----------
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
          // Eğer mevcut saat global bildirim penceresi içinde değilse, o kullanıcı için diğer bildirimler gönderilmez
          if (!(nowTotal >= startTotal && nowTotal <= endTotal)) return;
        }

        // ---------- Su Bildirimleri ----------
        try {
          const waterRef = db
            .collection("users")
            .doc(userDoc.id)
            .collection("water")
            .doc("current");
          const waterSnap = await waterRef.get();

          if (waterSnap.exists) {
            // Burayı kontrol edin - exists bir metot değil, property
            const waterData = waterSnap.data();
            if (waterData && waterData.nextWaterReminderTime) {
              const nextReminder = new Date(waterData.nextWaterReminderTime);

              // Takviye bildirimlerinde olduğu gibi, Türkiye saatine dönüştürme yapıyoruz
              const nextReminderTurkey = new Date(
                nextReminder.toLocaleString("en-US", {
                  timeZone: "Europe/Istanbul",
                })
              );

              console.log(
                `sendPushNotification - Kullanıcı ${userDoc.id} için su bildirimi zamanı:`,
                nextReminderTurkey
              );
              console.log(
                "sendPushNotification - nextWaterReminderTime:",
                waterData.nextWaterReminderTime
              );
              console.log(
                "sendPushNotification - nextWaterReminderMessage:",
                waterData.nextWaterReminderMessage
              );

              // Takviye bildirimlerindeki gibi Türkiye saati ile karşılaştırma yapıyoruz
              if (Math.abs(now - nextReminderTurkey) / 60000 < 0.6) {
                notificationsToSend.push({
                  token: fcmToken,
                  data: {
                    title: "Su İçme Hatırlatması",
                    body:
                      waterData.nextWaterReminderMessage ||
                      `Günlük su hedefin ${waterData.dailyWaterTarget} ml. Su içmeyi unutma!`,
                    nextWaterReminderTime: waterData.nextWaterReminderTime,
                    nextWaterReminderMessage:
                      waterData.nextWaterReminderMessage,
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

        // ---------- Takviye Bildirimleri ----------
        try {
          const suppSnapshot = await db
            .collection("users")
            .doc(userDoc.id)
            .collection("supplements")
            .get();
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
              // Türkiye saatine göre ayarlanmış zaman
              const nextReminderTurkey = new Date(
                nextReminder.toLocaleString("en-US", {
                  timeZone: "Europe/Istanbul",
                })
              );
              console.log(
                `sendPushNotification - Kullanıcı ${userDoc.id} için takviye bildirimi zamanı (${suppData.name}):`,
                nextReminderTurkey
              );
              if (Math.abs(now - nextReminderTurkey) / 60000 < 0.3) {
                // Estimated remaining days hesaplanıyor
                const estimatedRemainingDays = Math.floor(
                  suppData.quantity / suppData.dailyUsage
                );
                let title = "";
                let body = "";
                if (estimatedRemainingDays === 0) {
                  title = `${suppData.name} Takviyen Bitti!`;
                  body = `Takviyen tamamen tükendi. Lütfen yenilemeyi unutmayın.`;
                } else if ([14, 7, 3, 1].includes(estimatedRemainingDays)) {
                  title = `${suppData.name} Takviyenden ${estimatedRemainingDays} Gün Kaldı!`;
                  body = `Takviyenden ${estimatedRemainingDays} gün kaldı. Zamanında almayı unutmayın.`;
                } else {
                  title = `${suppData.name} Takviyesini Almayı Unutmayın!`;
                  body = `Belirlenen saatte (${nextReminderTurkey.toLocaleTimeString(
                    "tr-TR",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}) almanız gereken takviyeyi henüz almadınız.`;
                }
                notificationsToSend.push({
                  token: fcmToken,
                  data: {
                    title,
                    body,
                    supplementId: docSnap.id,
                  },
                });
              }
            }
          });
        } catch (err) {
          console.error(
            `Kullanıcı ${userDoc.id} için takviye hatırlatma hatası:`,
            err
          );
        }
      })
    );

    const sendResults = await Promise.all(
      notificationsToSend.map((msg) => admin.messaging().send(msg))
    );
    console.log(
      "sendPushNotification - Gönderilen bildirim sonuçları:",
      sendResults
    );
    return { statusCode: 200, body: JSON.stringify({ results: sendResults }) };
  } catch (error) {
    console.error(
      "sendPushNotification - Push bildirim gönderimi hatası:",
      error
    );
    return { statusCode: 500, body: error.toString() };
  }
};
