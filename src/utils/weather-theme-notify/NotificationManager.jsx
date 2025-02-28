// notificationManager.js
export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error("Bildirim izni verilmedi.");
    }
  } catch (error) {
    console.error("Bildirim izni alınamadı:", error);
  }
};

const VAPID_PUBLIC_KEY =
  "BHWNSZP_0FKOmmVcNbxmRAfwiNxs_bCFpo4yQGUurapJyyGoGynE5gi-jmwYb0UezPVgAkG22dUS8KKukSdoQo8"; // .env veya sabit olarak ekleyin

// Yardımcı: Base64 string'i Uint8Array'e çevirme
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

// Kullanıcıyı push bildirime abone eder
export const subscribeUserToPush = async () => {
  await requestNotificationPermission();
  if (!("serviceWorker" in navigator)) {
    throw new Error("Servis çalışanı desteklenmiyor.");
  }
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
  console.log("Push aboneliği oluşturuldu:", subscription);
  return subscription;
};

// Aboneliği sunucuya gönderir
export const sendSubscriptionToServer = async (subscription) => {
  await fetch("/api/save-subscription", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription),
  });
};

// Push bildirimi sistemini başlatır
export const initPushNotifications = async () => {
  try {
    const subscription = await subscribeUserToPush();
    await sendSubscriptionToServer(subscription);
  } catch (error) {
    console.error("Push aboneliği başlatılamadı:", error);
  }
};
