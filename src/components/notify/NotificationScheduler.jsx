// EnhancedWaterTrackingSystem.js

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../auth/firebaseConfig";
import React, { useState } from "react";
import waterIcon from "../../assets/water-icon.png";

// ============================================================
// Firebase & Utility Fonksiyonları (Bildirim Scheduler)
// ============================================================

/**
 * Türkiye saatini döndürür.
 */
export const getTurkeyTime = () => {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
  );
};

/**
 * Bazal Metabolizma Hızını (BMR) hesaplar.
 * Mifflin-St Jeor Denklemi kullanılarak erkek ve kadın için hesaplama yapılır.
 *
 * @param {string} gender - "male" veya "female"
 * @param {number} weight - ağırlık (kg)
 * @param {number} height - boy (cm)
 * @param {number} age - yaş
 * @returns {number} BMR değeri
 */
export const calculateBMR = (gender, weight, height, age) => {
  if (gender === "male") {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  } else if (gender === "female") {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
  return 10 * weight + 6.25 * height - 5 * age + 5;
};

/**
 * Günlük su ihtiyacını hesaplar.
 * Bazal Metabolizma Hızına göre ve aktivite seviyesini çarpanı olarak hesaba katar.
 *
 * @param {number} bmr - Hesaplanan BMR değeri
 * @param {number} [activityLevel=1.2] - Aktivite seviyesi çarpanı (varsayılan: 1.2)
 * @returns {number} Günlük su ihtiyacı (ml cinsinden)
 */
export const calculateDailyWaterIntake = (bmr, activityLevel = 1.2) => {
  const baseWaterIntake = bmr * 1; // Her 1 kalori için yaklaşık 1 ml su
  return Math.round(baseWaterIntake * activityLevel);
};

/**
 * Kullanıcı profilini ve mevcut su verilerini Firestore'dan getirir.
 * Artık profil verileri, kullanıcının ana dokümanında "profile" alanı olarak saklanıyor.
 *
 * @param {Object} user - Firebase kullanıcı nesnesi
 * @returns {Object|null} Birleştirilmiş profil ve su verileri veya hata durumunda null
 */
export const fetchUserProfileAndWaterData = async (user) => {
  if (!user || !user.uid) return null;
  try {
    // Kullanıcı verilerini ana dokümandan alıyoruz
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? userSnap.data() : {};

    // Profil verilerini kullanıcı dokümanındaki "profile" alanından alıyoruz
    const profileData = userData.profile || {};

    // Su verilerini water/current dokümanından alıyoruz
    const waterRef = doc(db, "users", user.uid, "water", "current");
    const waterSnap = await getDoc(waterRef);
    const waterData = waterSnap.exists() ? waterSnap.data() : {};

    // Water dokümanından notificationWindow alanını hariç tutuyoruz
    const { notificationWindow, ...waterDataWithoutNotification } = waterData;

    // Sonuçta, notificationWindow her zaman kullanıcı dokümanından gelecek
    return {
      ...userData,
      ...profileData,
      ...waterDataWithoutNotification,
      notificationWindow: userData.notificationWindow || {
        start: "07:00",
        end: "22:00",
      },
    };
  } catch (error) {
    console.error("fetchUserProfileAndWaterData hatası:", error);
    return null;
  }
};

/**
 * Gelişmiş su bildirim zamanlarını hesaplar.
 * Kullanıcı verilerine göre günlük hedef, bardak boyutu ve bildirim penceresi belirlenir.
 *
 * @param {Object} user - Firebase kullanıcı nesnesi
 * @returns {Promise<Array<Date>>} Bildirim zamanlarını içeren Date dizisi
 */
export const computeEnhancedWaterReminderTimes = async (user) => {
  const userData = await fetchUserProfileAndWaterData(user);

  if (!userData) {
    console.warn("Kullanıcı verisi bulunamadı");
    return [];
  }

  // weight ve height verileri string olabileceğinden parseFloat kullanılıyor
  const weight = parseFloat(userData.weight) || 93; // Varsayılan 93 kg
  const height = parseFloat(userData.height) || 190; // Varsayılan 190 cm

  // Yaş alanı null ise doğum tarihinden hesapla
  let age;
  if (userData.age != null) {
    age = parseInt(userData.age);
  } else if (userData.birthDate) {
    const birthDateObj = userData.birthDate.toDate
      ? userData.birthDate.toDate()
      : new Date(userData.birthDate);
    const today = getTurkeyTime();
    age = today.getFullYear() - birthDateObj.getFullYear();
    const m = today.getMonth() - birthDateObj.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }
  } else {
    age = 30; // Varsayılan yaş
  }

  // Varsayılan olarak erkek kabul edilmiştir
  const bmr = calculateBMR("male", weight, height, age);
  const dailyWaterTarget = calculateDailyWaterIntake(bmr);
  const glassSize = 250; // Ortalama bardak boyutu (ml)
  const notificationWindow = userData.notificationWindow || {
    start: "07:00",
    end: "22:00",
  };

  const nowTurkey = getTurkeyTime();
  const todayStr = nowTurkey.toLocaleDateString("en-CA"); // YYYY-MM-DD formatı

  let windowStart = new Date(`${todayStr}T${notificationWindow.start}:00`);
  let windowEnd = new Date(`${todayStr}T${notificationWindow.end}:00`);

  if (nowTurkey > windowEnd) {
    windowStart.setDate(windowStart.getDate() + 1);
    windowEnd.setDate(windowEnd.getDate() + 1);
  }

  const numGlassesRequired = Math.ceil(dailyWaterTarget / glassSize);
  const totalWindowMinutes = (windowEnd - windowStart) / 60000;
  const intervalMinutes = Math.max(
    15,
    Math.floor(totalWindowMinutes / numGlassesRequired)
  );

  let reminderTimes = [];
  let t = Math.max(windowStart.getTime(), nowTurkey.getTime() + 1000); // 1 saniye ekleniyor
  while (t <= windowEnd.getTime()) {
    reminderTimes.push(new Date(t));
    t += intervalMinutes * 60000;
  }

  await setDoc(
    doc(db, "users", user.uid, "water", "current"),
    {
      dailyWaterTarget,
      glassSize,
      numGlassesRequired,
      bmr,
      waterNotificationOption: "smart",
      notificationWindow,
    },
    { merge: true }
  );

  console.log("Gelişmiş su bildirim zamanları:", {
    dailyWaterTarget,
    glassSize,
    numGlassesRequired,
    reminderTimes: reminderTimes.map((t) => t.toLocaleTimeString()),
  });

  return reminderTimes;
};

/**
 * Sonraki su bildirim zamanını hesaplar.
 *
 * @param {Object} user - Firebase kullanıcı nesnesi
 * @returns {Promise<Date|null>} Sonraki bildirim zamanı veya bulunamazsa null
 */
export const getNextWaterReminderTime = async (user) => {
  const reminderTimes = await computeEnhancedWaterReminderTimes(user);
  const now = getTurkeyTime();

  for (const time of reminderTimes) {
    if (time.getTime() > now.getTime()) {
      // ">" kullanıldı, böylece şu an değil, gelecekteki bir zaman seçilir.
      console.log("Sonraki su bildirim zamanı:", time);
      return time;
    }
  }

  console.warn("Gelecek bildirim zamanı bulunamadı");
  return null;
};

/**
 * Hesaplanan sonraki su bildirim zamanını Firestore'a kaydeder.
 *
 * @param {Object} user - Firebase kullanıcı nesnesi
 * @returns {Promise<Date|null>} Kaydedilen bildirim zamanı veya hata durumunda null
 */
export const saveNextWaterReminderTime = async (user) => {
  const nextReminder = await getNextWaterReminderTime(user);
  if (!nextReminder) {
    console.warn("Sonraki bildirim zamanı hesaplanamadı");
    return null;
  }

  const waterDocRef = doc(db, "users", user.uid, "water", "current");
  await setDoc(
    waterDocRef,
    { nextWaterReminderTime: nextReminder.toISOString() },
    { merge: true }
  );

  console.log(
    "Kaydedilen sonraki su bildirim zamanı:",
    nextReminder.toISOString()
  );
  return nextReminder;
};

// ============================================================
// Gelişmiş Su Takip Sistemi Ek Özellikleri
// ============================================================

/**
 * Su takip sisteminin tüm gelişmiş özelliklerini barındıran sınıf.
 */
export class WaterTrackingSystem {
  constructor(user) {
    this.user = user;
  }

  getTurkeyTime() {
    return getTurkeyTime();
  }

  async fetchUserProfileAndWaterData() {
    return await fetchUserProfileAndWaterData(this.user);
  }

  calculateBMR(gender, weight, height, age) {
    return calculateBMR(gender, weight, height, age);
  }

  calculateDailyWaterIntake(bmr, activityLevel = 1.2) {
    return calculateDailyWaterIntake(bmr, activityLevel);
  }

  calculateAge(birthDate) {
    const birth = birthDate.toDate ? birthDate.toDate() : new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  /**
   * Aktivite ve günün saatine göre dinamik su içme hızı ve motivasyon ayarlaması
   */
  async adjustWaterIntakeStrategy(currentIntake, totalDailyTarget) {
    console.log("\n🔄 Su Alım Stratejisi Dinamik Ayarlaması:");
    const turkeyTime = this.getTurkeyTime();
    const currentHour = turkeyTime.getHours();

    const timeBasedStrategies = [
      {
        period: "Sabah (06:00-10:00)",
        startHour: 6,
        endHour: 10,
        intakeMultiplier: 0.3,
        strategy: "Güne Başlangıç Takviyesi",
        motivationalTips: [
          "🌅 Güne su içerek başlamak enerjinizi artırır!",
          "☀️ Sabah su içmek metabolizmanızı hızlandırır.",
        ],
      },
      {
        period: "Öğle (10:00-14:00)",
        startHour: 10,
        endHour: 14,
        intakeMultiplier: 0.25,
        strategy: "Verimlilik Hidratasyonu",
        motivationalTips: [
          "💼 Su içmek konsantrasyonunuzu artırır!",
          "🧠 Hidrasyon mental performansı yükseltir.",
        ],
      },
      {
        period: "Öğleden Sonra (14:00-18:00)",
        startHour: 14,
        endHour: 18,
        intakeMultiplier: 0.2,
        strategy: "Toparlanma ve Dengelem",
        motivationalTips: [
          "🔋 Enerjinizi yenilemek için su şart!",
          "💧 Düzenli su içmek yorgunluğu azaltır.",
        ],
      },
      {
        period: "Akşam (18:00-22:00)",
        startHour: 18,
        endHour: 22,
        intakeMultiplier: 0.15,
        strategy: "Akşam Toparlanma",
        motivationalTips: [
          "🌙 Akşam az ve kontrollü su için",
          "😴 Gece uykusunu bölmeyecek şekilde dikkatli ol",
        ],
      },
      {
        period: "Gece (22:00-06:00)",
        startHour: 22,
        endHour: 6,
        intakeMultiplier: 0.1,
        strategy: "Minimum Hidrasyon",
        motivationalTips: ["🌙 Gece minimal su tüketimi", "💤 Uykuyu bölmeme"],
      },
    ];

    const currentStrategy =
      timeBasedStrategies.find(
        (strategy) =>
          currentHour >= strategy.startHour && currentHour < strategy.endHour
      ) || timeBasedStrategies[0];

    const percentageIntake = (currentIntake / totalDailyTarget) * 100;
    let recommendedIntake, strategyMessage, motivationalMessage;

    if (percentageIntake < currentStrategy.intakeMultiplier * 100) {
      recommendedIntake = totalDailyTarget * currentStrategy.intakeMultiplier;
      strategyMessage = `🎯 ${currentStrategy.period} Strateji: ${currentStrategy.strategy}`;
      motivationalMessage =
        currentStrategy.motivationalTips[
          Math.floor(Math.random() * currentStrategy.motivationalTips.length)
        ];
    } else {
      strategyMessage = "✅ Şu an için su alım hedefindesin!";
      motivationalMessage = "👍 Devam et, harikasın!";
    }

    console.log("🕒 Güncel Zaman Dilimi:", currentStrategy.period);
    console.log("📊 Günlük Hedef:", totalDailyTarget, "ml");
    console.log("💧 Şu Ana Kadar İçilen Su:", currentIntake, "ml");
    console.log("📈 Alım Yüzdesi:", percentageIntake.toFixed(2), "%");
    console.log("🎯 Strateji Mesajı:", strategyMessage);
    console.log("💬 Motivasyon:", motivationalMessage);

    return {
      currentStrategy,
      recommendedIntake,
      strategyMessage,
      motivationalMessage,
    };
  }

  /**
   * Günlük su davranış puanlaması ve performans takibi
   */
  calculateWaterIntakeScore(waterHistory, totalDailyTarget) {
    console.log("\n🏆 Su İçme Performans Skorlaması:");

    if (!waterHistory || waterHistory.length === 0) {
      console.log("❌ Henüz veri yok");
      return { score: 0, performance: "Başlangıç" };
    }

    const last7DaysIntake = waterHistory.filter((entry) => {
      const entryDate = new Date(entry.date);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return entryDate >= sevenDaysAgo;
    });

    const totalIntake = last7DaysIntake.reduce(
      (sum, entry) => sum + entry.intake,
      0
    );
    const averageDailyIntake = totalIntake / 7;

    const performanceLevels = [
      {
        threshold: totalDailyTarget * 0.5,
        level: "Başlangıç",
        emoji: "🔻",
        advice: "Su alımını artırmalısın!",
      },
      {
        threshold: totalDailyTarget * 0.7,
        level: "Gelişmekte Olan",
        emoji: "🟨",
        advice: "Biraz daha gayret et!",
      },
      {
        threshold: totalDailyTarget * 0.9,
        level: "İyi",
        emoji: "🟢",
        advice: "Devam et, çok yakınsın!",
      },
      {
        threshold: totalDailyTarget * 1.1,
        level: "Mükemmel",
        emoji: "🏆",
        advice: "Süper performans!",
      },
    ];

    const baseScore = (averageDailyIntake / totalDailyTarget) * 100;
    const score = Math.min(Math.max(baseScore, 0), 100);

    const performance =
      performanceLevels.find((level) => score <= level.threshold) ||
      performanceLevels[performanceLevels.length - 1];

    console.log("📅 Son 7 Günlük Veriler:");
    console.log("💧 Toplam Su Alımı:", totalIntake.toFixed(2), "ml");
    console.log("📊 Günlük Ortalama:", averageDailyIntake.toFixed(2), "ml");
    console.log("🎯 Günlük Hedef:", totalDailyTarget, "ml");
    console.log("🏅 Performans Skoru:", score.toFixed(2));
    console.log(
      "📈 Performans Seviyesi:",
      performance.level,
      performance.emoji
    );
    console.log("💡 Tavsiye:", performance.advice);

    return {
      score,
      performance: performance.level,
      emoji: performance.emoji,
      advice: performance.advice,
    };
  }

  /**
   * Gelişmiş su hatırlatma ve bildirim sistemi
   */
  generateSmartReminders(waterIntakeScore, dailyWaterTarget) {
    console.log("\n🔔 Akıllı Bildirim Sistemi:");

    const reminderTypes = [
      {
        type: "Motivasyonel",
        messages: [
          "💧 Her yudum sağlık, her bardak enerji!",
          "🌊 Vücudun en iyi arkadaşı su!",
          "🚀 Hidrasyon performansını yükseltme zamanı!",
        ],
      },
      {
        type: "Eğitici",
        messages: [
          "💡 Biliyor muydun? Su metabolizmayı hızlandırır!",
          "🧠 Hidrasyon mental performansı artırır.",
          "❤️ Düzenli su içmek kalp sağlığına iyi gelir!",
        ],
      },
      {
        type: "Meydan Okuma",
        messages: [
          "🎯 Bugünkü su hedefini yakala!",
          "🏅 Hidrasyon meydan okumasını başlat!",
          "🔋 Enerjini su ile yenile!",
        ],
      },
    ];

    let selectedReminderType;
    if (waterIntakeScore.score < 50) {
      selectedReminderType = reminderTypes.find(
        (rt) => rt.type === "Meydan Okuma"
      );
    } else if (waterIntakeScore.score < 80) {
      selectedReminderType = reminderTypes.find(
        (rt) => rt.type === "Motivasyonel"
      );
    } else {
      selectedReminderType = reminderTypes.find((rt) => rt.type === "Eğitici");
    }

    const randomMessage =
      selectedReminderType.messages[
        Math.floor(Math.random() * selectedReminderType.messages.length)
      ];

    console.log("📊 Performans Skoru:", waterIntakeScore.score.toFixed(2));
    console.log("📣 Bildirim Tipi:", selectedReminderType.type);
    console.log("💬 Seçilen Mesaj:", randomMessage);

    return {
      type: selectedReminderType.type,
      message: randomMessage,
    };
  }

  /**
   * Günlük su takip raporunu oluşturur.
   */
  createDailyWaterReport(waterHistory, dailyWaterTarget) {
    console.log("\n📝 Günlük Su Takip Raporu:");
    const turkeyTime = this.getTurkeyTime();
    const todayStr = turkeyTime.toISOString().split("T")[0];

    const todayIntake = waterHistory
      .filter((entry) => entry.date === todayStr)
      .reduce((sum, entry) => sum + entry.intake, 0);

    const remainingWater = Math.max(0, dailyWaterTarget - todayIntake);

    const reportSections = [
      {
        title: "📊 Günlük İstatistikler",
        details: [
          `Günlük Hedef: ${dailyWaterTarget} ml`,
          `Şu Ana Kadar İçilen: ${todayIntake} ml`,
          `Kalan Su: ${remainingWater} ml`,
        ],
      },
      {
        title: "🌈 Performans Özeti",
        details: [
          `Günün saati: ${turkeyTime.toLocaleTimeString()}`,
          `Hedefe Ulaşma Oranı: ${(
            (todayIntake / dailyWaterTarget) *
            100
          ).toFixed(2)}%`,
        ],
      },
    ];

    console.log("📅 Tarih:", todayStr);
    reportSections.forEach((section) => {
      console.log(`\n${section.title}`);
      section.details.forEach((detail) => console.log(detail));
    });

    return {
      date: todayStr,
      dailyTarget: dailyWaterTarget,
      currentIntake: todayIntake,
      remainingWater: remainingWater,
      reportSections: reportSections,
    };
  }

  /**
   * Gelişmiş su takip metodunu genişletir.
   */
  async enhancedWaterTracking(waterIntakeAmount) {
    console.log("\n🚀 Gelişmiş Su Takip Sistemi Başlatılıyor...");
    try {
      const userData = await this.fetchUserProfileAndWaterData();
      if (!userData) {
        console.error("❌ Kullanıcı verisi alınamadı!");
        return null;
      }

      const weight = parseFloat(userData.weight) || 93;
      const height = parseFloat(userData.height) || 190;
      let age;
      if (userData.age != null) {
        age = parseInt(userData.age);
      } else if (userData.birthDate) {
        age = this.calculateAge(userData.birthDate);
      } else {
        age = 30;
      }

      const bmr = this.calculateBMR("male", weight, height, age);
      const dailyWaterTarget = this.calculateDailyWaterIntake(bmr, 1.4);

      const intakeStrategy = await this.adjustWaterIntakeStrategy(
        waterIntakeAmount,
        dailyWaterTarget
      );

      const waterHistory = userData.history || [];

      const waterIntakeScore = this.calculateWaterIntakeScore(
        waterHistory,
        dailyWaterTarget
      );

      const smartReminders = this.generateSmartReminders(
        waterIntakeScore,
        dailyWaterTarget
      );

      const dailyReport = this.createDailyWaterReport(
        waterHistory,
        dailyWaterTarget
      );

      await this.saveWaterTrackingData({
        bmr,
        dailyWaterTarget,
        intakeStrategy,
        waterIntakeScore,
        smartReminders,
        dailyReport,
      });

      return {
        bmr,
        dailyWaterTarget,
        intakeStrategy,
        waterIntakeScore,
        smartReminders,
        dailyReport,
      };
    } catch (error) {
      console.error("❌ Gelişmiş su takip sisteminde hata:", error);
      return null;
    }
  }

  /**
   * Su takip verilerini kaydeder (örnek implementasyon).
   */
  async saveWaterTrackingData(data) {
    console.log("Water tracking data saved:", data);
    // Gerçek senaryoda veritabanına kaydetme işlemi burada yapılacaktır.
    return Promise.resolve(true);
  }
}

// ============================================================
// Ekstra Fonksiyonlar & React Bileşenleri
// ============================================================

/**
 * Su takip sistemini başlatır.
 */
export const initializeEnhancedWaterTracking = async (user) => {
  const waterTracker = new WaterTrackingSystem(user);
  return await waterTracker.enhancedWaterTracking();
};

/**
 * React Hook örneği: Su Takip Verilerini yönetir.
 */
export const useWaterTracker = (user) => {
  const [waterTrackingData, setWaterTrackingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const trackWaterIntake = async (amount) => {
    setLoading(true);
    try {
      const waterTracker = new WaterTrackingSystem(user);
      const result = await waterTracker.enhancedWaterTracking(amount);
      setWaterTrackingData(result);
      setLoading(false);
      return result;
    } catch (err) {
      console.error("Su takibi sırasında hata:", err);
      setError(err);
      setLoading(false);
      return null;
    }
  };

  return {
    waterTrackingData,
    trackWaterIntake,
    loading,
    error,
  };
};

/**
 * Bildirim Entegrasyonu Örneği
 */
export const setupWaterIntakeNotifications = async (user) => {
  console.log("💧 Su Bildirimleri Kurulumu Başlatılıyor...");
  try {
    const notificationPermission = await Notification.requestPermission();
    if (notificationPermission !== "granted") {
      console.warn("❌ Bildirim izni reddedildi");
      return false;
    }

    const waterTracker = new WaterTrackingSystem(user);
    const userData = await waterTracker.fetchUserProfileAndWaterData();
    if (!userData) {
      console.error("❌ Kullanıcı verisi alınamadı");
      return false;
    }

    const weight = parseFloat(userData.weight) || 93;
    const height = parseFloat(userData.height) || 190;
    let age;
    if (userData.age != null) {
      age = parseInt(userData.age);
    } else if (userData.birthDate) {
      age = waterTracker.calculateAge(userData.birthDate);
    } else {
      age = 30;
    }

    const bmr = waterTracker.calculateBMR("male", weight, height, age);
    const dailyWaterTarget = waterTracker.calculateDailyWaterIntake(bmr, 1.4);

    const notificationStrategy = [
      {
        time: "08:00",
        message: "🌅 Günaydın! Günün ilk su içme zamanı geldi.",
        amount: dailyWaterTarget * 0.3,
      },
      {
        time: "11:00",
        message: "☀️ Öğlen öncesi su takviyesi zamanı!",
        amount: dailyWaterTarget * 0.25,
      },
      {
        time: "14:00",
        message: "🌞 Öğleden sonra enerjini topla!",
        amount: dailyWaterTarget * 0.2,
      },
      {
        time: "17:00",
        message: "🌆 Akşama hazırlık için su içmeyi unutma!",
        amount: dailyWaterTarget * 0.15,
      },
    ];

    const scheduledNotifications = notificationStrategy.map((notification) => ({
      time: notification.time,
      message: notification.message,
      scheduleNotification: () => {
        if ("Notification" in window) {
          new Notification(notification.message, {
            body: `Hedef: ${notification.amount.toFixed(0)} ml su içmelisin.`,
            icon: waterIcon,
          });
        }
      },
    }));

    console.log("✅ Su Bildirimleri Başarıyla Kuruldu");
    return scheduledNotifications;
  } catch (error) {
    console.error("❌ Su bildirimleri kurulumunda hata:", error);
    return null;
  }
};

/**
 * Widget Bileşeni Örneği
 */
export const WaterIntakeWidget = ({ user }) => {
  const { waterTrackingData, trackWaterIntake, loading, error } =
    useWaterTracker(user);

  const handleWaterIntake = (amount) => {
    trackWaterIntake(amount);
  };

  if (loading) return <div>Yükleniyor...</div>;
  if (error) return <div>Hata oluştu: {error.message}</div>;

  return (
    <div className="water-intake-widget">
      <h2>Su Takip Sistemi</h2>
      {waterTrackingData && (
        <>
          <div className="daily-target">
            Günlük Hedef: {waterTrackingData.dailyWaterTarget} ml
          </div>
          <div className="intake-progress">
            Şu Ana Kadar İçilen: {waterTrackingData.dailyReport.currentIntake}{" "}
            ml
          </div>
          <div className="water-buttons">
            <button onClick={() => handleWaterIntake(250)}>250 ml İç</button>
            <button onClick={() => handleWaterIntake(500)}>500 ml İç</button>
          </div>
          {waterTrackingData.smartReminders && (
            <div className="motivational-message">
              {waterTrackingData.smartReminders.message}
            </div>
          )}
        </>
      )}
    </div>
  );
};
