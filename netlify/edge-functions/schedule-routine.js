// schedule-routine.js
import webpush from "web-push";

// VAPID anahtarlarını ortam değişkenlerinden alıyoruz.
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

webpush.setVapidDetails(
  "mailto:pehlivanmert@outlook.com.tr",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// Örnek amaçlı geçici planlama nesnesi (stateless ortamda kalıcı değildir)
let scheduledRoutines = {};

export default async (request, context) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  try {
    const {
      id,
      title,
      time,
      isRecurring,
      recurrenceType,
      recurrenceUntil,
      notification,
    } = await request.json();
    // Bu verileri kalıcı depolama kullanarak saklamanız önerilir.
    scheduledRoutines[id] = {
      id,
      title,
      time, // HH:mm formatında
      isRecurring,
      recurrenceType,
      recurrenceUntil,
      notification,
    };
    console.log(`Rutin bildirimi planlandı: ${id} - ${title} saat: ${time}`);
    return new Response(
      JSON.stringify({ message: "Rutin bildirimi başarıyla planlandı." }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Schedule Routine Hatası:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
