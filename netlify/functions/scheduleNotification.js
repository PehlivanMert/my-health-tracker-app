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
    // Request validation
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Boş istek gövdesi" }),
      };
    }

    const { token, title, scheduledTime, userId } = JSON.parse(event.body);

    // Log incoming data
    console.log("Alınan scheduledTime:", scheduledTime);
    console.log("Kullanıcı ID:", userId);
    console.log("Token:", token?.slice(0, 15) + "...");

    // Field validation
    if (!token || !title || !scheduledTime || !userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Eksik gerekli alanlar (token, title, scheduledTime, userId)",
        }),
      };
    }

    // Date validation
    const targetDate = new Date(scheduledTime);
    const now = new Date();

    console.log("Hedef Tarih (UTC):", targetDate.toISOString());
    console.log("Şu anki Zaman (UTC):", now.toISOString());
    console.log("Fark (ms):", targetDate.getTime() - now.getTime());

    if (isNaN(targetDate.getTime())) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Geçersiz tarih formatı" }),
      };
    }

    if (targetDate < now) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Geçmiş tarihli bildirim planlanamaz" }),
      };
    }

    if (targetDate - now > 30 * 24 * 60 * 60 * 1000) {
      // 30 gün kontrolü
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Maksimum 30 gün sonrası için planlama yapabilirsiniz",
        }),
      };
    }

    // Firestore'a kayıt
    const notificationRef = await db
      .collection("users")
      .doc(userId)
      .collection("notifications")
      .add({
        title,
        scheduledTime: admin.firestore.Timestamp.fromDate(targetDate),
        status: "scheduled",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        token,
      });

    // Zamanlayıcıyı ayarla
    const job = schedule.scheduleJob(targetDate, async () => {
      try {
        const userDoc = await db.collection("users").doc(userId).get();

        if (!userDoc.exists) {
          await notificationRef.update({
            status: "failed",
            error: "Kullanıcı bulunamadı",
          });
          return;
        }

        const currentToken = userDoc.data().fcmToken || token;
        if (!currentToken) {
          await notificationRef.update({
            status: "failed",
            error: "Geçerli FCM token yok",
          });
          return;
        }

        // Bildirimi gönder
        await admin.messaging().send({
          token: currentToken,
          notification: {
            title: title,
            body: `⏰ ${title} zamanı geldi!`,
          },
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
    console.error("Kritik hata:", {
      message: error.message,
      stack: error.stack,
      rawError: error,
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal Server Error",
        details: error.message,
      }),
    };
  }
};
