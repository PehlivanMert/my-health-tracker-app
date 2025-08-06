import { db } from "../components/auth/firebaseConfig";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

// Retry mekanizması
const retryOperation = async (operation, maxRetries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      // BloomFilter hatası için özel bekleme
      if (error.name === 'BloomFilterError') {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
        continue;
      }
      
      // Diğer hatalar için kısa bekleme
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Güvenli getDoc fonksiyonu
export const safeGetDoc = async (docRef, options = {}) => {
  return retryOperation(async () => {
    try {
      return await getDoc(docRef, options);
    } catch (error) {
      if (error.name === 'BloomFilterError') {
        // BloomFilter hatası durumunda cache'i temizle ve tekrar dene
        if (process.env.NODE_ENV === 'development') {
          console.warn('🔄 BloomFilter hatası, cache temizleniyor...');
        }
        
        // Cache'i temizlemek için yeni bir istek yap
        return await getDoc(docRef, { source: "server" });
      }
      throw error;
    }
  });
};

// Güvenli setDoc fonksiyonu
export const safeSetDoc = async (docRef, data, options = {}) => {
  return retryOperation(async () => {
    return await setDoc(docRef, data, options);
  });
};

// Güvenli updateDoc fonksiyonu
export const safeUpdateDoc = async (docRef, data) => {
  return retryOperation(async () => {
    return await updateDoc(docRef, data);
  });
};

// Firestore bağlantı durumu kontrolü
export const checkFirestoreConnection = async () => {
  try {
    const testDoc = doc(db, "_test", "connection");
    await getDoc(testDoc);
    return true;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ Firestore bağlantı hatası:', error);
    }
    return false;
  }
};

// Cache temizleme fonksiyonu
export const clearFirestoreCache = async () => {
  try {
    // IndexedDB'yi temizle
    if ('indexedDB' in window) {
      const databases = await window.indexedDB.databases();
      for (const database of databases) {
        if (database.name.includes('firebase')) {
          window.indexedDB.deleteDatabase(database.name);
        }
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Firestore cache temizlendi');
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ Cache temizleme hatası:', error);
    }
  }
}; 