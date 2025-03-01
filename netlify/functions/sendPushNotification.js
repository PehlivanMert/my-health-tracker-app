// netlify/functions/sendPushNotification.js
const admin = require("firebase-admin");

// Firebase Admin SDK'yı başlatın; environment değişkenlerinden alınan bilgileri kullanın.
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

    // Örneğin; Firestore’da "routines" koleksiyonunda her rutine ait:
    // - time (HH:mm şeklinde UTC zamanı)
    // - notificationEnabled (boolean)
    // - fcmToken (kullanıcının token’ı) saklanıyor.
    const routinesSnapshot = await db
      .collection("routines")
      .where("notificationEnabled", "==", true)
      .get();

    const notifications = [];

    routinesSnapshot.forEach((doc) => {
      const routine = doc.data();
      console.log(
        `📢 Kullanıcıya push bildirimi gönderilecek: ${routine.title}, Token: ${routine.fcmToken}`
      );
      const [hour, minute] = routine.time.split(":").map(Number);
      if (
        hour === currentHour &&
        minute === currentMinute &&
        routine.fcmToken
      ) {
        notifications.push({
          token: routine.fcmToken,
          notification: {
            title: routine.title,
            body: `Şimdi ${routine.title} rutininin zamanı geldi!`,
          },
          data: {
            routineId: doc.id,
          },
        });
      }
    });

    // Push bildirimlerini gönderin
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
