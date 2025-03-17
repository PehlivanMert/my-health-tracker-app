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

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
  100% { transform: translateY(0px); }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
`;

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
  const [qwenUsage, setQwenUsage] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  // Geçmişte kaydedilen öneriden seçim yapıldığında ana içerikte göster
  const handleSelectRecommendation = (rec) => {
    setRecommendations(rec.content);
    setShowHistory(false); // Seçim yapıldığında dropdown'ı kapat
  };

  useEffect(() => {
    const fetchQwenUsage = async () => {
      const usageDocRef = doc(db, "users", user.uid, "apiUsage", "qwen");
      const docSnap = await getDoc(usageDocRef);
      if (docSnap.exists()) {
        setQwenUsage(docSnap.data());
      } else {
        // Eğer doküman yoksa oluştur
        const todayStr = new Date().toISOString().slice(0, 10);
        const initialUsage = { date: todayStr, count: 0 };
        await setDoc(usageDocRef, initialUsage);
        setQwenUsage(initialUsage);
      }
    };

    if (user) {
      fetchQwenUsage();
    }
  }, [user]);

  // Qwen kullanım sınırını kontrol eden fonksiyon: Eğer kullanım sayısı 2'ye ulaşmışsa false döner.
  const canUseQwen = () => {
    if (!qwenUsage) return false; // Veriler henüz yüklenmediyse false döndür
    const todayStr = new Date().toISOString().slice(0, 10);
    if (qwenUsage.date !== todayStr) return true; // Yeni gün, sayaç sıfırlanır
    return qwenUsage.count < 2;
  };

  // Qwen API kullanımı sonrası sayacı bir artıran fonksiyon
  const incrementQwenUsage = async () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const usageDocRef = doc(db, "users", user.uid, "apiUsage", "qwen");
    let updatedUsage = { ...qwenUsage };
    if (qwenUsage.date !== todayStr) {
      updatedUsage = { date: todayStr, count: 1 };
    } else {
      updatedUsage.count += 1;
    }
    await updateDoc(usageDocRef, updatedUsage);
    setQwenUsage(updatedUsage);
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

    // Qwen kullanım sınırını kontrol et (günde 2 kez)
    if (!canUseQwen()) {
      toast.error("Qwen günde sadece iki kez kullanılabilir.");
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


🌟 *Bilimsel ama Eğlenceli Öneriler İstiyorum* 🌟
Aşağıdaki başlıkları içeren 3000 karakteri geçmeyen bir rehber hazırla:
1️⃣ Su Tüketimi: Hidrasyon analizi ve yaratıcı su içme taktikleri
2️⃣ Takviyeler: Kullanım trendleri ve uzman görüşü
3️⃣ VKİ Yorumu: Mevcut değerinin bilimsel analizi
4️⃣ Hareket Planı: Kişiye özel 3 aşamalı egzersiz programı
5️⃣ Beslenme: Eğlenceli besin kombinasyonları
6️⃣ Şefin Önerisi: Sağlıklı bir tarif (malzeme listeli)
7️⃣ Motivasyon: Günün bilimsel ilham sözü

🔍 *İstenen Format:*
▸ Rakamlar ile maddelendirerek ve sade metin formatında
▸ Her maddeyi 🧊💡🏋️♀️ gibi emojilerle süsle
▸ Bilimsel terimleri günlük dile çevir (Örn: "Hidrasyon" yerine "Su Dostluğu")
▸ Kullanıcıya özel metaforlar kullan (Örn: "Su içmeyi unutuyorsan telefonuna 'Susuzluk Alarmı' kuralım!")
▸ Pozitif vurgu yap (Eleştirel değil teşvik edici dil)
`;

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "qwen-max",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 3000,
          temperature: 0.6,
        }),
      });

      const data = await response.json();
      if (data.choices?.[0]?.message?.content) {
        const recommendationText = data.choices[0].message.content;
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

        // İşlem başarılıysa Qwen kullanım sayacını artır
        incrementQwenUsage();

        setApiCooldown(true);
        setTimeout(() => setApiCooldown(false), 60000);
      }
    } catch (error) {
      toast.error("Öneri oluşturulamadı: " + error.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  // Öneri metnini bölümlere ayırıyoruz.
  const parseRecommendations = () => {
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
              disabled={loading || apiCooldown || !canUseQwen()}
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
              Günlük Kişisel Önerini Oluştur
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
        {/* Header, metrikler ve diğer bileşenler */}
        {parsed.preamble && (
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
                  {parsed.preamble}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
        <Grid container spacing={4}>
          <Grid item xs={12}>
            <Grid container spacing={3}>
              {parsed.sections.map((section, index) => (
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
