const { getDatabase, admin } = require('./dbConnection');
const fetch = require("node-fetch");

const db = getDatabase();

// Takvim bildirimleri için offsetler (dakika cinsinden)
const notificationOffsets = {
  "on-time": 0,
  "15-minutes": 15,
  "1-hour": 60,
  "1-day": 1440,
};

// Türkiye saatini döndürür
const getTurkeyTime = () => {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
  );
};

// Rutin tamamlanma durumunu kontrol eder
const getRoutineCompletedStatus = (routine, currentDateStr) => {
  if (routine.repeat && routine.repeat !== "none") {
    // Tekrarlanan rutinler için completedDates array'ini kontrol et
    return routine.completedDates && routine.completedDates.includes(currentDateStr);
  } else {
    // Tekrarlanmayan rutinler için normal completed alanını kullan
    return routine.completed;
  }
};

// Cache TTL: 10 dakika (600.000 ms)
const CACHE_TTL = 600000;

// Global cache değişkenleri
let cachedUsers = null;
let cachedUsersTimestamp = 0;
const calendarEventsCache = {};
const waterCache = {};
const supplementsCache = {};

// Cache'lenmiş kullanıcıları alır
const getCachedUsers = async () => {
  const nowMillis = Date.now();
  if (cachedUsers && nowMillis - cachedUsersTimestamp < CACHE_TTL) {
    console.log("Kullanıcılar ve Rutinler cache'den alınıyor.");
    return cachedUsers;
  }
  console.log("Kullanıcılar ve Rutinler Firestore'dan çekiliyor.");
  const snapshot = await db.collection("users").get();
  cachedUsers = snapshot.docs;
  cachedUsersTimestamp = nowMillis;
  return cachedUsers;
};

// Cache'lenmiş takvim verilerini alır
const getCachedCalendarEvents = async (userId) => {
  const nowMillis = Date.now();
  if (
    calendarEventsCache[userId] &&
    nowMillis - calendarEventsCache[userId].timestamp < CACHE_TTL
  ) {
    console.log(`Takvim verileri cache'den alınıyor (user: ${userId}).`);
    return calendarEventsCache[userId].data;
  }
  console.log(`Takvim verileri Firestore'dan çekiliyor (user: ${userId}).`);
  const snapshot = await db
    .collection("users")
    .doc(userId)
    .collection("calendarEvents")
    .get();
  calendarEventsCache[userId] = { data: snapshot, timestamp: nowMillis };
  return snapshot;
};

// Cache'lenmiş su verilerini alır
const getCachedWater = async (userId) => {
  const nowMillis = Date.now();
  if (
    waterCache[userId] &&
    nowMillis - waterCache[userId].timestamp < CACHE_TTL
  ) {
    console.log(`Su verileri cache'den alınıyor (user: ${userId}).`);
    return waterCache[userId].data;
  }
  console.log(`Su verileri Firestore'dan çekiliyor (user: ${userId}).`);
  const snapshot = await db
    .collection("users")
    .doc(userId)
    .collection("water")
    .doc("current")
    .get();
  waterCache[userId] = { data: snapshot, timestamp: nowMillis };
  return snapshot;
};

// Gece yarısı özeti için taze su verilerini alır (cache bypass)
const getFreshWaterForMidnight = async (userId) => {
  console.log(`🌙 [${userId}] Gece yarısı özeti için taze su verileri çekiliyor...`);
  const snapshot = await db
    .collection("users")
    .doc(userId)
    .collection("water")
    .doc("current")
    .get();
  return snapshot;
};

// Cache'lenmiş supplement verilerini alır
const getCachedSupplements = async (userId) => {
  const nowMillis = Date.now();
  if (
    supplementsCache[userId] &&
    nowMillis - supplementsCache[userId].timestamp < CACHE_TTL
  ) {
    console.log(`Supplement verileri cache'den alınıyor (user: ${userId}).`);
    return supplementsCache[userId].data;
  }
  console.log(`Supplement verileri Firestore'dan çekiliyor (user: ${userId}).`);
  const snapshot = await db
    .collection("users")
    .doc(userId)
    .collection("supplements")
    .get();
  supplementsCache[userId] = { data: snapshot, timestamp: nowMillis };
  return snapshot;
};

// Gece yarısı özeti için taze takviye verilerini alır (cache bypass)
const getFreshSupplementsForMidnight = async (userId) => {
  console.log(`🌙 [${userId}] Gece yarısı özeti için taze takviye verileri çekiliyor...`);
  const snapshot = await db
    .collection("users")
    .doc(userId)
    .collection("supplements")
    .get();
  return snapshot;
};

// Kullanıcının bugünkü takviye tüketimini alır
const getSupplementConsumptionStats = async (userId) => {
  const todayStr = getTurkeyTime().toLocaleDateString("en-CA");
  const statsRef = db
    .collection("users")
    .doc(userId)
    .collection("stats")
    .doc("supplementConsumption");
  const statsSnap = await statsRef.get();
  if (statsSnap.exists) {
    const data = statsSnap.data();
    return data[todayStr] || {};
  }
  return {};
};

// Dinamik gün sonu özeti kontrolü için özel tüketim verisi alma fonksiyonu
const getSupplementConsumptionStatsForMidnight = async (userId) => {
  const turkeyTime = getTurkeyTime();
  const nowHour = turkeyTime.getHours();
  const nowMinute = turkeyTime.getMinutes();
  
  // Dinamik gün sonu özeti kontrolü (23:59 veya pencere bitişinden 1 dakika önce)
  let checkDateStr;
  if (nowHour === 23 && nowMinute === 59) {
    // 23:59 kontrolü - bugünün verisini kontrol et
    checkDateStr = turkeyTime.toLocaleDateString("en-CA");
    console.log(`getSupplementConsumptionStatsForMidnight - 23:59 kontrolü, bugünün tarihi: ${checkDateStr}`);
  } else {
    // Normal durumda bugünün tarihini kullan
    checkDateStr = turkeyTime.toLocaleDateString("en-CA");
  }
  
  const statsRef = db
    .collection("users")
    .doc(userId)
    .collection("stats")
    .doc("supplementConsumption");
  const statsSnap = await statsRef.get();
  if (statsSnap.exists) {
    const data = statsSnap.data();
    const result = data[checkDateStr] || {};
    console.log(`getSupplementConsumptionStatsForMidnight - Kontrol edilen tarih: ${checkDateStr}, bulunan veriler:`, result);
    return result;
  }
  return {};
};

// sendEachForMulticast: Her bir token için ayrı ayrı bildirim gönderir ve geçersiz tokenları takip eder
const sendEachForMulticast = async (msg, userId) => {
  const { tokens, data } = msg;
  const sendPromises = tokens.map((token) =>
    admin
      .messaging()
      .send({
        token,
        data,
      })
      .then(() => ({ token, valid: true }))
      .catch((error) => {
        console.log(`Token hatası (${token}):`, error.code);
        // Geçersiz token, kayıtlı olmayan token veya kullanıcının uygulamayı kaldırdığı durumlar
        const invalidTokenErrors = [
          "messaging/invalid-registration-token",
          "messaging/registration-token-not-registered",
          "messaging/invalid-argument",
          "messaging/unregistered",
        ];

        const shouldRemove = invalidTokenErrors.includes(error.code);
        return { token, valid: false, shouldRemove, errorCode: error.code };
      })
  );

  const results = await Promise.all(sendPromises);

  // Geçersiz tokenları belirle
  const invalidTokens = results
    .filter((result) => result.shouldRemove)
    .map((result) => result.token);

  // Eğer geçersiz tokenlar varsa, bunları kullanıcı dökümanından kaldır
  if (invalidTokens.length > 0 && userId) {
    try {
      const userRef = db.collection("users").doc(userId);

      // Transaction içinde tokenları güvenli bir şekilde kaldır
      await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) return;

        const userData = userDoc.data();
        const currentTokens = userData.fcmTokens || [];

        // Geçersiz tokenları filtrele
        const validTokens = currentTokens.filter(
          (token) => !invalidTokens.includes(token)
        );

        // Sadece değişiklik varsa güncelle
        if (validTokens.length !== currentTokens.length) {
          console.log(
            `Kullanıcı ${userId} için ${
              currentTokens.length - validTokens.length
            } geçersiz token kaldırıldı`
          );
          transaction.update(userRef, { fcmTokens: validTokens });

          // Kullanıcı cache'ini sıfırla
          cachedUsers = null;
        }
      });
    } catch (err) {
      console.error(
        `Kullanıcı ${userId} için FCM tokenları temizlenemedi:`,
        err
      );
    }
  }

  return results;
};

// Bildirim gönderildikten sonra bir sonraki notificationSchedule zamanını kaydet
const updateNextSupplementReminderTime = async (userId, suppDocSnap) => {
  const suppData = suppDocSnap.data();
  if (!suppData || !suppData.notificationSchedule || !Array.isArray(suppData.notificationSchedule) || !suppData.notificationSchedule.length) return;
  const now = getTurkeyTime();
  const todayStr = now.toLocaleDateString("en-CA");
  const times = suppData.notificationSchedule.map((timeStr) => {
    let scheduled = new Date(`${todayStr}T${timeStr}:00`);
    if (scheduled.getTime() <= now.getTime()) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toLocaleDateString("en-CA");
      const timeParts = timeStr.split(":");
      scheduled = new Date(`${tomorrowStr}T${timeParts[0]}:${timeParts[1]}:00`);
    }
    return scheduled;
  });
  const futureTimes = times.filter((t) => t.getTime() > now.getTime());
  let nextReminder = null;
  if (futureTimes.length > 0) {
    nextReminder = futureTimes.sort((a, b) => a - b)[0];
  } else if (times.length > 0) {
    nextReminder = times.sort((a, b) => a - b)[0];
  }
  if (nextReminder) {
    await suppDocSnap.ref.update({
      nextSupplementReminderTime: nextReminder.toISOString(),
      notificationsLastCalculated: new Date(),
    });
  } else {
    await suppDocSnap.ref.update({
      nextSupplementReminderTime: null,
      notificationsLastCalculated: new Date(),
    });
  }
};

exports.handler = async (event, context) => {
  console.log("🚀 [BİLDİRİM SİSTEMİ] Fonksiyon başlatıldı");
  
  const turkeyTime = getTurkeyTime();
  const currentTimeStr = turkeyTime.toLocaleTimeString('tr-TR', { 
    timeZone: 'Europe/Istanbul',
    hour12: false 
  });
  const currentDateStr = turkeyTime.toLocaleDateString('tr-TR', { 
    timeZone: 'Europe/Istanbul' 
  });
  
  console.log(`⏰ [BİLDİRİM SİSTEMİ] Şu anki Türkiye zamanı: ${currentDateStr} ${currentTimeStr}`);
  console.log(`⏰ [BİLDİRİM SİSTEMİ] Şu anki dakika toplamı: ${turkeyTime.getHours() * 60 + turkeyTime.getMinutes()}`);
  
  try {
    const now = getTurkeyTime();
    const notificationsToSend = [];
    
    console.log(`🔔 [BİLDİRİM SİSTEMİ] Başlatılıyor - ${now.toLocaleString('tr-TR')}`);

    // Cache'lenmiş kullanıcıları alıyoruz (15 dakikalık TTL)
    const userDocs = await getCachedUsers();
    console.log(`👥 [BİLDİRİM SİSTEMİ] ${userDocs.length} kullanıcı bulundu`);

    // Kullanıcılar arası işlemleri paralel yürütüyoruz
    await Promise.all(
      userDocs.map(async (userDoc) => {
        const userData = userDoc.data();
        const fcmTokens = userData.fcmTokens; // Token dizisi kullanılıyor
        
        if (!fcmTokens || fcmTokens.length === 0) {
          console.log(`❌ [${userDoc.id}] FCM token yok, atlanıyor`);
          return;
        }

        console.log(`🔍 [${userDoc.id}] Bildirim kontrolü başlatılıyor (${fcmTokens.length} token)`);

        // Kullanıcıya ait bildirimleri toplamak için yerel dizi
        let notificationsForThisUser = [];

        // ---------- Rutin Bildirimleri ----------
        if (userData.routines && Array.isArray(userData.routines)) {
          console.log(`📅 [${userDoc.id}] ${userData.routines.length} rutin kontrol ediliyor`);
          
          // Bugünün tarihini YYYY-MM-DD formatında alıyoruz.
          const turkeyTime = getTurkeyTime();
          const currentDateStr = turkeyTime.toISOString().split("T")[0];

          userData.routines.forEach((routine) => {
            // Rutin tamamlanma durumunu kontrol et
            const isCompleted = getRoutineCompletedStatus(routine, currentDateStr);
            
            // Eğer bildirimler kapalıysa, rutin tamamlanmışsa veya rutinin tarihi bugünün tarihi değilse bildirim gönderme.
            if (
              !routine.notificationEnabled ||
              isCompleted ||
              routine.date !== currentDateStr
            ) {
              console.log(`⏭️ [${userDoc.id}] Rutin "${routine.title}" atlanıyor (bildirim: ${routine.notificationEnabled}, tamamlandı: ${isCompleted}, tarih: ${routine.date})`);
              return;
            }

            // Başlangıç zamanına bildirim
            const [startHour, startMinute] = routine.time
              .split(":")
              .map(Number);
            const startTime = new Date(now);
            startTime.setHours(startHour, startMinute, 0, 0);
            if (Math.abs(now - startTime) / 60000 < 0.5) {
              console.log(
                `✅ [${userDoc.id}] RUTİN BAŞLANGIÇ: "${routine.title}" - ${startTime.toLocaleTimeString('tr-TR')}`
              );
              notificationsForThisUser.push({
                tokens: fcmTokens,
                data: {
                  title: "Rutin Başlangıç Hatırlatması",
                  body: `Şimdi ${routine.title} rutini başlayacak!`,
                  routineId: routine.id || "",
                },
              });
            }

            // Bitiş zamanı varsa, bitiş zamanına bildirim
            if (routine.endTime) {
              const [endHour, endMinute] = routine.endTime
                .split(":")
                .map(Number);
              const endTime = new Date(now);
              endTime.setHours(endHour, endMinute, 0, 0);
              if (Math.abs(now - endTime) / 60000 < 0.5) {
                console.log(
                  `✅ [${userDoc.id}] RUTİN BİTİŞ: "${routine.title}" - ${endTime.toLocaleTimeString('tr-TR')}`
                );
                notificationsForThisUser.push({
                  tokens: fcmTokens,
                  data: {
                    title: "Rutin Bitiş Hatırlatması",
                    body: `Şimdi ${routine.title} rutini sona erecek!`,
                    routineId: routine.id || "",
                  },
                });
              }
            }
          });
        } else {
          console.log(`📅 [${userDoc.id}] Rutin yok`);
        }

        // ---------- Pomodoro Bildirimleri (Advanced Timer targetTime kullanarak) ----------
        const advancedTimerDoc = await db
          .collection("users")
          .doc(userDoc.id)
          .collection("advancedTimer")
          .doc("state")
          .get();

        if (advancedTimerDoc.exists) {
          const timerState = advancedTimerDoc.data();
          console.log(
            `⏰ [${userDoc.id}] Pomodoro durumu: ${timerState.isRunning ? 'Çalışıyor' : 'Durdu'}`
          );

          if (timerState.targetTime) {
            // Firestore'dan gelen targetTime (UTC milisaniye değeri)
            const targetTimeDate = new Date(timerState.targetTime);
            console.log(
              `⏰ [${userDoc.id}] Pomodoro hedef zamanı: ${targetTimeDate.toLocaleString('tr-TR')}`
            );

            // targetTime'ı Türkiye saatine çevirmek için:
            const targetTimeTurkey = new Date(
              targetTimeDate.toLocaleString("en-US", {
                timeZone: "Europe/Istanbul",
              })
            );

            // getTurkeyTime fonksiyonu zaten Türkiye saatini veriyor, bu yüzden tekrar çevirmeye gerek yok:
            const nowTurkey = getTurkeyTime();

            // İki tarih arasındaki farkı dakika cinsinden hesaplayın
            const diffMinutes = Math.abs(
              (nowTurkey - targetTimeTurkey) / 60000
            );

            // Eğer fark 0.5 dakika (30 saniye) içindeyse bildirim gönder
            if (diffMinutes < 0.5) {
              console.log(
                `✅ [${userDoc.id}] POMODORO TAMAMLANDI: ${targetTimeTurkey.toLocaleTimeString('tr-TR')}`
              );
              notificationsForThisUser.push({
                tokens: fcmTokens,
                data: {
                  title: "Pomodoro Bildirimi",
                  body: "Pomodoro süreniz tamamlandı!",
                  type: "pomodoro",
                },
              });
            } else {
              console.log(`⏰ [${userDoc.id}] Pomodoro henüz tamamlanmadı (${diffMinutes.toFixed(1)} dakika kaldı)`);
            }
          } else {
            console.log(`⏰ [${userDoc.id}] Pomodoro hedef zamanı yok`);
          }
        } else {
          console.log(`⏰ [${userDoc.id}] Pomodoro durumu bulunamadı`);
        }

        // ---------- Cache'lenmiş Subcollection Sorgularını Paralel Çalıştırma ----------
        const [calendarSnapshot, waterSnap, suppSnapshot] = await Promise.all([
          getCachedCalendarEvents(userDoc.id).catch((err) => {
            console.error(`Kullanıcı ${userDoc.id} için takvim hatası:`, err);
            return null;
          }),
          getCachedWater(userDoc.id).catch((err) => {
            console.error(
              `Kullanıcı ${userDoc.id} için su hatırlatma hatası:`,
              err
            );
            return null;
          }),
          getCachedSupplements(userDoc.id).catch((err) => {
            console.error(
              `Kullanıcı ${userDoc.id} için takviye hatırlatma hatası:`,
              err
            );
            return null;
          }),
        ]);

        // ---------- Takvim Bildirimleri (Global bildirim penceresinden bağımsız) ----------
        if (calendarSnapshot) {
          console.log(`📅 [${userDoc.id}] ${calendarSnapshot.size} takvim etkinliği kontrol ediliyor`);
          
          calendarSnapshot.forEach((docSnap) => {
            const eventData = docSnap.data();
            if (!eventData.notification || eventData.notification === "none") {
              console.log(`⏭️ [${userDoc.id}] Etkinlik "${eventData.title}" atlanıyor (bildirim: ${eventData.notification})`);
              return;
            }
            
            // eventData.start null check ekle
            if (!eventData.start) {
              console.log(`❌ [${userDoc.id}] Etkinlik "${eventData.title}" başlangıç zamanı eksik, atlanıyor`);
              return;
            }
            
            const offsetMinutes =
              notificationOffsets[eventData.notification] || 0;
            const eventStart = eventData.start.toDate();
            const eventStartTurkey = new Date(
              eventStart.toLocaleString("en-US", {
                timeZone: "Europe/Istanbul",
              })
            );
            
            const triggerTime = new Date(
              eventStartTurkey.getTime() - offsetMinutes * 60000
            );
            
            if (Math.abs(now - triggerTime) / 60000 < 0.5) {
              console.log(
                `✅ [${userDoc.id}] TAKVİM ETKİNLİĞİ: "${eventData.title}" - ${eventStartTurkey.toLocaleString('tr-TR')} (${offsetMinutes > 0 ? `${offsetMinutes} dk önce` : 'şimdi'})`
              );
              notificationsForThisUser.push({
                tokens: fcmTokens,
                data: {
                  title: "Takvim Etkinliği Hatırlatması",
                  body: `Etkinlik: ${eventData.title} ${
                    offsetMinutes > 0
                      ? `(${offsetMinutes} dakika sonra)`
                      : "(şimdi)"
                  } başlayacak.`,
                  eventId: docSnap.id,
                },
              });
            } else {
              console.log(`📅 [${userDoc.id}] Etkinlik "${eventData.title}" henüz zamanı gelmedi (${Math.abs(now - triggerTime) / 60000} dakika fark)`);
            }
          });
        } else {
          console.log(`📅 [${userDoc.id}] Takvim etkinliği yok`);
        }

        // ---------- Global Bildirim Penceresi Kontrolü (Su ve Takviye bildirimleri için) ----------
        let isWithinNotificationWindow = true;
        let notificationWindow = userData.notificationWindow;
        
        if (notificationWindow && notificationWindow.start && notificationWindow.end) {
          const [nowHour, nowMinute] = now
            .toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
            .split(":")
            .map(Number);
          const nowTotal = nowHour * 60 + nowMinute;
          const [startH, startM] = notificationWindow.start
            .split(":")
            .map(Number);
          const [endH, endM] = notificationWindow.end
            .split(":")
            .map(Number);
          const startTotal = startH * 60 + startM;
          const endTotal = endH * 60 + endM;

          if (startTotal < endTotal) {
            isWithinNotificationWindow =
              nowTotal >= startTotal && nowTotal <= endTotal;
          } else {
            isWithinNotificationWindow =
              nowTotal >= startTotal || nowTotal <= endTotal;
          }

          if (!isWithinNotificationWindow) {
            console.log(
              `⏰ [${userDoc.id}] BİLDİRİM PENCERESİ DIŞINDA: ${now.toLocaleTimeString('tr-TR')} (${notificationWindow.start}-${notificationWindow.end})`
            );
            // Bildirim gönderimini atla - sadece su ve takviye bildirimleri için
            // return; // ❌ Bu satır tüm bildirimleri engelliyor!
          } else {
            console.log(
              `⏰ [${userDoc.id}] BİLDİRİM PENCERESİ İÇİNDE: ${now.toLocaleTimeString('tr-TR')} (${notificationWindow.start}-${notificationWindow.end})`
            );
          }
        } else {
          // Bildirim penceresi yoksa varsayılan değerleri kullan
          notificationWindow = { start: "08:00", end: "22:00" };
          console.log(`⏰ [${userDoc.id}] Varsayılan bildirim penceresi kullanılıyor: ${notificationWindow.start}-${notificationWindow.end}`);
        }

        // ---------- Su Bildirimleri (Global bildirim penceresi kontrolü geçerse) ----------
        if (isWithinNotificationWindow && waterSnap && waterSnap.exists) {
          console.log(`💧 [${userDoc.id}] Su bildirimleri kontrol ediliyor`);
          
          const waterData = waterSnap.data();

          // Su verilerinin geçerli olduğunu kontrol et
          if (!waterData || typeof waterData.dailyWaterTarget !== 'number' || typeof waterData.waterIntake !== 'number') {
            console.log(`❌ [${userDoc.id}] Su verileri eksik veya geçersiz, su bildirimleri atlanıyor`);
          } else {
            console.log(`💧 [${userDoc.id}] Su durumu: ${waterData.waterIntake}ml / ${waterData.dailyWaterTarget}ml`);
            
            // Mevcut su bildirim zamanı (nextWaterReminderTime) için bildirim:
            if (waterData.nextWaterReminderTime) {
              const nextReminder = new Date(waterData.nextWaterReminderTime);
              const nextReminderTurkey = new Date(
                nextReminder.toLocaleString("en-US", {
                  timeZone: "Europe/Istanbul",
                })
              );
              
              if (Math.abs(now - nextReminderTurkey) / 60000 < 0.5) {
                console.log(
                  `✅ [${userDoc.id}] SU HATIRLATMASI: ${nextReminderTurkey.toLocaleTimeString('tr-TR')}`
                );
                notificationsForThisUser.push({
                  tokens: fcmTokens,
                  data: {
                    title: "Su İçme Hatırlatması",
                    body:
                      waterData.nextWaterReminderMessage ||
                      `Günlük su hedefin ${waterData.dailyWaterTarget} ml. Su içmeyi unutma!`,
                    nextWaterReminderTime: waterData.nextWaterReminderTime,
                    nextWaterReminderMessage: waterData.nextWaterReminderMessage,
                    type: "water",
                  },
                });
              } else {
                console.log(`💧 [${userDoc.id}] Su hatırlatması henüz zamanı gelmedi (${Math.abs(now - nextReminderTurkey) / 60000} dakika fark)`);
              }
            } else {
              console.log(`💧 [${userDoc.id}] Su hatırlatma zamanı ayarlanmamış`);
            }

            // GECE YARISI RESET BİLDİRİMİ: Gece yarısı 00:00 kontrolü
            const midnight = new Date(now);
            midnight.setHours(0, 0, 0, 0);
            if (Math.abs(now.getTime() - midnight.getTime()) < 60000) {
              // Gece yarısı özeti için taze su verilerini çek
              const freshWaterSnap = await getFreshWaterForMidnight(userDoc.id);
              const freshWaterData = freshWaterSnap.exists ? freshWaterSnap.data() : waterData;
              
              console.log(
                `✅ [${userDoc.id}] GECE YARISI SU RESET: ${freshWaterData.waterIntake >= freshWaterData.dailyWaterTarget ? 'HEDEF TAMAMLANDI' : 'HEDEF TAMAMLANAMADI'}`
              );
              
              let resetMessage = "";
              if (freshWaterData.waterIntake >= freshWaterData.dailyWaterTarget) {
                // Başarı mesajları (25 adet)
                const successMessages = [
                  "🎉 Harika! Bugün su hedefini gerçekleştirdin!",
                  "🏆 Mükemmel, su hedefin tamamlandı!",
                  "⭐ Tebrikler! Vücudun için gereken suyu aldın!",
                  "🌟 Su hedefine ulaştın, sağlığın için büyük bir adım!",
                  "💧 Bugün suyu tamamlama başarın takdire şayan!",
                  "🚀 Su hedefine ulaştın, süper bir performans!",
                  "💎 Bugün su içmeyi ihmal etmedin, tebrikler!",
                  "🌈 Sağlığın için harika bir gün, su hedefine ulaştın!",
                  "🎯 Günlük su hedefin tamamlandı, mükemmel!",
                  "✨ Bugün su hedefine ulaşman motivasyonunu artırıyor!",
                  "🎉 Fantastik! Bugün su hedefini tamamladın!",
                  "🏆 Süper! Su hedefin başarıyla tamamlandı!",
                  "⭐ Mükemmel! Vücudun için gereken suyu aldın!",
                  "🌟 Harika! Su hedefine ulaştın, sağlığın için büyük başarı!",
                  "💧 İnanılmaz! Bugün su hedefini gerçekleştirdin!",
                  "🚀 Muhteşem! Su hedefin tamamlandı, tebrikler!",
                  "💎 Harika! Bugün su içmeyi ihmal etmedin!",
                  "🌈 Süper! Sağlığın için mükemmel bir gün!",
                  "🎯 Mükemmel! Günlük su hedefin tamamlandı!",
                  "✨ Fantastik! Bugün su hedefine ulaştın!",
                  "🌊 Harika! Su hedefin başarıyla tamamlandı!",
                  "💪 Süper! Vücudun için gereken suyu aldın!",
                  "🌟 Mükemmel! Su hedefine ulaştın, sağlığın için büyük adım!",
                  "🎊 İnanılmaz! Bugün su hedefini gerçekleştirdin!",
                  "🏅 Harika! Su hedefin tamamlandı, tebrikler!",
                ];
                resetMessage =
                  successMessages[
                    Math.floor(Math.random() * successMessages.length)
                  ];
              } else {
                // Başarısız mesajlar (25 adet)
                const failMessages = [
                  `💧 Bugün ${freshWaterData.waterIntake} ml su içtin, hedefin ${freshWaterData.dailyWaterTarget} ml. Yarın daha iyi yapabilirsin!`,
                  `🌊 Su hedefin ${freshWaterData.dailyWaterTarget} ml idi, ancak bugün sadece ${freshWaterData.waterIntake} ml içtin.`,
                  `🎯 Hedefin ${freshWaterData.dailyWaterTarget} ml, bugün ${freshWaterData.waterIntake} ml su içtin. Biraz daha çabalayalım!`,
                  `💦 Yeterince su içemedin: ${freshWaterData.waterIntake} ml / ${freshWaterData.dailyWaterTarget} ml.`,
                  `⭐ Bugün su hedefine ulaşamadın (${freshWaterData.waterIntake} / ${freshWaterData.dailyWaterTarget} ml). Yarın şansın daha iyi olsun!`,
                  `🚀 Hedefin ${freshWaterData.dailyWaterTarget} ml, ancak bugün ${freshWaterData.waterIntake} ml su içtin. Daha fazlasını dene!`,
                  `💧 Su alımında eksik kaldın: ${freshWaterData.waterIntake} ml içtin, hedefin ${freshWaterData.dailyWaterTarget} ml.`,
                  `🌟 Günlük hedefin ${freshWaterData.dailyWaterTarget} ml, bugün ${freshWaterData.waterIntake} ml su içtin. Hedefe yaklaşabilirsin!`,
                  `🎯 Bugün su alımın hedefin altındaydı (${freshWaterData.waterIntake} / ${freshWaterData.dailyWaterTarget} ml). Yarın daha iyi yap!`,
                  `💎 Su hedefin ${freshWaterData.dailyWaterTarget} ml, fakat bugün sadece ${freshWaterData.waterIntake} ml içtin. Bir sonraki sefer daha dikkatli!`,
                  `💧 Bugün ${freshWaterData.waterIntake} ml su içtin, hedefin ${freshWaterData.dailyWaterTarget} ml. Yarın daha iyi yapabilirsin!`,
                  `🌊 Su hedefin ${freshWaterData.dailyWaterTarget} ml idi, ancak bugün sadece ${freshWaterData.waterIntake} ml içtin.`,
                  `🎯 Hedefin ${freshWaterData.dailyWaterTarget} ml, bugün ${freshWaterData.waterIntake} ml su içtin. Biraz daha çabalayalım!`,
                  `💦 Yeterince su içemedin: ${freshWaterData.waterIntake} ml / ${freshWaterData.dailyWaterTarget} ml.`,
                  `⭐ Bugün su hedefine ulaşamadın (${freshWaterData.waterIntake} / ${freshWaterData.dailyWaterTarget} ml). Yarın şansın daha iyi olsun!`,
                  `🚀 Hedefin ${freshWaterData.dailyWaterTarget} ml, ancak bugün ${freshWaterData.waterIntake} ml su içtin. Daha fazlasını dene!`,
                  `💧 Su alımında eksik kaldın: ${freshWaterData.waterIntake} ml içtin, hedefin ${freshWaterData.dailyWaterTarget} ml.`,
                  `🌟 Günlük hedefin ${freshWaterData.dailyWaterTarget} ml, bugün ${freshWaterData.waterIntake} ml su içtin. Hedefe yaklaşabilirsin!`,
                  `🎯 Bugün su alımın hedefin altındaydı (${freshWaterData.waterIntake} / ${freshWaterData.dailyWaterTarget} ml). Yarın daha iyi yap!`,
                  `💎 Su hedefin ${freshWaterData.dailyWaterTarget} ml, fakat bugün sadece ${freshWaterData.waterIntake} ml içtin. Bir sonraki sefer daha dikkatli!`,
                  `🌊 Bugün ${freshWaterData.waterIntake} ml su içtin, hedefin ${freshWaterData.dailyWaterTarget} ml. Yarın daha iyi yapabilirsin!`,
                  `💧 Su hedefin ${freshWaterData.dailyWaterTarget} ml idi, ancak bugün sadece ${freshWaterData.waterIntake} ml içtin.`,
                  `🎯 Hedefin ${freshWaterData.dailyWaterTarget} ml, bugün ${freshWaterData.waterIntake} ml su içtin. Biraz daha çabalayalım!`,
                  `💦 Yeterince su içemedin: ${freshWaterData.waterIntake} ml / ${freshWaterData.dailyWaterTarget} ml.`,
                  `⭐ Bugün su hedefine ulaşamadın (${freshWaterData.waterIntake} / ${freshWaterData.dailyWaterTarget} ml). Yarın şansın daha iyi olsun!`,
                ];
                resetMessage =
                  failMessages[Math.floor(Math.random() * failMessages.length)];
              }
              
              notificationsForThisUser.push({
                tokens: fcmTokens,
                data: {
                  title: "Günlük Su Reset Bildirimi",
                  body: resetMessage,
                  type: "water-reset",
                },
              });
            }
          }
        } else {
          if (!isWithinNotificationWindow) {
            console.log(`💧 [${userDoc.id}] Su bildirimleri atlanıyor (bildirim penceresi dışında)`);
          } else if (!waterSnap || !waterSnap.exists) {
            console.log(`💧 [${userDoc.id}] Su verisi bulunamadı`);
          }
        }

        // ---------- Takviye Bildirimleri (Global bildirim penceresi kontrolü geçerse) ----------
        if (isWithinNotificationWindow && suppSnapshot) {
          console.log(`💊 [${userDoc.id}] Takviye bildirimleri kontrol ediliyor`);
          
          // Bildirim penceresi kontrolü için güvenli erişim - varsayılan değerlerle
          if (!notificationWindow || !notificationWindow.start || !notificationWindow.end) {
            notificationWindow = { start: "08:00", end: "22:00" };
            console.log(`⏰ [${userDoc.id}] Varsayılan bildirim penceresi kullanılıyor: ${notificationWindow.start}-${notificationWindow.end}`);
          }
          
          // Bugünkü takviye tüketimini çek (gece yarısı kontrolü için özel fonksiyon kullan)
          const supplementConsumptionToday = await getSupplementConsumptionStatsForMidnight(userDoc.id);
          const turkeyTime = getTurkeyTime();
          const currentDateStr = turkeyTime.toLocaleDateString("en-CA");
          const nowHour = turkeyTime.getHours();
          const nowMinute = turkeyTime.getMinutes();
          const nowTotal = nowHour * 60 + nowMinute;
          const [startH, startM] = notificationWindow.start.split(":").map(Number);
          const [endH, endM] = notificationWindow.end.split(":").map(Number);
          const startTotal = startH * 60 + startM;
          const endTotal = endH * 60 + endM;
          const isWindowStart = nowTotal === startTotal;
          
          // Dinamik gün sonu özeti kontrolü
          // Pencere bitişi 00:00'dan önceyse 1 dakika önce, 00:00 veya sonrasıysa 23:59
          const windowEndTotal = endTotal;
          let summaryTimeTotal;
          
          // Eğer pencere bitişi gece yarısından önceyse (00:00'dan önce)
          if (windowEndTotal > 0 && windowEndTotal < 24 * 60) {
            // Pencere bitişinden 1 dakika önce
            summaryTimeTotal = windowEndTotal - 1;
          } else {
            // Pencere bitişi gece yarısı (00:00) veya sonrasıysa, günün sonu (23:59)
            summaryTimeTotal = 23 * 60 + 59; // 23:59
          }
          
          const isSummaryTime = nowTotal === summaryTimeTotal;

          console.log(`⏰ [${userDoc.id}] Dinamik gün sonu özeti hesaplaması:`, {
            windowStart: `${startH}:${startM}`,
            windowEnd: `${endH}:${endM}`,
            windowEndTotal,
            summaryTimeTotal,
            summaryTimeStr: `${Math.floor(summaryTimeTotal / 60).toString().padStart(2, '0')}:${(summaryTimeTotal % 60).toString().padStart(2, '0')}`,
            nowTotal,                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   
            isWindowStart,
            isSummaryTime
          });

          // Dinamik gün sonu özeti kontrolü - takviye döngüsünün dışında
          if (isSummaryTime) {
            console.log(`✅ [${userDoc.id}] GÜN SONU TAKVİYE ÖZET ZAMANI (${Math.floor(summaryTimeTotal / 60).toString().padStart(2, '0')}:${(summaryTimeTotal % 60).toString().padStart(2, '0')})`);
            
            // Gece yarısı özeti için taze takviye verilerini çek
            const freshSuppSnapshot = await getFreshSupplementsForMidnight(userDoc.id);
            const freshSupplementConsumptionToday = await getSupplementConsumptionStatsForMidnight(userDoc.id);
            
            // Önce takviye var mı kontrol et
            if (!freshSuppSnapshot || freshSuppSnapshot.size === 0) {
              console.log(`✅ [${userDoc.id}] Hiç takviye yok, gün sonu özeti atlanıyor`);
            } else {
              // Gün sonu özeti bildirimleri - tüm takviyeler için
              if (freshSuppSnapshot && freshSuppSnapshot.forEach) {
                const docSnaps = freshSuppSnapshot.docs ? freshSuppSnapshot.docs : Array.from(freshSuppSnapshot);
                
                // Aktif takviyeleri filtrele
                const activeSupplements = docSnaps.filter(docSnap => {
                  const suppData = docSnap.data();
                  return suppData.quantity > 0 && suppData.dailyUsage > 0;
                });
                
                if (activeSupplements.length === 0) {
                  console.log(`✅ [${userDoc.id}] Aktif takviye yok, gün sonu özeti atlanıyor`);
                } else {
                  let hasIncompleteSupplements = false;
                  let incompleteSupplements = [];
                  
                  for (const docSnap of activeSupplements) {
                    const suppData = docSnap.data();
                    const suppName = suppData.name || 'Bilinmeyen Takviye';
                    const dailyUsage = suppData.dailyUsage || 1;
                    const consumedToday = freshSupplementConsumptionToday[suppName] || 0;
                    
                    if (consumedToday < dailyUsage) {
                      hasIncompleteSupplements = true;
                      incompleteSupplements.push({
                        name: suppName,
                        consumed: consumedToday,
                        daily: dailyUsage
                      });
                    }
                  }
                  
                  // Gün sonu özeti bildirimi gönder
                  const summaryTimeStr = `${Math.floor(summaryTimeTotal / 60).toString().padStart(2, '0')}:${(summaryTimeTotal % 60).toString().padStart(2, '0')}`;
                  
                  if (hasIncompleteSupplements) {
                console.log(`✅ [${userDoc.id}] GÜN SONU TAKVİYE ÖZET (${summaryTimeStr}): ${incompleteSupplements.length} takviye tamamlanmadı`);
                
                const incompleteList = incompleteSupplements.map(s => `${s.name} (${s.consumed}/${s.daily})`).join(', ');
                const summaryMessages = [
                  `📋 Gün sonu özeti: ${incompleteList} - Yarın daha iyi yapabilirsin! 🌅`,
                  `📊 Bugünkü durum: ${incompleteList} - Sağlığın için düzenli kullanımı unutma! 💪`,
                  `📈 Günlük hedef: ${incompleteList} - Yarın tamamlamak için motive ol! 🎯`,
                  `📝 Özet: ${incompleteList} - Sağlıklı yaşam için istikrarlı ol! 🌟`,
                  `🔍 Günlük kontrol: ${incompleteList} - Yarın daha dikkatli ol! 🎯`,
                  `📅 Bugünkü performans: ${incompleteList} - İyileştirme zamanı! 🚀`,
                  `📊 Sağlık raporu: ${incompleteList} - Yarın daha iyi olacak! 🌈`,
                  `📋 Günlük değerlendirme: ${incompleteList} - Hedeflere odaklan! 🎯`,
                  `📈 İlerleme durumu: ${incompleteList} - Bir sonraki gün daha iyi! 💪`,
                  `📝 Günlük notlar: ${incompleteList} - Sağlığın için önemli! 🌟`,
                  `🔍 Detaylı özet: ${incompleteList} - Yarın tamamla! 🎯`,
                  `📊 Performans analizi: ${incompleteList} - İyileştirme fırsatı! 🚀`,
                  `📅 Günlük plan: ${incompleteList} - Yarın daha organize ol! 📋`,
                  `📈 Hedef takibi: ${incompleteList} - Sağlığın için devam et! 💪`,
                  `📝 Günlük değerlendirme: ${incompleteList} - Yarın daha iyi yap! 🌟`,
                  `🔍 Sağlık kontrolü: ${incompleteList} - Düzenli kullanım önemli! 🎯`,
                  `📊 Günlük istatistik: ${incompleteList} - İyileştirme zamanı! 📈`,
                  `📅 Sağlık planı: ${incompleteList} - Yarın daha dikkatli ol! 🎯`,
                  `📈 İlerleme raporu: ${incompleteList} - Hedeflere odaklan! 💪`,
                  `📝 Günlük özet: ${incompleteList} - Sağlığın için devam et! 🌟`,
                  `🔍 Detaylı analiz: ${incompleteList} - Yarın tamamla! 🎯`,
                  `📊 Performans raporu: ${incompleteList} - İyileştirme fırsatı! 🚀`,
                  `📅 Günlük değerlendirme: ${incompleteList} - Daha organize ol! 📋`,
                  `📈 Hedef analizi: ${incompleteList} - Sağlığın için önemli! 💪`,
                  `📝 Günlük kontrol: ${incompleteList} - Yarın daha iyi yap! 🌟`,
                  `🔍 Sağlık özeti: ${incompleteList} - Düzenli kullanım önemli! 🎯`,
                  `📊 Günlük değerlendirme: ${incompleteList} - İyileştirme zamanı! 📈`,
                  `📅 İlerleme planı: ${incompleteList} - Yarın daha dikkatli ol! 🎯`,
                  `📈 Sağlık takibi: ${incompleteList} - Hedeflere odaklan! 💪`,
                  `📝 Günlük analiz: ${incompleteList} - Sağlığın için devam et! 🌟`,
                ];
                
                notificationsForThisUser.push({
                  tokens: fcmTokens,
                  data: {
                    title: "Günlük Takviye Özeti",
                    body: summaryMessages[Math.floor(Math.random() * summaryMessages.length)],
                    type: "supplement-summary",
                  },
                });
              } else {
                console.log(`✅ [${userDoc.id}] GÜN SONU TAKVİYE ÖZET (${summaryTimeStr}): Tüm takviyeler tamamlandı!`);
                
                // Tüm takviyeler tamamlandığında da bildirim gönder
                const successMessages = [
                  `🎉 Mükemmel! Bugün tüm takviyelerini tamamladın! Sağlığın için harika bir gün! 🌟`,
                  `🏆 Harika performans! Günlük takviye hedeflerinin hepsine ulaştın! 💪`,
                  `⭐ Süper! Bugün tüm takviyelerini aldın, vücudun sana teşekkür ediyor! 🎯`,
                  `🌟 İnanılmaz! Günlük takviye rutinini mükemmel şekilde tamamladın! 🏅`,
                  `🎊 Tebrikler! Bugün tüm takviyelerini başarıyla aldın! Sağlıklı yaşam için büyük adım! 🌈`,
                  `💎 Mükemmel disiplin! Günlük takviye hedeflerinin hepsini gerçekleştirdin! ✨`,
                  `🏅 Harika! Bugün tüm takviyelerini tamamladın, sağlığın için en iyisini yapıyorsun! 🌟`,
                  `🎯 Süper başarı! Günlük takviye rutinini kusursuz şekilde tamamladın! 💎`,
                  `🚀 Fantastik! Tüm takviyelerini tamamladın, vücudun sana minnettar! 🌟`,
                  `✨ Muhteşem! Günlük takviye hedeflerinin hepsine ulaştın! 💪`,
                  `🌟 Harika! Bugün tüm takviyelerini aldın, sağlığın için en iyisini yapıyorsun! 🎯`,
                  `🏆 Mükemmel! Günlük takviye rutinini başarıyla tamamladın! 🏅`,
                  `🎊 Süper! Bugün tüm takviyelerini tamamladın! Sağlıklı yaşam için büyük başarı! 🌈`,
                  `💎 İnanılmaz! Günlük takviye hedeflerinin hepsini gerçekleştirdin! ✨`,
                  `🏅 Fantastik! Bugün tüm takviyelerini aldın, vücudun sana teşekkür ediyor! 🌟`,
                  `🎯 Mükemmel! Günlük takviye rutinini kusursuz şekilde tamamladın! 💎`,
                  `🚀 Harika! Tüm takviyelerini tamamladın, sağlığın için en iyisini yapıyorsun! 🌟`,
                  `✨ Muhteşem! Günlük takviye hedeflerinin hepsine ulaştın! 💪`,
                  `🌟 Süper! Bugün tüm takviyelerini aldın, vücudun sana minnettar! 🎯`,
                  `🏆 İnanılmaz! Günlük takviye rutinini başarıyla tamamladın! 🏅`,
                  `🎊 Fantastik! Bugün tüm takviyelerini tamamladın! Sağlıklı yaşam için büyük başarı! 🌈`,
                  `💎 Mükemmel! Günlük takviye hedeflerinin hepsini gerçekleştirdin! ✨`,
                  `🏅 Harika! Bugün tüm takviyelerini aldın, vücudun sana teşekkür ediyor! 🌟`,
                  `🎯 Süper! Günlük takviye rutinini kusursuz şekilde tamamladın! 💎`,
                  `🚀 Muhteşem! Tüm takviyelerini tamamladın, sağlığın için en iyisini yapıyorsun! 🌟`,
                  `✨ İnanılmaz! Günlük takviye hedeflerinin hepsine ulaştın! 💪`,
                  `🌟 Fantastik! Bugün tüm takviyelerini aldın, vücudun sana minnettar! 🎯`,
                  `🏆 Mükemmel! Günlük takviye rutinini başarıyla tamamladın! 🏅`,
                  `🎊 Harika! Bugün tüm takviyelerini tamamladın! Sağlıklı yaşam için büyük başarı! 🌈`,
                  `💎 Süper! Günlük takviye hedeflerinin hepsini gerçekleştirdin! ✨`,
                  `🏅 İnanılmaz! Bugün tüm takviyelerini aldın, vücudun sana teşekkür ediyor! 🌟`,
                  `🎯 Fantastik! Günlük takviye rutinini kusursuz şekilde tamamladın! 💎`,
                ];
                
                notificationsForThisUser.push({
                  tokens: fcmTokens,
                  data: {
                    title: "🎉 Günlük Takviye Başarısı!",
                    body: successMessages[Math.floor(Math.random() * successMessages.length)],
                    type: "supplement-summary-success",
                  },
                });
              }
            }
          }
        }

        if (suppSnapshot && suppSnapshot.forEach) {
            const docSnaps = suppSnapshot.docs ? suppSnapshot.docs : Array.from(suppSnapshot);
            console.log(`💊 [${userDoc.id}] ${docSnaps.length} takviye kontrol ediliyor`);
            
            for (const docSnap of docSnaps) {
              const suppData = docSnap.data();
              const suppName = suppData.name || 'Bilinmeyen Takviye'; // <-- BURAYA TAŞINDI
              if (
                suppData.quantity > 0 &&
                suppData.dailyUsage > 0
              ) {
                const dailyUsage = suppData.dailyUsage || 1;
                const consumedToday = supplementConsumptionToday[suppName] || 0;
                const estimatedRemainingDays = Math.floor(suppData.quantity / dailyUsage);

                console.log(`💊 [${userDoc.id}] ${suppName}: ${consumedToday}/${dailyUsage} alındı, ${estimatedRemainingDays} gün kaldı`);

                // 1. Kullanıcı günlük miktarı tamamladıysa bu takviye için bildirim atma
                if (consumedToday >= dailyUsage) {
                  console.log(`✅ [${userDoc.id}] ${suppName} günlük miktarı tamamlandı, bildirim atlanıyor`);
                  continue; // Sadece bu takviye için döngüden çık, diğerlerini etkileme
                }

                // 2. 14/7/3/1 gün kaldı bildirimi pencere başında
                if ([14, 7, 3, 1].includes(estimatedRemainingDays) && isWindowStart) {
                  console.log(`✅ [${userDoc.id}] TAKVİYE STOK UYARISI: ${suppName} - ${estimatedRemainingDays} gün kaldı`);
                  const motivasyonlar = [
                    `Harika gidiyorsun! ${suppName} takviyenden sadece ${estimatedRemainingDays} gün kaldı, sağlığın için istikrarlı ol!`,
                    `Az kaldı! ${suppName} takviyenden ${estimatedRemainingDays} gün sonra yenilemen gerekebilir.`,
                    `Motivasyonunu koru! ${suppName} takviyenden ${estimatedRemainingDays} gün sonra bitecek.`,
                    `Düzenli kullanım harika! ${suppName} takviyenden ${estimatedRemainingDays} gün kaldı.`,
                  ];
                  notificationsForThisUser.push({
                    tokens: fcmTokens,
                    data: {
                      title: `${suppName} Takviyenden ${estimatedRemainingDays} Gün Kaldı!`,
                      body: motivasyonlar[Math.floor(Math.random() * motivasyonlar.length)],
                      supplementId: docSnap.id,
                    },
                  });
                }

                // 3. Kullanıcının girdiği tüm bildirim saatlerini kontrol et
                if (suppData.notificationSchedule && suppData.notificationSchedule.length > 0) {
                  const currentTimeStr = `${nowHour.toString().padStart(2, '0')}:${nowMinute.toString().padStart(2, '0')}`;
                  
                  // Şu anki saat, bildirim saatlerinden biri mi kontrol et
                  if (suppData.notificationSchedule.includes(currentTimeStr)) {
                    console.log(`✅ [${userDoc.id}] TAKVİYE ZAMANI: ${suppName} - ${currentTimeStr}`);
                    const motivasyonlar = [
                      `Takviyeni almayı unutma! Düzenli kullanım sağlığın için çok önemli.`,
                      `Bugün de ${suppName} takviyeni alırsan zinciri bozmayacaksın!`,
                      `Vücudun sana teşekkür edecek! ${suppName} takviyeni almayı unutma.`,
                      `Sağlıklı bir gün için ${suppName} takviyeni şimdi alabilirsin!`,
                      `⏰ ${suppName} takviyesi zamanı! Sağlığın için önemli.`,
                      `💊 ${suppName} takviyeni almayı unutma! Düzenli kullanım şart.`,
                      `🌟 ${suppName} takviyesi için zaman geldi! Vücudun hazır.`,
                      `🎯 ${suppName} takviyeni al ve hedeflerine ulaş!`,
                      `💪 ${suppName} takviyesi zamanı! Güçlü kal.`,
                      `✨ ${suppName} takviyeni al ve parla!`,
                      `🚀 ${suppName} takviyesi için hazır mısın?`,
                      `⭐ ${suppName} takviyeni al ve yıldız gibi parla!`,
                      `🏆 ${suppName} takviyesi zamanı! Şampiyon gibi devam et.`,
                      `🎊 ${suppName} takviyeni al ve kutla!`,
                      `💎 ${suppName} takviyesi zamanı! Değerli vücudun için.`,
                      `🌈 ${suppName} takviyeni al ve renkli kal!`,
                      `🔥 ${suppName} takviyesi zamanı! Ateşli kal.`,
                      `⚡ ${suppName} takviyeni al ve enerjik ol!`,
                      `🌺 ${suppName} takviyesi zamanı! Çiçek gibi aç.`,
                      `🌙 ${suppName} takviyeni al ve ay gibi parla!`,
                      `☀️ ${suppName} takviyesi zamanı! Güneş gibi ışılda.`,
                      `🌊 ${suppName} takviyeni al ve dalga gibi ak!`,
                      `🌳 ${suppName} takviyesi zamanı! Ağaç gibi güçlü ol.`,
                      `🦋 ${suppName} takviyeni al ve kelebek gibi hafif ol!`,
                      `🦁 ${suppName} takviyesi zamanı! Aslan gibi güçlü ol.`,
                      `🦅 ${suppName} takviyeni al ve kartal gibi yüksel!`,
                      `🐬 ${suppName} takviyesi zamanı! Yunus gibi neşeli ol.`,
                      `🦄 ${suppName} takviyeni al ve efsanevi ol!`,
                      `🧚‍♀️ ${suppName} takviyesi zamanı! Peri gibi hafif ol.`,
                      `👑 ${suppName} takviyeni al ve kral gibi ol!`,
                      `💫 ${suppName} takviyesi zamanı! Yıldız gibi parla.`,
                      `🎪 ${suppName} takviyeni al ve sirk gibi eğlenceli ol!`,
                      `🎭 ${suppName} takviyesi zamanı! Sahne gibi parla.`,
                      `🎨 ${suppName} takviyeni al ve sanat gibi güzel ol!`,
                      `🎵 ${suppName} takviyesi zamanı! Müzik gibi uyumlu ol.`,
                      `🎬 ${suppName} takviyeni al ve film gibi etkileyici ol!`,
                      `🎮 ${suppName} takviyesi zamanı! Oyun gibi eğlenceli ol.`,
                      `🎲 ${suppName} takviyeni al ve şans gibi güzel ol!`,
                      `🎯 ${suppName} takviyesi zamanı! Hedef gibi odaklan.`,
                      `🎪 ${suppName} takviyeni al ve parti gibi eğlenceli ol!`,
                    ];
                    notificationsForThisUser.push({
                      tokens: fcmTokens,
                      data: {
                        title: `${suppName} Takviyesi Zamanı!`,
                        body: motivasyonlar[Math.floor(Math.random() * motivasyonlar.length)],
                        supplementId: docSnap.id,
                      },
                    });
                    // Bildirim gönderildikten sonra bir sonraki zamanı kaydet
                    await updateNextSupplementReminderTime(userDoc.id, docSnap);
                  } else {
                    console.log(`💊 [${userDoc.id}] ${suppName} henüz zamanı gelmedi (${currentTimeStr}, planlanan: ${suppData.notificationSchedule.join(', ')})`);
                  }
                } else {
                  // Eski sistem: nextSupplementReminderTime kontrolü (geriye uyumluluk için)
                  if (suppData.nextSupplementReminderTime) {
                    const nextReminder = new Date(suppData.nextSupplementReminderTime);
                    const nextReminderTurkey = new Date(
                      nextReminder.toLocaleString("en-US", {
                        timeZone: "Europe/Istanbul",
                      })
                    );
                    if (Math.abs(now - nextReminderTurkey) / 60000 < 0.5) {
                      console.log(`✅ [${userDoc.id}] TAKVİYE ZAMANI (ESKİ SİSTEM): ${suppName} - ${nextReminderTurkey.toLocaleTimeString('tr-TR')}`);
                      const motivasyonlar = [
                        `Takviyeni almayı unutma! Düzenli kullanım sağlığın için çok önemli.`,
                        `Bugün de ${suppName} takviyeni alırsan zinciri bozmayacaksın!`,
                        `Vücudun sana teşekkür edecek! ${suppName} takviyeni almayı unutma.`,
                        `Sağlıklı bir gün için ${suppName} takviyeni şimdi alabilirsin!`,
                        `⏰ ${suppName} takviyesi zamanı! Sağlığın için önemli.`,
                        `💊 ${suppName} takviyeni almayı unutma! Düzenli kullanım şart.`,
                        `🌟 ${suppName} takviyesi için zaman geldi! Vücudun hazır.`,
                        `🎯 ${suppName} takviyeni al ve hedeflerine ulaş!`,
                        `💪 ${suppName} takviyesi zamanı! Güçlü kal.`,
                        `✨ ${suppName} takviyeni al ve parla!`,
                        `🚀 ${suppName} takviyesi için hazır mısın?`,
                        `⭐ ${suppName} takviyeni al ve yıldız gibi parla!`,
                        `🏆 ${suppName} takviyesi zamanı! Şampiyon gibi devam et.`,
                        `🎊 ${suppName} takviyeni al ve kutla!`,
                        `💎 ${suppName} takviyesi zamanı! Değerli vücudun için.`,
                        `🌈 ${suppName} takviyeni al ve renkli kal!`,
                        `🔥 ${suppName} takviyesi zamanı! Ateşli kal.`,
                        `⚡ ${suppName} takviyeni al ve enerjik ol!`,
                        `🌺 ${suppName} takviyesi zamanı! Çiçek gibi aç.`,
                        `🌙 ${suppName} takviyeni al ve ay gibi parla!`,
                        `☀️ ${suppName} takviyesi zamanı! Güneş gibi ışılda.`,
                        `🌊 ${suppName} takviyesi zamanı! Dalga gibi ak.`,
                        `🌳 ${suppName} takviyesi zamanı! Ağaç gibi güçlü ol.`,
                        `🦋 ${suppName} takviyeni al ve kelebek gibi hafif ol!`,
                        `🦁 ${suppName} takviyesi zamanı! Aslan gibi güçlü ol.`,
                        `🦅 ${suppName} takviyeni al ve kartal gibi yüksel!`,
                        `🐬 ${suppName} takviyesi zamanı! Yunus gibi neşeli ol.`,
                        `🦄 ${suppName} takviyeni al ve efsanevi ol!`,
                        `🧚‍♀️ ${suppName} takviyesi zamanı! Peri gibi hafif ol.`,
                        `👑 ${suppName} takviyeni al ve kral gibi ol!`,
                        `💫 ${suppName} takviyesi zamanı! Yıldız gibi parla.`,
                        `🎪 ${suppName} takviyeni al ve sirk gibi eğlenceli ol!`,
                        `🎭 ${suppName} takviyesi zamanı! Sahne gibi parla.`,
                        `🎨 ${suppName} takviyeni al ve sanat gibi güzel ol!`,
                        `🎵 ${suppName} takviyesi zamanı! Müzik gibi uyumlu ol.`,
                        `🎬 ${suppName} takviyeni al ve film gibi etkileyici ol!`,
                        `🎮 ${suppName} takviyesi zamanı! Oyun gibi eğlenceli ol.`,
                        `🎲 ${suppName} takviyeni al ve şans gibi güzel ol!`,
                        `🎯 ${suppName} takviyesi zamanı! Hedef gibi odaklan.`,
                        `🎪 ${suppName} takviyeni al ve parti gibi eğlenceli ol!`,
                      ];
                      notificationsForThisUser.push({
                        tokens: fcmTokens,
                        data: {
                          title: `${suppName} Takviyesi Zamanı!`,
                          body: motivasyonlar[Math.floor(Math.random() * motivasyonlar.length)],
                          supplementId: docSnap.id,
                        },
                      });
                    } else {
                      console.log(`💊 [${userDoc.id}] ${suppName} henüz zamanı gelmedi (${Math.abs(now - nextReminderTurkey) / 60000} dakika fark)`);
                    }
                  } else {
                    console.log(`💊 [${userDoc.id}] ${suppName} için bildirim zamanı ayarlanmamış`);
                  }
                }
              } else {
                console.log(`💊 [${userDoc.id}] ${suppName} geçersiz (miktar: ${suppData.quantity}, günlük: ${suppData.dailyUsage})`);
              }
            }
          } else {
            console.log(`💊 [${userDoc.id}] Takviye verisi bulunamadı`);
          }
        }
        } else {
          if (!isWithinNotificationWindow) {
            console.log(`💊 [${userDoc.id}] Takviye bildirimleri atlanıyor (bildirim penceresi dışında)`);
          } else if (!suppSnapshot) {
            console.log(`💊 [${userDoc.id}] Takviye verisi bulunamadı`);
          }
        }

        // Kullanıcıya ait bildirimler varsa, kullanıcı ID'si ile birlikte ekle
        if (notificationsForThisUser.length > 0) {
          console.log(`📤 [${userDoc.id}] ${notificationsForThisUser.length} bildirim gönderilecek`);
          notificationsToSend.push({
            userId: userDoc.id,
            notifications: notificationsForThisUser,
          });
        } else {
          console.log(`📤 [${userDoc.id}] Gönderilecek bildirim yok`);
        }
      })
    );

    console.log(`📊 [BİLDİRİM SİSTEMİ] Toplam ${notificationsToSend.length} kullanıcıya bildirim gönderilecek`);

    // Tüm bildirim mesajlarını, her token için ayrı ayrı gönder ve geçersiz tokenları temizle
    const sendResults = await Promise.all(
      notificationsToSend.map(async (userNotifications) => {
        try {
          const { userId, notifications } = userNotifications;
          console.log(`📤 [${userId}] ${notifications.length} bildirim gönderiliyor...`);
          
          const results = await Promise.all(
            notifications.map((notification) =>
              sendEachForMulticast(notification, userId)
            )
          );
          
          const successCount = results.flat().filter(r => r.valid).length;
          const failCount = results.flat().filter(r => !r.valid).length;
          console.log(`📤 [${userId}] Bildirim sonucu: ${successCount} başarılı, ${failCount} başarısız`);
          
          return { userId, results };
        } catch (err) {
          console.error(`❌ [${userNotifications.userId}] Bildirim gönderme hatası:`, err);
          return err;
        }
      })
    );

    console.log(`✅ [BİLDİRİM SİSTEMİ] Tamamlandı - ${sendResults.length} kullanıcı işlendi`);
    return {
      statusCode: 200,
      body: JSON.stringify({ results: sendResults }),
    };
  } catch (error) {
    console.error("❌ [BİLDİRİM SİSTEMİ] Genel hata:", error);
    return { statusCode: 500, body: error.toString() };
  }
};


