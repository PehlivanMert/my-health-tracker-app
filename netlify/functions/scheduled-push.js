// netlify/functions/scheduled-push.js

const webpush = require("web-push");

// .env dosyanızdaki VAPID anahtarlarını kullanıyoruz:
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

webpush.setVapidDetails(
  "mailto:pehlivanmert@outlook.com.tr", // Kendi e-posta adresinizi ekleyin
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// Gerçek projede, abonelikleri kalıcı bir veri kaynağından çekmelisiniz.
// Şimdilik örnek amaçlı boş bir dizi kullanıyoruz.
const subscriptions = [
  // Örneğin: { endpoint: 'https://fcm.googleapis.com/fcm/send/....', keys: { p256dh: '...', auth: '...' } }
];

exports.handler = async (event, context) => {
  console.log("Scheduled function triggered: push bildirimleri gönderiliyor");

  // Test payload – gerçek senaryoda, rutin bilgilerine göre oluşturulabilir.
  const payload = JSON.stringify({
    title: "Planlı Bildirim",
    body: "Bu, Netlify Scheduled Function tarafından gönderilen test bildirimidir.",
    url: "/", // Bildirime tıklandığında açılacak URL
  });

  // Tüm aboneliklere push bildirimi gönderiyoruz.
  const sendPromises = subscriptions.map((subscription) =>
    webpush.sendNotification(subscription, payload).catch((err) => {
      console.error("Bildirim gönderim hatası:", err);
    })
  );

  await Promise.all(sendPromises);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Scheduled push bildirimleri gönderildi.",
    }),
  };
};
