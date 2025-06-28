export const initialExercises = [
  {
    id: "e1",
    title: "Diz Rehabilitasyon",
    content: `1. Güçlendirme Hareketleri:
    • Statik Kuadriseps Germe (Duvara yaslanarak) - 30 sn × 3 set
    • Bacak Kaldırma (Yatar pozisyonda düz bacak) - 10 tekrar × 3 set
    • Yan Yatış Bacak Kaldırma (Yan yatarak dış bacağı kaldırma) - 10 tekrar × 3 set
2. Esneme Hareketleri:
    • Hamstring Germe
    • Quadriceps Germe
    • Baldır Germe
3. Mobilite Hareketleri:
    • Diz Açma-Kapama
    • Ayak Bileği Hareketleri`,
  },
  {
    id: "e2",
    title: "Karın Egzersizleri",
    content: `1. Plank: 30 sn × 3 set
2. Yan Plank: 20 sn × 2 set
3. Crunch: 15 tekrar × 3 set
4. Russian Twist: 20 tekrar × 3 set
5. Şınav: 10 tekrar × 3 set`,
  },
  {
    id: "e3",
    title: "Çene ve Boyun Egzersizleri",
    content: `1. Boyun Germe:
   • Başı arkaya at, alt dudağı üste getir
   • 10 saniye tut × 10 tekrar
2. Dil Egzersizi:
   • Dil dışarı, çene uzat
   • 10 saniye tut × 10 tekrar
3. Öpücük Hareketi:
   • Dudakları büz, başı yukarı kaldır
   • 10 saniye tut × 10 tekrar
4. Boyun Masajı:
   • 2-3 dakika dairesel hareketler`,
  },
  {
    id: "e4",
    title: "Günlük Yürüyüş Detayları",
    content: `⏱️ Süre: 60 dakika
📏 Mesafe: ~5-6 km
👣 Hedef: 7.000-10.000 adım
💧 Su (yanınızda bulundurun)
🎯 Pro İpucu: Yürüyüş öncesi hafif stretching yapın`,
  },
];

export const initialSupplements = [
  {
    id: "s1",
    title: "Sabah Takviyeleri",
    content: `💊 Zeolit (2gr) + Su + İyot (08:00)
💊 Probiyotik (Öğünden 30 dk önce) (12:00)`,
  },
  {
    id: "s2",
    title: "Öğle Takviyeleri",
    content: `✨ Multivitamin Men
🐟 Omega 3 x 2
🦴 Multi Kolajen
🌞 D3 Vitamini (2000 IU)
🍵 Mate Çayı
💊 Zeolit (2gr) + Su (14:30)`,
  },
  {
    id: "s3",
    title: "Yürüyüş Öncesi Takviyeler",
    content: `💪 L-karnitin (1000mg)
🍃 Yeşil Çay
💧 200ml Su`,
  },
  {
    id: "s4",
    title: "Yürüyüş Sonrası",
    content: `💊 Zeolit (2gr)
🥤 Zencefil + Limon Suyu`,
  },
  {
    id: "s5",
    title: "Akşam Takviyeleri",
    content: `💊 Probiyotik (Öğünden 30 dk önce)
💇‍♂️ Biotin
💊 Zeolit (2gr)
🌙 Multi Magnesium x 2
🛡️ Immüne Complex`,
  },
];

export const initialRoutines = [
  {
    id: "r1",
    time: "08:00",
    title: "💊 Zeolit (2gr) + Su + İyot",
    checked: false,
  },
  {
    id: "r2",
    time: "08:30",
    title: "🌊 Detoks İçeceği",
    options: [
      "Ilık Su + 🍎 Elma Sirkesi",
      "Zencefil + Limon + Su",
      "Taze Sıkılmış Zencefil Suyu",
    ],
    checked: false,
  },
  {
    id: "r3",
    time: "08:45",
    title: "🧘‍♂️ Dizler için Rehabilitasyon Egzersizleri (20 dk)",
    checked: false,
  },
  {
    id: "r4",
    time: "09:15",
    title: "💪 Karın Egzersizleri (15 dk)",
    checked: false,
  },
  {
    id: "r5",
    time: "09:45",
    title: "☕ Kahve (250ml)",
    checked: false,
  },
  {
    id: "r6",
    time: "10:00",
    title: "🧘‍♂️ Çene ve Boyun Egzersizleri (10 dk)",
    checked: false,
  },
  {
    id: "r7",
    time: "12:00",
    title: "💊 Probiyotik (Öğünden 30 dk önce)",
    checked: false,
  },
  {
    id: "r8",
    time: "14:30",
    title: "💊 Zeolit (2gr) + Su",
    checked: false,
  },
  {
    id: "r9",
    time: "15:30",
    title: "🚶‍♂️ Yürüyüş Hazırlığı",
    checked: false,
  },
  {
    id: "r10",
    time: "16:00",
    title: "🚶‍♂️ Günlük Yürüyüş (60 dk)",
    checked: false,
  },
  {
    id: "r11",
    time: "17:00",
    title: "💊 Zeolit (2gr) + 🥤 Zencefil Limon Suyu",
    checked: false,
  },
  {
    id: "r12",
    time: "19:30",
    title: "💊 Zeolit (2gr)",
    checked: false,
  },
  {
    id: "r13",
    time: "21:00",
    title: "🌙 Multi Magnesium x 2",
    checked: false,
  },
  {
    id: "r14",
    time: "22:00",
    title: "🛡️ Immüne Complex",
    checked: false,
  },
];

export const defaultEvents = [
  {
    id: "default-event-1",
    title: "☀️ Sabah Rutini",
    start: new Date().setHours(8, 0, 0),
    end: new Date().setHours(12, 0, 0),
    allDay: false,
    extendedProps: {
      notify: "on-time",
      repeat: "daily",
    },
  },
  {
    id: "default-event-2",
    title: "🍳 İlk Öğün + Takviyeler",
    start: new Date().setHours(12, 30, 0), // "2025-02-08T12:30:00.000Z"
    end: new Date().setHours(13, 30, 0), // "2025-02-08T13:30:00.000Z"
    allDay: false,
    extendedProps: {
      notify: "on-time",
      repeat: "daily",
    },
  },
  {
    id: "default-event-3",
    title: "🚶‍♂️ Günlük Yürüyüş",
    start: new Date().setHours(16, 0, 0), // "2025-02-08T16:00:00.000Z"
    end: new Date().setHours(17, 0, 0), // "2025-02-08T17:00:00.000Z"
    allDay: false,
    extendedProps: {
      notify: "on-time",
      repeat: "daily",
    },
  },
  {
    id: "default-event-4",
    title: "🍽️ Son Öğün",
    start: new Date().setHours(18, 0, 0), // "2025-02-08T18:00:00.000Z"
    end: new Date().setHours(19, 0, 0), // "2025-02-08T19:00:00.000Z"
    allDay: false,
    extendedProps: {
      notify: "on-time",
      repeat: "daily",
    },
  },
];

// Sosyal medya linkleri
export const socialLinks = [
  {
    id: 1,
    name: "Email",
    url: "mailto:s.mertpehlivan@proton.me",
    icon: "mail"
  }
];
