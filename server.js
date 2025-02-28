// server.js
const express = require("express");
const axios = require("axios");
require("dotenv").config();
const cors = require("cors");
const webpush = require("web-push");
const cron = require("node-cron");

const app = express();
app.use(express.json());
app.use(cors());

// Qwen proxy endpoint (var olan kodunuz)
app.post("/api/qwen-proxy", async (req, res) => {
  try {
    console.log("Gönderilen İstek Verisi:", req.body);
    const response = await axios.post(
      "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions", // OpenAI uyumlu endpoint
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

// VAPID anahtarlarınızı .env dosyanızda tanımlayın:
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

webpush.setVapidDetails(
  "mailto:your-pehlivanmert@outlook.com", // Kendi e-posta adresinizi ekleyin
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// Abonelikleri ve planlanmış rutinleri hafızada saklıyoruz (demo amaçlı)
let subscriptions = [];
let scheduledRoutines = {}; // key: routineId, value: { reminderJob, mainJob }

// Push aboneliğini kaydetme endpoint’i
app.post("/api/save-subscription", (req, res) => {
  const subscription = req.body;
  subscriptions.push(subscription);
  console.log("Yeni push aboneliği kaydedildi:", subscription);
  res.status(201).json({});
});

// HH:mm formatındaki zamanı cron ifadesine çeviren yardımcı fonksiyon
function timeToCron(timeStr, offsetMinutes = 0) {
  const [hour, minute] = timeStr.split(":").map(Number);
  let totalMinutes = hour * 60 + minute - offsetMinutes;
  if (totalMinutes < 0) {
    totalMinutes += 24 * 60;
  }
  const newHour = Math.floor(totalMinutes / 60);
  const newMinute = totalMinutes % 60;
  // Cron formatı: "dakika saat * * *"
  return `${newMinute} ${newHour} * * *`;
}

// Rutin bildirimini planlama endpoint’i
// İstemciden; rutin id, başlık ve "HH:mm" formatında saat bilgisi gönderilmeli
app.post("/api/schedule-routine", (req, res) => {
  const { id, title, time } = req.body;
  if (!id || !title || !time) {
    return res.status(400).json({ error: "Eksik alanlar var." });
  }

  // Reminder (15 dakika öncesi) ve ana bildirim için cron ifadelerini oluşturun
  const reminderCron = timeToCron(time, 15);
  const mainCron = timeToCron(time, 0);

  // Her gün çalışacak şekilde cron job’larını planlayın
  const reminderJob = cron.schedule(
    reminderCron,
    () => {
      const payload = JSON.stringify({
        title: `Hatırlatma: ${title}`,
        body: `⏰ 15 dakika sonra ${title} zamanı!`,
        url: "/", // İlgili sayfa URL’si; isteğe bağlı güncellenebilir
      });
      subscriptions.forEach((subscription) => {
        webpush
          .sendNotification(subscription, payload)
          .catch((err) => console.error(err));
      });
      console.log(
        `Reminder bildirimi gönderildi: ${title} (Cron: ${reminderCron})`
      );
    },
    { scheduled: true }
  );

  const mainJob = cron.schedule(
    mainCron,
    () => {
      const payload = JSON.stringify({
        title: title,
        body: `⏰ ${title} zamanı geldi!`,
        url: "/", // İlgili sayfa URL’si
      });
      subscriptions.forEach((subscription) => {
        webpush
          .sendNotification(subscription, payload)
          .catch((err) => console.error(err));
      });
      console.log(`Ana bildirim gönderildi: ${title} (Cron: ${mainCron})`);
    },
    { scheduled: true }
  );

  // Rutin için oluşturulan job’ları saklayın
  scheduledRoutines[id] = { reminderJob, mainJob };
  console.log(`Rutin bildirimi planlandı: ${id} - ${title} saat: ${time}`);
  res.status(201).json({ message: "Rutin bildirimi başarıyla planlandı." });
});

// Rutin bildirimi iptali endpoint’i
app.post("/api/delete-routine", (req, res) => {
  const { id } = req.body;
  if (scheduledRoutines[id]) {
    scheduledRoutines[id].reminderJob.stop();
    scheduledRoutines[id].mainJob.stop();
    delete scheduledRoutines[id];
    console.log(`Rutin bildirimi iptal edildi: ${id}`);
  }
  res.status(200).json({ message: "Rutin bildirimi iptal edildi." });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server port ${PORT} üzerinde çalışıyor.`);
});
