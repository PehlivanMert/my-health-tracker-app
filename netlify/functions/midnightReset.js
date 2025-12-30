const { getDatabase, createBatch, admin } = require('./dbConnection');

const db = getDatabase();

// ============================================
// OPTIMIZATION CONFIGURATION
// ============================================
const ENABLE_VERBOSE_LOGGING = process.env.VERBOSE_LOGGING === 'true' || false;
const MAX_RETRIES = 3; // Hatalı işlemler için retry sayısı
const RETRY_DELAY_MS = 1000; // Retry arası bekleme süresi (ms)

// Chunk size'ı dinamik ayarla (production'da daha küçük, timeout riskini azaltmak için)
const getChunkSize = () => {
  // Production'da 15, development'ta 20 kullanıcı
  const isProduction = process.env.NETLIFY_ENV === 'production' || process.env.NODE_ENV === 'production';
  return isProduction ? 15 : 20;
};

// Retry mekanizması ile işlem yap
const executeWithRetry = async (operation, operationName, maxRetries = MAX_RETRIES) => {
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      if (attempt > 1 && ENABLE_VERBOSE_LOGGING) {
        console.log(`✅ ${operationName} - ${attempt}. denemede başarılı`);
      }
      return { success: true, result, attempts: attempt };
    } catch (error) {
      lastError = error;
      if (ENABLE_VERBOSE_LOGGING) {
        console.warn(`⚠️ ${operationName} - ${attempt}/${maxRetries} deneme başarısız:`, error.message);
      }
      
      // Son deneme değilse, bekle ve tekrar dene
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
      }
    }
  }
  
  return { success: false, error: lastError, attempts: maxRetries };
};

// Cache TTL: 10 dakika (600.000 ms)
const CACHE_TTL = 600000;

// Global cache değişkenleri
let cachedUsers = null;
let cachedUsersTimestamp = 0;
const userDataCache = {};
const weatherCache = {};

// Türkiye saati için yardımcı fonksiyon (Server-side için güvenli)
const getTurkeyTime = () => {
  const now = new Date();
  // UTC offset'i Türkiye için ayarla (UTC+3)
  const turkeyOffset = 3 * 60; // 3 saat = 180 dakika
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const turkeyTime = new Date(utc + (turkeyOffset * 60000));
  return turkeyTime;
};

// Yaş hesaplama (NotificationScheduler.jsx ile birebir aynı)
const calculateAge = (birthDate) => {
  const birth = birthDate.toDate ? birthDate.toDate() : new Date(birthDate);
  const today = getTurkeyTime();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

// BMR hesaplama (NotificationScheduler.jsx ile birebir aynı - Mifflin-St Jeor denklemi)
const calculateBMR = (gender, weight, height, age) => {
  let bmr;
  if (gender === "female") {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  }
  return bmr;
};

// Günlük su hedefi hesaplama (NotificationScheduler.jsx ile birebir aynı)
// Minimum değerler: Kadınlar için 2000ml, Erkekler için 2500ml
const calculateDailyWaterTarget = (bmr, multiplier = 1.4, gender = "male") => {
  const calculatedTarget = Math.round(bmr * multiplier);
  // Sağlık önerilerine göre minimum değerler
  const MINIMUM_WOMEN = 2000; // 2 litre
  const MINIMUM_MEN = 2500; // 2.5 litre
  const minimum = gender === "female" ? MINIMUM_WOMEN : MINIMUM_MEN;
  const dailyWaterTarget = Math.max(calculatedTarget, minimum);
  return dailyWaterTarget;
};

// Cache'lenmiş kullanıcıları alır
const getCachedUsers = async () => {
  const nowMillis = Date.now();
  if (cachedUsers && nowMillis - cachedUsersTimestamp < CACHE_TTL) {
    console.log("Kullanıcılar cache'den alınıyor.");
    return cachedUsers;
  }
  console.log("Kullanıcılar Firestore'dan çekiliyor.");
  try {
    const snapshot = await db.collection("users").get();
    if (snapshot && snapshot.docs) {
      cachedUsers = snapshot.docs;
      cachedUsersTimestamp = nowMillis;
      console.log(`✅ ${cachedUsers.length} kullanıcı başarıyla alındı`);
      return cachedUsers;
    } else {
      console.warn("⚠️ Firestore'dan kullanıcı verisi alınamadı, boş array döndürülüyor");
      return [];
    }
  } catch (error) {
    console.error("❌ Kullanıcıları alma hatası:", error);
    return [];
  }
};

// Cache'lenmiş kullanıcı verilerini alır
const getCachedUserData = async (userId) => {
  const nowMillis = Date.now();
  if (
    userDataCache[userId] &&
    nowMillis - userDataCache[userId].timestamp < CACHE_TTL
  ) {
    console.log(`Kullanıcı verileri cache'den alınıyor (user: ${userId}).`);
    return userDataCache[userId].data;
  }
  console.log(`Kullanıcı verileri Firestore'dan çekiliyor (user: ${userId}).`);
  const userDoc = await db.collection('users').doc(userId).get();
  userDataCache[userId] = { data: userDoc, timestamp: nowMillis };
  return userDoc;
};

// Global bildirim penceresi alma (SupplementNotificationScheduler.js ile birebir aynı)
const getGlobalNotificationWindow = async (userId) => {
  try {
    const userDoc = await getCachedUserData(userId);
    if (userDoc.exists) {
      const data = userDoc.data();
      if (data.notificationWindow) {
        const windowObj =
          typeof data.notificationWindow === "string"
            ? JSON.parse(data.notificationWindow)
            : data.notificationWindow;
        return windowObj;
      } else {
        console.warn('getGlobalNotificationWindow - Global bildirim penceresi bulunamadı for user:', userId);
        return null;
      }
    } else {
      console.warn('getGlobalNotificationWindow - Kullanıcı dokümanı bulunamadı for user:', userId);
      return null;
    }
  } catch (error) {
    console.error('getGlobalNotificationWindow - Global bildirim penceresi alınırken hata:', error);
    return null;
  }
};

// Pencere zamanlarını hesaplama (NotificationScheduler.jsx ile birebir aynı)
const computeWindowTimes = (windowObj) => {
  const now = getTurkeyTime();
  // Türkiye saati ile tarih string'i oluştur
  const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD formatı

  let start, end;
  // Eğer pencere overnight ise (başlangıç saati bitiş saatinden sonra)
  if (windowObj.start > windowObj.end) {
    // Bugünkü pencere bitişini hesaplayalım
    const todayEnd = new Date(`${todayStr}T${windowObj.end}:00+03:00`); // Türkiye timezone
    // Eğer şu an pencere bitişinden önceyse, bu demektir ki pencere dün başlamış.
    if (now < todayEnd) {
      // Dünün tarihi
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      start = new Date(`${yesterdayStr}T${windowObj.start}:00+03:00`); // Türkiye timezone
      end = todayEnd;
    } else {
      // Aksi halde, pencere bugünden başlayıp yarına kadar sürer.
      start = new Date(`${todayStr}T${windowObj.start}:00+03:00`); // Türkiye timezone
      end = new Date(`${todayStr}T${windowObj.end}:00+03:00`); // Türkiye timezone
      end.setDate(end.getDate() + 1);
    }
  } else {
    // Overnight değilse, normal şekilde bugünkü start ve end
    start = new Date(`${todayStr}T${windowObj.start}:00+03:00`); // Türkiye timezone
    end = new Date(`${todayStr}T${windowObj.end}:00+03:00`); // Türkiye timezone
  }

  return { windowStart: start, windowEnd: end };
};

// Hava durumu verisi alma (basitleştirilmiş)
const getDailyAverageWeatherData = async () => {
  try {
    // Basit hava durumu verisi (gerçek API yerine)
    return {
      temperature: 25,
      humidity: 60,
      windSpeed: 10,
      uvIndex: 5,
      cloudCover: 30,
      precipitation: 0,
      isDay: 1,
      hourlyData: Array(24).fill(null).map((_, hour) => ({
        temperature: 20 + Math.sin(hour / 24 * Math.PI) * 10,
        humidity: 50 + Math.sin(hour / 24 * Math.PI) * 20,
        windSpeed: 5 + Math.random() * 10,
        uvIndex: hour >= 6 && hour <= 18 ? 3 + Math.random() * 5 : 0
      }))
    };
  } catch (error) {
    console.error('Hava durumu verisi alma hatası:', error);
    return null;
  }
};

// Belirtilen saat için hava durumu verisini alır
const getCurrentHourWeatherData = async (date, userId) => {
  try {
    const waterRef = db.collection('users').doc(userId).collection('water').doc('current');
    const waterSnap = await waterRef.get();
    if (waterSnap.exists) {
      const waterData = waterSnap.data();
      const todayStr = date.toISOString().split('T')[0]; // YYYY-MM-DD formatı
      const currentHour = date.getHours();
      
      if (waterData.hourlyWeatherData && waterData.hourlyWeatherData.date === todayStr && waterData.hourlyWeatherData.hourlyData) {
        // Saatlik veriler varsa, o saatin verisini kullan
        const hourlyWeather = waterData.hourlyWeatherData.hourlyData[currentHour];
        if (hourlyWeather) {
          return hourlyWeather;
        }
      }
      
      // Saatlik veriler yoksa veya o saat için veri yoksa, günlük ortalamayı kullan
      const dailyWeather = waterData.dailyWeatherAverages;
      return dailyWeather;
    }
  } catch (error) {
    console.error('Hava durumu verisi alınırken hata:', error);
  }
  return null;
};

// Motivasyonel mesaj oluşturma (NotificationScheduler.jsx ile birebir aynı)
const getMotivationalMessageForTime = (date, weather = null) => {
  const hour = date.getHours();
  let messages = [];

  if (hour >= 6 && hour < 10) {
    messages = [
      "🌅 Günaydın! Güne taptaze su damlalarıyla başlayın!",
      "☀️ Yeni bir gün, enerjinizi artırmak için suyunuz hazır olsun!",
      "🌞 Gün ışığıyla beraber suyun tadını çıkarın, harika bir gün sizi bekliyor!",
      "🌅 Sabahın ilk ışıklarıyla su için, zinde bir başlangıç yapın!",
      "💧 Günaydın! Bol su, bol enerji demektir!",
      "🌅 Sabahın ilk ışıklarıyla su için, güne enerjik başlayın!",
      "☀️ Güneş doğarken su içmek, günün en iyi başlangıcı!",
      "🌞 Sabah suyu, vücudunuzu canlandırır ve metabolizmanızı hızlandırır!",
      "💧 Sabahın ilk suyu, gün boyu sizi zinde tutar!",
      "🚀 Güne su ile başlayın, enerjiniz hiç bitmesin!",
    ];
  } else if (hour >= 10 && hour < 14) {
    messages = [
      "🌞 Öğle vakti: Hava sıcaksa, serinlemenin en iyi yolu su içmek!",
      "☀️ Öğle zamanı! Suyu için, enerji depolayın!",
      "💧 Gün ortasında, bir bardak su ile kendinizi tazeleyin!",
      "🌊 Öğlenin sıcaklığına meydan okuyun; suyun ferahlığı sizi canlandırsın!",
      "⚡ Bir mola verin, suyunuzu için ve yenilenin!",
      "🌞 Öğle vakti su içmek, günün geri kalanına güç verir!",
      "☀️ Öğlenin sıcaklığında su, en iyi arkadaşınız!",
      "💪 Öğle molası: Su içerek enerjinizi yenileyin!",
      "🌊 Öğle vakti su, vücudunuzu ferahlatır!",
      "⚡ Öğlen suyu, performansınızı artırır!",
    ];
  } else if (hour >= 14 && hour < 18) {
    messages = [
      "🌅 Öğleden sonra: Rüzgar hafif, suyun ferahlığı sizi canlandırsın!",
      "💧 Hadi, biraz su içip kendinizi yenileyin!",
      "🌟 Gün ortasının yorgunluğunu suyun tazeliğiyle atın!",
      "🌊 Öğleden sonra suyunuzu için, enerjinizi tazeleyin!",
      "⚡ Bir bardak su, günün geri kalanına güç katacaktır!",
      "🌅 Öğleden sonra su, yorgunluğu atar!",
      "💧 İkindi vakti su içmek, akşama hazırlar!",
      "🌟 Öğleden sonra su, enerjinizi yeniler!",
      "🌊 İkindi suyu, vücudunuzu canlandırır!",
      "⚡ Öğleden sonra su, performansınızı korur!",
    ];
  } else if (hour >= 18 && hour < 22) {
    messages = [
      "🌙 Akşam oldu! Güne güzel bir kapanış için serin bir yudum su harika!",
      "💧 Gün bitmeden, su içerek kendinizi ödüllendirin!",
      "🌟 Akşamın huzurunu suyun ferahlığıyla yaşayın!",
      "🌊 Gün sonu geldi, son bir bardak su ile günü tamamlayın!",
      "🌅 Akşamın tadını çıkarın, suyunuz yanınızda olsun!",
      "🌙 Akşam suyu, günü güzel kapatır!",
      "🌅 Gün batımında su içmek, huzur verir!",
      "💧 Akşam suyu, vücudunuzu dinlendirir!",
      "🌟 Akşam vakti su, günü özetler!",
      "🌊 Akşam suyu, rahat bir gece sağlar!",
    ];
  } else {
    messages = [
      "🌙 Gece vakti bile su içmeyi ihmal etmeyin, rüyalarınıza tazelik katın!",
      "⭐ Uyumadan önce bir yudum su, tatlı rüyalara kapı aralar!",
      "💫 Gece sessizliğinde, suyun ferahlığı ruhunuzu dinlendirsin!",
      "🌊 Yatmadan önce su içmeyi unutmayın; rahat bir uykuya dalın!",
      "🌟 Gece boyunca suyunuzun keyfini çıkarın, rüyalarınıza ilham olsun!",
      "🌙 Gece suyu, tatlı rüyalar getirir!",
      "⭐ Gece vakti su, vücudunuzu onarır!",
      "💫 Gece suyu, hücrelerinizi yeniler!",
      "🌊 Gece suyu, metabolizmanızı destekler!",
      "🌟 Gece vakti su, sağlığınızı korur!",
    ];
  }

  if (weather && weather.temperature) {
    if (weather.temperature > 30) {
      messages.push("🔥 Bugün hava sıcak, suyunuz hayat kurtarıcı!");
      messages.push("☀️ Sıcak günlerde su, vücudunuzun serin kalmasını sağlar!");
      messages.push("🔥 Sıcak hava su ihtiyacınızı artırıyor, bol su için!");
      messages.push("☀️ Sıcak günlerde su, vücudunuzu soğutur!");
      messages.push("🌡️ Yüksek sıcaklıkta su, hayat kurtarıcıdır!");
      messages.push("💧 Sıcak hava terlemeyi artırır, su kaybını önleyin!");
      messages.push("🌞 Sıcak günlerde su, enerjinizi korur!");
      messages.push("⚡ Sıcak hava metabolizmanızı hızlandırır, su ihtiyacınız artar!");
    } else if (weather.temperature < 10) {
      messages.push("❄️ Soğuk havada içinizi ısıtacak bir yudum suya ne dersiniz?");
      messages.push("🌨️ Soğuk günlerde sıcak su, sizi ısıtır ve canlandırır!");
      messages.push("❄️ Soğuk hava su ihtiyacınızı azaltsa da, su içmeyi unutmayın!");
      messages.push("🌨️ Soğuk günlerde sıcak su, içinizi ısıtır!");
      messages.push("🧊 Soğuk havada su, vücudunuzu dengeler!");
      messages.push("🌡️ Düşük sıcaklıkta su, metabolizmanızı destekler!");
      messages.push("💧 Soğuk günlerde su, bağışıklığınızı güçlendirir!");
      messages.push("🌟 Soğuk hava su ihtiyacınızı azaltsa da, düzenli su için!");
    }

    if (weather.windSpeed > 20) {
      messages.push("💨 Rüzgarlı havada su kaybınız artıyor, daha fazla su için!");
      messages.push("🌪️ Rüzgar vücudunuzdan nem alıyor, suyunuzu ihmal etmeyin!");
      messages.push("💨 Rüzgarlı hava su kaybınızı artırır, bol su için!");
      messages.push("🌪️ Rüzgar vücudunuzdan nem alır, su ihtiyacınız artar!");
      messages.push("💧 Rüzgarlı günlerde su, cildinizi nemlendirir!");
      messages.push("🌊 Rüzgar su kaybınızı artırır, daha fazla su için!");
    }

    if (weather.uvIndex > 7) {
      messages.push("☀️ UV indeksi yüksek! Güneş ışınları su ihtiyacınızı artırıyor.");
      messages.push("🌞 Yüksek UV'de su, cildinizi korur ve nemlendirir!");
      messages.push("☀️ Yüksek UV su ihtiyacınızı artırır, bol su için!");
      messages.push("🌞 UV ışınları cildinizi kurutur, su ile nemlendirin!");
      messages.push("💧 Yüksek UV'de su, cildinizi korur!");
      messages.push("⚡ UV indeksi yüksek, su ihtiyacınız artıyor!");
    }

    if (weather.cloudCover > 80) {
      messages.push("☁️ Bulutlu hava su ihtiyacınızı azaltsa da, su içmeyi unutmayın!");
      messages.push("☁️ Bulutlu hava su ihtiyacınızı azaltsa da, düzenli su için!");
      messages.push("🌥️ Bulutlu günlerde su, vücudunuzu dengeler!");
      messages.push("💧 Bulutlu hava su ihtiyacınızı azaltsa da, su içmeyi unutmayın!");
    }

    if (weather.precipitation > 0 || weather.rain > 0 || weather.showers > 0) {
      messages.push("🌧️ Yağmurlu havada bile su içmeyi ihmal etmeyin!");
      messages.push("☔ Yağmur dışarıda, su içmek içeride - her ikisi de önemli!");
      messages.push("🌧️ Yağmurlu havada su, vücudunuzu dengeler!");
      messages.push("☔ Yağmur dışarıda, su içmek içeride!");
      messages.push("💧 Yağmurlu günlerde su, metabolizmanızı destekler!");
      messages.push("🌊 Yağmur su ihtiyacınızı azaltsa da, düzenli su için!");
    }

    if (weather.humidity > 80) {
      messages.push("💧 Nemli havada terleme artıyor, su ihtiyacınız yüksek!");
      messages.push("💧 Nemli hava terlemeyi artırır, bol su için!");
      messages.push("🌫️ Yüksek nem su kaybınızı artırır!");
      messages.push("💦 Nemli havada su, vücudunuzu dengeler!");
      messages.push("🌊 Yüksek nem terlemeyi artırır, su ihtiyacınız yüksek!");
    } else if (weather.humidity < 30) {
      messages.push("🏜️ Kuru havada su kaybı fazla, bol su için!");
      messages.push("🏜️ Kuru hava su kaybınızı artırır, bol su için!");
      messages.push("💧 Düşük nem su kaybınızı artırır!");
      messages.push("🌵 Kuru havada su, cildinizi nemlendirir!");
      messages.push("🌊 Düşük nem su ihtiyacınızı artırır!");
    }
  }

  return messages[Math.floor(Math.random() * messages.length)];
};

// Takviye bildirim zamanını alma (SupplementNotificationScheduler.js ile birebir aynı)
const getNextSupplementReminderTime = async (suppData, userId) => {
  const reminderTimes = await computeSupplementReminderTimes(suppData, userId);
  const now = getTurkeyTime();
  
  // Gece yarısı özeti için özel kontrol (23:59)
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // Eğer şu an 23:58-23:59 arasındaysa ve gece yarısı özeti varsa
  if (currentHour === 23 && currentMinute >= 58) {
    const midnightSummary = reminderTimes.find(time => {
      const timeHour = time.getHours();
      const timeMinute = time.getMinutes();
      return timeHour === 23 && timeMinute === 59;
    });
    
    if (midnightSummary) {
      console.log(`🌙 [${userId}] ${suppData.name} için gece yarısı özeti bulundu: ${midnightSummary.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}`);
      return midnightSummary;
    }
  }
  
  // Tolerans eklenerek, gelecekteki bildirim zamanı aranıyor.
  const TOLERANCE_MS = 60000; // 1 dakika tolerans
  for (const time of reminderTimes) {
    if (time.getTime() > now.getTime() + TOLERANCE_MS) {
      return time;
    }
  }
  // Eğer bugünün tüm bildirim saatleri geçmişse, yarının ilk bildirim zamanını ayarla.
  if (reminderTimes.length > 0) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const firstTime = reminderTimes[0];
    const tomorrowDateStr = tomorrow.toLocaleDateString("en-CA");
    const timeParts = firstTime.toLocaleTimeString("en-US", { hour12: false }).split(":");
    const tomorrowReminder = new Date(`${tomorrowDateStr}T${timeParts[0]}:${timeParts[1]}:00`);
    return tomorrowReminder;
  }
  console.warn(`getNextSupplementReminderTime - [${userId}] ${suppData.name} için gelecek bildirim zamanı bulunamadı`);
  return null;
};

// Kullanıcı verilerini alma (NotificationScheduler.jsx ile birebir aynı)
const fetchUserData = async (userId) => {
  if (!userId) return {};
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    const waterDoc = await db.collection('users').doc(userId).collection('water').doc('current').get();
    const waterData = waterDoc.exists ? waterDoc.data() : {};

    return { ...userData, ...waterData };
  } catch (error) {
    console.error('fetchUserData - Hata:', error);
    return {};
  }
};

// Su bildirim zamanlarını hesaplama (NotificationScheduler.jsx ile birebir aynı)
const computeWaterReminderTimes = async (userId) => {
  const data = await fetchUserData(userId);
  const mode = data.waterNotificationOption || "smart";

  // Global bildirim penceresi kontrolü - varsayılan değerlerle güvenli erişim
  let globalWindow = await getGlobalNotificationWindow(userId);
  if (!globalWindow) {
    globalWindow = data.notificationWindow || { start: "08:00", end: "22:00" };
  }
  
  const { windowStart, windowEnd } = computeWindowTimes(globalWindow);
  const now = getTurkeyTime();
  let reminderSchedule = [];

  if (mode === "none") {
    const waterRef = db.collection('users').doc(userId).collection('water').doc('current');
    await waterRef.update({
      nextWaterReminderTime: null,
      nextWaterReminderMessage: null,
      reminderTimes: [],
    });
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

    // --- GÜNLÜK ORTALAMA HAVA DURUMU ---
    // Sadece günün başında (00:00'da) veya dailyWeatherAverages kaydedilmemişse çekilecek
    let dailyWeatherAverages = data.dailyWeatherAverages;
    let todayStr = now.toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
    if (!dailyWeatherAverages || dailyWeatherAverages.date !== todayStr) {
      const avgWeather = await getDailyAverageWeatherData();
      if (avgWeather) {
        dailyWeatherAverages = { ...avgWeather, date: todayStr };
        // Firestore'a kaydet
        const waterRef = db.collection('users').doc(userId).collection('water').doc('current');
        await waterRef.update({ dailyWeatherAverages });
      }
    }
    
    // --- SAATLİK HAVA DURUMU VERİLERİ ---
    // Günlük ortalama hesaplaması için kullanılacak, ayrıca saatlik veriler de kaydedilecek
    let hourlyWeatherData = data.hourlyWeatherData;
    if (!hourlyWeatherData || hourlyWeatherData.date !== todayStr) {
      // Sadece saatlik verileri al (günlük ortalama zaten dailyWeatherAverages'da var)
      const weatherData = await getDailyAverageWeatherData();
      if (weatherData) {
        // Sadece saatlik verileri kaydet
        hourlyWeatherData = { 
          date: todayStr,
          hourlyData: weatherData.hourlyData 
        };
        const waterRef = db.collection('users').doc(userId).collection('water').doc('current');
        await waterRef.update({ hourlyWeatherData });
      }
    }
    
    // Ortalamaları kullan (günlük su hedefi hesaplaması için)
    const weather = dailyWeatherAverages || {};
    const temperature = weather.temperature || 20;
    const humidity = weather.humidity || 50;
    const windSpeed = weather.windSpeed || 10;
    const uvIndex = weather.uvIndex || 3;
    const cloudCover = weather.cloudCover || 50;
    const precipitation = weather.precipitation || 0;
    const isDay = weather.isDay || 1;

    // Temel çarpanlar
    const humidityMultiplier = 1 + Math.abs(50 - humidity) / 200;
    const weatherMultiplier = 1 + (temperature - 20) / 100;
    let windMultiplier = 1 + Math.max(0, (windSpeed - 10)) / 100;
    let uvMultiplier = 1 + Math.max(0, (uvIndex - 3)) / 20;
    let cloudMultiplier = 1 - (cloudCover / 200);
    let precipitationMultiplier = precipitation > 0 ? 0.9 : 1.0;
    let dayNightMultiplier = isDay ? 1.1 : 0.9;

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

    const finalMultiplier =
      1.4 * 
      weatherMultiplier * 
      humidityMultiplier * 
      activityMultiplier *
      windMultiplier *
      uvMultiplier *
      cloudMultiplier *
      precipitationMultiplier *
      dayNightMultiplier;
      
    // --- GÜNLÜK SU HEDEFİ ARTIK SABİT ---
    const dailyWaterTarget = calculateDailyWaterTarget(bmr, finalMultiplier, gender);
    const waterIntake = 0; // Gece yarısı sıfırlandığı için 0
    const remainingTarget = Math.max(dailyWaterTarget - waterIntake, 0);

    const glassSize = data.glassSize || 250;
    const numGlasses = Math.ceil(remainingTarget / glassSize);

    const waterRef = db.collection('users').doc(userId).collection('water').doc('current');
    await waterRef.update({
      bmr,
      dailyWaterTarget,
      glassSize,
      waterNotificationOption: "smart",
      dailyWeatherAverages,
      serverSideCalculated: true, // Server-side hesaplandığını işaretle
    });

    // Saatlik hava durumu verilerini analiz et ve kritik saatleri belirle
    const criticalHours = [];
    if (hourlyWeatherData && hourlyWeatherData.hourlyData) {
      for (let hour = 0; hour < 24; hour++) {
        const hourData = hourlyWeatherData.hourlyData[hour];
        if (hourData) {
          const isCritical = 
            hourData.temperature > 28 || // Sıcak
            hourData.humidity > 75 || // Nemli
            hourData.uvIndex > 6 || // Yüksek UV
            hourData.windSpeed > 15; // Rüzgarlı
          
          if (isCritical) {
            criticalHours.push(hour);
          }
        }
      }
    }
    
    // Kritik saatlerde daha sık bildirim için interval hesaplama
    const remainingMinutes = (windowEnd.getTime() - now.getTime()) / 60000;
    let baseInterval = Math.max(15, Math.floor(remainingMinutes / numGlasses));
    
    // Kritik saatlerde interval'i yarıya düşür
    const criticalInterval = Math.max(10, Math.floor(baseInterval / 2));
    
    let startTime;
    if (
      now.getTime() >= windowStart.getTime() &&
      now.getTime() < windowEnd.getTime()
    ) {
      startTime = now.getTime() + baseInterval * 60000;
    } else {
      startTime = windowStart.getTime();
    }
    
    while (startTime <= windowEnd.getTime()) {
      const reminderTime = new Date(startTime);
      reminderTime.setSeconds(0, 0);
      
      // O anki saatin hava durumu verisini al
      const currentHourWeather = await getCurrentHourWeatherData(reminderTime, userId);
      const message = getMotivationalMessageForTime(reminderTime, currentHourWeather || weather);
      reminderSchedule.push({ time: reminderTime, message });
      
      // O anki saatin kritik olup olmadığını kontrol et
      const currentHour = reminderTime.getHours();
      const isCurrentHourCritical = criticalHours.includes(currentHour);
      const nextInterval = isCurrentHourCritical ? criticalInterval : baseInterval;
      
      startTime += nextInterval * 60000;
    }
  } else if (mode === "custom") {
    const dailyWaterTarget = data.dailyWaterTarget || 2000;
    const glassSize = data.glassSize || 250;
    const customIntervalHours = data.customNotificationInterval || 1;

    let startTime;
    if (now >= windowStart && now < windowEnd) {
      startTime = now.getTime() + customIntervalHours * 3600000;
    } else if (now >= windowEnd) {
      const nextWindowStart = new Date(windowStart);
      nextWindowStart.setDate(nextWindowStart.getDate() + 1);
      startTime = nextWindowStart.getTime();
    } else {
      startTime = windowStart.getTime();
    }

    // Custom mod için de kritik saatleri analiz et
    const criticalHours = [];
    if (hourlyWeatherData && hourlyWeatherData.hourlyData) {
      for (let hour = 0; hour < 24; hour++) {
        const hourData = hourlyWeatherData.hourlyData[hour];
        if (hourData) {
          const isCritical = 
            hourData.temperature > 28 || // Sıcak
            hourData.humidity > 75 || // Nemli
            hourData.uvIndex > 6 || // Yüksek UV
            hourData.windSpeed > 15; // Rüzgarlı
          
          if (isCritical) {
            criticalHours.push(hour);
          }
        }
      }
    }
    
    while (startTime <= windowEnd.getTime()) {
      const reminderTime = new Date(startTime);
      reminderTime.setSeconds(0, 0); // Saniyeleri ve milisaniyeleri 0 yap
      
      // O anki saatin hava durumu verisini al
      const currentHourWeather = await getCurrentHourWeatherData(reminderTime, userId);
      const message = getMotivationalMessageForTime(reminderTime, currentHourWeather || weather);
      reminderSchedule.push({ time: reminderTime, message });
      
      // O anki saatin kritik olup olmadığını kontrol et
      const currentHour = reminderTime.getHours();
      const isCurrentHourCritical = criticalHours.includes(currentHour);
      
      // Kritik saatlerde daha sık bildirim (yarı aralık)
      let nextInterval = customIntervalHours;
      if (isCurrentHourCritical) {
        nextInterval = Math.max(0.5, customIntervalHours / 2); // Minimum 30 dakika
      }
      
      startTime += nextInterval * 3600000;
    }
  }

  // Filtre: Şu anın +1 dakika sonrasından daha yakın olan bildirimler çıkarılıyor.
  const futureReminders = reminderSchedule.filter(
    (reminder) => reminder.time.getTime() > now.getTime() + 60000
  );

  const waterRef = db.collection('users').doc(userId).collection('water').doc('current');
  await waterRef.update({
    reminderTimes: futureReminders.map((obj) => ({
      time: obj.time.toISOString(), // ISO formatında kaydediyoruz
      message: obj.message,
    })),
  });

  return futureReminders;
};

// Su bildirim zamanını kaydetme (NotificationScheduler.jsx ile birebir aynı)
const saveNextWaterReminderTime = async (userId) => {
  const waterRef = db.collection('users').doc(userId).collection('water').doc('current');
  const waterSnap = await waterRef.get();
  let reminderTimes = [];
  if (waterSnap.exists && waterSnap.data().reminderTimes) {
    reminderTimes = waterSnap.data().reminderTimes.map((r) => ({
      ...r,
      time: new Date(r.time),
    }));
  }

  const now = getTurkeyTime();
  reminderTimes = reminderTimes.filter(
    (r) => r.time.getTime() > now.getTime() + 60000
  );
  if (reminderTimes.length === 0) {
    reminderTimes = await computeWaterReminderTimes(userId);
  }
  if (reminderTimes.length > 0) {
    const nextReminder = reminderTimes[0];
    await waterRef.update({
      nextWaterReminderTime: nextReminder.time.toISOString(),
      nextWaterReminderMessage: nextReminder.message,
      reminderTimes: reminderTimes,
    });
    return nextReminder;
  } else {
    await waterRef.update({
      nextWaterReminderTime: null,
      nextWaterReminderMessage: null,
      reminderTimes: [],
    });
    return null;
  }
};

// Takviye bildirim zamanlarını hesaplama (SupplementNotificationScheduler.js ile birebir aynı)
const computeSupplementReminderTimes = async (suppData, userId) => {
  const times = [];
  const now = getTurkeyTime();
  const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD formatı

  // Tüketim kontrolü: Eğer günlük kullanım hedefine ulaşılmışsa bildirim zamanı hesaplanmaz.
  let consumptionReached = false;
  let consumed = 0; // Değişkeni dışarıda tanımla
  if (suppData.dailyUsage > 0) {
    try {
      const consumptionDocRef = db.collection('users').doc(userId).collection('stats').doc('supplementConsumption');
      const consumptionDoc = await consumptionDocRef.get();
      if (consumptionDoc.exists) {
        const consumptionData = consumptionDoc.data();
        const todayConsumption = consumptionData[todayStr] || {};
        consumed = todayConsumption[suppData.name] || 0;
      }
      if (consumed >= suppData.dailyUsage) {
        consumptionReached = true;
      }
    } catch (error) {
      console.error('computeSupplementReminderTimes - Consumption verisi alınırken hata:', error);
    }
  }
  if (consumptionReached) {
    console.log(`🔄 [${userId}] ${suppData.name} günlük hedefe ulaşılmış (${consumed}/${suppData.dailyUsage}), bildirim hesaplanmayacak`);
    return [];
  }

  // Global bildirim penceresi (değeri doğru; bu alana dokunmuyoruz)
  let globalNotifWindow = await getGlobalNotificationWindow(userId);
  if (!globalNotifWindow) {
    globalNotifWindow = { start: "08:00", end: "22:00" };
  }
  const { windowStart, windowEnd } = computeWindowTimes(globalNotifWindow);
  
  // Dinamik gün sonu özeti zamanı hesaplama - Düzeltilmiş versiyon
  let summaryTime;
  
  // Pencere bitiş zamanını al
  const windowEndTime = new Date(windowEnd);
  
  // Eğer pencere bitişi bugün içindeyse, o zamandan 1 dakika önce
  if (windowEndTime.getDate() === now.getDate()) {
    summaryTime = new Date(windowEndTime.getTime() - 60000); // 1 dakika önce
  } else {
    // Pencere bitişi yarınsa veya daha sonra, bugünün sonu (23:59)
    summaryTime = new Date(todayStr + 'T23:59:00+03:00');
  }
  
  // Zamanı saniye ve milisaniye olmadan ayarla
  summaryTime.setSeconds(0, 0);

  // Manuel bildirim zamanı varsa
  if (suppData.notificationSchedule && suppData.notificationSchedule.length > 0) {
    suppData.notificationSchedule.forEach((timeStr) => {
      let scheduled = new Date(`${todayStr}T${timeStr}:00+03:00`);
      // Manuel zaman bugünden geçmişse, yarın için hesapla
      if (scheduled.getTime() <= now.getTime()) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        const timeParts = timeStr.split(":");
        scheduled = new Date(`${tomorrowStr}T${timeParts[0]}:${timeParts[1]}:00+03:00`);
      }
      times.push(scheduled);
    });
  }
  // Otomatik hesaplama: Günlük kullanım tanımlıysa
  else if (suppData.dailyUsage > 0) {
    const estimatedRemainingDays = suppData.quantity / suppData.dailyUsage;
    const flooredRemaining = Math.floor(estimatedRemainingDays);

    if (flooredRemaining === 0) {
      // Takviyenin bittiğine dair bildirim (örneğin 1 dakika sonrası)
      const finishedTime = new Date(now.getTime() + 1 * 60000);
      times.push(finishedTime);
    } else if ([14, 7, 3, 1].includes(flooredRemaining)) {
      if (globalNotifWindow && globalNotifWindow.end) {
        const windowEndTime = new Date(`${todayStr}T${globalNotifWindow.end}:00+03:00`);
        times.push(windowEndTime);
      } else {
        const defaultTime = new Date(now.getTime() + 60 * 60000);
        times.push(defaultTime);
      }
    } else {
      // Normal durumda artık pencere bitişi bildirimi göndermiyoruz, sadece dinamik gün sonu özeti
      // Dinamik gün sonu özeti zamanını ekle
      times.push(summaryTime);
    }
  } else {
    console.warn(`computeSupplementReminderTimes - [${userId}] ${suppData.name} için hiçbir bildirim zamanı hesaplanamadı: dailyUsage yok veya 0`);
  }

  times.sort((a, b) => a - b);
  return times;
};

// Takviye bildirim zamanını kaydetme (SupplementNotificationScheduler.js ile birebir aynı)
const saveNextSupplementReminderTime = async (userId, suppData) => {
  // notificationSchedule varsa, en yakın zamanı bul ve kaydet
  if (suppData.notificationSchedule && suppData.notificationSchedule.length > 0) {
    // En yakın zamanı bul
    const now = getTurkeyTime();
    const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD formatı
    // Tüm saatleri bugünün tarihiyle Date objesine çevir
    const times = suppData.notificationSchedule.map((timeStr) => {
      let scheduled = new Date(`${todayStr}T${timeStr}:00+03:00`);
      // Eğer saat geçmişse, yarın için hesapla
      if (scheduled.getTime() <= now.getTime()) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        const timeParts = timeStr.split(":");
        scheduled = new Date(`${tomorrowStr}T${timeParts[0]}:${timeParts[1]}:00+03:00`);
      }
      return scheduled;
    });
    // Gelecekteki en yakın zamanı bul
    const futureTimes = times.filter((t) => t.getTime() > now.getTime());
    let nextReminder = null;
    if (futureTimes.length > 0) {
      nextReminder = futureTimes.sort((a, b) => a - b)[0];
    } else if (times.length > 0) {
      // Hepsi geçmişse, yarının ilk zamanı
      nextReminder = times.sort((a, b) => a - b)[0];
    }
    const suppDocRef = db.collection('users').doc(userId).collection('supplements').doc(suppData.id);
    if (nextReminder) {
      await suppDocRef.update({
        nextSupplementReminderTime: nextReminder.toISOString(),
        notificationsLastCalculated: new Date(),
      });
      return nextReminder;
    } else {
      await suppDocRef.update({
        nextSupplementReminderTime: null,
        notificationsLastCalculated: new Date(),
      });
      return null;
    }
  }
  // Otomatik hesaplama kodu
  try {
    const nextReminder = await getNextSupplementReminderTime(suppData, userId);
    if (!nextReminder) {
      console.warn(`saveNextSupplementReminderTime - [${userId}] ${suppData.name} için sonraki bildirim zamanı hesaplanamadı`);
      return null;
    }
    const suppDocRef = db.collection('users').doc(userId).collection('supplements').doc(suppData.id);
    // Sadece gerekli alanları kaydet
    const updateData = {
      nextSupplementReminderTime: nextReminder.toISOString(),
      notificationsLastCalculated: new Date(),
    };
    await suppDocRef.update(updateData);
    if (ENABLE_VERBOSE_LOGGING) {
      console.log(`💊 [${userId}] ${suppData.name} bildirimi kaydedildi: ${nextReminder.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}`);
    }
    return nextReminder;
  } catch (error) {
    if (ENABLE_VERBOSE_LOGGING) {
      console.error(`❌ saveNextSupplementReminderTime - [${userId}] ${suppData.name} için hata:`, error);
    }
    throw error; // Retry mekanizması için hatayı fırlat
  }
};

// Su verilerini sıfırla
const resetWaterData = async (userId, waterData) => {
  const todayStr = getTurkeyTime().toISOString().split('T')[0]; // YYYY-MM-DD formatı
  
  // Eğer bugün zaten reset yapılmışsa, tekrar yapma
  if (waterData.lastResetDate === todayStr) {
    if (ENABLE_VERBOSE_LOGGING) {
      console.log(`🔄 [${userId}] Su verisi zaten bugün sıfırlanmış`);
    }
    return false;
  }

  const yesterday = new Date(getTurkeyTime());
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const newHistoryEntry = {
    date: yesterdayStr,
    intake: waterData.waterIntake || 0,
  };

  try {
    const waterRef = db.collection('users').doc(userId).collection('water').doc('current');
    
    await waterRef.update({
      waterIntake: 0,
      yesterdayWaterIntake: waterData.waterIntake || 0,
      lastResetDate: todayStr,
      lastUpdate: new Date().toISOString(),
      history: admin.firestore.FieldValue.arrayUnion(newHistoryEntry),
      serverSideCalculated: true, // Reset sonrası server-side hesaplandığını işaretle
    });

    if (ENABLE_VERBOSE_LOGGING) {
      console.log(`✅ [${userId}] Su verisi sıfırlandı: ${waterData.waterIntake}ml → 0ml`);
    }
    return true;
  } catch (error) {
    if (ENABLE_VERBOSE_LOGGING) {
      console.error(`❌ [${userId}] Su verisi sıfırlama hatası:`, error);
    }
    throw error; // Retry mekanizması için hatayı fırlat
  }
};

// Ana fonksiyon
exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
  };

  // OPTIONS request için CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  const startTime = Date.now();
  const errorSummary = {
    userErrors: 0,
    waterResetErrors: 0,
    waterNotificationErrors: 0,
    supplementErrors: 0,
    criticalErrors: [],
  };

  try {
    console.log('🌙 Gece yarısı sıfırlama ve bildirim hesaplama başlatılıyor...');
    
    // Tüm kullanıcıları al (cache ile)
    const usersDocs = await getCachedUsers();
    
    if (!usersDocs || usersDocs.length === 0) {
      console.log("ℹ️ İşlenecek kullanıcı bulunamadı");
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'İşlenecek kullanıcı bulunamadı',
          stats: {
            totalUsers: 0,
            waterResetCount: 0,
            waterNotificationCount: 0,
            supplementNotificationCount: 0,
          },
        }),
      };
    }
    
    let totalUsers = 0;
    let waterResetCount = 0;
    let waterNotificationCount = 0;
    let supplementNotificationCount = 0;

    // Hava durumu verisini bir kez al ve cache'le (tüm kullanıcılar için paylaşılacak)
    console.log('🌤️ Hava durumu verisi alınıyor (tüm kullanıcılar için paylaşılacak)...');
    const weatherResult = await executeWithRetry(
      () => getDailyAverageWeatherData(),
      'Hava durumu verisi alma'
    );
    const sharedWeatherData = weatherResult.success ? weatherResult.result : null;
    
    if (!sharedWeatherData) {
      console.warn('⚠️ Hava durumu verisi alınamadı, işlem devam edecek (varsayılan değerler kullanılacak)');
    }

    // Kullanıcıları chunk'lara böl (paralel işleme için)
    const CHUNK_SIZE = getChunkSize(); // Dinamik chunk size
    const userChunks = [];
    for (let i = 0; i < usersDocs.length; i += CHUNK_SIZE) {
      userChunks.push(usersDocs.slice(i, i + CHUNK_SIZE));
    }

    console.log(`🔄 ${usersDocs.length} kullanıcı ${userChunks.length} chunk'a bölündü (her chunk ${CHUNK_SIZE} kullanıcı, ${ENABLE_VERBOSE_LOGGING ? 'verbose logging açık' : 'verbose logging kapalı'})`);

    // Her chunk'ı paralel işle
    for (let chunkIndex = 0; chunkIndex < userChunks.length; chunkIndex++) {
      const chunk = userChunks[chunkIndex];
      console.log(`📦 Chunk ${chunkIndex + 1}/${userChunks.length} işleniyor (${chunk.length} kullanıcı)...`);
      
      const chunkStartTime = Date.now();
      
      // Chunk içindeki tüm kullanıcıları paralel işle
      const chunkResults = await Promise.allSettled(
        chunk.map(async (userDoc) => {
          if (!userDoc || !userDoc.id) {
            if (ENABLE_VERBOSE_LOGGING) {
              console.warn("⚠️ Geçersiz kullanıcı dokümanı, atlanıyor");
            }
            return { success: false, skipped: true };
          }
          
          const userId = userDoc.id;
          const stats = {
            waterReset: false,
            waterNotification: false,
            supplementNotifications: 0,
          };

          try {
            // Paralel veri çekimi: Water ve supplements verilerini birlikte çek (retry ile)
            const dataFetchResult = await executeWithRetry(async () => {
              return await Promise.all([
                db.collection('users').doc(userId).collection('water').doc('current').get(),
                db.collection('users').doc(userId).collection('supplements').get(),
              ]);
            }, `[${userId}] Veri çekimi`);

            if (!dataFetchResult.success) {
              throw new Error(`Veri çekilemedi: ${dataFetchResult.error?.message}`);
            }

            const [waterDoc, supplementsSnapshot] = dataFetchResult.result;
            const waterData = waterDoc.exists ? waterDoc.data() : null;

            // Su verilerini sıfırla (retry ile)
            if (waterData) {
              const waterResetResult = await executeWithRetry(
                () => resetWaterData(userId, waterData),
                `[${userId}] Su verisi sıfırlama`
              );

              if (waterResetResult.success && waterResetResult.result) {
                stats.waterReset = true;
                waterResetCount++;
              } else if (!waterResetResult.success) {
                errorSummary.waterResetErrors++;
                if (ENABLE_VERBOSE_LOGGING) {
                  console.error(`❌ [${userId}] Su verisi sıfırlama başarısız:`, waterResetResult.error?.message);
                }
              }
            }

            // Su bildirimlerini hesapla (retry ile)
            const waterNotificationResult = await executeWithRetry(
              () => saveNextWaterReminderTime(userId),
              `[${userId}] Su bildirimi hesaplama`
            );

            if (waterNotificationResult.success && waterNotificationResult.result) {
              stats.waterNotification = true;
              waterNotificationCount++;
            } else if (!waterNotificationResult.success) {
              errorSummary.waterNotificationErrors++;
              if (ENABLE_VERBOSE_LOGGING) {
                console.error(`❌ [${userId}] Su bildirimi hesaplama başarısız:`, waterNotificationResult.error?.message);
              }
            }

            // Takviye bildirimlerini hesapla
            if (supplementsSnapshot && supplementsSnapshot.docs) {
              // Takviyeleri de paralel işle
              const supplementPromises = supplementsSnapshot.docs.map(async (suppDoc) => {
                try {
                  const suppData = { ...suppDoc.data(), id: suppDoc.id };
                  if (!suppData.name) {
                    if (ENABLE_VERBOSE_LOGGING) {
                      console.warn(`⚠️ [${userId}] Takviye adı bulunamadı, atlanıyor`);
                    }
                    return null;
                  }
                  
                  // Takviye bildirimi hesaplama (retry ile)
                  const supplementResult = await executeWithRetry(
                    () => saveNextSupplementReminderTime(userId, suppData),
                    `[${userId}] ${suppData.name} takviye bildirimi`
                  );

                  if (supplementResult.success && supplementResult.result) {
                    stats.supplementNotifications++;
                    if (ENABLE_VERBOSE_LOGGING) {
                      console.log(`💊 [${userId}] ${suppData.name} bildirimi kaydedildi`);
                    }
                    return { name: suppData.name, time: supplementResult.result };
                  } else if (!supplementResult.success) {
                    errorSummary.supplementErrors++;
                    if (ENABLE_VERBOSE_LOGGING) {
                      console.error(`❌ [${userId}] ${suppData.name} takviye işleme hatası:`, supplementResult.error?.message);
                    }
                  }
                  return null;
                } catch (suppError) {
                  errorSummary.supplementErrors++;
                  console.error(`❌ [${userId}] Takviye işleme hatası (${suppDoc.id}):`, suppError);
                  return null;
                }
              });

              const supplementResults = await Promise.allSettled(supplementPromises);
              supplementResults.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value) {
                  supplementNotificationCount++;
                }
              });
            }

            return { success: true, userId, stats };
          } catch (error) {
            errorSummary.userErrors++;
            const errorInfo = {
              userId,
              error: error.message,
              stack: error.stack,
              timestamp: new Date().toISOString(),
            };
            
            if (ENABLE_VERBOSE_LOGGING) {
              console.error(`❌ [${userId}] Kullanıcı işleme hatası:`, error);
            } else {
              // Sadece kritik hataları logla
              if (error.message?.includes('permission') || error.message?.includes('quota')) {
                errorSummary.criticalErrors.push(errorInfo);
                console.error(`🚨 [${userId}] KRİTİK HATA:`, error.message);
              }
            }
            
            return { success: false, userId, error: error.message };
          }
        })
      );

      // Chunk sonuçlarını işle
      chunkResults.forEach((result, index) => {
        totalUsers++;
        if (result.status === 'rejected') {
          errorSummary.userErrors++;
          console.error(`❌ Chunk ${chunkIndex + 1} - Kullanıcı işleme hatası:`, result.reason);
        } else if (result.status === 'fulfilled' && result.value && result.value.success && ENABLE_VERBOSE_LOGGING) {
          // Başarılı işlemler için log (sadece verbose logging açıksa)
          console.log(`✅ [${result.value.userId}] İşlem tamamlandı`, result.value.stats);
        }
      });

      const chunkDuration = Date.now() - chunkStartTime;
      const avgTimePerUser = chunkDuration / chunk.length;
      console.log(`✅ Chunk ${chunkIndex + 1}/${userChunks.length} tamamlandı (${chunkDuration}ms, ortalama: ${Math.round(avgTimePerUser)}ms/kullanıcı)`);
      
      // Netlify timeout riskini azaltmak için: Son chunk değilse ve çok uzun sürdüyse kısa bekleme
      if (chunkIndex < userChunks.length - 1 && chunkDuration > 5000) {
        // Chunk 5 saniyeden uzun sürdüyse, 100ms bekle (timeout riskini azalt)
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const totalDuration = Date.now() - startTime;
    const avgTimePerUser = totalUsers > 0 ? totalDuration / totalUsers : 0;
    
    console.log(`✅ Gece yarısı işlemleri tamamlandı:`);
    console.log(`   ⏱️  Toplam süre: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);
    console.log(`   📊 Toplam kullanıcı: ${totalUsers} (ortalama: ${Math.round(avgTimePerUser)}ms/kullanıcı)`);
    console.log(`   💧 Su sıfırlama: ${waterResetCount} (başarılı)`);
    console.log(`   💧 Su bildirim hesaplama: ${waterNotificationCount} (başarılı)`);
    console.log(`   💊 Takviye bildirim hesaplama: ${supplementNotificationCount} takviye (başarılı)`);
    
    // Hata özeti logla
    if (errorSummary.userErrors > 0 || errorSummary.waterResetErrors > 0 || 
        errorSummary.waterNotificationErrors > 0 || errorSummary.supplementErrors > 0) {
      console.log(`   ⚠️  Hata Özeti:`);
      if (errorSummary.userErrors > 0) {
        console.log(`      - Kullanıcı işleme hataları: ${errorSummary.userErrors}`);
      }
      if (errorSummary.waterResetErrors > 0) {
        console.log(`      - Su sıfırlama hataları: ${errorSummary.waterResetErrors}`);
      }
      if (errorSummary.waterNotificationErrors > 0) {
        console.log(`      - Su bildirimi hesaplama hataları: ${errorSummary.waterNotificationErrors}`);
      }
      if (errorSummary.supplementErrors > 0) {
        console.log(`      - Takviye işleme hataları: ${errorSummary.supplementErrors}`);
      }
      if (errorSummary.criticalErrors.length > 0) {
        console.log(`      - 🚨 KRİTİK HATALAR: ${errorSummary.criticalErrors.length}`);
        errorSummary.criticalErrors.forEach(criticalError => {
          console.error(`         [${criticalError.userId}]: ${criticalError.error}`);
        });
      }
    } else {
      console.log(`   ✅ Tüm işlemler başarıyla tamamlandı (hata yok)`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Gece yarısı sıfırlama ve bildirim hesaplama tamamlandı',
        stats: {
          totalUsers,
          waterResetCount,
          waterNotificationCount,
          supplementNotificationCount,
          duration: totalDuration,
          avgTimePerUser: Math.round(avgTimePerUser),
          errors: {
            userErrors: errorSummary.userErrors,
            waterResetErrors: errorSummary.waterResetErrors,
            waterNotificationErrors: errorSummary.waterNotificationErrors,
            supplementErrors: errorSummary.supplementErrors,
            criticalErrors: errorSummary.criticalErrors.length,
          },
        },
      }),
    };

  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error('❌ Gece yarısı işlemleri kritik hatası:', error);
    console.error('   Stack:', error.stack);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        duration: totalDuration,
        stats: {
          totalUsers,
          waterResetCount,
          waterNotificationCount,
          supplementNotificationCount,
        },
        errorSummary: {
          userErrors: errorSummary.userErrors,
          waterResetErrors: errorSummary.waterResetErrors,
          waterNotificationErrors: errorSummary.waterNotificationErrors,
          supplementErrors: errorSummary.supplementErrors,
          criticalErrors: errorSummary.criticalErrors,
        },
      }),
    };
  }
}; 