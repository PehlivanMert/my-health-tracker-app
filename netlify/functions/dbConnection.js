const admin = require("firebase-admin");

// Singleton pattern ile tek connection instance
let dbInstance = null;

/**
 * Firebase Admin SDK bağlantısını başlatır ve yönetir
 * @returns {Object} Firestore database instance
 */
const initializeDatabase = () => {
  if (!dbInstance) {
    if (!admin.apps.length) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL || serviceAccount.databaseURL,
      });
    }
    dbInstance = admin.firestore();
    
    // Connection pooling ayarları
    dbInstance.settings({
      ignoreUndefinedProperties: true,
      cacheSizeBytes: admin.firestore.CACHE_SIZE_UNLIMITED
    });
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

module.exports = {
  getDatabase,
  createBatch,
  runTransaction,
  collection,
  doc,
  admin
}; 