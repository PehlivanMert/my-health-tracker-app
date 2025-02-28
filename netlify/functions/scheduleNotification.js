const admin = require("firebase-admin");
const schedule = require("node-schedule");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    ),
  });
}

const jobs = new Map();

exports.handler = async (event) => {
  try {
    const { token, title, scheduledTime } = JSON.parse(event.body);
    const targetDate = new Date(scheduledTime);

    if (targetDate < new Date()) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Geçmiş tarihli bildirim planlanamaz" }),
      };
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const job = schedule.scheduleJob(jobId, targetDate, async () => {
      try {
        await admin.messaging().send({
          token,
          notification: { title, body: `⏰ ${title} zamanı!` },
        });
        jobs.delete(jobId);
      } catch (error) {
        console.error("Bildirim gönderilemedi:", error);
      }
    });

    jobs.set(jobId, job);

    return {
      statusCode: 200,
      body: JSON.stringify({
        notificationId: jobId,
        scheduledTime: targetDate.toISOString(),
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
