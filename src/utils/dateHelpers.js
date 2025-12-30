// Merkezi tarih ve saat yardımcı fonksiyonları

/**
 * Türkiye saatini döndürür
 * @param {Date} date - Opsiyonel tarih, varsayılan şu anki zaman
 * @returns {Date} Türkiye saati
 */
export const getTurkeyTime = (date = new Date()) => {
  return new Date(
    date.toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
  );
};

/**
 * Yaş hesaplama (Mifflin-St Jeor denklemi için)
 * @param {Date|FirebaseTimestamp} birthDate - Doğum tarihi
 * @returns {number} Yaş
 */
export const calculateAge = (birthDate) => {
  const birth = birthDate.toDate ? birthDate.toDate() : new Date(birthDate);
  const today = getTurkeyTime();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

/**
 * computeAge - calculateAge'nin alias'ı (geriye uyumluluk için)
 * @param {Date|FirebaseTimestamp} birthDate - Doğum tarihi
 * @returns {number} Yaş
 */
export const computeAge = calculateAge;

/**
 * BMR hesaplama (Mifflin-St Jeor denklemi)
 * @param {string} gender - Cinsiyet ('male' veya 'female')
 * @param {number} weight - Kilo (kg)
 * @param {number} height - Boy (cm)
 * @param {number} age - Yaş
 * @returns {number} BMR değeri
 */
export const calculateBMR = (gender, weight, height, age) => {
  let bmr;
  if (gender === "female") {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  }
  return bmr;
};

/**
 * Günlük su hedefi hesaplama
 * @param {number} bmr - BMR değeri
 * @param {number} multiplier - Çarpan (varsayılan 1.4)
 * @param {string} gender - Cinsiyet ('male' veya 'female', varsayılan 'male')
 * @returns {number} Günlük su hedefi (ml) - Minimum: Kadınlar 2000ml, Erkekler 2500ml
 */
export const calculateDailyWaterTarget = (bmr, multiplier = 1.4, gender = "male") => {
  const calculatedTarget = Math.round(bmr * multiplier);
  // Sağlık önerilerine göre minimum değerler
  const MINIMUM_WOMEN = 2000; // 2 litre
  const MINIMUM_MEN = 2500; // 2.5 litre
  const minimum = gender === "female" ? MINIMUM_WOMEN : MINIMUM_MEN;
  const dailyWaterTarget = Math.max(calculatedTarget, minimum);
  return dailyWaterTarget;
};

/**
 * Türkiye tarih string'i oluşturur (YYYY-MM-DD formatı)
 * @param {Date} date - Opsiyonel tarih
 * @returns {string} Tarih string'i
 */
export const getTurkeyDateString = (date = new Date()) => {
  return getTurkeyTime(date).toISOString().split('T')[0];
};

/**
 * Türkiye yerel tarih string'i oluşturur
 * @param {Date} date - Opsiyonel tarih
 * @returns {string} Yerel tarih string'i
 */
export const getTurkeyLocalDateString = (date = new Date()) => {
  return getTurkeyTime(date).toLocaleDateString("en-CA", { 
    timeZone: "Europe/Istanbul" 
  });
};

/**
 * Bildirim penceresi zamanlarını hesaplar
 * @param {Object} windowObj - Pencere objesi {start: "08:00", end: "22:00"}
 * @returns {Object} {start: Date, end: Date}
 */
export const computeWindowTimes = (windowObj) => {
  const now = getTurkeyTime();
  const todayStr = now.toISOString().split('T')[0];

  let start, end;
  
  // Eğer pencere overnight ise (başlangıç saati bitiş saatinden sonra)
  if (windowObj.start > windowObj.end) {
    const todayEnd = new Date(`${todayStr}T${windowObj.end}:00+03:00`);
    
    if (now < todayEnd) {
      // Dünün tarihi
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      start = new Date(`${yesterdayStr}T${windowObj.start}:00+03:00`);
      end = todayEnd;
    } else {
      start = new Date(`${todayStr}T${windowObj.start}:00+03:00`);
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      end = new Date(`${tomorrowStr}T${windowObj.end}:00+03:00`);
    }
  } else {
    start = new Date(`${todayStr}T${windowObj.start}:00+03:00`);
    end = new Date(`${todayStr}T${windowObj.end}:00+03:00`);
  }

  return { start, end };
};
