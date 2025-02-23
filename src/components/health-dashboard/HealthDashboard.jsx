import React, { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
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
  LinearProgress,
  useTheme,
  Button,
  Divider,
  useMediaQuery,
} from "@mui/material";
import {
  FitnessCenter,
  Refresh,
  LocalHospital,
  Cake,
  Height,
  Scale,
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

const API_URL = "/api/qwen-proxy"; //"http://localhost:3001/api/qwen-proxy";

const HealthDashboard = ({ user }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [healthData, setHealthData] = useState({
    recommendations: "",
    bmi: null,
    yesterdayWaterIntake: null, // yeni alan
    supplementConsumptionStats: null, // yeni alan
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

  // Firebase'den kullanıcı verilerini çekiyoruz.
  // HealthDashboard bileşeni içinde fetchAllData fonksiyonunu güncelleyelim
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
          birthDate: data.profile?.birthDate?.toDate() || null,
        });

        setHealthData((prev) => ({
          ...prev,
          ...data.healthData,
          // Yeni eklenen veriler
          supplements,
          waterData: {
            currentIntake: waterData.waterIntake || 0,
            target: waterData.dailyWaterTarget || 2000,
            history: waterData.history || [],
            yesterday: waterData.yesterdayWaterIntake || 0,
          },
          supplementStats,
        }));

        setRecommendations(data.healthData?.recommendations || null);
      }
    } catch (error) {
      toast.error("Veri yükleme hatası: " + error.message);
    }
  };

  const calculateAge = () => {
    if (!profileData.birthDate) return null;
    const today = new Date();
    const birthDate = new Date(profileData.birthDate);
    return today.getFullYear() - birthDate.getFullYear();
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

  // Hesaplanan metrikleri Firebase'ye güncelliyoruz.
  const updateMetrics = async () => {
    const age = calculateAge();
    const bmi = calculateBMI();
    try {
      await updateDoc(doc(db, "users", user.uid), {
        "profile.age": age,
        "healthData.bmi": bmi,
      });
    } catch (error) {
      toast.error("Metrik güncelleme hatası: " + error.message);
    }
  };

  // Öneri oluştururken, profil bilgileriyle birlikte yeni istatistikleri de API'ye gönderiyoruz.
  const generateRecommendations = async () => {
    if (apiCooldown) return;
    setLoading(true);
    try {
      const age = calculateAge();
      const bmi = calculateBMI();
      const prompt = `Kullanıcı bilgileri:
İsim: ${profileData.firstName || "Belirtilmemiş"},
Yaş: ${age || "Belirtilmemiş"},
Boy: ${profileData.height || "Belirtilmemiş"} cm,
Kilo: ${profileData.weight || "Belirtilmemiş"} kg,
${bmi ? `VKİ: ${bmi.value} (${bmi.status})` : ""}

Su Tüketimi:
- Dün içilen: ${healthData.waterData?.yesterday || 0} ml
- Hedef: ${healthData.waterData?.target || 2000} ml
- Bugünkü içilen: ${healthData.waterData?.currentIntake || 0} ml

Takviyeler:
${
  healthData.supplements
    ?.map((s) => `- ${s.name} (${s.quantity}/${s.initialQuantity})`)
    .join("\n") || "Kayıtlı takviye yok"
}

Son 7 Gün Takviye Kullanımı:
${JSON.stringify(healthData.supplementStats, null, 2) || "Veri yok"}

Günlük Detaylı sağlık önerileri oluştur:
1. Su tüketim analizi ve öneriler
2. Takviye kullanım değerlendirmesi
3. VKİ analizi ve yorumu
4. Günlük aktivite planı
5. Beslenme önerileri
6. Sağlıklı bir tarif
Madde madde ve sade metin formatında max 1500 karakterle oluştur bilimsel ve eğlenceli bir dil kullan.`;

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "qwen-max",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1500,
          temperature: 0.6,
        }),
      });
      const data = await response.json();
      if (data.choices?.[0]?.message?.content) {
        const recommendationText = data.choices[0].message.content;
        await updateDoc(doc(db, "users", user.uid), {
          "healthData.recommendations": recommendationText,
          "healthData.lastUpdated": new Date().toISOString(),
        });
        setRecommendations(recommendationText);
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
      updateMetrics();
    }
  }, [user]);

  // Öneri metnini bölümlere ayırıyoruz.
  const parseRecommendations = () => {
    if (!recommendations) return [];
    const sections = recommendations
      .split(/---/)
      .map((section) => section.trim())
      .filter((section) => section);
    return sections.map((section) => {
      const lines = section
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line);
      const firstLine = lines[0] || "";
      const match = firstLine.match(/^(\d+)\.\s*(\*\*(.*)\*\*|(.+))/);
      let number = null;
      let heading = "";
      if (match) {
        number = match[1];
        heading = (match[3] || match[4] || firstLine)
          .replace(/[#*]+/g, "")
          .trim();
      } else {
        heading = firstLine.replace(/[#*]+/g, "").trim();
      }
      const content = lines.slice(1).join("\n").replace(/[#*]+/g, "").trim();
      return { number, heading, content };
    });
  };

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
                  textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
                  animation: `${fadeIn} 1s ease, ${float} 6s ease-in-out infinite`,
                  fontSize: { xs: "2rem", sm: "3rem", md: "4rem" },
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
              disabled={loading || apiCooldown}
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
              value: calculateAge(),
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

        {/* Kişiselleştirilmiş Öneriler */}
        <Grid container spacing={4}>
          <Grid item xs={12}>
            <Typography
              variant="h4"
              fontWeight={700}
              mb={3}
              sx={{
                fontFamily: '"Montserrat", sans-serif',
                letterSpacing: "0.5px",
                color: "#1a2a6c",
              }}
            >
              Kişiselleştirilmiş Öneriler
            </Typography>
            <Grid container spacing={3}>
              {parseRecommendations().map((section, index) => (
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
                    <CardContent
                      sx={{
                        height: "100%",
                        p: 3, // Padding artırıldı
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          height: "100%",
                          gap: 2.5, // Gap artırıldı
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
                            textShadow: "0 2px 4px rgba(0,0,0,0.1)",
                            fontFamily: '"Montserrat", sans-serif',
                          }}
                        >
                          {section.number
                            ? `${section.number}. ${section.heading}`
                            : section.heading}
                        </Typography>
                        <Typography
                          component="div" // div kullanarak içerik için daha fazla kontrol
                          sx={{
                            color: "rgba(255,255,255,0.95)",
                            flex: 1,
                            fontSize: "0.95rem",
                            lineHeight: 1.8,
                            letterSpacing: "0.3px",
                            fontWeight: 400,
                            "& p": {
                              // paragraflar için
                              mb: 2,
                              "&:last-child": {
                                mb: 0,
                              },
                            },
                            "& ul, & ol": {
                              // listeler için
                              pl: 2,
                              mb: 2,
                              "& li": {
                                mb: 1,
                              },
                            },
                            "& strong": {
                              // vurgular için
                              color: "#fff",
                              fontWeight: 600,
                            },
                            textShadow: "0 1px 2px rgba(0,0,0,0.05)",
                            fontFamily:
                              '"Roboto", "Helvetica", "Arial", sans-serif',
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
