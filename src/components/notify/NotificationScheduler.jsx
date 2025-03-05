// NotificationScheduler.jsx

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../auth/firebaseConfig";

/**
 * Türkiye saatini döndürür.
 */
export const getTurkeyTime = () => {
  const turkeyTime = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
  );
  console.log("getTurkeyTime - Şu anki Türkiye zamanı:", turkeyTime);
  return turkeyTime;
};

/**
 * Kullanıcının doğum tarihinden yaşını hesaplar.
 * @param {Date|string|Object} birthDate - Doğum tarihi (Date, ISO string veya Firebase timestamp)
 * @returns {number} Hesaplanan yaş
 */
export const calculateAge = (birthDate) => {
  const birth = birthDate.toDate ? birthDate.toDate() : new Date(birthDate);
  const today = getTurkeyTime();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  console.log("calculateAge - Hesaplanan yaş:", age);
  return age;
};

/**
 * Mifflin-St Jeor denklemi ile Bazal Metabolizma Hızını (BMR) hesaplar.
 * @param {string} gender - "male" veya "female"
 * @param {number} weight - Ağırlık (kg)
 * @param {number} height - Boy (cm)
 * @param {number} age - Yaş
 * @returns {number} Hesaplanan BMR
 */
export const calculateBMR = (gender, weight, height, age) => {
  let bmr;
  if (gender === "female") {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  }
  console.log("calculateBMR - Hesaplanan BMR:", bmr);
  return bmr;
};

/**
 * BMR değeri ve çarpan üzerinden günlük su hedefini (ml) hesaplar.
 * @param {number} bmr - Hesaplanan BMR
 * @param {number} multiplier - Çarpan (varsayılan 1.4)
 * @returns {number} Günlük su hedefi (ml)
 */
export const calculateDailyWaterTarget = (bmr, multiplier = 1.4) => {
  const dailyWaterTarget = Math.round(bmr * multiplier);
  console.log(
    "calculateDailyWaterTarget - Günlük su hedefi:",
    dailyWaterTarget
  );
  return dailyWaterTarget;
};

/**
 * Kullanıcıya ait profil ve su verilerini Firestore’dan getirir.
 * /users/{uid} ve /users/{uid}/water/current dokümanlarını birleştirir.
 * @param {Object} user - Firebase kullanıcı nesnesi
 * @returns {Object} Birleşik veri nesnesi
 */
const fetchUserData = async (user) => {
  if (!user || !user.uid) return {};
  try {
    // Kullanıcı ana verisi
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? userSnap.data() : {};
    console.log("fetchUserData - Kullanıcı ana verisi:", userData);

    // Su verileri
    const waterRef = doc(db, "users", user.uid, "water", "current");
    const waterSnap = await getDoc(waterRef);
    const waterData = waterSnap.exists() ? waterSnap.data() : {};
    console.log("fetchUserData - Su verileri:", waterData);

    return { ...userData, ...waterData };
  } catch (error) {
    console.error("fetchUserData - Hata:", error);
    return {};
  }
};

/**
 * Bildirim penceresi (start, end) değerlerini alır; yoksa varsayılan olarak 08:00-22:00 kullanır.
 * @param {Object} data - Kullanıcı verileri
 * @returns {Object} { start: string, end: string }
 */
const getNotificationWindow = (data) => {
  const windowObj = data.notificationWindow || { start: "08:00", end: "22:00" };
  console.log("getNotificationWindow - Bildirim penceresi:", windowObj);
  return windowObj;
};

/**
 * Global bildirim penceresini hesaplar.
 * Overnight (gece) pencereleri de ele alınır: Eğer start > end ise,
 * - Eğer şu an windowEnd’den önce ise, windowStart dünkü saat olarak belirlenir.
 * - Aksi halde, windowEnd yarın olarak ayarlanır.
 * @param {Object} windowObj - { start, end } zaman stringleri (ör. "18:45", "05:30")
 * @returns {Object} { windowStart: Date, windowEnd: Date }
 */
const computeWindowTimes = (windowObj) => {
  const now = getTurkeyTime();
  const todayStr = now.toISOString().split("T")[0];
  let windowStart, windowEnd;

  if (windowObj.start <= windowObj.end) {
    // Normal (aynı gün) pencere
    windowStart = new Date(`${todayStr}T${windowObj.start}:00`);
    windowEnd = new Date(`${todayStr}T${windowObj.end}:00`);
    if (now > windowEnd) {
      windowStart.setDate(windowStart.getDate() + 1);
      windowEnd.setDate(windowEnd.getDate() + 1);
    }
  } else {
    // Overnight pencere: örn. {start: "18:45", end: "05:30"}
    let potentialStart = new Date(`${todayStr}T${windowObj.start}:00`);
    let potentialEnd = new Date(`${todayStr}T${windowObj.end}:00`);
    // Eğer şu an potentialEnd'den önce ise, aktif pencere dünkü start'tan bugünkü end'e
    if (now < potentialEnd) {
      potentialStart.setDate(potentialStart.getDate() - 1);
    } else {
      // Aksi halde, pencere bugünkü start'tan yarınki end'e
      potentialEnd.setDate(potentialEnd.getDate() + 1);
    }
    windowStart = potentialStart;
    windowEnd = potentialEnd;
  }
  console.log(
    "computeWindowTimes - Pencere başlangıcı:",
    windowStart,
    "Bitişi:",
    windowEnd
  );
  return { windowStart, windowEnd };
};

/**
 * Belirtilen bildirim zamanı için günün saatine göre motivasyon mesajı oluşturur.
 * Mesajlar, zaman dilimine göre farklı seçenekler sunar ve rastgele bir seçim yapılır.
 * @param {Date} date - Bildirim zamanı
 * @returns {string} Motivasyon mesajı
 */
export const getMotivationalMessageForTime = (date) => {
  const hour = date.getHours();
  let messages = [];
  if (hour >= 6 && hour < 10) {
    messages = [
      "Günaydın! Güne enerjik başlayın, suyunuzu için.",
      "Yeni bir gün, yeni başlangıç! Hadi suyunuzu için.",
    ];
  } else if (hour >= 10 && hour < 14) {
    messages = [
      "Öğle vakti! Hedefinize bir adım daha yaklaşın.",
      "Enerjinizi korumak için bol su için.",
    ];
  } else if (hour >= 14 && hour < 18) {
    messages = [
      "Öğleden sonra! Su içmeyi unutmayın.",
      "Kendinize biraz su ayırın, enerjinizi toplayın.",
    ];
  } else if (hour >= 18 && hour < 22) {
    messages = [
      "Akşam oldu, gününüzü tamamlamak için su için.",
      "Gün bitmeden su içmeyi unutmayın, vücudunuz dinç kalsın.",
    ];
  } else {
    messages = [
      "Gece vakti, su içmeyi ihmal etmeyin!",
      "Gece de su, sağlığınız için önemli!",
    ];
  }
  const selectedMessage = messages[Math.floor(Math.random() * messages.length)];
  console.log(
    `getMotivationalMessageForTime - Saat ${hour} için mesaj:`,
    selectedMessage
  );
  return selectedMessage;
};

/**
 * Kullanıcının bildirim moduna göre su hatırlatma zamanlarını hesaplar.
 * Smart modda profil verilerinden (boy, kilo, cinsiyet, doğum tarihi) otomatik hesaplama yapılır;
 * Custom modda ise kullanıcının belirlediği saat aralığına göre planlanır.
 * Her bildirim zamanı için günün saatine uygun motivasyon mesajı eklenir.
 * @param {Object} user - Firebase kullanıcı nesnesi
 * @returns {Array<Object>} Bildirim zamanları dizisi, her eleman { time: Date, message: string }
 */
export const computeWaterReminderTimes = async (user) => {
  if (!user || !user.uid) return [];
  const data = await fetchUserData(user);
  console.log("computeWaterReminderTimes - Birleşik veri:", data);

  const mode = data.waterNotificationOption || "smart";
  console.log("computeWaterReminderTimes - Bildirim modu:", mode);

  const notifWindow = getNotificationWindow(data);
  const { windowStart, windowEnd } = computeWindowTimes(notifWindow);
  const now = getTurkeyTime();
  let reminderSchedule = [];

  if (mode === "none") {
    console.log("computeWaterReminderTimes - Bildirimler kapalı (none mod).");
    return [];
  } else if (mode === "smart") {
    // Smart mod: Profil verilerinden hesaplamalar
    const profile = data.profile || data;
    const weight = parseFloat(profile.weight) || 93;
    const height = parseFloat(profile.height) || 190;
    const gender = profile.gender || "male";
    let age = profile.age != null ? parseInt(profile.age) : 30;
    if (!profile.age && profile.birthDate) {
      age = calculateAge(profile.birthDate);
    }
    const bmr = calculateBMR(gender, weight, height, age);
    const dailyWaterTarget = calculateDailyWaterTarget(bmr, 1.4);
    const glassSize = data.glassSize || 250;
    const numGlasses = Math.ceil(dailyWaterTarget / glassSize);
    console.log(
      "computeWaterReminderTimes - dailyWaterTarget:",
      dailyWaterTarget,
      "glassSize:",
      glassSize,
      "numGlasses:",
      numGlasses
    );

    // Kaydet: bmr, dailyWaterTarget, glassSize, mod
    const waterRef = doc(db, "users", user.uid, "water", "current");
    await setDoc(
      waterRef,
      { bmr, dailyWaterTarget, glassSize, waterNotificationOption: "smart" },
      { merge: true }
    );

    const totalMinutes = (windowEnd - windowStart) / 60000;
    const interval = Math.max(15, Math.floor(totalMinutes / numGlasses));
    console.log(
      "computeWaterReminderTimes - Toplam dakika:",
      totalMinutes,
      "Interval (dk):",
      interval
    );

    // Başlangıç zamanı: aktif pencere içinde, şimdi+1 saniye veya pencere başlangıcı (hangisi daha sonraysa)
    let startTime = Math.max(windowStart.getTime(), now.getTime() + 1000);
    while (startTime <= windowEnd.getTime()) {
      const reminderTime = new Date(startTime);
      const message = getMotivationalMessageForTime(reminderTime);
      reminderSchedule.push({ time: reminderTime, message });
      console.log(
        "computeWaterReminderTimes - Eklenen bildirim zamanı:",
        reminderTime,
        "Mesaj:",
        message
      );
      startTime += interval * 60000;
    }
  } else if (mode === "custom") {
    // Custom mod: Kullanıcının belirlediği bildirim aralığı (saat) kullanılır.
    const dailyWaterTarget = data.dailyWaterTarget || 2000;
    const glassSize = data.glassSize || 250;
    const customIntervalHours = data.customNotificationInterval || 1;
    console.log(
      "computeWaterReminderTimes - Custom mod: dailyWaterTarget:",
      dailyWaterTarget,
      "glassSize:",
      glassSize,
      "customIntervalHours:",
      customIntervalHours
    );

    let startTime = windowStart.getTime();
    while (startTime <= windowEnd.getTime()) {
      const reminderTime = new Date(startTime);
      const message = getMotivationalMessageForTime(reminderTime);
      reminderSchedule.push({ time: reminderTime, message });
      console.log(
        "computeWaterReminderTimes - Eklenen custom bildirim zamanı:",
        reminderTime,
        "Mesaj:",
        message
      );
      startTime += customIntervalHours * 3600000;
    }
  }

  // Bildirim zamanlarını Firestore'a kaydet (ISO string ve mesaj ile)
  const waterRef = doc(db, "users", user.uid, "water", "current");
  await setDoc(
    waterRef,
    {
      reminderTimes: reminderSchedule.map((obj) => ({
        time: obj.time.toISOString(),
        message: obj.message,
      })),
    },
    { merge: true }
  );
  console.log(
    "computeWaterReminderTimes - Hesaplanan bildirim zamanları:",
    reminderSchedule
  );
  return reminderSchedule;
};

/**
 * Hesaplanan bildirim zamanları arasından, mevcut zamandan sonraki ilk bildirimi bulur.
 * @param {Object} user - Firebase kullanıcı nesnesi
 * @returns {Object|null} { time: Date, message: string } veya null
 */
export const getNextWaterReminderTime = async (user) => {
  const schedule = await computeWaterReminderTimes(user);
  const now = getTurkeyTime();
  for (const reminder of schedule) {
    if (reminder.time.getTime() > now.getTime()) {
      console.log(
        "getNextWaterReminderTime - Sonraki bildirim bulundu:",
        reminder
      );
      return reminder;
    }
  }
  console.warn("getNextWaterReminderTime - Gelecek bildirim zamanı bulunamadı");
  return null;
};

/**
 * Hesaplanan sonraki su hatırlatma zamanını Firestore’da saklar.
 * @param {Object} user - Firebase kullanıcı nesnesi
 * @returns {Object|null} { time: Date, message: string } veya null
 */
export const saveNextWaterReminderTime = async (user) => {
  const waterRef = doc(db, "users", user.uid, "water", "current");
  const nextReminder = await getNextWaterReminderTime(user);
  if (nextReminder) {
    await setDoc(
      waterRef,
      {
        nextWaterReminderTime: nextReminder.time.toISOString(),
        nextWaterReminderMessage: nextReminder.message,
      },
      { merge: true }
    );
    console.log(
      "saveNextWaterReminderTime - Kaydedilen sonraki bildirim zamanı:",
      nextReminder
    );
    return nextReminder;
  }
  console.warn(
    "saveNextWaterReminderTime - Sonraki bildirim zamanı hesaplanamadı"
  );
  return null;
};

/**
 * Su bildirimlerinin planlamasını tetikler.
 * Su içim miktarı güncellendiğinde veya hedef değiştiğinde bu fonksiyon çağrılarak,
 * yeni bildirim zamanları hesaplanır ve Firestore güncellenir.
 * @param {Object} user - Firebase kullanıcı nesnesi
 * @returns {Object} { reminderSchedule: Array<Object>, nextReminder: Object|null }
 */
export const scheduleWaterNotifications = async (user) => {
  if (!user || !user.uid) return;
  const data = await fetchUserData(user);
  const mode = data.waterNotificationOption || "smart";
  if (mode === "none") {
    console.log("scheduleWaterNotifications - Bildirimler kapalı (none mod).");
    return { reminderSchedule: [], nextReminder: null };
  }
  const reminderSchedule = await computeWaterReminderTimes(user);
  const nextReminder = await saveNextWaterReminderTime(user);
  console.log(
    "scheduleWaterNotifications - Yeni su bildirim zamanları hesaplandı:",
    reminderSchedule.map((r) => r.time.toLocaleTimeString())
  );
  console.log(
    "scheduleWaterNotifications - Sonraki bildirim zamanı:",
    nextReminder ? nextReminder.time.toLocaleTimeString() : "Belirlenmedi"
  );
  // Burada ek push bildirimleri veya motivasyonel bildirim tetikleme kodları eklenebilir.
  return { reminderSchedule, nextReminder };
};
