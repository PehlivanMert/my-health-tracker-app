# Sağlık ve Rutin Takip Sistemi 🏋️‍♂️💧

![Proje Logo](/public/logo4.jpeg)

Türkçe kişisel sağlık, fitness ve wellness takip platformu. Firebase tabanlı, PWA destekli ve AI entegreli modern bir React uygulaması.

## 🌟 Temel Özellikler

### 📅 Entegre Sistemler
- **Günlük Rutin Takibi** (Alarmlı hatırlatıcılar)
- **Akıllı Su Takip Sistemi** (Hareketli su animasyonlu)
- **Egzersiz Kütüphanesi** (1000+ hareket, GIF destekli)
- **Kişiselleştirilmiş Sağlık Panosu** (AI öneri sistemi)
- **Takviye Yönetimi** (Vitamin, mineral takibi)
- **Akıllı Takvim** (Renk kodlu etkinlikler)

### 🚀 Teknolojik Alt Yapı
- **Firebase Realtime Database**
- **Qwen AI Entegrasyonu**
- **PWA & Offline Destek**
- **Bildirim Yönetim Sistemi**
- **Çoklu Dil Desteği** (Türkçe/İngilizce)
- **Responsive Tasarım**

## 🛠 Kurulum

### Gereksinimler
- Node.js v18+
- Firebase Projesi
- RapidAPI Hesapları (ExerciseDB, Translation)

```bash
git clone https://github.com/PehlivanMert/my-health-tracker-app.git
cd my-health-tracker-app
npm install
```

### Ortam Değişkenleri
`.env` dosyası oluşturun:
```ini
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx
VITE_XRAPID_API_KEY=xxx
VITE_QWEN_API_URL=xxx
```

### Çalıştırma
```bash
npm run dev
```

## 📚 Sistem Mimarisi

### Ana Bileşenler
1. **Kimlik Yönetimi** 
   - E-posta/Şifre ile Giriş
   - Şifre Sıfırlama
   - E-posta Doğrulama

2. **Sağlık Modülleri**
   ![Diagram](/screenshots/Ekran%20görüntüsü%202025-02-26%20153511.png)

3. **Veri Akış Diyagramı**
 ![sequenceDiagram](/screenshots/Ekran%20görüntüsü%202025-02-26%20153316.png)
   
## 📱 Ekran Görüntüleri

| Özellik | Görsel |
|---------|--------|
| **Giriş Ekranı** | ![Giriş Ekranı](/screenshots/Ekran%20görüntüsü%202025-02-26%20155133.png) |
| **Profil Sayfası** | ![Profil Sayfası](/screenshots/Ekran%20görüntüsü%202025-02-26%20155121.png) |
| **Rutin Takip** | ![Rutin Takip](/screenshots/Ekran%20görüntüsü%202025-02-26%20154057.png) |
| **Su Takibi** | ![Su Takibi](/screenshots/Ekran%20görüntüsü%202025-02-26%20153741.png) |
| **Egzersiz Kütüphanesi** | ![Egzersizler](/screenshots/Ekran%20görüntüsü%202025-02-26%20153835.png) |
| **Api Egzersizler** | ![Api Egzersizler](/screenshots/Ekran%20görüntüsü%202025-02-26%20154247.png) |
| **Sağlık Panosu** | ![Dashboard](/screenshots/Ekran%20görüntüsü%202025-02-26%20153924.png) |
| **Takviye Yönetimi** | ![Takviyeler](/screenshots/Ekran%20görüntüsü%202025-02-26%20154135.png) |
| **Takviye Detayları** | ![Takviye Detayları](/screenshots/Ekran%20görüntüsü%202025-02-26%20154157.png) |
| **Tarifler** | ![Tarifler](/screenshots/Ekran%20görüntüsü%202025-02-26%20154210.png) |
| **Api Tarifler** | ![Api Tarifler](/screenshots/Ekran%20görüntüsü%202025-02-26%20154226.png) |
| **Tam Ekran Akıllı Takvim** | ![Takvim](/screenshots/Ekran%20görüntüsü%202025-02-26%20154400.png) |
| **Takvim Renkleri** | ![Takvim Renkleri](/screenshots/Ekran%20görüntüsü%202025-02-26%20154342.png) |

## 🌍 Canlı Demo

👉 [Site Linki](https://www.stayhealthywith.me)

## 📜 Lisans

MIT Lisansı - Detaylar için [LICENSE](LICENSE) dosyasına bakınız.

---

## 🔔 Bildirim Sistemi Detayları

### Rutin & Takvim Bildirimleri
- **Rutin Bildirimleri:**  
  Belirlenen rutin saatlerde (örn: 07:00, 21:00) otomatik bildirim gönderilir. Global bildirim penceresi bu bildirimleri etkilemez.
- **Takvim Bildirimleri:**  
  Takvim etkinliklerine ait bildirimler, ayarlanan offset değerlerine göre (örneğin 15 dakika, 1 saat öncesi) gönderilir. Bu bildirimler de global bildirim penceresinden bağımsızdır.

### Akıllı Su Bildirimleri
- **Smart Mod:**  
  - Kullanıcı “akıllı” modda ise, sistem önce konum bilgisine dayalı güncel sıcaklık bilgisini alır.  
  - Sıcaklık 30°C ve üzeriyse, sabit olarak 1.5 saat; aksi halde 2 saat eklenir.  
  - Son 7 günün su tüketim verilerinden ortalama tüketim hızı hesaplanarak, kalan su miktarının ne kadar sürede biteceği (tahmini hedef zamanı) daha detaylı belirlenir.  
  - Hedef zamanı geldiğinde (örneğin 1 dakika içinde) bildirim gönderilir ve bu bilgi beyaz renkli metinle kullanıcıya sunulur.
  
- **Custom Mod:**  
  Kullanıcı “özel” modda, kaç saatte bir bildirim almak istediğini belirler. Bu değer mevcut zamana eklenerek bildirim zamanı hesaplanır.

### Takviye Bildirimleri
- **Planlanmış Bildirim Saatleri:**  
  - Kullanıcı, takviyeler için planlanmış bildirim saatlerini (örn: “08:00, 14:00”) belirleyebilmekte.  
  - Belirlenen saatlerde bildirim gönderilir.  
  - Eğer planlanan saat geçmişse ve henüz takviyeden beklenen tüketim gerçekleşmemişse, “Takviyenizi almayı unuttunuz!” şeklinde uyarı tetiklenir.
  
- **Tahmini Kalan Günler & Otomatik Bildirim:**  
  - Her takviyenin kalan miktarı, günlük kullanım miktarına (dailyUsage) bölünerek tahmini kalan gün sayısı hesaplanır.  
  - Eğer bu değer 14, 7, 3 veya 1 gün gibi belirlenen eşiklere ulaşırsa, kullanıcıya “Takviyeniz yakında bitiyor!” bildirimi gönderilir.  
  - Eğer planlanmış zaman alanı boş bırakılmışsa, sistem otomatik olarak takviyenin günlük kullanımına göre kalan süreyi hesaplar ve eğer kalan süre 2 saat veya daha az ise bildirim oluşturur.
  
- **Otomatik Toplu Hatırlatma:**  
  - Global bildirim penceresinin bitimine (örneğin son 15 dakika) girildiğinde, o gün henüz alınması gereken takviyeler varsa, sistem bu takviyeleri tek bir toplu bildirimde listeler.

### Global Bildirim Ayarları
- Kullanıcı, "Global Bildirim Ayarları" modali aracılığıyla sadece belirlediği saat aralığında (örn: 08:00–22:00) su ve takviye bildirimleri almak üzere ayar yapar.
- Bu ayar, rutin ve takvim bildirimlerini etkilemez.

---

## 🌍 Katkıda Bulunma  
Hata raporları ve özellik istekleri için Issues bölümünü kullanın.  

**⭐ Projeyi Beğendiyseniz Yıldız Verin!**
