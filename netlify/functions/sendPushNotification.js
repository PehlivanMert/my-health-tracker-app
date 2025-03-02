// CombinedNotifications.js

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

// Takvim bildirimleri için offset değerleri (dakika cinsinden)
const notificationOffsets = {
  "on-time": 0,
  "15-minutes": 15,
  "1-hour": 60,
  "1-day": 1440,
};

exports.handler = async function (event, context) {
  try {
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();

    const usersSnapshot = await db.collection("users").get();
    const routineNotifications = [];
    const calendarNotifications = [];

    // 1. Rutin Bildirimleri (Routine Notifications)
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
        if (!routine.notificationEnabled) return;
        if (routine.checked) return; // Check edilmişse bildirim gönderme

        // Lokal zamanı UTC'ye çevirme (Türkiye için UTC+3)
        const [localHour, localMinute] = routine.time.split(":").map(Number);
        const utcHour = (localHour - 3 + 24) % 24;
        console.log(
          `Fonksiyon tetiklendi: currentHour=${currentHour}, currentMinute=${currentMinute}`
        );
        console.log(
          `Rutin zamanı: localHour=${localHour}, localMinute=${localMinute}, utcHour=${utcHour}`
        );
        const timeDiff = Math.abs(
          currentMinute + currentHour * 60 - (utcHour * 60 + localMinute)
        );
        if (timeDiff < 1) {
          console.log(
            `📢 Kullanıcı ${userDoc.id} için ${routine.title} bildirimi gönderilecek.`
          );
          routineNotifications.push({
            token: fcmToken,
            data: {
              title: routine.title,
              body: `Şimdi ${routine.title} rutininin zamanı geldi!`,
              routineId: routine.id || "",
            },
          });
        }
      });
    });

    // 2. Takvim (Calendar) Bildirimleri
    // Her kullanıcı için calendarEvents alt koleksiyonunu işliyoruz
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const fcmToken = userData.fcmToken;
      if (!fcmToken) continue;

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
        // Bildirimin tetikleneceği zamanı hesaplayın: eventStart - offset

        console.log(
          `📢 Kullanıcı ${userDoc.id} için ${eventData.title} etkinliği bildirimi gönderilecek.`
        );
        calendarNotifications.push({
          token: fcmToken,
          data: {
            title: eventData.title,
            body: `Etkinlik: ${eventData.title} ${
              offsetMinutes > 0 ? `(${offsetMinutes} dakika sonra)` : "(şimdi)"
            } başlayacak.`,
            eventId: docSnap.id,
          },
        });
      });
    }

    const allNotifications = [
      ...routineNotifications,
      ...calendarNotifications,
    ];
    const sendResults = await Promise.all(
      allNotifications.map((msg) => admin.messaging().send(msg))
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
