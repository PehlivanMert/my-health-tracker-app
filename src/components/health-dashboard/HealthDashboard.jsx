// src/components/HealthDashboard.jsx
import React, { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../auth/firebaseConfig";
import { styled } from "@mui/material/styles";
import { toast } from "react-toastify";
import { Box, Grid, Typography } from "@mui/material";
import LocalDrinkIcon from "@mui/icons-material/LocalDrink";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import RamenDiningIcon from "@mui/icons-material/RamenDining";
import { HealthRecommendations } from "./HealthRecommendations";

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
  });

  const [profileData, setProfileData] = useState({
    firstName: "",
    birthDate: "",
    height: "",
    weight: "",
  });

  // Firestore'dan kullanıcı profil verisini çekme
  const fetchProfileData = async () => {
    try {
      if (!user?.uid) throw new Error("Kullanıcı bilgisi eksik");
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfileData(docSnap.data().profile || {});
      } else {
        console.warn("Profil verisi bulunamadı");
      }
    } catch (error) {
      console.error("Profil verisi hatası:", error);
      toast.error("Profil verisi yükleme hatası: " + error.message);
    }
  };

  // Firestore'dan sağlık verilerini çekme
  const fetchHealthData = async () => {
    try {
      if (!user?.uid) throw new Error("Kullanıcı bilgisi eksik");
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setHealthData(docSnap.data().healthData || {});
      } else {
        console.warn("Sağlık verisi bulunamadı");
      }
    } catch (error) {
      console.error("Sağlık verisi hatası:", error);
      toast.error("Veri yükleme hatası: " + error.message);
    }
  };

  useEffect(() => {
    fetchHealthData();
    fetchProfileData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            <HealthRecommendations />
          </Box>
        </Grid>
      </Grid>
    </DashboardContainer>
  );
};

export default HealthDashboard;
