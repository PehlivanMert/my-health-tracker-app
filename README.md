# Sağlık Takip ve Yönetim Sistemi

Türkçe destekli, kapsamlı sağlık takip ve yaşam yönetim platformu.

## 📌 Ana Modüller

### 1. Günlük Rutin Yönetimi

- **Özellikler:**
  - Drag & Drop ile rutin sıralama
  - Zaman bazlı rutin takibi
  - Tamamlama durumuna göre ilerleme grafiği
  - Tekrar eden rutinler
  - Sesli bildirim entegrasyonu

```javascript
// Örnek Rutin Objesi
{
  id: "routine_123",
  time: "08:30",
  title: "Kahvaltı",
  checked: false,
  repeat: "daily"
}
```

### 2. Egzersiz Takip Modülü

- **Özellikler:**
  - Özel egzersiz programları
  - Set ve tekrar takibi
  - Antrenman geçmişi
  - PDF rapor oluşturma

```jsx
<ExerciseForm onSubmit={handleExerciseSubmit} initialData={editingExercise} />
```

### 3. Takviye Yönetim Sistemi

- **Özellikler:**
  - Takviye zamanlama
  - Dozaj hatırlatıcıları
  - Etkileşim analizi
  - Stok takip sistemi

### 4. Profesyonel Öneriler

- **İçerik:**
  - Beslenme planları
  - Hidrasyon takip çizelgesi
  - Vitamin kullanım kılavuzu
  - Özel tarifler
  - Aktivite önerileri

### 5. Akıllı Takvim

- **Özellikler:**
  - Entegre hatırlatıcı sistemi
  - Doktor randevu yönetimi
  - İlaç takip entegrasyonu
  - Otomatik tekrar ayarları

## 🚀 Kurulum

```bash
# Gerekli Bağımlılıklar
npm install @mui/material @emotion/react @emotion/styled @fullcalendar/react date-fns react-toastify jwt-decode react-beautiful-dnd chart.js
```

## ⚙️ Yapılandırma

`.env` Örneği:

```ini
REACT_APP_API_URL=http://localhost:3000
REACT_APP_JWT_SECRET=your_secret_key
REACT_APP_THEME=default
```

## 📊 Veri Yapısı

```javascript
// Kullanıcı Veri Modeli
{
  username: "kullanici123",
  routines: [...],
  exercises: [...],
  supplements: [...],
  calendarEvents: [...],
  preferences: {
    theme: "health",
    notifications: true
  }
}
```

## 🔧 Teknik Özellikler

| Teknoloji           | Kullanım Amacı                 |
| ------------------- | ------------------------------ |
| React               | Ana UI Framework               |
| Material-UI         | UI Component Kütüphanesi       |
| FullCalendar        | Etkileşimli Takvim Sistemi     |
| react-beautiful-dnd | Sürükle-Bırak Fonksiyonalitesi |
| date-fns            | Tarih Yönetimi                 |
| Chart.js            | İlerleme Grafikleri            |

## 🛠 Geliştirici Rehberi

### Ana Bileşen Yapısı

```
src/
├── components/
│   ├── calendar/          # Takvim modülü
│   ├── daily-routine/     # Rutin yönetimi
│   ├── exercises/         # Egzersiz takip
│   ├── supplements/       # Takviye yönetimi
│   └── pro-tips/          # Sağlık önerileri
```

### Önemli Fonksiyonlar

```javascript
// Rutin Sıralama Mantığı
const onDragEnd = (result) => {
  const items = Array.from(routines);
  const [removed] = items.splice(result.source.index, 1);
  items.splice(result.destination.index, 0, removed);
  setRoutines(items);
};

// Takvim Etkinlik Üretimi
const generateRecurringEvents = (baseEvent) => {
  if (baseEvent.repeat === "weekly") {
    return Array(52)
      .fill()
      .map((_, i) => ({
        ...baseEvent,
        start: addWeeks(baseEvent.start, i),
      }));
  }
  return [baseEvent];
};
```

## 🌐 API Entegrasyonları

```javascript
// Örnek Servis Çağrısı
const fetchHealthData = async (userId) => {
  try {
    const response = await axios.get(`${API_URL}/health-data/${userId}`);
    return response.data;
  } catch (error) {
    toast.error("Veri alınamadı");
    return null;
  }
};
```

## 📱 Responsive Tasarım

```css
/* Mobil Uyumlu Grid Sistemi */
.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
  padding: 1rem;
}
```

## 🚨 Sık Karşılaşılan Sorunlar

| Sorun                    | Çözüm                              |
| ------------------------ | ---------------------------------- |
| LocalStorage veri kaybı  | JSON parse/hatalarını kontrol et   |
| Tarih format uyuşmazlığı | date-fns kullanarak standartlaştır |
| Drag & Drop performans   | react-beautiful-dnd optimizasyonu  |
| Bildirim izinleri        | Kullanıcı onay süreci ekle         |

## 📜 Lisans Bilgisi

MIT Lisansı - Detaylar için [LICENSE](LICENSE) dosyasını inceleyin.

## ✨ Katkıda Bulunma

1. Issue açarak değişiklik öner
2. Fork işlemi yap
3. Özellik branch'i oluştur (`feat/yeni-ozellik`)
4. Değişiklikleri commit et
5. Push işlemi yap
6. Pull Request oluştur
