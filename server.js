const express = require("express");
const axios = require("axios");
require("dotenv").config();
const cors = require("cors");
const schedule = require("node-schedule"); // node-schedule kütüphanesi ekleniyor

const app = express();
app.use(express.json());
app.use(cors());

// Firebase Admin SDK kurulumu
const admin = require("firebase-admin");

let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  // Geliştirme ortamı için yerel dosya
  serviceAccount = require("./serviceAccountKey.json");
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Mevcut qwen-proxy endpoint'iniz
app.post("/api/qwen-proxy", async (req, res) => {
  try {
    console.log("Gönderilen İstek Verisi:", req.body);
    const response = await axios.post(
      "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions",
      req.body,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.QWEN_API_KEY}`,
        },
      }
    );
    console.log("API Yanıtı:", response.data);
    res.json(response.data);
  } catch (error) {
    console.error("API Hatası:", error.message);
    console.error("Hata Detayları:", error.response?.data);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// Planlanan push bildirimlerini saklamak için global obje:
const scheduledPushNotifications = {};

// Endpoint: Bildirim planlama
app.post("/api/scheduleNotification", (req, res) => {
  const { token, title, body, scheduledTime } = req.body;
  const targetDate = new Date(scheduledTime);
  if (targetDate - Date.now() < 0) {
    return res.status(400).json({ error: "Planlanan zaman geçmişte." });
  }

  // Benzersiz bildirim ID'si oluşturuyoruz
  const notificationId = `notif-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  // node-schedule ile planlama yapıyoruz
  const job = schedule.scheduleJob(targetDate, () => {
    const message = {
      notification: { title, body },
      token,
    };
    admin
      .messaging()
      .send(message)
      .then((response) => {
        console.log("Bildirim gönderildi:", response);
      })
      .catch((error) => {
        console.error("Bildirim gönderme hatası:", error);
      });
    // Gönderim tamamlandığında planlamadan çıkarıyoruz.
    delete scheduledPushNotifications[notificationId];
  });

  scheduledPushNotifications[notificationId] = job;
  res.json({ notificationId, message: "Bildirim planlandı." });
});

// Endpoint: Bildirim iptal
app.post("/api/cancelNotification", (req, res) => {
  const { notificationId } = req.body;
  const job = scheduledPushNotifications[notificationId];
  if (job) {
    job.cancel();
    delete scheduledPushNotifications[notificationId];
    return res.json({ message: "Planlanan bildirim iptal edildi." });
  }
  res.status(404).json({ error: "Planlanan bildirim bulunamadı." });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Sunucu çalışıyor: http://localhost:${PORT}`);
});
