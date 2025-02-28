export const initialExercises = [
  {
    id: "e2",
    title: "Karın Egzersizleri",
    content: `1. Plank: 30 sn × 3 set
2. Yan Plank: 20 sn × 2 set
3. Crunch: 15 tekrar × 3 set
4. Russian Twist: 20 tekrar × 3 set
5. Şınav: 10 tekrar × 3 set`,
  },
];

export const initialSupplements = [
  {
    id: "s3",
    title: "Yürüyüş Öncesi Takviyeler",
    content: `💪 L-karnitin (1000mg)
🍃 Yeşil Çay
💧 200ml Su`,
  },
];

export const additionalInfo = {
  liquidConsumptionGoals: {
    title: "Sıvı Tüketim Hedefleri",
    items: [
      { name: "Su", value: "2.5-3L" },
      { name: "Kahve", value: "500ml (max)" },
      { name: "Yeşil Çay", value: "2 fincan" },
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
    newSupplements: {
      title: "🆕 Önerilen Yeni Takviyeler",
      items: [
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
      ],
    },
  },
};
export const initialRoutines = [
  {
    id: "r1",
    time: "15:30",
    title: "🚶‍♂️ Yürüyüş Hazırlığı",
    checked: false,
  },
  {
    id: "r2",
    time: "16:00",
    title: "🚶‍♂️ Günlük Yürüyüş (60 dk)",
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
];
