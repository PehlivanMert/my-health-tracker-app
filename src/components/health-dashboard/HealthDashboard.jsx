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

// Animasyon keyframeleri
const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
  100% { transform: translateY(0px); }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const API_URL = "http://localhost:3001/api/qwen-proxy";

const HealthDashboard = ({ user }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [healthData, setHealthData] = useState({
    supplements: [],
    recommendations: "",
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

  // Firebase'den kullanıcı verilerini getDoc ile çekiyoruz
  const fetchAllData = async () => {
    try {
      const userRef = doc(db, "users", user.uid);
      const [userSnap, supplementsSnap] = await Promise.all([
        getDoc(userRef),
        getDocs(collection(db, "users", user.uid, "supplements")),
      ]);

      if (userSnap.exists()) {
        const data = userSnap.data();
        setProfileData({
          ...data.profile,
          birthDate: data.profile?.birthDate?.toDate() || null,
        });
        setHealthData({
          ...data.healthData,
          supplements: supplementsSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })),
        });
        setRecommendations(data.healthData?.recommendations || null);
      }
    } catch (error) {
      toast.error("Veri yükleme hatası: " + error.message);
    }
  };

  // Hesaplanan metrikleri (yaş, VKİ) hesaplıyoruz
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

  // Hesaplanan metrikleri Firebase'ye ekleyen fonksiyon
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

  // Öneriler oluşturulurken hesaplanan verileri Firebase'ye ekliyoruz
  const generateRecommendations = async () => {
    if (apiCooldown) return;
    setLoading(true);
    try {
      const age = calculateAge();
      const bmi = calculateBMI();
      const supplementsInfo =
        healthData.supplements && healthData.supplements.length
          ? `Supplementler: ${healthData.supplements
              .map((s) => `${s.name} (${s.quantity} adet)`)
              .join(", ")}`
          : "";
      const prompt = `Kullanıcı bilgileri:
İsim: ${profileData.firstName || "Belirtilmemiş"},
Yaş: ${age || "Belirtilmemiş"},
Boy: ${profileData.height || "Belirtilmemiş"} cm,
Kilo: ${profileData.weight || "Belirtilmemiş"} kg,
${bmi ? `VKİ: ${bmi.value} (${bmi.status})` : ""}
${supplementsInfo}

Detaylı sağlık önerileri oluştur:
1. VKİ analizi ve yorumu
2. Günlük aktivite planı
3. Beslenme önerileri
4. Supplement tavsiyeleri
5. Sağlıklı bir tarif
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
      // Veriler çekildikten sonra hesaplanan metrikleri Firebase'ye ekliyoruz
      updateMetrics();
    }
  }, [user]);

  // Öneri metnini bölümlere ayıran fonksiyon
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

  const SupplementCard = ({ supplement }) => (
    <Card
      sx={{
        mb: 2,
        transition: "all 0.3s ease",
        "&:hover": { transform: "translateY(-2px)" },
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar
            sx={{
              bgcolor: "primary.light",
              color: "primary.main",
              width: 40,
              height: 40,
            }}
          >
            <LocalHospital fontSize="small" />
          </Avatar>
          <Box flexGrow={1}>
            <Typography fontWeight={600}>{supplement.name}</Typography>
            <Typography variant="body2" color="textSecondary">
              {supplement.dailyUsage}/gün • {supplement.quantity} adet kaldı
            </Typography>
          </Box>
        </Box>
        <LinearProgress
          variant="determinate"
          value={(supplement.quantity / supplement.initialQuantity) * 100}
          sx={{
            height: 8,
            mt: 2,
            borderRadius: 4,
            "& .MuiLinearProgress-bar": {
              background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
            },
          }}
        />
      </CardContent>
    </Card>
  );

  // RecommendationCard: Her öneri bölümünü estetik card şeklinde gösterir
  const RecommendationCard = ({ section }) => {
    let icon = null;
    let color = theme.palette.primary.main;
    const headingLower = section.heading.toLowerCase();

    if (headingLower.includes("yaş")) {
      icon = <Cake />;
      color = theme.palette.secondary.main;
    } else if (headingLower.includes("boy")) {
      icon = <Height />;
      color = theme.palette.info.main;
    } else if (headingLower.includes("kilo")) {
      icon = <Scale />;
      color = theme.palette.warning.main;
    } else if (
      headingLower.includes("vki") ||
      headingLower.includes("vücut kitle")
    ) {
      icon = <FitnessCenter />;
      color = theme.palette.success.main;
    } else if (headingLower.includes("aktivite")) {
      icon = <FitnessCenter />;
      color = theme.palette.success.main;
    } else if (headingLower.includes("beslenme")) {
      icon = <LocalHospital />;
      color = theme.palette.primary.main;
    } else if (headingLower.includes("tarif")) {
      icon = <LocalHospital />;
      color = theme.palette.primary.main;
    } else {
      icon = <LocalHospital />;
      color = theme.palette.primary.main;
    }

    return (
      <Card
        sx={{
          borderRadius: 4,
          mb: 3,
          border: `1px solid ${color}30`,
          transition: "transform 0.3s ease, box-shadow 0.3s ease",
          "&:hover": { transform: "translateY(-4px)", boxShadow: 3 },
        }}
      >
        <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Avatar
            sx={{
              bgcolor: color,
              width: 50,
              height: 50,
            }}
          >
            {icon}
          </Avatar>
          <Box>
            <Typography
              variant="h6"
              fontWeight={700}
              sx={{
                fontFamily: '"Montserrat", sans-serif',
                letterSpacing: "0.5px",
                color: color,
              }}
            >
              {section.number
                ? `${section.number}. ${section.heading}`
                : section.heading}
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{
                fontFamily: '"Roboto", sans-serif',
                letterSpacing: "0.25px",
                lineHeight: 1.6,
                mt: 1,
                whiteSpace: "pre-line",
              }}
            >
              {section.content}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box
      sx={{
        // Genel arka plan için hafif, uyumlu bir gradient
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
              Öneri Oluştur
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

        {/* İçerik (Alt alta dizilmiş Takviyeler ve Kişiselleştirilmiş Öneriler) */}
        <Grid container spacing={4}>
          {/* Takviyeler */}
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 4, height: "100%" }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} mb={3}>
                  Aktif Takviyeler
                </Typography>
                {healthData.supplements?.map((supplement) => (
                  <SupplementCard key={supplement.id} supplement={supplement} />
                ))}
              </CardContent>
            </Card>
          </Grid>

          {/* Kişiselleştirilmiş Öneriler */}
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 4, height: "100%" }}>
              <CardContent
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Typography
                  variant="h6"
                  fontWeight={700}
                  mb={3}
                  sx={{
                    fontFamily: '"Montserrat", sans-serif',
                    letterSpacing: "0.5px",
                  }}
                >
                  Kişiselleştirilmiş Öneriler
                </Typography>
                <Box
                  sx={{
                    flex: 1,
                    overflow: "auto",
                    pr: 2,
                    "&::-webkit-scrollbar": { width: 6 },
                    "&::-webkit-scrollbar-thumb": {
                      background: theme.palette.primary.main,
                      borderRadius: 3,
                    },
                  }}
                >
                  {parseRecommendations().map((section, index) => (
                    <RecommendationCard key={index} section={section} />
                  ))}
                </Box>
              </CardContent>
            </Card>
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
