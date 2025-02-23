import React, { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { db } from "../auth/firebaseConfig";
import { keyframes } from "@mui/material/styles";
import { toast } from "react-toastify";
import {
  Box,
  CircularProgress,
  Grid,
  IconButton,
  Typography,
  Card,
  CardContent,
  Chip,
  Avatar,
  LinearProgress,
  Tooltip,
  useTheme,
} from "@mui/material";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import RefreshIcon from "@mui/icons-material/Refresh";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import CakeIcon from "@mui/icons-material/Cake";
import HeightIcon from "@mui/icons-material/Height";
import ScaleIcon from "@mui/icons-material/Scale";

// Animasyonlar
const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

const gradientBackground = {
  background: "linear-gradient(135deg, #1a2a6c 0%, #2196F3 50%, #3F51B5 100%)",
  minHeight: "100vh",
  padding: 3,
  borderRadius: "24px",
  boxShadow: "0 0 40px rgba(33, 150, 243, 0.3)",
};

const cardSx = {
  p: 3,
  background: "rgba(255, 255, 255, 0.1)",
  backdropFilter: "blur(12px)",
  borderRadius: "24px",
  border: "1px solid rgba(33, 150, 243, 0.3)",
  boxShadow: "0 0 25px rgba(33, 150, 243, 0.2)",
  transition: "all 0.3s ease",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  "&:hover": {
    transform: "translateY(-5px)",
    boxShadow: "0 0 35px rgba(33, 150, 243, 0.4)",
  },
};

const API_URL = "http://localhost:3001/api/qwen-proxy";

const HealthDashboard = ({ user }) => {
  const theme = useTheme();
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

  const generateRecommendations = async () => {
    if (apiCooldown) return;

    setLoading(true);
    try {
      const age = calculateAge();
      const bmi = calculateBMI();
      const supplementsList = healthData.supplements
        .map((s) => `${s.name} (${s.dailyUsage}/gün)`)
        .join(", ");

      const prompt = `Kullanıcı bilgileri:
İsim: ${profileData.firstName || "Belirtilmemiş"},
Yaş: ${age || "Belirtilmemiş"}, 
Boy: ${profileData.height || "Belirtilmemiş"} cm, 
Kilo: ${profileData.weight || "Belirtilmemiş"} kg
Mevcut Takviyeler: ${supplementsList || "Yok"}
${bmi ? `VKİ: ${bmi.value} (${bmi.status})` : ""}

Detaylı sağlık önerileri oluştur:
- VKİ analizi ve yorumu
- Günlük aktivite planı
- Beslenme önerileri
- Supplement tavsiyeleri
- Sağlıklı bir tarif`;

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
        const recommendationText = data.choices[0].message.content
          .replace(/-/g, "")
          .replace(/#/g, "")
          .replace(/###/g, "")
          .replace(/---/g, "")
          .replace(/\*\*/g, "");

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
    if (user) fetchAllData();
  }, [user]);

  const parseRecommendations = () => {
    if (!recommendations) return [];
    return recommendations.split("\n").filter((line) => line.trim());
  };

  const SupplementCard = ({ supplement }) => (
    <Card sx={cardSx}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <Avatar
            sx={{ bgcolor: "rgba(33, 150, 243, 0.2)", width: 40, height: 40 }}
          >
            <LocalHospitalIcon fontSize="small" color="primary" />
          </Avatar>
          <Typography variant="h6" sx={{ color: "#fff" }}>
            {supplement.name}
          </Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Tooltip title="Kalan miktar">
              <Typography variant="body2" sx={{ color: "#BBDEFB" }}>
                {supplement.quantity} adet
              </Typography>
            </Tooltip>
          </Grid>
          <Grid item xs={6}>
            <Tooltip title="Günlük kullanım">
              <Typography variant="body2" sx={{ color: "#BBDEFB" }}>
                {supplement.dailyUsage}/gün
              </Typography>
            </Tooltip>
          </Grid>
        </Grid>

        <LinearProgress
          variant="determinate"
          value={(supplement.quantity / supplement.initialQuantity) * 100}
          sx={{
            height: 8,
            borderRadius: 4,
            mt: 2,
            backgroundColor: "rgba(255,255,255,0.1)",
            "& .MuiLinearProgress-bar": {
              borderRadius: 4,
              backgroundColor: "#2196F3",
            },
          }}
        />
      </CardContent>
    </Card>
  );

  return (
    <Box sx={gradientBackground}>
      <Box sx={{ maxWidth: 1280, margin: "0 auto", p: { xs: 2, md: 3 } }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 4,
            gap: 2,
          }}
        >
          <Typography
            variant="h4"
            sx={{
              color: "#fff",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <FitnessCenterIcon sx={{ fontSize: "2rem" }} />
            Sağlık Panosu
          </Typography>
          <IconButton
            onClick={generateRecommendations}
            disabled={loading || apiCooldown}
          >
            <RefreshIcon sx={{ fontSize: 32, color: "#fff" }} />
          </IconButton>
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <CircularProgress sx={{ color: "#fff" }} size={80} />
          </Box>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card sx={cardSx}>
                <CardContent>
                  <Typography variant="h6" sx={{ color: "#2196F3", mb: 3 }}>
                    Profil Bilgileri
                  </Typography>
                  <DetailItem
                    icon={<CakeIcon />}
                    label="Yaş"
                    value={calculateAge() || "Belirtilmemiş"}
                  />
                  <DetailItem
                    icon={<HeightIcon />}
                    label="Boy"
                    value={
                      profileData.height
                        ? `${profileData.height} cm`
                        : "Belirtilmemiş"
                    }
                  />
                  <DetailItem
                    icon={<ScaleIcon />}
                    label="Kilo"
                    value={
                      profileData.weight
                        ? `${profileData.weight} kg`
                        : "Belirtilmemiş"
                    }
                  />
                  <DetailItem
                    icon={<LocalHospitalIcon />}
                    label="VKİ Durumu"
                    value={calculateBMI()?.status || "Hesaplanamadı"}
                  />
                </CardContent>
              </Card>
            </Grid>

            {healthData.supplements?.length > 0 && (
              <Grid item xs={12} md={4}>
                <Card sx={cardSx}>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: "#2196F3", mb: 3 }}>
                      Takviyeler
                    </Typography>
                    <Grid container spacing={2}>
                      {healthData.supplements.map((supplement) => (
                        <Grid item xs={12} key={supplement.id}>
                          <SupplementCard supplement={supplement} />
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            )}

            <Grid item xs={12} md={4}>
              <Card sx={{ ...cardSx, height: "600px" }}>
                <CardContent
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Typography variant="h6" sx={{ color: "#2196F3", mb: 3 }}>
                    Kişiselleştirilmiş Öneriler
                  </Typography>
                  <Box sx={{ flex: 1, overflow: "auto", pr: 2 }}>
                    {recommendations ? (
                      parseRecommendations().map((line, index) => (
                        <Box
                          key={index}
                          sx={{
                            mb: 2,
                            display: "flex",
                            alignItems: "flex-start",
                          }}
                        >
                          <Chip
                            label="•"
                            sx={{
                              mr: 1,
                              bgcolor: "rgba(33, 150, 243, 0.3)",
                              color: "#fff",
                            }}
                          />
                          <Typography variant="body1" sx={{ color: "#fff" }}>
                            {line}
                          </Typography>
                        </Box>
                      ))
                    ) : (
                      <Typography
                        sx={{
                          color: "rgba(255,255,255,0.7)",
                          textAlign: "center",
                        }}
                      >
                        Öneri oluşturmak için yenile butonuna tıklayın
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {apiCooldown && (
          <Typography
            sx={{ color: "rgba(255,255,255,0.7)", textAlign: "center", mt: 3 }}
          >
            Yeni öneri oluşturmak için lütfen 1 dakika bekleyin
          </Typography>
        )}
      </Box>
    </Box>
  );
};

const DetailItem = ({ icon, label, value }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
    <Box sx={{ color: "#2196F3" }}>{icon}</Box>
    <Box>
      <Typography variant="body2" sx={{ color: "#BBDEFB" }}>
        {label}
      </Typography>
      <Typography variant="body1" sx={{ color: "#fff" }}>
        {value}
      </Typography>
    </Box>
  </Box>
);

export default HealthDashboard;
