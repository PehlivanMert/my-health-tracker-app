const admin = require("firebase-admin");
const schedule = require("node-schedule");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    ),
  });
}

const scheduledJobs = {};

exports.handler = async (event, context) => {
  try {
    const { token, title, scheduledTime } = JSON.parse(event.body);
    const targetDate = new Date(scheduledTime);

    if (targetDate < new Date()) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Geçmiş tarihli bildirim planlanamaz" }),
      };
    }

    const notificationId = `notif-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 9)}`;

    const job = schedule.scheduleJob(targetDate, async () => {
      try {
        await admin.messaging().send({
          token,
          notification: {
            title: title,
            body: `⏰ ${title} zamanı geldi!`,
          },
        });
        delete scheduledJobs[notificationId];
      } catch (error) {
        console.error("Bildirim gönderilemedi:", error);
      }
    });

    scheduledJobs[notificationId] = job;

    return {
      statusCode: 200,
      body: JSON.stringify({
        notificationId,
        message: "Bildirim başarıyla planlandı",
      }),
    };
  } catch (error) {
    console.error("Hata:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
