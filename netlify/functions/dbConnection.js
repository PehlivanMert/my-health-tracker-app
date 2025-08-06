const admin = require("firebase-admin");

// Singleton pattern ile tek connection instance
let dbInstance = null;

/**
 * Firebase Admin SDK bağlantısını başlatır ve yönetir
 * @returns {Object} Firestore database instance
 */
const initializeDatabase = () => {
  if (!dbInstance) {
    console.log('🔄 [dbConnection] Database instance oluşturuluyor...');
    
    if (!admin.apps.length) {
      // Environment variable kontrolü - Netlify'daki gerçek isimler
      if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
        console.error('❌ [dbConnection] FIREBASE_SERVICE_ACCOUNT environment variable bulunamadı!');
        throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable gerekli');
      }
      
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${process.env.VITE_FIREBASE_PROJECT_ID}.firebaseio.com`,
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
    
    console.log('✅ [dbConnection] Database instance hazır');
  } else {
    console.log('🔄 [dbConnection] Mevcut instance kullanılıyor');
  }
  return dbInstance;
};

/**
 * Database instance'ını döndürür
 * @returns {Object} Firestore database instance
 */
const getDatabase = () => {
  return initializeDatabase();
};

/**
 * Batch operations için optimized batch oluşturur
 * @returns {Object} Firestore batch instance
 */
const createBatch = () => {
  return getDatabase().batch();
};

/**
 * Transaction için optimized transaction oluşturur
 * @param {Function} updateFunction - Transaction içinde çalışacak fonksiyon
 * @returns {Promise} Transaction sonucu
 */
const runTransaction = async (updateFunction) => {
  return getDatabase().runTransaction(updateFunction);
};

/**
 * Collection reference oluşturur
 * @param {string} collectionPath - Collection path
 * @returns {Object} Collection reference
 */
const collection = (collectionPath) => {
  return getDatabase().collection(collectionPath);
};

/**
 * Document reference oluşturur
 * @param {string} docPath - Document path
 * @returns {Object} Document reference
 */
const doc = (docPath) => {
  return getDatabase().doc(docPath);
};

// Test fonksiyonu (sadece development için)
const testConnection = () => {
  try {
    const db = getDatabase();
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