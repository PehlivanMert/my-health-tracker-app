const admin = require("firebase-admin");
const schedule = require("node-schedule");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    ),
    databaseURL: `https://${
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT).project_id
    }.firebaseio.com`,
  });
}

const db = admin.firestore();
const jobs = new Map();

exports.handler = async (event) => {
  try {
    const { token, title, scheduledTime, userId } = JSON.parse(event.body);

    // Zorunlu alan kontrolü
    if (!token || !title || !scheduledTime || !userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Eksik gerekli alanlar (token, title, scheduledTime, userId)",
        }),
      };
    }

    const targetDate = new Date(scheduledTime);
    const now = new Date();

    // Geçerlilik kontrolleri
    if (targetDate < now) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Geçmiş tarihli bildirim planlanamaz" }),
      };
    }

    if (targetDate - now > 30 * 24 * 60 * 60 * 1000) {
      // 30 günden fazla
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Maksimum 30 gün sonrası için planlama yapabilirsiniz",
        }),
      };
    }

    // Firestore'a kaydet
    const notificationRef = await db
      .collection("users")
      .doc(userId)
      .collection("notifications")
      .add({
        title,
        scheduledTime: admin.firestore.Timestamp.fromDate(targetDate),
        status: "scheduled",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        token, // Debug için token'ı da kaydet
      });

    // Zamanlayıcıyı ayarla
    const job = schedule.scheduleJob(targetDate, async () => {
      try {
        const job = schedule.scheduleJob(targetDate, async () => {
          // Token geçerlilik kontrolü ekleyin
          const userDoc = await db.collection("users").doc(userId).get();
          if (!userDoc.exists) {
            console.log("Kullanıcı bulunamadı");
            return;
          }

          const currentToken = userDoc.data().fcmToken;
          if (!currentToken) {
            await notificationRef.update({
              status: "failed",
              error: "Token bulunamadı",
            });
            return;
          }

          // Bildirimi mevcut token ile gönder
          await admin.messaging().send({
            token: currentToken,
            notification: { title, body: `⏰ ${title} zamanı geldi!` },
          });
        });

        // Durumu güncelle
        await notificationRef.update({
          status: "sent",
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (error) {
        console.error("Bildirim gönderme hatası:", error);
        await notificationRef.update({
          status: "failed",
          error: error.message,
        });
      } finally {
        jobs.delete(job.name);
      }
    });

    jobs.set(job.name, job);

    return {
      statusCode: 200,
      body: JSON.stringify({
        notificationId: notificationRef.id,
        jobId: job.name,
        scheduledTime: targetDate.toISOString(),
      }),
    };
  } catch (error) {
    console.error("Kritik hata:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal Server Error",
        details: error.message,
      }),
    };
  }
};
