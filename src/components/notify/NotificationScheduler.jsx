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
 * Global bildirim penceresini kullanıcı dokümanından alır.
 */
export const getGlobalNotificationWindow = async (user) => {
  try {
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      const data = userDoc.data();
      if (data.notificationWindow) {
        console.log(
          "getGlobalNotificationWindow - Global bildirim penceresi alındı:",
          data.notificationWindow
        );
        return data.notificationWindow;
      } else {
        console.warn(
          "getGlobalNotificationWindow - Global bildirim penceresi bulunamadı for user:",
          user.uid
        );
        return null;
      }
    } else {
      console.warn(
        "getGlobalNotificationWindow - Kullanıcı dokümanı bulunamadı for user:",
        user.uid
      );
      return null;
    }
  } catch (error) {
    console.error(
      "getGlobalNotificationWindow - Global bildirim penceresi alınırken hata:",
      error
    );
    return null;
  }
};

/**
 * Bildirim penceresini (start, end) hesaplar.
 */
const computeWindowTimes = (windowObj) => {
  const now = getTurkeyTime();
  const todayStr = now.toISOString().split("T")[0];
  let windowStart, windowEnd;

  if (windowObj.start <= windowObj.end) {
    windowStart = new Date(`${todayStr}T${windowObj.start}:00`);
    windowEnd = new Date(`${todayStr}T${windowObj.end}:00`);
    if (now > windowEnd) {
      windowStart.setDate(windowStart.getDate() + 1);
      windowEnd.setDate(windowEnd.getDate() + 1);
    }
  } else {
    let potentialStart = new Date(`${todayStr}T${windowObj.start}:00`);
    let potentialEnd = new Date(`${todayStr}T${windowObj.end}:00`);
    if (now < potentialEnd) {
      potentialStart.setDate(potentialStart.getDate() - 1);
    } else {
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
 */
export const getMotivationalMessageForTime = (date, weather = null) => {
  const hour = date.getHours();
  let messages = [];

  if (hour >= 6 && hour < 10) {
    messages = [
      "Günaydın! Güne taptaze su damlalarıyla başlayın!",
      "Yeni bir gün, enerjinizi artırmak için suyunuz hazır olsun!",
      "Gün ışığıyla beraber suyun tadını çıkarın, harika bir gün sizi bekliyor!",
      "Sabahın ilk ışıklarıyla su için, zinde bir başlangıç yapın!",
      "Günaydın! Bol su, bol enerji demektir!",
    ];
  } else if (hour >= 10 && hour < 14) {
    messages = [
      "Öğle vakti: Hava sıcaksa, serinlemenin en iyi yolu su içmek!",
      "Öğle zamanı! Suyu için, enerji depolayın!",
      "Gün ortasında, bir bardak su ile kendinizi tazeleyin!",
      "Öğlenin sıcaklığına meydan okuyun; suyun ferahlığı sizi canlandırsın!",
      "Bir mola verin, suyunuzu için ve yenilenin!",
    ];
  } else if (hour >= 14 && hour < 18) {
    messages = [
      "Öğleden sonra: Rüzgar hafif, suyun ferahlığı sizi canlandırsın!",
      "Hadi, biraz su içip kendinizi yenileyin!",
      "Gün ortasının yorgunluğunu suyun tazeliğiyle atın!",
      "Öğleden sonra suyunuzu için, enerjinizi tazeleyin!",
      "Bir bardak su, günün geri kalanına güç katacaktır!",
    ];
  } else if (hour >= 18 && hour < 22) {
    messages = [
      "Akşam oldu! Güne güzel bir kapanış için serin bir yudum su harika!",
      "Gün bitmeden, su içerek kendinizi ödüllendirin!",
      "Akşamın huzurunu suyun ferahlığıyla yaşayın!",
      "Gün sonu geldi, son bir bardak su ile günü tamamlayın!",
      "Akşamın tadını çıkarın, suyunuz yanınızda olsun!",
    ];
  } else {
    messages = [
      "Gece vakti bile su içmeyi ihmal etmeyin, rüyalarınıza tazelik katın!",
      "Uyumadan önce bir yudum su, tatlı rüyalara kapı aralar!",
      "Gece sessizliğinde, suyun ferahlığı ruhunuzu dinlendirsin!",
      "Yatmadan önce su içmeyi unutmayın; rahat bir uykuya dalın!",
      "Gece boyunca suyunuzun keyfini çıkarın, rüyalarınıza ilham olsun!",
    ];
  }

  // Hava durumuna göre ekstra mesajlar ekleyelim
  if (weather && weather.temperature > 30) {
    messages.push("Bugün hava sıcak, suyunuz hayat kurtarıcı!");
    messages.push("Sıcak günlerde su, vücudunuzun serin kalmasını sağlar!");
  } else if (weather && weather.temperature < 10) {
    messages.push("Soğuk havada içinizi ısıtacak bir yudum suya ne dersiniz?");
    messages.push("Soğuk günlerde sıcak su, sizi ısıtır ve canlandırır!");
  }

  const selectedMessage = messages[Math.floor(Math.random() * messages.length)];
  console.log(
    `getMotivationalMessageForTime - Saat ${hour} için mesaj:`,
    selectedMessage
  );
  return selectedMessage;
};

/**
 * Hava durumu bilgisini (sıcaklık, nem, weathercode) almak için örnek fonksiyon.
 * (Not: Gerçek uygulamada Open-Meteo API gibi gerçek bir servisten veri alınmalıdır.)
 */
export const fetchWeatherData = async (latitude, longitude) => {
  try {
    const response = await fetch(
      `${
        import.meta.env.VITE_OPEN_METEO_API_URL
      }?latitude=${latitude}&longitude=${longitude}&current_weather=true`
    );
    const data = await response.json();
    if (data.current_weather) {
      console.log(
        "fetchWeatherData - Hava durumu alındı:",
        data.current_weather
      );
      return {
        temperature: data.current_weather.temperature,
        humidity: data.current_weather.humidity || 50,
        weathercode: data.current_weather.weathercode,
      };
    } else {
      console.warn("fetchWeatherData - Hava durumu verisi alınamadı:", data);
      return null;
    }
  } catch (error) {
    console.error("fetchWeatherData - Hata:", error);
    return null;
  }
};

/**
 * Kullanıcının bildirim moduna göre su hatırlatma zamanlarını hesaplar.
 * Hesaplanan bildirimler, tümüyle bir array olarak oluşturulup Firestore’daki
 * "reminderTimes" alanına kaydedilir. Burada, şu andan 1 dakika sonrasına denk gelen (veya daha yakın)
 * bildirimler array’den çıkarılır; geriye kalanlar kalır.
 */
export const computeWaterReminderTimes = async (user) => {
  if (!user || !user.uid) return [];
  const data = await fetchUserData(user);
  console.log("computeWaterReminderTimes - Birleşik veri:", data);

  const mode = data.waterNotificationOption || "smart";
  console.log("computeWaterReminderTimes - Bildirim modu:", mode);

  // Global bildirim penceresi: kullanıcı ana dokümanından okunuyor.
  const globalWindow = (await getGlobalNotificationWindow(user)) ||
    data.notificationWindow || { start: "08:00", end: "22:00" };
  const { windowStart, windowEnd } = computeWindowTimes(globalWindow);
  const now = getTurkeyTime();
  let reminderSchedule = [];

  if (mode === "none") {
    console.log("computeWaterReminderTimes - Bildirimler kapalı (none mod).");
    const waterRef = doc(db, "users", user.uid, "water", "current");
    await setDoc(
      waterRef,
      {
        nextWaterReminderTime: null,
        nextWaterReminderMessage: null,
        reminderTimes: [],
      },
      { merge: true }
    );
    return [];
  } else if (mode === "smart") {
    const profile = data.profile || data;
    const weight = parseFloat(profile.weight) || 93;
    const height = parseFloat(profile.height) || 190;
    const gender = profile.gender || "male";
    let age = profile.age != null ? parseInt(profile.age) : 30;
    if (!profile.age && profile.birthDate) {
      age = calculateAge(profile.birthDate);
    }
    const bmr = calculateBMR(gender, weight, height, age);

    // Hava durumu kontrolü:
    let temperature = 20;
    let humidity = 50;
    if (profile.latitude && profile.longitude) {
      const weather = await fetchWeatherData(
        profile.latitude,
        profile.longitude
      );
      if (weather) {
        temperature = weather.temperature;
        humidity = weather.humidity;
      } else {
        console.warn(
          "Hava durumu verisi alınamadı; varsayılan değerler kullanılacak."
        );
      }
    }
    const weatherMultiplier = 1 + (temperature - 20) / 100;
    const activityMap = {
      çok_düşük: 0.9,
      düşük: 1.0,
      orta: 1.1,
      yüksek: 1.2,
      çok_yüksek: 1.3,
      aşırı: 1.4,
      moderate: 1.1,
    };
    const activityLevel = data.activityLevel || "orta";
    const activityMultiplier = activityMap[activityLevel] || 1.1;

    const finalMultiplier = 1.4 * weatherMultiplier * activityMultiplier;
    console.log(
      "computeWaterReminderTimes - weatherMultiplier:",
      weatherMultiplier,
      "activityMultiplier:",
      activityMultiplier,
      "finalMultiplier:",
      finalMultiplier
    );
    const dailyWaterTarget = calculateDailyWaterTarget(bmr, finalMultiplier);
    const waterIntake = data.waterIntake || 0;
    const remainingTarget = Math.max(dailyWaterTarget - waterIntake, 0);
    console.log(
      "computeWaterReminderTimes - Günlük hedef:",
      dailyWaterTarget,
      "İçilen su:",
      waterIntake,
      "Kalan su hedefi:",
      remainingTarget
    );
    if (remainingTarget <= 0) {
      console.log(
        "computeWaterReminderTimes - Günlük su hedefi aşıldı, bildirim zamanı hesaplanmadı."
      );
      return [];
    }
    const glassSize = data.glassSize || 250;
    const numGlasses = Math.ceil(remainingTarget / glassSize);
    console.log(
      "computeWaterReminderTimes - Kalan hedefe göre numGlasses:",
      numGlasses
    );

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

    // Bildirimlerin tamamı; sadece geleceğe yönelik (şu andan sonraki) bildirimler alınır.
    let startTime = Math.max(windowStart.getTime(), now.getTime() + 60000);
    for (let i = 0; i < numGlasses && startTime <= windowEnd.getTime(); i++) {
      const reminderTime = new Date(startTime);
      const message = getMotivationalMessageForTime(reminderTime);
      reminderSchedule.push({ time: reminderTime, message });
      console.log(
        "computeWaterReminderTimes - Eklenen smart bildirim zamanı:",
        reminderTime,
        "Mesaj:",
        message
      );
      startTime += interval * 60000;
    }
  } else if (mode === "custom") {
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

    let startTime;
    if (now >= windowStart && now < windowEnd) {
      startTime = now.getTime() + customIntervalHours * 3600000;
      console.log(
        "computeWaterReminderTimes - Custom mod: Başlangıç zamanı gün içinde, şimdi + interval:",
        new Date(startTime)
      );
    } else if (now >= windowEnd) {
      const nextWindowStart = new Date(windowStart);
      nextWindowStart.setDate(nextWindowStart.getDate() + 1);
      startTime = nextWindowStart.getTime();
      console.log(
        "computeWaterReminderTimes - Custom mod: Gün sonu geçmiş, sonraki pencere başlangıcı:",
        nextWindowStart
      );
    } else {
      startTime = windowStart.getTime();
      console.log(
        "computeWaterReminderTimes - Custom mod: Pencere henüz başlamadı, pencere başlangıcı:",
        windowStart
      );
    }

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

  // NOT: Burada, hesaplanan tüm bildirimler (reminderSchedule) tutuluyor.
  // İstenirse, "şu andan 1 dakika sonrasından daha yakın" olanlar filtrelenip atılabilir.
  // Ancak; isteğe göre; ilk oluşturulan (yani, en yakın bildirim) 1 dakika içinde ise, onu array’den çıkaracağız.
  const futureReminders = reminderSchedule.filter(
    (reminder) => reminder.time.getTime() > now.getTime() + 60000
  );
  console.log(
    "computeWaterReminderTimes - Gelecek bildirimler (1 dakikadan sonra):",
    futureReminders
  );

  // Tüm geleceğe dönük bildirimler Firestore’daki reminderTimes alanına kaydediliyor.
  const waterRef = doc(db, "users", user.uid, "water", "current");
  await setDoc(
    waterRef,
    {
      reminderTimes: futureReminders.map((obj) => ({
        time: obj.time.toISOString(),
        message: obj.message,
      })),
    },
    { merge: true }
  );
  console.log(
    "computeWaterReminderTimes - Hesaplanan bildirim zamanları:",
    futureReminders
  );
  return futureReminders;
};

/**
 * Mevcut Firestore’daki reminderTimes array’inden,
 * eğer ilk bildirim 1 dakika sonra veya daha yakınsa silinir ve
 * kalan array’in ilk elemanı nextWaterReminderTime/Message alanlarına set edilir.
 * Eğer array boşsa, computeWaterReminderTimes tekrar çalıştırılır.
 */
export const popNextReminder = async (user) => {
  const waterRef = doc(db, "users", user.uid, "water", "current");
  const waterSnap = await getDoc(waterRef);
  let reminderTimes = [];
  if (waterSnap.exists() && waterSnap.data().reminderTimes) {
    reminderTimes = waterSnap.data().reminderTimes;
  }
  const now = getTurkeyTime();
  // İlk elemanı sil (bildirim geldiği varsayımında)
  if (reminderTimes.length > 0) {
    console.log("popNextReminder - Silinen bildirim:", reminderTimes[0]);
    reminderTimes.shift();
  }
  // Reminders'ı güncel zaman bazında filtreleyelim:
  reminderTimes = reminderTimes.filter(
    (r) => new Date(r.time).getTime() > now.getTime() + 60000
  );
  // Eğer array boşsa, bildirimler yeniden hesaplanır.
  if (reminderTimes.length === 0) {
    console.log("popNextReminder - Reminders boş, yeniden hesaplanıyor.");
    reminderTimes = await computeWaterReminderTimes(user);
  }
  if (reminderTimes.length > 0) {
    const nextReminder = reminderTimes[0];
    await setDoc(
      waterRef,
      {
        nextWaterReminderTime: nextReminder.time,
        nextWaterReminderMessage: nextReminder.message,
        reminderTimes: reminderTimes,
      },
      { merge: true }
    );
    console.log("popNextReminder - Yeni sonraki bildirim:", nextReminder);
    return nextReminder;
  } else {
    await setDoc(
      waterRef,
      {
        nextWaterReminderTime: null,
        nextWaterReminderMessage: null,
        reminderTimes: [],
      },
      { merge: true }
    );
    console.warn("popNextReminder - Reminders boş, bildirim ayarlanamadı.");
    return null;
  }
};

/**
 * Mevcut Firestore’daki reminderTimes array’inden,
 * en az 1 dakika sonrasındaki ilk bildirimi bulur ve onu nextWaterReminderTime/Message olarak kaydeder.
 */
export const saveNextWaterReminderTime = async (user) => {
  const waterRef = doc(db, "users", user.uid, "water", "current");
  const waterSnap = await getDoc(waterRef);
  let reminderTimes = [];
  if (waterSnap.exists() && waterSnap.data().reminderTimes) {
    reminderTimes = waterSnap.data().reminderTimes;
  }
  const now = getTurkeyTime();
  // 1 dakika sonrasından daha yakın olan bildirimleri array’den çıkarıyoruz.
  reminderTimes = reminderTimes.filter(
    (r) => new Date(r.time).getTime() > now.getTime() + 60000
  );
  if (reminderTimes.length === 0) {
    console.log(
      "saveNextWaterReminderTime - Reminders boş, yeniden hesaplanıyor."
    );
    reminderTimes = await computeWaterReminderTimes(user);
  }
  if (reminderTimes.length > 0) {
    const nextReminder = reminderTimes[0];
    await setDoc(
      waterRef,
      {
        nextWaterReminderTime: nextReminder.time,
        nextWaterReminderMessage: nextReminder.message,
        reminderTimes: reminderTimes,
      },
      { merge: true }
    );
    console.log(
      "saveNextWaterReminderTime - Kaydedilen sonraki bildirim zamanı:",
      nextReminder
    );
    return nextReminder;
  } else {
    await setDoc(
      waterRef,
      {
        nextWaterReminderTime: null,
        nextWaterReminderMessage: null,
        reminderTimes: [],
      },
      { merge: true }
    );
    console.warn(
      "saveNextWaterReminderTime - Sonraki bildirim zamanı hesaplanamadı"
    );
    return null;
  }
};

/**
 * Su bildirimlerinin planlamasını tetikler.
 * İlk, tüm bildirimler hesaplanıp Firestore'a kaydedilir.
 * Ardından, saveNextWaterReminderTime ile en az 1 dakika sonrası olan bildirim,
 * nextWaterReminderTime/Message alanlarına set edilir.
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
    reminderSchedule.map((r) => new Date(r.time).toLocaleTimeString())
  );
  console.log(
    "scheduleWaterNotifications - Sonraki bildirim zamanı:",
    nextReminder
      ? new Date(nextReminder.time).toLocaleTimeString()
      : "Belirlenmedi"
  );
  return { reminderSchedule, nextReminder };
};
