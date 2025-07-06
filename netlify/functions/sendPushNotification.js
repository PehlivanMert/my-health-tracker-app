const admin = require("firebase-admin");
const fetch = require("node-fetch");

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL:
      process.env.FIREBASE_DATABASE_URL || serviceAccount.databaseURL,
  });
}

const db = admin.firestore();

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

exports.handler = async function (event, context) {
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
            // Eğer bildirimler kapalıysa, rutin tamamlanmışsa veya rutinin tarihi bugünün tarihi değilse bildirim gönderme.
            if (
              !routine.notificationEnabled ||
              routine.completed ||
              routine.date !== currentDateStr
            ) {
              console.log(`⏭️ [${userDoc.id}] Rutin "${routine.title}" atlanıyor (bildirim: ${routine.notificationEnabled}, tamamlandı: ${routine.completed}, tarih: ${routine.date})`);
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
              console.log(
                `✅ [${userDoc.id}] GECE YARISI SU RESET: ${waterData.waterIntake >= waterData.dailyWaterTarget ? 'HEDEF TAMAMLANDI' : 'HEDEF TAMAMLANAMADI'}`
              );
              
              let resetMessage = "";
              if (waterData.waterIntake >= waterData.dailyWaterTarget) {
                // Başarı mesajları (10 adet)
                const successMessages = [
                  "Harika! Bugün su hedefini gerçekleştirdin!",
                  "Mükemmel, su hedefin tamamlandı!",
                  "Tebrikler! Vücudun için gereken suyu aldın!",
                  "Su hedefine ulaştın, sağlığın için büyük bir adım!",
                  "Bugün suyu tamamlama başarın takdire şayan!",
                  "Su hedefini aştın, süper bir performans!",
                  "Bugün su içmeyi ihmal etmedin, tebrikler!",
                  "Sağlığın için harika bir gün, su hedefine ulaştın!",
                  "Günlük su hedefin tamamlandı, mükemmel!",
                  "Bugün su hedefine ulaşman motivasyonunu artırıyor!",
                ];
                resetMessage =
                  successMessages[
                    Math.floor(Math.random() * successMessages.length)
                  ];
              } else {
                // Başarısız mesajlar (10 adet)
                const failMessages = [
                  `Bugün ${waterData.waterIntake} ml su içtin, hedefin ${waterData.dailyWaterTarget} ml. Yarın daha iyi yapabilirsin!`,
                  `Su hedefin ${waterData.dailyWaterTarget} ml idi, ancak bugün sadece ${waterData.waterIntake} ml içtin.`,
                  `Hedefin ${waterData.dailyWaterTarget} ml, bugün ${waterData.waterIntake} ml su içtin. Biraz daha çabalayalım!`,
                  `Yeterince su içemedin: ${waterData.waterIntake} ml / ${waterData.dailyWaterTarget} ml.`,
                  `Bugün su hedefine ulaşamadın (${waterData.waterIntake} / ${waterData.dailyWaterTarget} ml). Yarın şansın daha iyi olsun!`,
                  `Hedefin ${waterData.dailyWaterTarget} ml, ancak bugün ${waterData.waterIntake} ml su içtin. Daha fazlasını dene!`,
                  `Su alımında eksik kaldın: ${waterData.waterIntake} ml içtin, hedefin ${waterData.dailyWaterTarget} ml.`,
                  `Günlük hedefin ${waterData.dailyWaterTarget} ml, bugün ${waterData.waterIntake} ml su içtin. Hedefe yaklaşabilirsin!`,
                  `Bugün su alımın hedefin altındaydı (${waterData.waterIntake} / ${waterData.dailyWaterTarget} ml). Yarın daha iyi yap!`,
                  `Su hedefin ${waterData.dailyWaterTarget} ml, fakat bugün sadece ${waterData.waterIntake} ml içtin. Bir sonraki sefer daha dikkatli!`,
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
          const isWindowEnd = nowTotal === endTotal;
          
          // Dinamik gün sonu özeti kontrolü
          // Pencere bitişi 23:59'dan sonraysa 23:59'da, önceyse pencere bitişinden 1 dakika önce
          const windowEndTotal = endTotal;
          const midnightTotal = 23 * 60 + 59; // 23:59
          const summaryTimeTotal = windowEndTotal > midnightTotal ? midnightTotal : windowEndTotal - 1; // 1 dakika önce
          const isSummaryTime = nowTotal === summaryTimeTotal;

          if (suppSnapshot && suppSnapshot.forEach) {
            const docSnaps = suppSnapshot.docs ? suppSnapshot.docs : Array.from(suppSnapshot);
            console.log(`💊 [${userDoc.id}] ${docSnaps.length} takviye kontrol ediliyor`);
            
            for (const docSnap of docSnaps) {
              const suppData = docSnap.data();
              if (
                suppData.quantity > 0 &&
                suppData.dailyUsage > 0
              ) {
                const suppName = suppData.name || 'Bilinmeyen Takviye';
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

                // 4. Dinamik gün sonu özeti bildirimi
                if (isSummaryTime) {
                  const summaryTimeStr = `${Math.floor(summaryTimeTotal / 60).toString().padStart(2, '0')}:${(summaryTimeTotal % 60).toString().padStart(2, '0')}`;
                  console.log(`✅ [${userDoc.id}] GÜN SONU TAKVİYE ÖZET (${summaryTimeStr}): ${suppName} - ${consumedToday}/${dailyUsage} alındı`);
                  
                  // Gün sonu özet bildirimleri
                  if (consumedToday === dailyUsage) {
                    // Tamamını aldıysa
                    const successMessages = [
                      `🎉 Harikasın! Bugün ${suppName} takviyeni tam zamanında aldın, vücudun sana teşekkür ediyor! 🏆`,
                      `👏 Süper! ${suppName} takviyeni eksiksiz aldın, sağlığın için harika bir adım attın! 💪`,
                      `🌟 Mükemmel! ${suppName} takviyeni tam olarak aldın, zinciri bozmadın! 🔗`,
                      `🥳 Tebrikler! Bugün ${suppName} takviyeni eksiksiz aldın, böyle devam! 🚀`,
                    ];
                    notificationsForThisUser.push({
                      tokens: fcmTokens,
                      data: {
                        title: `${suppName} Takviyesi Tamamlandı!`,
                        body: successMessages[Math.floor(Math.random() * successMessages.length)],
                        supplementId: docSnap.id,
                      },
                    });
                  } else if (consumedToday === 0) {
                    // Hiç almadıysa
                    const failMessages = [
                      `😱 Olamaz! Bugün ${suppName} takviyeni hiç almadın. Yarın telafi etme zamanı! ⏰`,
                      `🙈 Bugün ${suppName} takviyeni atladın, ama üzülme, yarın yeni bir gün! 🌅`,
                      `🚨 Dikkat! ${suppName} takviyeni bugün hiç almadın. Sağlığın için düzenli kullanımı unutma!`,
                      `😴 Bugün ${suppName} takviyeni unuttun. Yarın hatırlatıcıları kontrol etmeyi unutma! 🔔`,
                    ];
                    notificationsForThisUser.push({
                      tokens: fcmTokens,
                      data: {
                        title: `${suppName} Takviyesi Alınmadı!`,
                        body: failMessages[Math.floor(Math.random() * failMessages.length)],
                        supplementId: docSnap.id,
                      },
                    });
                  } else if (consumedToday > 0 && consumedToday < dailyUsage) {
                    // Kısmen aldıysa
                    const partialMessages = [
                      `🤔 Bugün ${suppName} takviyenden ${consumedToday}/${dailyUsage} aldın. Biraz daha dikkat, zinciri tamamla! 🔗`,
                      `🕗 ${suppName} takviyeni bugün tam alamadın (${consumedToday}/${dailyUsage}). Yarın tam doz için motive ol! 💡`,
                      `💡 ${suppName} takviyeni neredeyse tamamladın (${consumedToday}/${dailyUsage}), az kaldı!`,
                      `⏳ Bugün ${suppName} takviyeni tam tamamlayamadın (${consumedToday}/${dailyUsage}). Yarın daha iyisi için devam!`,
                    ];
                    notificationsForThisUser.push({
                      tokens: fcmTokens,
                      data: {
                        title: `${suppName} Takviyesi Yeterli Değil!`,
                        body: partialMessages[Math.floor(Math.random() * partialMessages.length)],
                        supplementId: docSnap.id,
                      },
                    });
                  }
                }
              } else {
                console.log(`💊 [${userDoc.id}] ${suppName} geçersiz (miktar: ${suppData.quantity}, günlük: ${suppData.dailyUsage})`);
              }
            }
          } else {
            console.log(`💊 [${userDoc.id}] Takviye verisi bulunamadı`);
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


