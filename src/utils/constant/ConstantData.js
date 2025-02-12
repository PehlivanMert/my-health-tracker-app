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

// Pro önerileri yükle
export const additionalInfo = {
  liquidConsumptionGoals: {
    title: "Sıvı Tüketim Hedefleri",
    items: [
      { name: "Su", value: "2.5-3L" },
      { name: "Kahve", value: "500ml (max)" },
      { name: "Yeşil Çay", value: "2 fincan" },
      { name: "Mate Çayı", value: "1 fincan" },
      { name: "Zencefilli Su", value: "500ml" },
      { name: "Çay", value: "5 fincan" },
    ],
  },
  dailyActivityGoals: {
    title: "Günlük Aktivite Hedefleri",
    items: [
      { name: "Yürüyüş", value: "60 dk" },
      { name: "Masadan Kalkma", value: "Saatlik 2-3 dk" },
      { name: "Merdiven", value: "5 kat minimum" },
    ],
  },
  recipes: {
    GingerWater: {
      title: "🥤 Zencefil Suyu",
      ingredients: [
        "Taze zencefil (2-3 cm): Rendeleyin",
        "1/2 Limon (dilimlenmiş)",
        "500ml Ilık su",
        "İsteğe bağlı: 1 çay kaşığı bal",
      ],
      preparation: [
        "Rendelenmiş zencefili cam sürahiye ekleyin",
        "Limon dilimlerini üzerine yerleştirin",
        "Ilık suyu ekleyip karıştırın",
        "15-20 dakika demlenmeye bırakın",
        "Süzerek veya direkt olarak tüketin",
      ],
      tips: ["Sabah aç karnına tüketin", "Gün boyu tazeleyerek için"],
    },
    GreenTea: {
      title: "🍵 Yeşil Çay",
      ingredients: [
        "1 çay kaşığı (2-3 gram) yeşil çay",
        "80-90°C su",
        "2-3 dakika demleme",
      ],
      preparation: [
        "Çay demliğini ısıtın",
        "Yeşil çay yapraklarını ekleyin",
        "85°C suyu yaprakların üzerine dökün",
        "2-3 dakika demleyin",
        "Süzerek servis yapın",
      ],
      notes: [
        "Fazla demleme acılaştırır",
        "İdeal miktar: 200-250 ml",
        "Günde maksimum 2 fincan",
      ],
    },
    MateTea: {
      title: "🧉 Mate Çayı",
      ingredients: [
        "1-2 çay kaşığı mate çayı",
        "250-300 ml sıcak su (85-90°C)",
        "İsteğe bağlı: Bal/limon",
      ],
      preparation: [
        "Mate çayını özel kabına (kalabasaya) koyun",
        "Suyu kaynattıktan sonra 1 dakika bekletin",
        "Yaprakların üzerine yavaşça dökün",
        "3-5 dakika demlenmeye bırakın",
        "İsteğe bağlı bal/limon ekleyerek için",
      ],
      tips: [
        "Geleneksel olarak metal kamışla içilir",
        "Yapraklar 3-4 kez demlenebilir",
      ],
    },
    DetoxDrink: {
      title: "🌟 Detoks İçeceği",
      ingredients: [
        "1 limon (dilimlenmiş)",
        "1 yemek kaşığı taze rendelenmiş zencefil",
        "1 çay kaşığı elma sirkesi",
        "500 ml ılık su",
      ],
      preparation: [
        "Tüm malzemeleri cam sürahiye ekleyin",
        "İsteğe bağlı: 1 çay kaşığı bal",
        "15 dakika bekletin",
        "Sabah aç karnına için",
        "Gün boyu tazeleyerek tüketin",
      ],
      benefits: [
        "Metabolizmayı hızlandırır",
        "Toksin atılımını destekler",
        "Enerji verir",
      ],
    },
  },
  supplementDetails: {
    multivitamin: {
      title: "1️⃣ Nature's Supreme Multivitamin Men",
      groups: [
        {
          heading: "Vitamin İçeriği",
          items: [
            {
              name: "A Vitamini",
              amount: "300 mcg",
              dailyValue: "38%",
            },
            {
              name: "B1 Vitamini (Tiamin)",
              amount: "1.7 mg",
              dailyValue: "150%",
            },
            {
              name: "B12 Vitamini",
              amount: "25 mcg",
              dailyValue: "1000%",
            },
            {
              name: "B2 Vitamini (Riboflavin)",
              amount: "1.9 mg",
              dailyValue: "134%",
            },
            {
              name: "B3 Vitamini (Niasinamid)",
              amount: "16.0 mg",
              dailyValue: "100%",
            },
            {
              name: "B5 Vitamini",
              amount: "10.0 mg",
              dailyValue: "167%",
            },
            {
              name: "B6 Vitamini",
              amount: "3.3 mg",
              dailyValue: "236%",
            },
            {
              name: "B8 Vitamini (İnositol)",
              amount: "2.5 mg",
              dailyValue: "**",
            },
            {
              name: "Biotin (B7 Vitamini)",
              amount: "150 mcg",
              dailyValue: "300%",
            },
            {
              name: "C Vitamini (Askorbik Asit)",
              amount: "80 mg",
              dailyValue: "100%",
            },
            {
              name: "D3 Vitamini",
              amount: "10.0 mcg",
              dailyValue: "200%",
            },
            {
              name: "E Vitamini",
              amount: "9.2 mg",
              dailyValue: "77%",
            },
            {
              name: "Folik Asit (B9 Vitamini)",
              amount: "400 mcg",
              dailyValue: "200%",
            },
            {
              name: "K Vitamini",
              amount: "80.0 mcg",
              dailyValue: "107%",
            },
          ],
        },
        {
          heading: "Mineral İçeriği",
          items: [
            { name: "Bakır", amount: "2.0 mg", dailyValue: "200%" },
            { name: "Çinko", amount: "10.0 mg", dailyValue: "100%" },
            { name: "İyot", amount: "150 mcg", dailyValue: "100%" },
            { name: "Krom", amount: "200 mcg", dailyValue: "500%" },
            {
              name: "Manganez",
              amount: "2.0 mg",
              dailyValue: "100%",
            },
            {
              name: "Magnezyum",
              amount: "60.0 mg",
              dailyValue: "16%",
            },
            {
              name: "Molibden",
              amount: "75 mcg",
              dailyValue: "150%",
            },
            {
              name: "Selenyum",
              amount: "100 mcg",
              dailyValue: "182%",
            },
            { name: "Vanadyum", amount: "10 mcg", dailyValue: "**" },
            { name: "Demir", amount: "8.0 mg", dailyValue: "57%" },
            { name: "Kalsiyum", amount: "120 mg", dailyValue: "15%" },
          ],
        },
        {
          heading: "Amino Asit İçeriği",
          items: [
            { name: "Arjinin", amount: "15 mg", dailyValue: "**" },
            { name: "Taurin", amount: "13 mg", dailyValue: "**" },
            { name: "Metiyonin", amount: "13 mg", dailyValue: "**" },
            { name: "Glutamin", amount: "13 mg", dailyValue: "**" },
          ],
        },
        {
          heading: "İlave Bileşenler",
          items: [
            {
              name: "Zerdeçal Ekstresi",
              amount: "35 mg",
              dailyValue: "**",
            },
            { name: "Koenzim Q10", amount: "5 mg", dailyValue: "**" },
            { name: "Ginseng", amount: "40.0 mg", dailyValue: "**" },
            {
              name: "L-Karnitin",
              amount: "13.0 mg",
              dailyValue: "**",
            },
            { name: "Kolin", amount: "2.5 mg", dailyValue: "**" },
            { name: "Lutein", amount: "1.0 mg", dailyValue: "**" },
            { name: "Likopen", amount: "0.6 mg", dailyValue: "**" },
            {
              name: "Zeaksantin",
              amount: "0.20 mg",
              dailyValue: "**",
            },
          ],
        },
      ],
    },
    omega3: {
      title: "2️⃣ Nature's Supreme Omega 3",
      items: [
        { name: "Balık Yağı", amount: "1000 mg", dailyValue: "**" },
        { name: "Omega 3", amount: "620 mg", dailyValue: "**" },
        { name: "EPA", amount: "360 mg", dailyValue: "**" },
        { name: "DHA", amount: "260 mg", dailyValue: "**" },
      ],
    },
    magnesium: {
      title: "3️⃣ Nature's Supreme Multi Magnesium",
      items: [
        {
          name: "Toplam Magnezyum",
          amount: "200 mg",
          dailyValue: "53%",
        },
        {
          name: "Magnezyum Sitrat",
          amount: "100 mg",
          dailyValue: "**",
        },
        {
          name: "Magnezyum Malat",
          amount: "50 mg",
          dailyValue: "**",
        },
        {
          name: "Magnezyum Bisglisinat",
          amount: "50 mg",
          dailyValue: "**",
        },
      ],
    },
    biotin: {
      title: "4️⃣ Nature's Supreme Biotin",
      items: [{ name: "Biotin", amount: "5000 mcg", dailyValue: "5000%" }],
    },
    probiotic: {
      title: "5️⃣ Nature's Supreme Probiyotik 5B",
      items: [
        {
          name: "Toplam Probiyotik Mikroorganizma",
          amount: "10.0 Milyar KOB",
          dailyValue: "**",
        },
        {
          name: "Lactobacillus Acidophilus",
          amount: "2.0 Milyar KOB",
          dailyValue: "**",
        },
        {
          name: "Bifidobacterium Longum",
          amount: "2.0 Milyar KOB",
          dailyValue: "**",
        },
        {
          name: "Bifidobacterium Bifidum",
          amount: "1.0 Milyar KOB",
          dailyValue: "**",
        },
        {
          name: "Lactobacillus Plantarum",
          amount: "1.0 Milyar KOB",
          dailyValue: "**",
        },
        {
          name: "Lactobacillus Rhamnosus",
          amount: "1.0 Milyar KOB",
          dailyValue: "**",
        },
        {
          name: "Lactobacillus Bulgaricus",
          amount: "0.5 Milyar KOB",
          dailyValue: "**",
        },
        {
          name: "Lactobacillus Paracasei",
          amount: "0.5 Milyar KOB",
          dailyValue: "**",
        },
        {
          name: "Lactobacillus Breve",
          amount: "0.5 Milyar KOB",
          dailyValue: "**",
        },
        {
          name: "Lactobacillus Reuteri",
          amount: "0.5 Milyar KOB",
          dailyValue: "**",
        },
        {
          name: "Streptococcus Thermophilus",
          amount: "0.5 Milyar KOB",
          dailyValue: "**",
        },
        {
          name: "Bifidobacterium Infantis",
          amount: "0.5 Milyar KOB",
          dailyValue: "**",
        },
        { name: "İnülin", amount: "1200 mg", dailyValue: "**" },
      ],
    },
    immune: {
      title: "6️⃣ Nature's Supreme Immüne Complex",
      items: [
        {
          name: "Beta Glukan (1,3 & 1,6)",
          amount: "100 mg",
          dailyValue: "**",
        },
        {
          name: "C Vitamini (Askorbik Asit)",
          amount: "150 mg",
          dailyValue: "188%",
        },
        {
          name: "D3 Vitamini",
          amount: "25.0 mcg",
          dailyValue: "500%",
        },
        { name: "Çinko", amount: "7.5 mg", dailyValue: "75%" },
        {
          name: "Kara Mürver Ekstresi (Sambucus Nigra)",
          amount: "100 mg",
          dailyValue: "**",
        },
        { name: "Selenyum", amount: "60 mcg", dailyValue: "109%" },
        { name: "Bakır", amount: "0.8 mg", dailyValue: "80%" },
      ],
    },
    collagen: {
      title: "7️⃣ Nature's Supreme Multi Kolajen",
      groups: [
        {
          heading: "Besin Değerleri",
          items: [
            { name: "Enerji", amount: "36 kcal", dailyValue: "2%" },
            { name: "Yağ", amount: "0.0 g", dailyValue: "0%" },
            { name: "Doymuş Yağ", amount: "0.0 g", dailyValue: "0%" },
            {
              name: "Karbonhidrat",
              amount: "0.0 g",
              dailyValue: "0%",
            },
            { name: "Şeker", amount: "0.0 g", dailyValue: "0%" },
            { name: "Protein", amount: "9.1 g", dailyValue: "18%" },
          ],
        },
        {
          heading: "Kolajen ve İlgili Bileşenler",
          items: [
            {
              name: "Hidrolize Kolajen",
              amount: "10,000 mg",
              dailyValue: "**",
            },
            {
              name: "Tip 1 Kolajen",
              amount: "7,500 mg",
              dailyValue: "**",
            },
            {
              name: "Tip 2 Kolajen",
              amount: "100 mg",
              dailyValue: "**",
            },
            {
              name: "Tip 3 Kolajen",
              amount: "2,400 mg",
              dailyValue: "**",
            },
            {
              name: "Hyaluronik Asit",
              amount: "100 mg",
              dailyValue: "**",
            },
            {
              name: "C Vitamini",
              amount: "80 mg",
              dailyValue: "100%",
            },
          ],
        },
      ],
    },
    newSupplements: {
      title: "🆕 Önerilen Yeni Takviyeler",
      items: [
        {
          name: "L-Karnitin",
          details: [
            { label: "Günlük Doz", value: "2000-3000 mg" },
            { label: "Bölünmüş Doz", value: "1000 mg × 2-3" },
          ],
        },
        {
          name: "Yeşil Çay Ekstresi",
          details: [
            { label: "EGCG", value: "400-500 mg" },
            { label: "Kafein", value: "50-100 mg" },
          ],
        },
      ],
    },
    importantNotes: {
      title: "⚠️ Önemli Notlar",
      items: [
        "Toplam Günlük D Vitamini: 35 mcg (Multivitamin + Immüne Complex)",
        "Toplam Günlük C Vitamini: 310 mg (Multivitamin + Immüne Complex + Kolajen)",
        "Toplam Günlük Çinko: 17.5 mg (Multivitamin + Immüne Complex)",
        "Toplam Günlük Selenyum: 160 mcg (Multivitamin + Immüne Complex)",
      ],
    },
  },
};
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
