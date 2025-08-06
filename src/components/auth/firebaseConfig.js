import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Firestore persistence ayarları
const initializeFirestore = async () => {
  try {
    // IndexedDB persistence'ı etkinleştir
    await enableIndexedDbPersistence(db, {
      synchronizeTabs: true, // Multi-tab senkronizasyonu
    });
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Firestore persistence başarıyla etkinleştirildi');
    }
  } catch (error) {
    if (error.code === 'failed-precondition') {
      // Multi-tab açık olduğunda bu hata oluşabilir
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Firestore persistence: Multi-tab açık, persistence devre dışı');
      }
    } else if (error.code === 'unimplemented') {
      // Browser desteklemiyor
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Firestore persistence: Browser desteklemiyor');
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Firestore persistence hatası:', error);
      }
    }
  }
};

// Firestore'u başlat
initializeFirestore();

const storage = getStorage(app);
const messaging = getMessaging(app);

export { app, auth, db, storage, messaging };
