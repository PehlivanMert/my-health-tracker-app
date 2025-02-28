// save-subscription.js
let subscriptions = []; // Geçici, örnek amaçlı

export default async (request, context) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  try {
    const subscription = await request.json();
    subscriptions.push(subscription);
    console.log("Yeni push aboneliği kaydedildi:", subscription);
    return new Response(JSON.stringify({}), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Save Subscription Hatası:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
