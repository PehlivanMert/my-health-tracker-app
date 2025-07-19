import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../auth/firebaseConfig";

/**
 * Türkiye saatini döndürür.
 */
export const getTurkeyTime = () => {
  const turkeyTime = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
  );
  if (process.env.NODE_ENV === 'development') {
  console.log("getTurkeyTime - Şu anki Türkiye zamanı:", turkeyTime);
  }
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
  if (process.env.NODE_ENV === 'development') {
  console.log("calculateAge - Hesaplanan yaş:", age);
  }
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
  if (process.env.NODE_ENV === 'development') {
  console.log("calculateBMR - Hesaplanan BMR:", bmr);
  }
  return bmr;
};

/**
 * BMR değeri ve çarpan üzerinden günlük su hedefini (ml) hesaplar.
 */
export const calculateDailyWaterTarget = (bmr, multiplier = 1.4) => {
  const dailyWaterTarget = Math.round(bmr * multiplier);
  if (process.env.NODE_ENV === 'development') {
  console.log(
    "calculateDailyWaterTarget - Günlük su hedefi:",
    dailyWaterTarget
  );
  }
  return dailyWaterTarget;
};

/**
 * Kullanıcıya ait profil ve su verilerini Firestore'dan getirir.
 */
const fetchUserData = async (user) => {
  if (!user || !user.uid) return {};
  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? userSnap.data() : {};
    if (process.env.NODE_ENV === 'development') {
    console.log("fetchUserData - Kullanıcı ana verisi:", userData);
    }

    const waterRef = doc(db, "users", user.uid, "water", "current");
    const waterSnap = await getDoc(waterRef);
    const waterData = waterSnap.exists() ? waterSnap.data() : {};
    if (process.env.NODE_ENV === 'development') {
    console.log("fetchUserData - Su verileri:", waterData);
    }

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
        if (process.env.NODE_ENV === 'development') {
        console.log(
          "getGlobalNotificationWindow - Global bildirim penceresi alındı:",
          data.notificationWindow
        );
        }
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
 * Eğer pencere overnight ise (örn. 18:45–05:45), bitiş zamanı ertesi güne ayarlanır.
 */
const computeWindowTimes = (windowObj) => {
  const now = getTurkeyTime();
  // Yerel tarihi 'en-CA' formatıyla alarak Türkiye yerel tarihini elde ediyoruz.
  const todayStr = now.toLocaleDateString("en-CA", {
    timeZone: "Europe/Istanbul",
  });

  let start, end;
  // Eğer pencere overnight ise (başlangıç saati bitiş saatinden sonra)
  if (windowObj.start > windowObj.end) {
    // Bugünkü pencere bitişini hesaplayalım
    const todayEnd = new Date(`${todayStr}T${windowObj.end}:00`);
    // Eğer şu an pencere bitişinden önceyse, bu demektir ki pencere dün başlamış.
    if (now < todayEnd) {
      // Dünün tarihi
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString("en-CA", {
        timeZone: "Europe/Istanbul",
      });
      start = new Date(`${yesterdayStr}T${windowObj.start}:00`);
      end = todayEnd;
    } else {
      // Aksi halde, pencere bugünden başlayıp yarına kadar sürer.
      start = new Date(`${todayStr}T${windowObj.start}:00`);
      end = new Date(`${todayStr}T${windowObj.end}:00`);
      end.setDate(end.getDate() + 1);
    }
  } else {
    // Overnight değilse, normal şekilde bugünkü start ve end
    start = new Date(`${todayStr}T${windowObj.start}:00`);
    end = new Date(`${todayStr}T${windowObj.end}:00`);
  }

  if (process.env.NODE_ENV === 'development') {
  console.log(
    "computeWindowTimes - Pencere başlangıcı:",
    start,
    "Bitişi:",
    end
  );
  }
  return { windowStart: start, windowEnd: end };
};

/**
 * Belirtilen bildirim zamanı için günün saatine göre motivasyon mesajı oluşturur.
 * Opsiyonel: weather parametresi varsa ek mesajlar eklenir.
 */
export const getMotivationalMessageForTime = (date, weather = null) => {
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
    if (process.env.NODE_ENV === 'development') {
    console.log("getWeatherData  - Sıcaklık:", weather.temperature);
    }
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
      messages.push(
        "❄️ Soğuk havada içinizi ısıtacak bir yudum suya ne dersiniz?"
      );
      messages.push("🌨️ Soğuk günlerde sıcak su, sizi ısıtır ve canlandırır!");
      messages.push("❄️ Soğuk hava su ihtiyacınızı azaltsa da, su içmeyi unutmayın!");
      messages.push("🌨️ Soğuk günlerde sıcak su, içinizi ısıtır!");
      messages.push("🧊 Soğuk havada su, vücudunuzu dengeler!");
      messages.push("🌡️ Düşük sıcaklıkta su, metabolizmanızı destekler!");
      messages.push("💧 Soğuk günlerde su, bağışıklığınızı güçlendirir!");
      messages.push("🌟 Soğuk hava su ihtiyacınızı azaltsa da, düzenli su için!");
    }

    // Yeni hava durumu parametreleri için mesajlar
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

  const selectedMessage = messages[Math.floor(Math.random() * messages.length)];
  if (process.env.NODE_ENV === 'development') {
  console.log(
    `getMotivationalMessageForTime - Saat ${hour} için mesaj:`,
    selectedMessage
  );
  }
  return selectedMessage;
};

/**
 * Hava durumu bilgisini (sıcaklık, nem, weathercode) almak için örnek fonksiyon.
 *
 */
// 1. Kullanıcının gerçek zamanlı konumunu alan yardımcı fonksiyon
const getUserLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Tarayıcınız konum servisini desteklemiyor."));
      return;
    }

    // Konum izni durumunu kontrol et
    navigator.permissions.query({ name: 'geolocation' }).then((permissionStatus) => {
      if (process.env.NODE_ENV === 'development') {
      console.log('NotificationScheduler - Konum izni durumu:', permissionStatus.state);
      }
      
      if (permissionStatus.state === 'denied') {
        reject(new Error("Konum izni reddedildi"));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (process.env.NODE_ENV === 'development') {
          console.log('NotificationScheduler - Konum alındı:', position.coords);
          }
          resolve(position.coords);
        },
        (error) => {
          console.error('NotificationScheduler - Konum hatası:', error);
          let errorMessage = "Konum alınamadı";
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Konum izni verilmedi";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Konum bilgisi alınamadı";
              break;
            case error.TIMEOUT:
              errorMessage = "Konum alma zaman aşımına uğradı";
              break;
            default:
              errorMessage = "Konum alınırken bir hata oluştu";
          }
          
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 dakika cache
        }
      );
    }).catch((error) => {
      console.error('NotificationScheduler - İzin sorgulama hatası:', error);
      // Fallback olarak direkt konum iste
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position.coords),
        (error) => reject(new Error("Konum izni verilmedi"))
      );
    });
  });
};

// 2. Güncellenmiş getWeatherData fonksiyonu (konum izni + API entegrasyonu)
export const getWeatherData = async () => {
  try {
    // A. Konum izni iste ve koordinatları al
    const { latitude, longitude } = await getUserLocation();
    if (process.env.NODE_ENV === 'development') {
    console.log("Konum alındı:", { latitude, longitude });
    }

    // B. API isteği - tüm parametreleri al
    const response = await fetch(
      `${
        import.meta.env.VITE_OPEN_METEO_API_URL
      }?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,apparent_temperature,pressure_msl,cloud_cover,precipitation,rain,showers,snowfall,visibility,uv_index,is_day&timezone=Europe/Istanbul`
    );

    // C. Veri kontrolü
    const data = await response.json();
    if (!data.current) {
      throw new Error("Hava durumu verisi alınamadı");
    }

    // D. Formatlanmış veriyi döndür
    return {
      temperature: data.current.temperature_2m,
      humidity: data.current.relative_humidity_2m,
      weathercode: data.current.weather_code,
      windSpeed: data.current.wind_speed_10m,
      windDirection: data.current.wind_direction_10m,
      apparentTemperature: data.current.apparent_temperature,
      pressure: data.current.pressure_msl,
      cloudCover: data.current.cloud_cover,
      precipitation: data.current.precipitation,
      rain: data.current.rain,
      showers: data.current.showers,
      snowfall: data.current.snowfall,
      visibility: data.current.visibility,
      uvIndex: data.current.uv_index,
      isDay: data.current.is_day,
    };
  } catch (error) {
    // E. Hata yönetimi
    console.error("Hava durumu hatası:", error.message);
    toast.error(error.message || "Hava durumu alınamadı");
    return null;
  }
};

/**
 * 24 saatlik ortalama hava durumu verisini çeker ve döndürür.
 * Sadece günün başında (00:00'da) çağrılmalı, gün boyunca sabit kalmalı.
 */
export const getDailyAverageWeatherData = async () => {
  try {
    // A. Konum izni iste ve koordinatları al
    const { latitude, longitude } = await getUserLocation();
    if (process.env.NODE_ENV === 'development') {
    console.log("Konum alındı:", { latitude, longitude });
    }

    // B. Bugünün tarihi (Türkiye saatiyle)
    const now = getTurkeyTime();
    const todayStr = now.toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });

    // C. API isteği - 24 saatlik saatlik veriler
    const response = await fetch(
      `${import.meta.env.VITE_OPEN_METEO_API_URL}?latitude=${latitude}&longitude=${longitude}` +
        `&hourly=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,apparent_temperature,pressure_msl,cloud_cover,precipitation,rain,showers,snowfall,visibility,uv_index,is_day` +
        `&start_date=${todayStr}&end_date=${todayStr}&timezone=Europe/Istanbul`
    );
    const data = await response.json();
    if (!data.hourly) {
      throw new Error("Saatlik hava durumu verisi alınamadı");
    }
    // D. 24 saatlik ortalamaları hesapla
    const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const getArr = (key) => data.hourly[key] || [];
    const result = {
      temperature: avg(getArr("temperature_2m")),
      humidity: avg(getArr("relative_humidity_2m")),
      windSpeed: avg(getArr("wind_speed_10m")),
      windDirection: avg(getArr("wind_direction_10m")),
      apparentTemperature: avg(getArr("apparent_temperature")),
      pressure: avg(getArr("pressure_msl")),
      cloudCover: avg(getArr("cloud_cover")),
      precipitation: avg(getArr("precipitation")),
      rain: avg(getArr("rain")),
      showers: avg(getArr("showers")),
      snowfall: avg(getArr("snowfall")),
      visibility: avg(getArr("visibility")),
      uvIndex: avg(getArr("uv_index")),
      isDay: Math.round(avg(getArr("is_day"))),
      weathercode: getArr("weather_code")[12] || 0, // Öğlenin kodunu al (temsilci)
    };
    return result;
  } catch (error) {
    console.error("Günlük ortalama hava durumu hatası:", error.message);
    return null;
  }
};

/**
 * Su bildirimlerini hesaplar.
 * - Kalan dakika, pencere bitişi (windowEnd) ile mevcut zaman (now) arasından hesaplanır.
 * - İlk bildirim zamanı: Eğer now pencere içindeyse, ilk bildirim now + interval;
 *   aksi halde pencere başlangıcı kullanılır.
 * - Eğer kullanıcı su hedefine ulaştıysa, yeni bildirim hesaplanmaz; bunun yerine UI'da
 *   "Günlük su hedefinize ulaştınız!" yazısı gösterilir.
 */
export const computeWaterReminderTimes = async (user) => {
  if (!user || !user.uid) return [];
  const data = await fetchUserData(user);
  if (process.env.NODE_ENV === 'development') {
  console.log("computeWaterReminderTimes - Birleşik veri:", data);
  }

  const mode = data.waterNotificationOption || "smart";
  if (process.env.NODE_ENV === 'development') {
  console.log("computeWaterReminderTimes - Bildirim modu:", mode);
  }

  // Global bildirim penceresi kontrolü - varsayılan değerlerle güvenli erişim
  let globalWindow = await getGlobalNotificationWindow(user);
  if (!globalWindow) {
    globalWindow = data.notificationWindow || { start: "08:00", end: "22:00" };
    if (process.env.NODE_ENV === 'development') {
    console.log("computeWaterReminderTimes - Varsayılan bildirim penceresi kullanılıyor:", globalWindow);
    }
  }
  
  const { windowStart, windowEnd } = computeWindowTimes(globalWindow);
  const now = getTurkeyTime();
  let reminderSchedule = [];

  if (mode === "none") {
    if (process.env.NODE_ENV === 'development') {
    console.log("computeWaterReminderTimes - Bildirimler kapalı (none mod).");
    }
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

    // --- GÜNLÜK ORTALAMA HAVA DURUMU ---
    // Sadece günün başında (00:00'da) veya dailyWeatherAverages kaydedilmemişse çekilecek
    let dailyWeatherAverages = data.dailyWeatherAverages;
    let todayStr = now.toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
    if (!dailyWeatherAverages || dailyWeatherAverages.date !== todayStr) {
      const avgWeather = await getDailyAverageWeatherData();
      if (avgWeather) {
        dailyWeatherAverages = { ...avgWeather, date: todayStr };
        // Firestore'a kaydet
        const waterRef = doc(db, "users", user.uid, "water", "current");
        await setDoc(waterRef, { dailyWeatherAverages }, { merge: true });
      }
    }
    // Ortalamaları kullan
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
    const dailyWaterTarget = calculateDailyWaterTarget(bmr, finalMultiplier);
    const waterIntake = data.waterIntake || 0;
    const remainingTarget = Math.max(dailyWaterTarget - waterIntake, 0);
    if (process.env.NODE_ENV === 'development') {
    console.log(
      "computeWaterReminderTimes - Günlük hedef:",
      dailyWaterTarget,
      "İçilen su:",
      waterIntake,
      "Kalan su hedefi:",
      remainingTarget
    );
    }

    const glassSize = data.glassSize || 250;
    const numGlasses = Math.ceil(remainingTarget / glassSize);
    if (process.env.NODE_ENV === 'development') {
    console.log(
      "computeWaterReminderTimes - Kalan hedefe göre numGlasses:",
      numGlasses
    );
    }

    const waterRef = doc(db, "users", user.uid, "water", "current");
    await setDoc(
      waterRef,
      {
        bmr,
        dailyWaterTarget,
        glassSize,
        waterNotificationOption: "smart",
        dailyWeatherAverages,
      },
      { merge: true }
    );

    // Bildirim aralığı ve zamanlaması aynı kalacak
    const remainingMinutes = (windowEnd.getTime() - now.getTime()) / 60000;
    const interval = Math.max(15, Math.floor(remainingMinutes / numGlasses));
    let startTime;
    if (
      now.getTime() >= windowStart.getTime() &&
      now.getTime() < windowEnd.getTime()
    ) {
      startTime = now.getTime() + interval * 60000;
    } else {
      startTime = windowStart.getTime();
    }
    while (startTime <= windowEnd.getTime()) {
      const reminderTime = new Date(startTime);
      reminderTime.setSeconds(0, 0);
      const message = getMotivationalMessageForTime(reminderTime);
      reminderSchedule.push({ time: reminderTime, message });
      startTime += interval * 60000;
    }
  } else if (mode === "custom") {
    const dailyWaterTarget = data.dailyWaterTarget || 2000;
    const glassSize = data.glassSize || 250;
    const customIntervalHours = data.customNotificationInterval || 1;
    if (process.env.NODE_ENV === 'development') {
    console.log(
      "computeWaterReminderTimes - Custom mod: dailyWaterTarget:",
      dailyWaterTarget,
      "glassSize:",
      glassSize,
      "customIntervalHours:",
      customIntervalHours
    );
    }

    let startTime;
    if (now >= windowStart && now < windowEnd) {
      startTime = now.getTime() + customIntervalHours * 3600000;
      if (process.env.NODE_ENV === 'development') {
      console.log(
        "computeWaterReminderTimes - Custom mod: Başlangıç zamanı gün içinde, şimdi + interval:",
        new Date(startTime)
      );
      }
    } else if (now >= windowEnd) {
      const nextWindowStart = new Date(windowStart);
      nextWindowStart.setDate(nextWindowStart.getDate() + 1);
      startTime = nextWindowStart.getTime();
      if (process.env.NODE_ENV === 'development') {
      console.log(
        "computeWaterReminderTimes - Custom mod: Gün sonu geçmiş, sonraki pencere başlangıcı:",
        nextWindowStart
      );
      }
    } else {
      startTime = windowStart.getTime();
      if (process.env.NODE_ENV === 'development') {
      console.log(
        "computeWaterReminderTimes - Custom mod: Pencere henüz başlamadı, pencere başlangıcı:",
        windowStart
      );
      }
    }

    while (startTime <= windowEnd.getTime()) {
      const reminderTime = new Date(startTime);
      reminderTime.setSeconds(0, 0); // Saniyeleri ve milisaniyeleri 0 yap
      const message = getMotivationalMessageForTime(reminderTime);
      reminderSchedule.push({ time: reminderTime, message });
      if (process.env.NODE_ENV === 'development') {
      console.log(
        "computeWaterReminderTimes - Eklenen custom bildirim zamanı:",
        reminderTime,
        "Mesaj:",
        message
      );
      }
      startTime += customIntervalHours * 3600000;
    }
  }

  // Filtre: Şu anın +1 dakika sonrasından daha yakın olan bildirimler çıkarılıyor.
  const futureReminders = reminderSchedule.filter(
    (reminder) => reminder.time.getTime() > now.getTime() + 60000
  );
  if (process.env.NODE_ENV === 'development') {
  console.log(
    "computeWaterReminderTimes - Gelecek bildirimler (1 dakikadan sonra):",
    futureReminders
  );
  }

  const waterRef = doc(db, "users", user.uid, "water", "current");
  await setDoc(
    waterRef,
    {
      reminderTimes: futureReminders.map((obj) => ({
        time: obj.time.toISOString(), // ISO formatında kaydediyoruz
        message: obj.message,
      })),
    },
    { merge: true }
  );
  if (process.env.NODE_ENV === 'development') {
  console.log(
    "computeWaterReminderTimes - Hesaplanan bildirim zamanları:",
    futureReminders
  );
  }
  return futureReminders;
};

/**
 * Firestore'daki reminderTimes array'inden:
 * - Eğer ilk bildirim 1 dakika sonrasından daha yakınsa, silinir.
 * - Kalan array'in ilk elemanı nextWaterReminderTime/Message olarak set edilir.
 * - Eğer array boşsa, computeWaterReminderTimes tekrar çalıştırılır.
 */
export const popNextReminder = async (user) => {
  const waterRef = doc(db, "users", user.uid, "water", "current");
  const waterSnap = await getDoc(waterRef);
  let reminderTimes = [];
  if (waterSnap.exists() && waterSnap.data().reminderTimes) {
    reminderTimes = waterSnap.data().reminderTimes.map((r) => ({
      ...r,
      time: new Date(r.time),
    }));
  }

  const now = getTurkeyTime();
  if (reminderTimes.length > 0) {
    if (process.env.NODE_ENV === 'development') {
    console.log("popNextReminder - Silinen bildirim:", reminderTimes[0]);
    }
    reminderTimes.shift();
  }
  reminderTimes = reminderTimes.filter(
    (r) => r.time.getTime() > now.getTime() + 60000
  );
  if (reminderTimes.length === 0) {
    if (process.env.NODE_ENV === 'development') {
    console.log("popNextReminder - Reminders boş, yeniden hesaplanıyor.");
    }
    reminderTimes = await computeWaterReminderTimes(user);
  }
  if (reminderTimes.length > 0) {
    const nextReminder = reminderTimes[0];
    await setDoc(
      waterRef,
      {
        nextWaterReminderTime: nextReminder.time.toISOString(),
        nextWaterReminderMessage: nextReminder.message,
        reminderTimes: reminderTimes,
      },
      { merge: true }
    );
    if (process.env.NODE_ENV === 'development') {
    console.log("popNextReminder - Yeni sonraki bildirim:", nextReminder);
    }
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
 * Firestore'daki reminderTimes array'inden,
 * en az 1 dakika sonrasındaki ilk bildirimi bularak nextWaterReminderTime/Message olarak kaydeder.
 */
export const saveNextWaterReminderTime = async (user) => {
  const waterRef = doc(db, "users", user.uid, "water", "current");
  const waterSnap = await getDoc(waterRef);
  let reminderTimes = [];
  if (waterSnap.exists() && waterSnap.data().reminderTimes) {
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
    if (process.env.NODE_ENV === 'development') {
    console.log(
      "saveNextWaterReminderTime - Reminders boş, yeniden hesaplanıyor."
    );
    }
    reminderTimes = await computeWaterReminderTimes(user);
  }
  if (reminderTimes.length > 0) {
    const nextReminder = reminderTimes[0];
    await setDoc(
      waterRef,
      {
        nextWaterReminderTime: nextReminder.time.toISOString(),
        nextWaterReminderMessage: nextReminder.message,
        reminderTimes: reminderTimes,
      },
      { merge: true }
    );
    if (process.env.NODE_ENV === 'development') {
    console.log(
      "saveNextWaterReminderTime - Kaydedilen sonraki bildirim zamanı:",
      nextReminder
    );
    }
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
 * - İlk, tüm bildirimler hesaplanıp Firestore'a kaydedilir.
 * - Ardından, saveNextWaterReminderTime ile en az 1 dakika sonrası olan bildirim,
 *   nextWaterReminderTime/Message alanlarına set edilir.
 *
 * GÜNCELLEME:
 * - Hesaplama sonlandırma zamanını takip eden "notificationsLastCalculated" alanı eklenmiştir.
 * - Eğer bu alan mevcutsa ve son hesaplama 5 dakika içinde yapılmışsa, hesaplama tekrarlanmaz.
 */
export const scheduleWaterNotifications = async (user) => {
  if (!user || !user.uid) return;

  const waterRef = doc(db, "users", user.uid, "water", "current");
  const waterSnap = await getDoc(waterRef);
  const now = getTurkeyTime();
  const THRESHOLD = 30 * 60 * 1000; // 30 dakika

  if (waterSnap.exists()) {
    const data = waterSnap.data();
    // Şu anki tetikleyici değerleri oluşturuyoruz.
    const triggerFields = {
      waterIntake: data.waterIntake || 0,
      waterNotificationOption: data.waterNotificationOption || "smart",
      activityLevel: data.activityLevel || "orta",
      notificationWindow: JSON.stringify(
        data.notificationWindow || { start: "08:00", end: "22:00" }
      ),
    };

    let existingReminderTimes = [];
    if (data.reminderTimes && data.reminderTimes.length > 0) {
      existingReminderTimes = data.reminderTimes.map((r) => ({
        ...r,
        time: new Date(r.time),
      }));
    }

    const lastTriggers = data.lastNotificationTriggers;
    // Eğer tetikleyici değerler aynıysa ve mevcut reminderTimes geçerliyse, hesaplamayı tekrarlamıyoruz.
    if (
      lastTriggers &&
      lastTriggers.waterIntake === triggerFields.waterIntake &&
      lastTriggers.waterNotificationOption ===
        triggerFields.waterNotificationOption &&
      lastTriggers.activityLevel === triggerFields.activityLevel &&
      lastTriggers.notificationWindow === triggerFields.notificationWindow &&
      existingReminderTimes.length > 0 &&
      existingReminderTimes[0].time.getTime() > now.getTime() + 60000 &&
      data.notificationsLastCalculated &&
      now.getTime() - new Date(data.notificationsLastCalculated).getTime() <
        THRESHOLD
    ) {
      const nextReminder = data.nextWaterReminderTime
        ? {
            time: new Date(data.nextWaterReminderTime),
            message: data.nextWaterReminderMessage,
          }
        : null;
      if (process.env.NODE_ENV === 'development') {
      console.log(
        "scheduleWaterNotifications - Mevcut bildirimler kullanılıyor."
      );
      }
      return { reminderSchedule: existingReminderTimes, nextReminder };
    }
  }

  // Tetikleyici değişiklik var veya reminderTimes boş, yeniden hesaplama yapıyoruz.
  const data = await fetchUserData(user);
  const mode = data.waterNotificationOption || "smart";
  if (mode === "none") {
    if (process.env.NODE_ENV === 'development') {
    console.log("scheduleWaterNotifications - Bildirimler kapalı (none mod).");
    }
    return { reminderSchedule: [], nextReminder: null };
  }
  const reminderSchedule = await computeWaterReminderTimes(user);
  const nextReminder = await saveNextWaterReminderTime(user);

  // Yeni tetikleyici değerleri oluşturuyoruz.
  const newTriggerFields = {
    waterIntake: data.waterIntake || 0,
    waterNotificationOption: data.waterNotificationOption || "smart",
    activityLevel: data.activityLevel || "orta",
    notificationWindow: JSON.stringify(
      data.notificationWindow || { start: "08:00", end: "22:00" }
    ),
  };

  // Hesaplama zamanını ve tetikleyici değerleri güncelliyoruz.
  await setDoc(
    waterRef,
    {
      notificationsLastCalculated: now.toISOString(),
      lastNotificationTriggers: newTriggerFields,
    },
    { merge: true }
  );

  if (process.env.NODE_ENV === 'development') {
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
  }
  return { reminderSchedule, nextReminder };
};
