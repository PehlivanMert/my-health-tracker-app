import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);
const db = getFirestore(app);
const auth = getAuth(app);

// VAPID key'i yapılandırma
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// FCM token'ı Firestore'a kaydet
export const saveFCMToken = async (userId, token) => {
  if (!userId || !token) return;

  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      await updateDoc(userRef, {
        fcmTokens: [...(userDoc.data().fcmTokens || []), token],
      });
    } else {
      await setDoc(userRef, {
        fcmTokens: [token],
      });
    }
    console.log("FCM token başarıyla kaydedildi");
  } catch (error) {
    console.error("FCM token kaydedilirken hata:", error);
  }
};

// Bildirim izni iste ve token al
export const requestNotificationPermission = async () => {
  try {
    // Tarayıcı bildirim izni iste
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.log("Bildirim izni reddedildi");
      return null;
    }

    // FCM token'ı al
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });

    // Giriş yapmış kullanıcı varsa token'ı kaydet
    onAuthStateChanged(auth, (user) => {
      if (user) {
        saveFCMToken(user.uid, token);
      }
    });

    return token;
  } catch (error) {
    console.error("Bildirim izni veya token alınırken hata:", error);
    return null;
  }
};

// Uygulama açıkken gelen bildirimleri yönet
export const setupForegroundNotifications = () => {
  onMessage(messaging, (payload) => {
    console.log("Ön planda bildirim alındı:", payload);

    // Bildirim göster
    const { title, body } = payload.notification;

    // Tarayıcı bildirimi göster
    if (Notification.permission === "granted") {
      new Notification(title, {
        body: body,
        icon: "/logo4.jpeg",
      });
    }
  });
};

// Zamanlanmış bildirimler için veriyi Firestore'a kaydet
export const scheduleNotification = async (
  userId,
  title,
  body,
  startTime,
  notifyType
) => {
  if (!userId) return null;

  try {
    // Bildirim yapısını oluştur
    const notificationId = `notif-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const interval = notificationIntervals[notifyType] || 0;
    const notificationTime = new Date(startTime - interval).getTime();

    // Firestore'a bildirim verisini kaydet
    const notificationsRef = doc(db, "scheduled_notifications", notificationId);
    await setDoc(notificationsRef, {
      userId,
      title,
      body,
      scheduledTime: notificationTime,
      created: Date.now(),
      delivered: false,
    });

    return notificationId;
  } catch (error) {
    console.error("Bildirim zamanlanırken hata:", error);
    return null;
  }
};

// Bildirim iptal etme
export const cancelScheduledNotification = async (notificationId) => {
  if (!notificationId) return;

  try {
    const notificationRef = doc(db, "scheduled_notifications", notificationId);
    await updateDoc(notificationRef, {
      cancelled: true,
    });
    console.log("Bildirim iptal edildi");
  } catch (error) {
    console.error("Bildirim iptal edilirken hata:", error);
  }
};

// Bildirim araları için sabitler
export const notificationIntervals = {
  "15-minutes": 15 * 60000,
  "1-hour": 60 * 60000,
  "1-day": 24 * 60 * 60000,
  "on-time": 0,
};

export { messaging };
