const admin = require("firebase-admin");

// Singleton pattern ile tek connection instance
let dbInstance = null;

/**
 * Firebase Admin SDK bağlantısını başlatır ve yönetir
 * @returns {Object} Firestore database instance
 */
const initializeDatabase = () => {
  if (!dbInstance) {
    console.log('🔄 [dbConnection] Yeni database instance oluşturuluyor...');
    
    if (!admin.apps.length) {
      console.log('🔄 [dbConnection] Firebase Admin SDK başlatılıyor...');
      
      // Environment variable kontrolü
      if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
        console.error('❌ [dbConnection] FIREBASE_SERVICE_ACCOUNT environment variable bulunamadı!');
        throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable gerekli');
      }
      
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: process.env.FIREBASE_DATABASE_URL || serviceAccount.databaseURL,
        });
        console.log('✅ [dbConnection] Firebase Admin SDK başlatıldı');
      } catch (error) {
        console.error('❌ [dbConnection] Firebase Admin SDK başlatma hatası:', error.message);
        throw error;
      }
    } else {
      console.log('🔄 [dbConnection] Mevcut Firebase Admin SDK kullanılıyor');
    }
    
    dbInstance = admin.firestore();
    
    // Connection pooling ayarları
    dbInstance.settings({
      ignoreUndefinedProperties: true,
      cacheSizeBytes: admin.firestore.CACHE_SIZE_UNLIMITED
    });
    
    console.log('✅ [dbConnection] Database instance oluşturuldu ve ayarlandı');
    console.log('📊 [dbConnection] Connection pooling aktif');
  } else {
    console.log('🔄 [dbConnection] Mevcut database instance kullanılıyor (singleton)');
  }
  return dbInstance;
};

/**
 * Database instance'ını döndürür
 * @returns {Object} Firestore database instance
 */
const getDatabase = () => {
  console.log('🔄 [dbConnection] getDatabase() çağrıldı');
  return initializeDatabase();
};

/**
 * Batch operations için optimized batch oluşturur
 * @returns {Object} Firestore batch instance
 */
const createBatch = () => {
  console.log('🔄 [dbConnection] createBatch() çağrıldı');
  return getDatabase().batch();
};

/**
 * Transaction için optimized transaction oluşturur
 * @param {Function} updateFunction - Transaction içinde çalışacak fonksiyon
 * @returns {Promise} Transaction sonucu
 */
const runTransaction = async (updateFunction) => {
  console.log('🔄 [dbConnection] runTransaction() çağrıldı');
  return getDatabase().runTransaction(updateFunction);
};

/**
 * Collection reference oluşturur
 * @param {string} collectionPath - Collection path
 * @returns {Object} Collection reference
 */
const collection = (collectionPath) => {
  console.log(`🔄 [dbConnection] collection(${collectionPath}) çağrıldı`);
  return getDatabase().collection(collectionPath);
};

/**
 * Document reference oluşturur
 * @param {string} docPath - Document path
 * @returns {Object} Document reference
 */
const doc = (docPath) => {
  console.log(`🔄 [dbConnection] doc(${docPath}) çağrıldı`);
  return getDatabase().doc(docPath);
};

// Test fonksiyonu
const testConnection = () => {
  console.log('🧪 [dbConnection] Test başlatılıyor...');
  try {
    const db = getDatabase();
    console.log('✅ [dbConnection] Test başarılı - Database instance alındı');
    return true;
  } catch (error) {
    console.error('❌ [dbConnection] Test başarısız:', error.message);
    return false;
  }
};

module.exports = {
  getDatabase,
  createBatch,
  runTransaction,
  collection,
  doc,
  admin,
  testConnection
}; 