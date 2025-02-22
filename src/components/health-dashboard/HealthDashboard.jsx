// HealthDashboard.jsx
import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../auth/firebaseConfig";
import { styled } from "@mui/material/styles";
import { toast } from "react-toastify";
import {
  Box,
  CircularProgress,
  Grid,
  IconButton,
  Typography,
} from "@mui/material";
import LocalDrinkIcon from "@mui/icons-material/LocalDrink";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import RefreshIcon from "@mui/icons-material/Refresh";
import RamenDiningIcon from "@mui/icons-material/RamenDining";

const DashboardContainer = styled("div")(({ theme }) => ({
  padding: theme.spacing(3),
  background: "linear-gradient(145deg, #f0f8ff 0%, #e6f7ff 100%)",
  borderRadius: "20px",
  boxShadow: "0 8px 32px rgba(33, 150, 243, 0.2)",
  margin: theme.spacing(2),
  position: "relative",
}));

const HealthDashboard = ({ user }) => {
  const [healthData, setHealthData] = useState({
    water: 0,
    vitamins: [],
    activity: {},
    supplements: [],
    recommendations: "",
  });

  const [profileData, setProfileData] = useState({
    firstName: "",
    birthDate: "",
    height: "",
    weight: "",
  });

  const [recommendations, setRecommendations] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiCooldown, setApiCooldown] = useState(false);

  // Kullanıcı profil verisini Firestore'dan çek
  const fetchProfileData = async () => {
    try {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfileData(docSnap.data().profile || {});
      }
    } catch (error) {
      toast.error("Profil verisi yükleme hatası: " + error.message);
    }
  };

  // Sağlık verilerini Firestore'dan çek
  const fetchHealthData = async () => {
    try {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setHealthData(docSnap.data().healthData || {});
      }
    } catch (error) {
      toast.error("Veri yükleme hatası: " + error.message);
    }
  };

  // Kullanıcının doğum tarihine göre yaş hesaplama
  const calculateAge = (birthDate) => {
    if (!birthDate) return "Belirtilmemiş";
    const diff = Date.now() - new Date(birthDate).getTime();
    return Math.abs(new Date(diff).getUTCFullYear() - 1970);
  };

  // Qwen API kullanarak sağlık önerilerini oluşturma
  const generateRecommendations = async () => {
    if (apiCooldown) {
      toast.warn("Lütfen 1 dakika sonra tekrar deneyin");
      return;
    }

    setLoading(true);
    try {
      const prompt = `Kullanıcı bilgileri: 
İsim: Mert,
Yaş: 25, 
Boy: 190cm, 
Kilo: 93kg. 
Vücut kitle indeksini hesaplayıp günlük ve haftalık sağlıklı yaşam önerileri ver. 
Max 3 madde ve 1 sağlıklı tarif içersin. ve json formatına uygun olsun.`;
      const API_URL =
        process.env.NODE_ENV === "development"
          ? "http://localhost:3001/api/qwen-proxy"
          : "/.netlify/functions/qwen-proxy";

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "qwen-max",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });

      const data = await response.json();
      console.log(data);

      if (data.choices && data.choices.length > 0) {
        const recommendationText = data.choices[0].message.content;
        setRecommendations(recommendationText);

        await updateDoc(doc(db, "users", user.uid), {
          "healthData.recommendations": recommendationText,
          "healthData.lastUpdated": new Date(),
        });
      } else {
        throw new Error("Geçersiz API yanıtı");
      }

      // API çağrı sınırlandırması: 1 dakika bekleme süresi
      setApiCooldown(true);
      setTimeout(() => setApiCooldown(false), 60000);
    } catch (error) {
      toast.error("Öneri oluşturma hatası: " + error.message);
    }
    setLoading(false);
  };

  // API yanıtını, belirlenen JSON formatına göre parse edip render eden fonksiyon
  const renderRecommendations = () => {
    if (!recommendations) {
      return "Öneri oluşturmak için yenile butonuna tıklayın";
    }
    try {
      const data = JSON.parse(recommendations);
      return (
        <Box>
          {data.vucut_kitle_indeksi && (
            <Typography variant="h6" sx={{ color: "#2196F3", mb: 1 }}>
              Vücut Kitle İndeksi: {data.vucut_kitle_indeksi.indeks} (
              {data.vucut_kitle_indeksi.durum})
            </Typography>
          )}
          {data.saglikli_yasam_onerileri && (
            <>
              <Box sx={{ mb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                  Günlük Sağlıklı Yaşam Önerileri:
                </Typography>
                <ul>
                  {data.saglikli_yasam_onerileri.gunluk_oneriler.map(
                    (item, index) => (
                      <li key={index}>
                        <Typography variant="body2">{item}</Typography>
                      </li>
                    )
                  )}
                </ul>
              </Box>
              <Box sx={{ mb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                  Haftalık Sağlıklı Yaşam Önerileri:
                </Typography>
                <ul>
                  {data.saglikli_yasam_onerileri.haftalik_oneriler.map(
                    (item, index) => (
                      <li key={index}>
                        <Typography variant="body2">{item}</Typography>
                      </li>
                    )
                  )}
                </ul>
              </Box>
            </>
          )}
          {data.saglikli_tarif && (
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                Sağlıklı Tarif: {data.saglikli_tarif.adi}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                {data.saglikli_tarif.tarif}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>Malzemeler:</strong>{" "}
                {data.saglikli_tarif.malzemeler.join(", ")}
              </Typography>
            </Box>
          )}
        </Box>
      );
    } catch (error) {
      // JSON parse edilemezse, düz metin olarak göster
      return (
        <Typography
          sx={{
            whiteSpace: "pre-wrap",
            color: "#2d3748",
            fontSize: "0.9rem",
            lineHeight: "1.6",
          }}
        >
          {recommendations}
        </Typography>
      );
    }
  };

  useEffect(() => {
    fetchHealthData();
    fetchProfileData();
  }, []);

  return (
    <DashboardContainer>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Box
            sx={{
              p: 3,
              background: "rgba(255,255,255,0.9)",
              borderRadius: "16px",
              boxShadow: "0 4px 20px rgba(33, 150, 243, 0.1)",
            }}
          >
            <Typography variant="h5" sx={{ mb: 2, color: "#2196F3" }}>
              <LocalDrinkIcon sx={{ mr: 1 }} />
              Su Takibi: {healthData.water}/3L
            </Typography>

            <Typography variant="h5" sx={{ mb: 2, color: "#3F51B5" }}>
              <FitnessCenterIcon sx={{ mr: 1 }} />
              Aktivite Hedefi: {healthData.activity?.target || 0}/5000 adım
            </Typography>

            <Typography variant="h5" sx={{ color: "#4CAF50" }}>
              <RamenDiningIcon sx={{ mr: 1 }} />
              Takviyeler:{" "}
              {healthData.supplements?.join(", ") || "Belirtilmemiş"}
            </Typography>
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          <Box
            sx={{
              p: 3,
              background: "rgba(255,255,255,0.9)",
              borderRadius: "16px",
              position: "relative",
              minHeight: "200px",
            }}
          >
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}
            >
              <Typography variant="h5" sx={{ color: "#2196F3" }}>
                Sağlık Asistanı
              </Typography>
              <IconButton
                onClick={generateRecommendations}
                disabled={loading || apiCooldown}
              >
                <RefreshIcon />
              </IconButton>
            </Box>

            {loading ? (
              <CircularProgress
                sx={{ color: "#2196F3", display: "block", margin: "0 auto" }}
              />
            ) : (
              renderRecommendations()
            )}

            {apiCooldown && (
              <Typography
                variant="caption"
                sx={{
                  position: "absolute",
                  bottom: 8,
                  right: 8,
                  color: "#718096",
                }}
              >
                Sonraki istek için 1 dakika bekleyin
              </Typography>
            )}
          </Box>
        </Grid>
      </Grid>
    </DashboardContainer>
  );
};

export default HealthDashboard;
