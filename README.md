 # Sağlık ve Rutin Takip Sistemi 🏋️‍♂️💧

![Proje Logo](/public/logo4.jpeg)

Türkçe dil desteğiyle kişisel sağlık, fitness ve wellness takip platformu. Firebase tabanlı, PWA destekli ve AI entegreli modern bir React uygulaması.

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

**🌍 Katkıda Bulunma**  
Hata raporları ve özellik istekleri için Issues bölümünü kullanın.  
**⭐ Projeyi Beğendiyseniz Yıldız Verin!**
```