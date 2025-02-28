// netlify/functions/scheduleNotification.js
const admin = require("firebase-admin");
const schedule = require("node-schedule");

if (!admin.apps.length) {
  // FIREBASE_SERVICE_ACCOUNT ortam değişkenini Netlify Dashboard üzerinden ayarlayın.
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Üretim ortamında, planlanan bildirimlerin veritabanında saklanması önerilir.
// Bu örnekte, geçici olarak global obje kullanılmıştır.
let scheduledPushNotifications = {};

exports.handler = async (event, context) => {
  try {
    const { token, title, body, scheduledTime } = JSON.parse(event.body);
    const targetDate = new Date(scheduledTime);
    if (targetDate - Date.now() < 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Planlanan zaman geçmişte." }),
      };
    }
    const notificationId = `notif-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // node-schedule ile gerçek zamanlı planlama
    const job = schedule.scheduleJob(targetDate, () => {
      const message = {
        notification: { title, body },
        token,
      };
      admin
        .messaging()
        .send(message)
        .then((response) => console.log("Bildirim gönderildi:", response))
        .catch((error) => console.error("Bildirim gönderme hatası:", error));
      // İş tamamlandığında job'u global objeden kaldırıyoruz.
      delete scheduledPushNotifications[notificationId];
    });

    scheduledPushNotifications[notificationId] = job;
    return {
      statusCode: 200,
      body: JSON.stringify({ notificationId, message: "Bildirim planlandı." }),
    };
  } catch (error) {
    console.error("Hata:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
