// sendPushNotification.js
const admin = require("firebase-admin");

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL:
      process.env.FIREBASE_DATABASE_URL || serviceAccount.databaseURL,
  });
}

const db = admin.firestore();

exports.handler = async function (event, context) {
  try {
    // Sunucu tarafı zamanı UTC olarak alıyoruz.
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();

    // "users" koleksiyonundaki tüm kullanıcıları alıyoruz
    const usersSnapshot = await db.collection("users").get();
    const notifications = [];

    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      const fcmToken = userData.fcmToken;
      if (!fcmToken) {
        console.log(`Kullanıcı ${userDoc.id} için fcmToken bulunamadı.`);
        return;
      }

      const routines = userData.routines;
      if (!routines || !Array.isArray(routines)) {
        console.log(`Kullanıcı ${userDoc.id} için rutinler bulunamadı.`);
        return;
      }

      routines.forEach((routine) => {
        if (!routine.notificationEnabled) return; // Bildirim kapalıysa atla

        // Lokal zamanı UTC'ye çevirme (Türkiye için UTC+3)
        const [localHour, localMinute] = routine.time.split(":").map(Number);
        const utcHour = (localHour - 3 + 24) % 24;

        // Zaman farkını hesapla
        const routineTimeInMinutes = utcHour * 60 + localMinute;
        const currentTimeInMinutes = currentHour * 60 + currentMinute;
        const timeDiff = Math.abs(currentTimeInMinutes - routineTimeInMinutes);

        // Eğer 2 dakika içinde ise bildirimi gönder
        if (timeDiff < 2) {
          // Ek kontrol: eğer yakın zamanda bildirim gönderilmişse atla
          const nowTimestamp = Date.now();
          const lastNotified = routine.lastNotifiedAt
            ? new Date(routine.lastNotifiedAt).getTime()
            : 0;
          if (nowTimestamp - lastNotified < 2 * 60 * 1000) {
            console.log(
              `Kullanıcı ${userDoc.id} için ${routine.title} bildirimi zaten gönderilmiş.`
            );
            return;
          }

          console.log(
            `📢 Kullanıcı ${userDoc.id} için ${routine.title} bildirimi gönderilecek.`
          );
          notifications.push({
            token: fcmToken,
            notification: {
              title: routine.title,
              body: `Şimdi ${routine.title} rutininin zamanı geldi!`,
            },
            data: {
              routineId: routine.id || "",
            },
          });

          // Bu rutin için son bildirim zamanını güncelle
          routine.lastNotifiedAt = new Date().toISOString();
        }
      });
    });

    // Bildirimleri gönder
    const sendResults = await Promise.all(
      notifications.map((msg) => admin.messaging().send(msg))
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ results: sendResults }),
    };
  } catch (error) {
    console.error("Push bildirim gönderimi hatası:", error);
    return { statusCode: 500, body: error.toString() };
  }
};
