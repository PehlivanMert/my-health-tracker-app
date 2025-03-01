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

        // Debug logları
        console.log(
          `Fonksiyon tetiklendi: currentHour=${currentHour}, currentMinute=${currentMinute}`
        );
        console.log(
          `Rutin zamanı: localHour=${localHour}, localMinute=${localMinute}, utcHour=${utcHour}`
        );

        // Zaman farkını hesapla
        const timeDiff = Math.abs(
          currentMinute + currentHour * 60 - (utcHour * 60 + localMinute)
        );

        // Eğer 2 dakika içinde ise bildirimi gönder
        if (timeDiff < 2) {
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
