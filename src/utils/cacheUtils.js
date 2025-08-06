// Client-side cache sistemi
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map(); // Time To Live
    this.defaultTTL = 5 * 60 * 1000; // 5 dakika
  }

  // Cache'e veri ekle
  set(key, data, ttl = this.defaultTTL) {
    this.cache.set(key, data);
    this.ttl.set(key, Date.now() + ttl);
  }

  // Cache'den veri al
  get(key) {
    if (!this.cache.has(key)) return null;
    
    const expiryTime = this.ttl.get(key);
    if (Date.now() > expiryTime) {
      this.delete(key);
      return null;
    }
    
    return this.cache.get(key);
  }

  // Cache'den veri sil
  delete(key) {
    this.cache.delete(key);
    this.ttl.delete(key);
  }

  // Belirli bir pattern'e uyan tüm cache'leri sil
  deletePattern(pattern) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.delete(key);
      }
    }
  }

  // Tüm cache'i temizle
  clear() {
    this.cache.clear();
    this.ttl.clear();
  }

  // Cache boyutunu al
  size() {
    return this.cache.size;
  }

  // Cache istatistikleri
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [key, expiryTime] of this.ttl.entries()) {
      if (now > expiryTime) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }

    return {
      total: this.cache.size,
      valid: validEntries,
      expired: expiredEntries
    };
  }
}

// Global cache instance
export const cacheManager = new CacheManager();

// Cache key generator
export const generateCacheKey = (collection, userId, ...params) => {
  return `${collection}_${userId}_${params.join('_')}`;
};

// Firestore cache wrapper
export const cachedFirestoreGet = async (key, fetchFunction, ttl = 5 * 60 * 1000) => {
  // Önce cache'den kontrol et
  const cachedData = cacheManager.get(key);
  if (cachedData) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Cache hit: ${key}`);
    }
    return cachedData;
  }

  // Cache'de yoksa Firestore'dan çek
  if (process.env.NODE_ENV === 'development') {
    console.log(`Cache miss: ${key}`);
  }
  const data = await fetchFunction();
  
  // Cache'e kaydet
  cacheManager.set(key, data, ttl);
  
  return data;
};

// Cache invalidation helpers
export const invalidateUserCache = (userId) => {
  cacheManager.deletePattern(`users_${userId}`);
  if (process.env.NODE_ENV === 'development') {
    console.log(`User cache invalidated: ${userId}`);
  }
};

export const invalidateCollectionCache = (collection, userId) => {
  const key = generateCacheKey(collection, userId);
  cacheManager.deletePattern(key);
  if (process.env.NODE_ENV === 'development') {
    console.log(`Collection cache invalidated: ${collection} for user ${userId}`);
  }
}; 