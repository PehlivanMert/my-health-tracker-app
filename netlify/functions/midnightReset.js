const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Firebase Admin SDK'yı başlat
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = getFirestore();

// Türkiye saati için yardımcı fonksiyon
const getTurkeyTime = () => {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
};

// Su verilerini sıfırla
const resetWaterData = async (userId, waterData) => {
  const todayStr = getTurkeyTime().toLocaleDateString("en-CA");
  
  // Eğer bugün zaten reset yapılmışsa, tekrar yapma
  if (waterData.lastResetDate === todayStr) {
    console.log(`🔄 [${userId}] Su verisi zaten bugün sıfırlanmış`);
    return false;
  }

  const yesterday = new Date(getTurkeyTime());
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString("en-CA");

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
      history: admin.firestore.FieldValue.arrayUnion(newHistoryEntry),
    });

    console.log(`✅ [${userId}] Su verisi sıfırlandı: ${waterData.waterIntake}ml → 0ml`);
    return true;
  } catch (error) {
    console.error(`❌ [${userId}] Su verisi sıfırlama hatası:`, error);
    return false;
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

  try {
    console.log('🌙 Gece yarısı sıfırlama başlatılıyor...');
    
    // Tüm kullanıcıları al
    const usersSnapshot = await db.collection('users').get();
    let totalUsers = 0;
    let waterResetCount = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      totalUsers++;

      try {
        // Su verilerini al
        const waterDoc = await db.collection('users').doc(userId).collection('water').doc('current').get();
        const waterData = waterDoc.exists ? waterDoc.data() : null;

        // Su verilerini sıfırla
        if (waterData) {
          const waterReset = await resetWaterData(userId, waterData);
          if (waterReset) waterResetCount++;
        }



      } catch (error) {
        console.error(`❌ [${userId}] Kullanıcı işleme hatası:`, error);
      }
    }

    console.log(`✅ Gece yarısı sıfırlama tamamlandı:`);
    console.log(`   📊 Toplam kullanıcı: ${totalUsers}`);
    console.log(`   💧 Su sıfırlama: ${waterResetCount}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Gece yarısı sıfırlama tamamlandı',
        stats: {
          totalUsers,
          waterResetCount,
        },
      }),
    };

  } catch (error) {
    console.error('❌ Gece yarısı sıfırlama hatası:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
}; 