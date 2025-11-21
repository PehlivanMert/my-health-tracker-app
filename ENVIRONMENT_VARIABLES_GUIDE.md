# Environment Variables Kılavuzu - midnightReset.js

## 🎯 ÖNEMLİ: Hiçbir şey yapmanıza gerek yok!

Kod **otomatik** olarak çalışıyor:
- ✅ **Chunk size**: Netlify otomatik olarak production ortamını algılıyor
- ✅ **Logging**: Varsayılan olarak optimize edilmiş (sadece özet bilgiler)
- ✅ **Retry mekanizması**: Otomatik olarak çalışıyor

---

## 📋 Mevcut Varsayılan Değerler

### Chunk Size
- **Production ortamında**: 15 kullanıcı/chunk (otomatik)
- **Development ortamında**: 20 kullanıcı/chunk (otomatik)

### Verbose Logging
- **Varsayılan**: `false` (kapalı)
- Sadece özet bilgiler loglanır (hız için optimize edilmiş)

### Retry Mekanizması
- **Maksimum deneme**: 3 kez
- **Bekleme süresi**: 1 saniye (her denemede artar)

---

## 🔧 Opsiyonel: Verbose Logging Açmak

Eğer **debugging** yapıyorsanız ve tüm detaylı logları görmek istiyorsanız:

### Yöntem 1: Netlify Dashboard (ÖNERİLEN)

1. **Netlify Dashboard**'a gidin: https://app.netlify.com/
2. **Site Settings** → **Environment variables** bölümüne gidin
3. **Add a variable** butonuna tıklayın
4. Şunları ekleyin:
   - **Key**: `VERBOSE_LOGGING`
   - **Value**: `true`
5. **Save** butonuna tıklayın
6. **Trigger deploy** yapın (varsa) veya bir sonraki deploy'da aktif olur

**✅ Artık tüm detaylı loglar görünecek**

### Yöntem 2: Local Development İçin (.env dosyası)

Proje root dizininde `.env` dosyası oluşturun (eğer yoksa):

```bash
# .env dosyası (local development için)
VERBOSE_LOGGING=true
```

**Not**: `.env` dosyası `.gitignore`'da olduğu için git'e commit edilmez (güvenli).

### Yöntem 3: Netlify CLI ile

```bash
netlify env:set VERBOSE_LOGGING true
```

---

## 📊 Chunk Size'ı Manuel Ayarlamak (ÇOK GEREK YOK)

Kod zaten otomatik olarak production'da küçük chunk size kullanıyor.

Eğer özel bir chunk size istiyorsanız, `midnightReset.js` dosyasında şu satırı değiştirebilirsiniz:

```javascript
// Mevcut (Otomatik)
const getChunkSize = () => {
  const isProduction = process.env.NETLIFY_ENV === 'production' || process.env.NODE_ENV === 'production';
  return isProduction ? 15 : 20;
};

// Manuel ayarlamak isterseniz:
const getChunkSize = () => {
  return 10; // Sabit 10 kullanıcı/chunk (her ortamda)
};
```

**⚠️ Uyarı**: Chunk size'ı çok küçük yaparsanız, çok fazla paralel işlem olur ve timeout riski artabilir.

---

## 🧪 Test Etmek

### Verbose Logging'in Açık Olup Olmadığını Kontrol

`midnightReset.js` fonksiyonunu çalıştırdığınızda loglarda şunları görürsünüz:

**Kapalı (varsayılan)**:
```
🌙 Gece yarısı sıfırlama ve bildirim hesaplama başlatılıyor...
🔄 100 kullanıcı 5 chunk'a bölündü (her chunk 15 kullanıcı, verbose logging kapalı)
✅ Chunk 1/5 tamamlandı (2500ms, ortalama: 166ms/kullanıcı)
✅ Gece yarısı işlemleri tamamlandı:
   ⏱️  Toplam süre: 12000ms
   📊 Toplam kullanıcı: 100
```

**Açık (VERBOSE_LOGGING=true)**:
```
🌙 Gece yarısı sıfırlama ve bildirim hesaplama başlatılıyor...
🔄 100 kullanıcı 5 chunk'a bölündü (her chunk 15 kullanıcı, verbose logging açık)
✅ [userId1] Su verisi sıfırlandı: 1500ml → 0ml
✅ [userId1] İşlem tamamlandı { waterReset: true, ... }
✅ [userId2] Takviye bildirimi kaydedildi
... (her kullanıcı için detaylı loglar)
✅ Chunk 1/5 tamamlandı (2500ms, ortalama: 166ms/kullanıcı)
```

---

## ❓ Sık Sorulan Sorular

### Q: Environment variable eklemem gerekiyor mu?
**A: HAYIR!** Kod varsayılan değerlerle mükemmel çalışıyor. Sadece debugging yapıyorsanız `VERBOSE_LOGGING=true` ekleyebilirsiniz.

### Q: NETLIFY_ENV değişkenini ben mi eklemeliyim?
**A: HAYIR!** Netlify otomatik olarak production ortamında `NETLIFY_ENV=production` ayarlıyor. Hiçbir şey yapmanıza gerek yok.

### Q: Production'da chunk size otomatik küçülüyor mu?
**A: EVET!** Kod otomatik olarak production'da 15, development'ta 20 kullanıcı/chunk kullanıyor.

### Q: Verbose logging açmak performansı etkiler mi?
**A: Evet, biraz etkiler.** Çok fazla log yazıldığı için I/O işlemleri artar. Sadece debugging sırasında açın.

### Q: Chunk size'ı değiştirmeli miyim?
**A: Genelde gerek yok.** Varsayılan değerler optimize edilmiş. Çok fazla kullanıcınız varsa (1000+) ve timeout alıyorsanız, chunk size'ı küçültmeyi deneyebilirsiniz.

---

## 📝 Özet

1. ✅ **Hiçbir şey yapmaya gerek yok** - kod otomatik çalışıyor
2. 🔧 **Sadece debugging için** `VERBOSE_LOGGING=true` ekleyin (opsiyonel)
3. 🚀 **Kod zaten optimize** - varsayılan değerler en iyi performans için ayarlanmış

**Her şey hazır, sadece kullanın! 🎉**

