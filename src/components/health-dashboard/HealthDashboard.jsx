import React, { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { db } from "../auth/firebaseConfig";
import { toast } from "react-toastify";
import {
  Box,
  CircularProgress,
  Grid,
  Typography,
  Card,
  CardContent,
  Avatar,
  useTheme,
  Button,
  useMediaQuery,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  FitnessCenter,
  Refresh,
  LocalHospital,
  Cake,
  Height,
  Scale,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import { keyframes } from "@emotion/react";
import { GoogleGenerativeAI } from "@google/generative-ai";

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
  100% { transform: translateY(0px); }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
`;

// Gemini AI konfigürasyonu
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "GEMINI_API_KEY");

const API_URL = "/api/qwen-proxy"; /* "http://localhost:3001/api/qwen-proxy"; */
const HealthDashboard = ({ user }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [healthData, setHealthData] = useState({
    recommendations: "",
    bmi: null,
    yesterdayWaterIntake: null, // yeni alan
    supplementConsumptionStats: null, // yeni alan
    recommendationsHistory: [],
  });
  const [profileData, setProfileData] = useState({
    firstName: "",
    birthDate: null,
    height: "",
    weight: "",
  });
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiCooldown, setApiCooldown] = useState(false);
  const [geminiUsage, setGeminiUsage] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  // Geçmişte kaydedilen öneriden seçim yapıldığında ana içerikte göster
  const handleSelectRecommendation = (rec) => {
    setRecommendations(rec.content);
    setShowHistory(false); // Seçim yapıldığında dropdown'ı kapat
  };

  useEffect(() => {
    const fetchGeminiUsage = async () => {
      const usageDocRef = doc(db, "users", user.uid, "apiUsage", "healthDashboard");
      const docSnap = await getDoc(usageDocRef);
      if (docSnap.exists()) {
        setGeminiUsage(docSnap.data());
      } else {
        // Eğer doküman yoksa oluştur
        const todayStr = new Date().toISOString().slice(0, 10);
        const initialUsage = { date: todayStr, count: 0 };
        await setDoc(usageDocRef, initialUsage);
        setGeminiUsage(initialUsage);
      }
    };

    if (user) {
      fetchGeminiUsage();
    }
  }, [user]);

  // Gemini kullanım sınırını kontrol eden fonksiyon: Eğer kullanım sayısı 2'ye ulaşmışsa false döner.
  const canUseGemini = () => {
    if (!geminiUsage) return true; // Veriler henüz yüklenmediyse true döndür (buton aktif olsun)
    const todayStr = new Date().toISOString().slice(0, 10);
    if (geminiUsage.date !== todayStr) return true; // Yeni gün, sayaç sıfırlanır
    return geminiUsage.count < 2;
  };

  // Gemini API kullanımı sonrası sayacı bir artıran fonksiyon
  const incrementGeminiUsage = async () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const usageDocRef = doc(db, "users", user.uid, "apiUsage", "healthDashboard");
    let updatedUsage = { ...geminiUsage };
    if (geminiUsage.date !== todayStr) {
      updatedUsage = { date: todayStr, count: 1 };
    } else {
      updatedUsage.count += 1;
    }
    await updateDoc(usageDocRef, updatedUsage);
    setGeminiUsage(updatedUsage);
  };

  // Firebase'den kullanıcı verilerini çekiyoruz.
  const fetchAllData = async () => {
    try {
      const userRef = doc(db, "users", user.uid);

      // Tüm verileri tek seferde çekmek için Promise.all kullanalım
      const [userSnap, waterSnap, supplementsSnap, supplementStatsSnap] =
        await Promise.all([
          getDoc(userRef),
          getDoc(doc(db, "users", user.uid, "water", "current")),
          getDocs(collection(db, "users", user.uid, "supplements")),
          getDoc(doc(db, "users", user.uid, "stats", "supplementConsumption")),
        ]);

      // Su verilerini işleme
      const waterData = waterSnap.exists() ? waterSnap.data() : {};

      // Supplement istatistiklerini işleme
      const supplementStats = supplementStatsSnap.exists()
        ? supplementStatsSnap.data()
        : {};

      // Supplement listesini işleme
      const supplements = supplementsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Tüm verileri state'e kaydetme
      if (userSnap.exists()) {
        const data = userSnap.data();
        setProfileData({
          ...data.profile,
          birthDate: data.profile?.birthDate
            ? typeof data.profile.birthDate === "number"
              ? new Date(data.profile.birthDate * 1000)
              : new Date(data.profile.birthDate)
            : null,
        });

        // Öneri geçmişini tarih sırasına göre sırala (en son en üstte olacak)
        let recommendationHistory =
          data.healthData?.recommendationsHistory || [];

        // Tarih bilgisine göre sıralama yapmadan önce tarihleri karşılaştırılabilir format kontrolü
        const sortedHistory = [...recommendationHistory].sort((a, b) => {
          // Eğer tarih formatı ISO string ise doğrudan karşılaştır
          if (a.date.includes("T") && b.date.includes("T")) {
            return new Date(b.date) - new Date(a.date);
          }

          // Tarih formatı düz string ise, yeni Date nesnesi oluştur
          // Türkçe tarih formatını parse et (örn: "25 Şubat 2025 Salı")
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

        setHealthData((prev) => ({
          ...prev,
          ...data.healthData,
          supplements,
          waterData: {
            currentIntake: waterData.waterIntake || 0,
            target: waterData.dailyWaterTarget || 2000,
            history: waterData.history || [],
            yesterday: waterData.yesterdayWaterIntake || 0,
          },
          supplementStats,
          recommendationsHistory: sortedHistory,
        }));

        setRecommendations(data.healthData?.recommendations || null);
      }
    } catch (error) {
      toast.error("Veri yükleme hatası: " + error.message);
    }
  };

  const calculateBMI = () => {
    if (!profileData.height || !profileData.weight) return null;
    const heightInMeters = profileData.height / 100;
    const bmi = profileData.weight / (heightInMeters * heightInMeters);

    let status = "";
    if (bmi < 18.5) status = "Zayıf";
    else if (bmi < 24.9) status = "Normal";
    else if (bmi < 29.9) status = "Fazla Kilolu";
    else status = "Obez";

    return { value: bmi.toFixed(2), status };
  };

  // Öneri oluştururken, profil bilgileriyle birlikte yeni istatistikleri de API'ye gönderiyoruz.
  const generateRecommendations = async () => {
    if (apiCooldown) return;

    // Gemini kullanım sınırını kontrol et (günde 2 kez)
    if (!canUseGemini()) {
      toast.error("Gemini günde sadece iki kez kullanılabilir.");
      return;
    }

    setLoading(true);
    try {
      const age = profileData.age;
      const bmi = calculateBMI();

      // Güncel tarih ve saat bilgisini 'Tarih ve Saat' olarak alıyoruz
      const currentDateTime = new Date().toLocaleString("tr-TR", {
        dateStyle: "full",
        timeStyle: "short",
      });

      const prompt = `Kullanıcı bilgileri:
İsim: ${profileData.firstName || "Belirtilmemiş"},
Yaş: ${age || "Belirtilmemiş"},
Cinsiyet: ${profileData.gender || "Belirtilmemiş"},
Boy: ${profileData.height || "Belirtilmemiş"} cm,
Kilo: ${profileData.weight || "Belirtilmemiş"} kg,
${bmi ? `VKİ: ${bmi.value} (${bmi.status})` : ""}

Su Tüketimi:
- Dün içilen: ${healthData.waterData?.yesterday || 0} ml
- Hedef: ${healthData.waterData?.target || 2000} ml
- Bugünkü içilen: ${healthData.waterData?.currentIntake || 0} ml

Takviyeler:Kalan/Toplam Miktar:
${
  healthData.supplements
    ?.map((s) => `- ${s.name} (${s.quantity}/${s.initialQuantity})`)
    .join("\n") || "Kayıtlı takviye yok"
}

Son 7 Gün Takviye Kullanımı:
${JSON.stringify(healthData.supplementStats, null, 2) || "Veri yok"}

Tarih ve Saat: ${currentDateTime}

🌟 *Kişiselleştirilmiş Sağlık Rehberi* 🌟

Aşağıdaki JSON formatında kesinlikle 3000 karakteri geçmeyen bir sağlık rehberi hazırla:

{
  "title": "🏥 KİŞİSELLEŞTİRİLMİŞ SAĞLIK REHBERİ",
  "summary": "Kullanıcının mevcut durumuna göre hazırlanmış kapsamlı sağlık önerileri",
  "sections": {
    "waterIntake": {
      "title": "💧 Su Tüketimi Analizi",
      "content": "Hidrasyon durumu ve yaratıcı su içme taktikleri (300-400 karakter)",
      "icon": "🧊",
      "tips": ["İpucu 1", "İpucu 2", "İpucu 3"]
    },
    "supplements": {
      "title": "💊 Takviye Kullanım Rehberi",
      "content": "Kullanım trendleri ve uzman görüşü (300-400 karakter)",
      "icon": "💡",
      "recommendations": ["Öneri 1", "Öneri 2"]
    },
    "bmiAnalysis": {
      "title": "📊 VKİ Bilimsel Analizi",
      "content": "Mevcut değerin detaylı analizi ve öneriler (300-400 karakter)",
      "icon": "📈",
      "status": "Mevcut durum",
      "advice": "Uzman tavsiyesi"
    },
    "exercisePlan": {
      "title": "🏋️♀️ Kişiye Özel Hareket Planı",
      "content": "3 aşamalı egzersiz programı (300-400 karakter)",
      "icon": "💪",
      "phases": [
        {
          "phase": "Başlangıç (1-2 hafta)",
          "exercises": ["Egzersiz 1", "Egzersiz 2"]
        },
        {
          "phase": "Gelişim (3-4 hafta)",
          "exercises": ["Egzersiz 1", "Egzersiz 2"]
        },
        {
          "phase": "İleri (5-6 hafta)",
          "exercises": ["Egzersiz 1", "Egzersiz 2"]
        }
      ]
    },
    "nutrition": {
      "title": "🥗 Beslenme Önerileri",
      "content": "Eğlenceli besin kombinasyonları (300-400 karakter)",
      "icon": "🍎",
      "meals": {
        "breakfast": "Kahvaltı önerisi",
        "lunch": "Öğle yemeği önerisi",
        "dinner": "Akşam yemeği önerisi",
        "snacks": "Ara öğün önerileri"
      }
    },
    "recipe": {
      "title": "👨‍🍳 Şefin Önerisi",
      "content": "Sağlıklı bir tarif (300-400 karakter)",
      "icon": "🍽️",
      "recipeName": "Tarif adı",
      "ingredients": ["Malzeme 1", "Malzeme 2", "Malzeme 3"],
      "instructions": "Hazırlanış adımları"
    },
    "motivation": {
      "title": "🌟 Günün Motivasyonu",
      "content": "Bilimsel ilham sözü ve kişisel hedef (300-400 karakter)",
      "icon": "✨",
      "quote": "İlham verici söz",
      "dailyGoal": "Günlük hedef"
    }
  },
  "priority": "En önemli 3 öneri",
  "nextSteps": "Yarın için plan"
}

🔍 *ÖNEMLİ KURALLAR:*
1. SADECE JSON formatında cevap ver, başka hiçbir metin ekleme
2. Her bölümü kullanıcının mevcut durumuna göre kişiselleştir
3. Bilimsel terimleri günlük dile çevir
4. Pozitif ve teşvik edici dil kullan
5. Kullanıcının yaş, cinsiyet, VKİ ve su/takviye verilerini dikkate al
6. Gerçekçi ve uygulanabilir öneriler ver
7. JSON formatını bozma, geçerli JSON olsun`;

      // Gemini AI kullanarak öneri oluştur
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const recommendationText = response.text();

      if (recommendationText) {
        const newRecommendation = {
          date: new Date().toISOString(), // ISO string formatında kaydet
          content: recommendationText,
          displayDate: currentDateTime, // Görüntüleme için ayrı bir alan
        };

        // Güncellenmiş öneri geçmişini oluştur
        const updatedHistory = [
          newRecommendation,
          ...(healthData.recommendationsHistory || []),
        ];

        await updateDoc(doc(db, "users", user.uid), {
          "healthData.recommendations": recommendationText,
          "healthData.lastUpdated": new Date().toISOString(),
          "healthData.recommendationsHistory": updatedHistory,
        });

        setRecommendations(recommendationText);
        setHealthData((prev) => ({
          ...prev,
          recommendationsHistory: updatedHistory,
        }));

        // İşlem başarılıysa Gemini kullanım sayacını artır
        incrementGeminiUsage();

        setApiCooldown(true);
        setTimeout(() => setApiCooldown(false), 60000);
      }
    } catch (error) {
      console.error("Gemini API Hatası:", error);
      console.error("Hata Detayları:", error.response || error.message);
      
      if (error.message?.includes("400")) {
        toast.error("API anahtarı geçersiz veya model bulunamadı. Lütfen ayarları kontrol edin.");
      } else if (error.message?.includes("403")) {
        toast.error("API erişim izni yok. Lütfen API anahtarınızı kontrol edin.");
      } else if (error.message?.includes("429")) {
        toast.error("API kullanım limiti aşıldı. Lütfen daha sonra tekrar deneyin.");
      } else {
        toast.error("Öneri oluşturulamadı: " + error.message);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  // Öneri metnini JSON formatında parse ediyoruz.
  const parseRecommendations = () => {
    if (!recommendations) return { parsedData: null, fallbackData: null };

    try {
      // JSON'u temizle ve parse et
      let cleanText = recommendations.trim();
      
      // Eğer JSON başlangıcı ve bitişi varsa, sadece o kısmı al
      const jsonStart = cleanText.indexOf('{');
      const jsonEnd = cleanText.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1) {
        cleanText = cleanText.substring(jsonStart, jsonEnd + 1);
      }
      
      // JSON'u parse et
      const parsedData = JSON.parse(cleanText);
      
      // Gerekli alanları kontrol et ve varsayılan değerler ata
      const validatedData = {
        title: parsedData.title || '🏥 KİŞİSELLEŞTİRİLMİŞ SAĞLIK REHBERİ',
        summary: parsedData.summary || 'Kişiselleştirilmiş sağlık önerileri',
        sections: parsedData.sections || {},
        priority: parsedData.priority || 'Önemli öneriler',
        nextSteps: parsedData.nextSteps || 'Yarın için plan'
      };
      
      return { parsedData: validatedData, fallbackData: null };
      
    } catch (error) {
      // Fallback: Eski parse yöntemini dene
      return { parsedData: null, fallbackData: parseRecommendationsFallback() };
    }
  };

  // Eski parse yöntemi (fallback için)
  const parseRecommendationsFallback = () => {
    if (!recommendations) return { preamble: null, sections: [] };

    const lines = recommendations.split("\n");
    let preamble = null;
    let sections = [];
    let currentSection = null;

    // İlk satır bir header değilse preamble olarak alıyoruz.
    if (lines.length > 0 && !lines[0].match(/^\d+\.\s/)) {
      preamble = lines[0].trim();
    }

    // Eğer preamble varsa, döngüye ikinci satırdan başlıyoruz.
    const startIndex = preamble ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === "") continue;

      // Eğer satır, "numara nokta boşluk" formatında başlıyorsa:
      if (line.match(/^\d+\.\s/)) {
        // Eğer hemen önceki satır "Hazırlanışı:" ile bitiyorsa, bu satırı alt madde olarak kabul et.
        if (i > 0 && lines[i - 1].trim().endsWith("Hazırlanışı:")) {
          if (currentSection) {
            currentSection.content += "\n" + line;
          } else {
            preamble = (preamble ? preamble + "\n" : "") + line;
          }
        } else {
          // Yeni bölüm başlığı olduğunu varsayalım.
          if (currentSection) {
            sections.push(currentSection);
          }
          const match = line.match(/^(\d+)\.\s*(.+)$/);
          const number = match ? match[1] : null;
          const heading = match ? match[2] : line;
          currentSection = { number, heading, content: "" };
        }
      } else {
        // Satır, header formatında değilse, mevcut bölümün içeriğine ekle.
        if (currentSection) {
          currentSection.content += (currentSection.content ? "\n" : "") + line;
        } else {
          preamble = (preamble ? preamble + "\n" : "") + line;
        }
      }
    }
    if (currentSection) {
      sections.push(currentSection);
    }
    return { preamble, sections };
  };

  const parsed = parseRecommendations();

  const MetricCard = ({ icon, title, value, unit, color }) => (
    <Card
      sx={{
        background:
          theme.palette.mode === "dark"
            ? `linear-gradient(45deg, ${color}20 30%, ${color}10 90%)`
            : `linear-gradient(45deg, ${color}10 30%, ${color}05 90%)`,
        border: `1px solid ${color}30`,
        borderRadius: "16px",
        p: 2,
        height: "100%",
        transition: "transform 0.3s ease",
        "&:hover": { transform: "translateY(-4px)" },
      }}
    >
      <Box display="flex" alignItems="center" gap={2}>
        <Avatar
          sx={{
            bgcolor: `${color}20`,
            color: color,
            borderRadius: "12px",
            width: 44,
            height: 44,
          }}
        >
          {icon}
        </Avatar>
        <Box>
          <Typography variant="body2" color="textSecondary">
            {title}
          </Typography>
          <Box display="flex" alignItems="baseline" gap={1}>
            <Typography variant="h6" fontWeight={600}>
              {value || "-"}
            </Typography>
            {unit && (
              <Typography variant="body2" color="textSecondary">
                {unit}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    </Card>
  );

  return (
    <Box
      sx={{
        background: "linear-gradient(135deg, #dbe9ff 0%, #f0f5ff 100%)",
        minHeight: "100vh",
        p: isMobile ? 2 : 4,
      }}
    >
      <Box sx={{ maxWidth: 1440, margin: "0 auto" }}>
        {/* Header */}
        <Box
          sx={{
            background:
              "linear-gradient(135deg, #1a2a6c 0%, #2196F3 50%, #3F51B5 100%)",
            borderRadius: 4,
            p: 4,
            mb: 4,
            boxShadow: 3,
          }}
        >
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box>
              <Typography
                variant="h2"
                sx={{
                  textAlign: "center",
                  color: "#fff",
                  fontWeight: 800,
                  mb: { xs: 3, sm: 6 },
                  mr: { xs: 7, sm: 0 },
                  textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
                  animation: `${fadeIn} 1s ease, ${float} 6s ease-in-out infinite`,
                  fontSize: { xs: "1rem", sm: "3rem", md: "4rem" },
                }}
              >
                <LocalHospital
                  sx={{
                    fontSize: { xs: 30, sm: 50 },
                    verticalAlign: "middle",
                    mr: 2,
                  }}
                />
                Sağlık Panosu
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: "#fff",
                  textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
                  animation: `${float} 6s ease-in-out infinite`,
                  fontSize: { xs: "0.9rem", sm: "1rem" },
                }}
              >
                {new Date().toLocaleDateString("tr-TR", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={generateRecommendations}
              disabled={loading || apiCooldown || !canUseGemini()}
              sx={{
                borderRadius: "12px",
                py: 1.5,
                px: 4,
                fontWeight: 600,
                textTransform: "none",
                background: "rgba(255,255,255,0.2)",
                backdropFilter: "blur(10px)",
                "&:hover": { background: "rgba(255,255,255,0.3)" },
              }}
            >
              {loading ? "Öneri Oluşturuluyor..." : 
               !canUseGemini() ? "Günlük Limit Doldu" : 
               "Günlük Kişisel Önerini Oluştur"}
            </Button>
          </Box>
        </Box>
        {/* Metrikler */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[
            {
              icon: <Cake sx={{ fontSize: 24 }} />,
              title: "Yaş",
              value: profileData.age,
              color: theme.palette.secondary.main,
            },
            {
              icon: <Height sx={{ fontSize: 24 }} />,
              title: "Boy",
              value: profileData.height,
              unit: "cm",
              color: theme.palette.info.main,
            },
            {
              icon: <Scale sx={{ fontSize: 24 }} />,
              title: "Kilo",
              value: profileData.weight,
              unit: "kg",
              color: theme.palette.warning.main,
            },
            {
              icon: <FitnessCenter sx={{ fontSize: 24 }} />,
              title: "VKİ",
              value: calculateBMI()?.value,
              unit: calculateBMI()?.status,
              color: theme.palette.success.main,
            },
          ].map((metric, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <MetricCard {...metric} />
            </Grid>
          ))}
        </Grid>
        {/* Kişiselleştirilmiş Öneriler Header with Accordion for History */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
          position="relative"
        >
          <Typography
            variant="h4"
            fontWeight={700}
            sx={{
              fontFamily: '"Montserrat", sans-serif',
              letterSpacing: "0.5px",
              color: "#1a2a6c",
              fontSize: { xs: "1.5rem" },
            }}
          >
            Kişiselleştirilmiş Öneriler
          </Typography>

          {/* Geçmiş Öneriler Panel */}
          <Box sx={{ position: "relative", display: "inline-block" }}>
            <Button
              variant="outlined"
              endIcon={<ExpandMoreIcon />}
              onClick={(e) => setShowHistory(!showHistory)}
              sx={{
                borderRadius: "12px",
                py: 1,
                px: 3,
                fontWeight: 600,
                color: "#1a2a6c",
                borderColor: "#1a2a6c",
                "&:hover": { borderColor: "#2196F3" },
              }}
            >
              Geçmiş Öneriler
            </Button>
            {showHistory && (
              <Box
                sx={{
                  position: "absolute",
                  right: 0,
                  top: "100%",
                  mt: 1,
                  width: 300,
                  maxHeight: 400,
                  bgcolor: "background.paper",
                  borderRadius: "12px",
                  boxShadow: 3,
                  zIndex: 999,
                  overflow: "hidden",
                  border: "1px solid #e0e0e0",
                }}
              >
                <Box
                  sx={{
                    maxHeight: 380,
                    overflowY: "auto",
                    p: 2,
                    "&::-webkit-scrollbar": { width: "6px" },
                    "&::-webkit-scrollbar-thumb": {
                      backgroundColor: "#1a2a6c",
                      borderRadius: "3px",
                    },
                  }}
                >
                  {healthData.recommendationsHistory?.length > 0 ? (
                    healthData.recommendationsHistory.map((rec, index) => (
                      <Box
                        key={index}
                        sx={{
                          cursor: "pointer",
                          p: 1.5,
                          mb: 1,
                          borderRadius: "8px",
                          transition: "all 0.2s ease",
                          "&:hover": {
                            backgroundColor: "#f5f5f5",
                            transform: "translateX(4px)",
                          },
                        }}
                        onClick={() => handleSelectRecommendation(rec)}
                      >
                        <Typography variant="body2" fontWeight={500}>
                          {rec.displayDate || rec.date}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="textSecondary"
                          sx={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {rec.content}
                        </Typography>
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      Önceki öneri bulunamadı.
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
          </Box>
        </Box>
        {/* Kişiselleştirilmiş Öneriler Content */}
        {/* JSON Format Render */}
        {parsed.parsedData ? (
          <Box>
            {/* Başlık ve Özet */}
            <Card
              sx={{
                width: "100%",
                mb: 4,
                background:
                  "linear-gradient(135deg, #1a2a6c 0%, #2196F3 50%, #3F51B5 100%)",
                borderRadius: "16px",
                boxShadow: 3,
              }}
            >
              <CardContent sx={{ color: "white", py: 4 }}>
                <Typography
                  variant="h4"
                  sx={{
                    textAlign: "center",
                    fontWeight: 700,
                    mb: 2,
                    fontSize: { xs: "1.5rem", md: "2rem" },
                  }}
                >
                  {parsed.parsedData.title}
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    textAlign: "center",
                    fontSize: "1.1rem",
                    lineHeight: 1.8,
                    opacity: 0.9,
                  }}
                >
                  {parsed.parsedData.summary}
                </Typography>
              </CardContent>
            </Card>

            {/* Bölümler */}
            <Grid container spacing={4}>
              {Object.entries(parsed.parsedData.sections).map(([key, section], index) => (
                <Grid item xs={12} md={6} lg={4} key={key}>
                  <Card
                    sx={{
                      height: "100%",
                      background:
                        "linear-gradient(135deg, #1a2a6c 0%, #2196F3 50%, #3F51B5 100%)",
                      borderRadius: "16px",
                      transition:
                        "transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out",
                      "&:hover": {
                        transform: "translateY(-5px)",
                        boxShadow: theme.shadows[10],
                      },
                    }}
                  >
                    <CardContent sx={{ height: "100%", p: 3 }}>
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          height: "100%",
                          gap: 2.5,
                        }}
                      >
                        <Typography
                          variant="h6"
                          sx={{
                            color: "#fff",
                            borderBottom: "2px solid rgba(255,255,255,0.2)",
                            pb: 2,
                            mb: 2,
                            fontWeight: 700,
                            fontSize: "1.25rem",
                            letterSpacing: "0.5px",
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          <span>{section.icon}</span>
                          {section.title}
                        </Typography>
                        
                        <Typography
                          component="div"
                          sx={{
                            color: "rgba(255,255,255,0.95)",
                            flex: 1,
                            fontSize: "0.95rem",
                            lineHeight: 1.8,
                            mb: 2,
                          }}
                        >
                          {section.content}
                        </Typography>

                        {/* Özel içerik türleri */}
                        {section.tips && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" sx={{ color: "#fff", mb: 1, fontWeight: 600 }}>
                              💡 İpuçları:
                            </Typography>
                            <ul style={{ color: "rgba(255,255,255,0.9)", margin: 0, paddingLeft: 20 }}>
                              {section.tips.map((tip, idx) => (
                                <li key={idx}>{tip}</li>
                              ))}
                            </ul>
                          </Box>
                        )}

                        {section.recommendations && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" sx={{ color: "#fff", mb: 1, fontWeight: 600 }}>
                              📋 Öneriler:
                            </Typography>
                            <ul style={{ color: "rgba(255,255,255,0.9)", margin: 0, paddingLeft: 20 }}>
                              {section.recommendations.map((rec, idx) => (
                                <li key={idx}>{rec}</li>
                              ))}
                            </ul>
                          </Box>
                        )}

                        {section.phases && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" sx={{ color: "#fff", mb: 1, fontWeight: 600 }}>
                              📅 Aşamalar:
                            </Typography>
                            {section.phases.map((phase, idx) => (
                              <Box key={idx} sx={{ mb: 1, p: 1, bgcolor: "rgba(255,255,255,0.1)", borderRadius: 1 }}>
                                <Typography variant="body2" sx={{ color: "#fff", fontWeight: 600 }}>
                                  {phase.phase}
                                </Typography>
                                <ul style={{ color: "rgba(255,255,255,0.9)", margin: "4px 0 0 0", paddingLeft: 20 }}>
                                  {phase.exercises.map((exercise, exIdx) => (
                                    <li key={exIdx}>{exercise}</li>
                                  ))}
                                </ul>
                              </Box>
                            ))}
                          </Box>
                        )}

                        {section.meals && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" sx={{ color: "#fff", mb: 1, fontWeight: 600 }}>
                              🍽️ Öğünler:
                            </Typography>
                            {Object.entries(section.meals).map(([mealType, meal]) => (
                              <Box key={mealType} sx={{ mb: 1 }}>
                                <Typography variant="body2" sx={{ color: "#fff", fontWeight: 600, textTransform: "capitalize" }}>
                                  {mealType === "breakfast" ? "Kahvaltı" : 
                                   mealType === "lunch" ? "Öğle" : 
                                   mealType === "dinner" ? "Akşam" : "Ara Öğün"}: {meal}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        )}

                        {section.recipeName && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" sx={{ color: "#fff", mb: 1, fontWeight: 600 }}>
                              👨‍🍳 {section.recipeName}
                            </Typography>
                            {section.ingredients && (
                              <Box sx={{ mb: 1 }}>
                                <Typography variant="body2" sx={{ color: "#fff", fontWeight: 600 }}>
                                  Malzemeler:
                                </Typography>
                                <ul style={{ color: "rgba(255,255,255,0.9)", margin: "4px 0 0 0", paddingLeft: 20 }}>
                                  {section.ingredients.map((ingredient, idx) => (
                                    <li key={idx}>{ingredient}</li>
                                  ))}
                                </ul>
                              </Box>
                            )}
                            {section.instructions && (
                              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.9)" }}>
                                {section.instructions}
                              </Typography>
                            )}
                          </Box>
                        )}

                        {section.quote && (
                          <Box sx={{ mt: 2, p: 2, bgcolor: "rgba(255,255,255,0.1)", borderRadius: 2, textAlign: "center" }}>
                            <Typography variant="body2" sx={{ color: "#fff", fontStyle: "italic", mb: 1 }}>
                              "{section.quote}"
                            </Typography>
                            {section.dailyGoal && (
                              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>
                                🎯 {section.dailyGoal}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Öncelik ve Sonraki Adımlar */}
            {(parsed.parsedData.priority || parsed.parsedData.nextSteps) && (
              <Grid container spacing={3} sx={{ mt: 3 }}>
                {parsed.parsedData.priority && (
                  <Grid item xs={12} md={6}>
                    <Card
                      sx={{
                        background: "linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)",
                        borderRadius: "16px",
                        boxShadow: 3,
                      }}
                    >
                      <CardContent sx={{ color: "white", py: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                          🎯 Öncelikli Öneriler
                        </Typography>
                        <Typography variant="body1">
                          {parsed.parsedData.priority}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                {parsed.parsedData.nextSteps && (
                  <Grid item xs={12} md={6}>
                    <Card
                      sx={{
                        background: "linear-gradient(135deg, #FF9800 0%, #FFB74D 100%)",
                        borderRadius: "16px",
                        boxShadow: 3,
                      }}
                    >
                      <CardContent sx={{ color: "white", py: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                          📅 Yarın İçin Plan
                        </Typography>
                        <Typography variant="body1">
                          {parsed.parsedData.nextSteps}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            )}
          </Box>
        ) : parsed.fallbackData ? (
          /* Fallback Format Render */
          <Box>
            {parsed.fallbackData.preamble && (
              <Grid item xs={12}>
                <Card
                  sx={{
                    width: "100%",
                    mb: 4,
                    background:
                      "linear-gradient(135deg, #1a2a6c 0%, #2196F3 50%, #3F51B5 100%)",
                    borderRadius: "16px",
                    boxShadow: 3,
                  }}
                >
                  <CardContent sx={{ color: "white", py: 4 }}>
                    <Typography
                      variant="body1"
                      sx={{
                        whiteSpace: "pre-line",
                        fontSize: "1.1rem",
                        lineHeight: 1.8,
                        textAlign: "center",
                        fontStyle: "italic",
                      }}
                    >
                      {parsed.fallbackData.preamble}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
            <Grid container spacing={4}>
              <Grid item xs={12}>
                <Grid container spacing={3}>
                  {parsed.fallbackData.sections.map((section, index) => (
                    <Grid item xs={12} md={6} lg={4} key={index}>
                      <Card
                        sx={{
                          height: "100%",
                          background:
                            "linear-gradient(135deg, #1a2a6c 0%, #2196F3 50%, #3F51B5 100%)",
                          borderRadius: "16px",
                          transition:
                            "transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out",
                          "&:hover": {
                            transform: "translateY(-5px)",
                            boxShadow: theme.shadows[10],
                          },
                        }}
                      >
                        <CardContent sx={{ height: "100%", p: 3 }}>
                          <Box
                            sx={{
                              display: "flex",
                              flexDirection: "column",
                              height: "100%",
                              gap: 2.5,
                            }}
                          >
                            <Typography
                              variant="h6"
                              sx={{
                                color: "#fff",
                                borderBottom: "2px solid rgba(255,255,255,0.2)",
                                pb: 2,
                                mb: 2,
                                fontWeight: 700,
                                fontSize: "1.25rem",
                                letterSpacing: "0.5px",
                              }}
                            >
                              {section.number
                                ? `${section.number}. ${section.heading}`
                                : section.heading}
                            </Typography>
                            <Typography
                              component="div"
                              sx={{
                                color: "rgba(255,255,255,0.95)",
                                flex: 1,
                                fontSize: "0.95rem",
                                lineHeight: 1.8,
                              }}
                            >
                              {section.content.split("\n").map((paragraph, idx) => (
                                <p key={idx}>{paragraph}</p>
                              ))}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            </Grid>
          </Box>
        ) : (
          /* Öneri yoksa boş durum */
          <Card
            sx={{
              width: "100%",
              background:
                "linear-gradient(135deg, #1a2a6c 0%, #2196F3 50%, #3F51B5 100%)",
              borderRadius: "16px",
              boxShadow: 3,
            }}
          >
            <CardContent sx={{ color: "white", py: 6, textAlign: "center" }}>
              <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                🏥 Kişiselleştirilmiş Sağlık Rehberi
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                AI destekli sağlık önerilerinizi oluşturmak için yukarıdaki butona tıklayın.
              </Typography>
            </CardContent>
          </Card>
        )}
        {loading && (
          <Box
            sx={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              bgcolor: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
            }}
          >
            <CircularProgress size={80} thickness={2} />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default HealthDashboard;
