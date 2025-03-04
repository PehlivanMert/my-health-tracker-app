import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  IconButton,
  Tooltip,
  useTheme,
} from "@mui/material";
import { styled, keyframes, alpha } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import Confetti from "react-confetti";
import Lottie from "lottie-react";
import waterAnimation from "../../assets/waterAnimation.json";
import sparkleAnimation from "../../assets/sparkleAnimation.json"; // Sparkle animasyon dosyasını ekleyin
import { db } from "../auth/firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import WaterNotificationSettingsDialog from "./WaterNotificationSettingsDialog";
import styles from "./waterAnimation.module.css";
import { saveNextWaterReminderTime } from "../notify/NotificationScheduler";
import CheckCircle from "@mui/icons-material/CheckCircle";
import CircularProgress from "@mui/material/CircularProgress";
import InputAdornment from "@mui/material/InputAdornment";
import { SportsBar } from "@mui/icons-material";

// Yeni Animasyonlar

const wave = keyframes`
  0% { background-position-x: 0; }
  100% { background-position-x: 1000px; }
`;

const bubble = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const float = keyframes`
  0% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(5deg); }
  100% { transform: translateY(0px) rotate(0deg); }
`;

const textGlow = keyframes`
  0% { text-shadow: 0 0 10px rgba(33,150,243,0.5); }
  50% { text-shadow: 0 0 30px rgba(33,150,243,0.9), 0 0 50px rgba(33,150,243,0.7); }
  100% { text-shadow: 0 0 10px rgba(33,150,243,0.5); }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const shine = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
`;

// Yeni Styled Components
const AchievementOverlay = styled(Box)({
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.9)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  backdropFilter: "blur(10px)",
  animation: `${fadeIn} 0.5s ease-out`,
});

const AchievementText = styled(Typography)({
  background: "linear-gradient(45deg, #2196F3 30%, #3F51B5 90%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  animation: `${textGlow} 2s ease-in-out infinite, ${float} 3s ease-in-out infinite`,
  textAlign: "center",
  padding: "40px",
  borderRadius: "20px",
  border: "2px solid rgba(33,150,243,0.5)",
  boxShadow: "0 0 50px rgba(33,150,243,0.3)",
  position: "relative",
  overflow: "hidden",
  "&::before": {
    content: '""',
    position: "absolute",
    top: "-50%",
    left: "-50%",
    right: "-50%",
    bottom: "-50%",
    background:
      "linear-gradient(45deg, transparent 20%, rgba(255,255,255,0.1) 50%, transparent 80%)",
    animation: `${shine} 5s infinite linear`,
  },
});

// Başarı animasyonu bileşeni
const AchievementAnimation = ({ message, onComplete }) => {
  return (
    <AchievementOverlay>
      <Confetti
        numberOfPieces={800}
        recycle={false}
        colors={["#2196F3", "#3F51B5", "#00BCD4", "#4CAF50"]}
        gravity={0.15}
        wind={0.02}
        initialVelocityY={15}
        style={{ zIndex: 10000 }}
      />
      <AchievementText
        variant="h2"
        sx={{ fontSize: { xs: "2rem", md: "3rem" } }}
      >
        {message}
        <Lottie
          animationData={sparkleAnimation}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
          }}
        />
      </AchievementText>
    </AchievementOverlay>
  );
};

// Utility: Returns current Turkey time
const getTurkeyTime = () =>
  new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));

// Eski stillerin korunmuş hali: GlowingCard, AnimatedButton, WaterContainer
const GlowingCard = styled(Card, {
  shouldForwardProp: (prop) => prop !== "glowColor",
})(({ glowColor }) => ({
  position: "relative",
  background: "rgba(255, 255, 255, 0.1)",
  backdropFilter: "blur(10px)",
  borderRadius: "24px",
  overflow: "hidden",
  border: "1px solid rgba(33,150,243,0.2)",
  boxShadow: `0 0 20px ${glowColor || "#2196F322"}`,
  transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    transform: "translateY(-10px) scale(1.02)",
    boxShadow: `0 0 40px ${glowColor || "#2196F344"}`,
  },
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `linear-gradient(135deg, ${alpha(
      glowColor || "#2196F3",
      0.2
    )} 0%, transparent 100%)`,
    opacity: 0,
    transition: "opacity 0.3s ease",
  },
  "&:hover::before": { opacity: 1 },
}));

const AnimatedButton = styled(Button)(({ theme }) => ({
  background: "linear-gradient(45deg, #2196F3 30%, #3F51B5 90%)",
  border: 0,
  borderRadius: 25,
  boxShadow: "0 3px 5px 2px rgba(33,150,243,0.3)",
  color: "white",
  padding: "12px 35px",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  position: "relative",
  overflow: "hidden",
  "&:hover": {
    transform: "scale(1.05)",
    boxShadow: "0 5px 15px 3px rgba(33,150,243,0.4)",
  },
}));

const WaterContainer = styled(Box)(({ theme }) => ({
  position: "relative",
  width: "100%",
  height: "500px",
  borderRadius: "30px",
  overflow: "hidden",
  background: "rgba(0, 0, 0, 0.2)",
  boxShadow: "inset 0 0 50px rgba(0, 0, 0, 0.2)",
  // Hedefe ulaşıldığında ek efekt
  "&.goal-achieved": {
    "&::after": {
      content: '""',
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background:
        "radial-gradient(circle at center, rgba(33,150,243,0.4) 0%, transparent 70%)",
      animation: `${pulse} 2s infinite`,
      zIndex: 1,
    },
  },
}));

// WaterTracker Component
const WaterTracker = ({ user, onWaterDataChange }) => {
  const [waterData, setWaterData] = useState({
    waterIntake: 0,
    dailyWaterTarget: 2000,
    glassSize: 250,
    history: [],
    yesterdayWaterIntake: 0,
    lastResetDate: null,
    waterNotificationOption: "smart",
    customNotificationInterval: 1,
    notificationWindow: { start: "08:00", end: "22:00" },
  });
  const [showConfetti, setShowConfetti] = useState(false);
  const [achievement, setAchievement] = useState(null);
  const [nextReminder, setNextReminder] = useState(null);
  const [waterNotifDialogOpen, setWaterNotifDialogOpen] = useState(false);
  const timerRef = useRef(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const getWaterDocRef = () => doc(db, "users", user.uid, "water", "current");

  const checkIfResetNeeded = async (data) => {
    const nowTurkey = getTurkeyTime();
    const todayStr = nowTurkey.toLocaleDateString("en-CA");
    if (data.lastResetDate !== todayStr) {
      await resetDailyWaterIntake();
    }
  };

  const fetchWaterData = async () => {
    const ref = getWaterDocRef();
    const docSnap = await getDoc(ref);
    if (docSnap.exists()) {
      const data = docSnap.data();
      setWaterData({
        waterIntake: data.waterIntake || 0,
        dailyWaterTarget: data.dailyWaterTarget || 2000,
        glassSize: data.glassSize || 250,
        history: data.history
          ? data.history.sort((a, b) => new Date(a.date) - new Date(b.date))
          : [],
        yesterdayWaterIntake: data.yesterdayWaterIntake || 0,
        lastResetDate: data.lastResetDate || null,
        waterNotificationOption: data.waterNotificationOption || "smart",
        customNotificationInterval: data.customNotificationInterval || 1,
        notificationWindow: data.notificationWindow || {
          start: "08:00",
          end: "22:00",
        },
        nextWaterReminderTime: data.nextWaterReminderTime || null,
      });
      await checkIfResetNeeded(data);
      if (onWaterDataChange) onWaterDataChange(data);
    }
  };

  const resetDailyWaterIntake = async () => {
    try {
      const nowTurkey = getTurkeyTime();
      const yesterday = new Date(nowTurkey);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString("en-CA");
      const todayStr = nowTurkey.toLocaleDateString("en-CA");
      const ref = getWaterDocRef();
      const docSnap = await getDoc(ref);
      let updatedHistory = [];
      if (docSnap.exists()) {
        const currentData = docSnap.data();
        const currentHistory = currentData.history || [];
        const oneYearAgo = new Date(nowTurkey);
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const filteredHistory = currentHistory.filter(
          (entry) => new Date(entry.date + "T00:00:00") >= oneYearAgo
        );
        updatedHistory = [
          ...filteredHistory.filter(
            (entry) => entry.date !== yesterdayStr && entry.date !== todayStr
          ),
          { date: yesterdayStr, intake: currentData.waterIntake || 0 },
        ];
      }
      await setDoc(
        ref,
        {
          waterIntake: 0,
          dailyWaterTarget: docSnap.exists()
            ? docSnap.data().dailyWaterTarget || 2000
            : 2000,
          glassSize: docSnap.exists() ? docSnap.data().glassSize || 250 : 250,
          history: updatedHistory,
          yesterdayWaterIntake: docSnap.exists()
            ? docSnap.data().waterIntake || 0
            : 0,
          lastResetDate: todayStr,
        },
        { merge: true }
      );
      await fetchWaterData();
    } catch (error) {
      console.error("Reset error:", error);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchWaterData();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [user]);

  const handleAddWater = async () => {
    const newIntake = waterData.waterIntake + waterData.glassSize;
    const isGoalAchieved =
      newIntake >= waterData.dailyWaterTarget &&
      waterData.waterIntake < waterData.dailyWaterTarget;
    const ref = getWaterDocRef();
    try {
      await setDoc(
        ref,
        {
          waterIntake: newIntake,
          dailyWaterTarget: waterData.dailyWaterTarget,
          glassSize: waterData.glassSize,
          waterNotificationOption: waterData.waterNotificationOption,
          customNotificationInterval: waterData.customNotificationInterval,
        },
        { merge: true }
      );
      await fetchWaterData();
    } catch (error) {
      console.error("Error updating water intake:", error);
    }
    if (isGoalAchieved) {
      setShowConfetti(true);
      setAchievement(
        "🚀 Harika! Bugün su hedefini gerçekleştirdin, sağlığın için büyük bir adım attın!"
      );
      setTimeout(() => {
        setShowConfetti(false);
        setAchievement(null);
      }, 5000);
    }
  };

  const handleRemoveWater = async () => {
    const newIntake = Math.max(0, waterData.waterIntake - waterData.glassSize);
    const ref = getWaterDocRef();
    try {
      await setDoc(ref, { waterIntake: newIntake }, { merge: true });
      await fetchWaterData();
    } catch (error) {
      console.error("Error updating water intake:", error);
    }
  };

  const handleWaterSettingChange = async (field, value) => {
    const ref = getWaterDocRef();
    try {
      await setDoc(ref, { [field]: value }, { merge: true });
      await fetchWaterData();
    } catch (error) {
      console.error("Error updating water settings:", error);
    }
  };

  const fillPercentage = Math.min(
    (waterData.waterIntake / waterData.dailyWaterTarget) * 100,
    100
  );

  useEffect(() => {
    if (!user) return;
    fetchWaterData();
  }, [user]);

  useEffect(() => {
    if (user && waterData) {
      saveNextWaterReminderTime(user)
        .then((next) => {
          console.log("WaterTracker - nextReminder hesaplandı:", next);
          setNextReminder(next);
        })
        .catch((err) =>
          console.error("WaterTracker - saveNextWaterReminderTime hatası:", err)
        );
    }
  }, [waterData, user]);

  return (
    <Box sx={{ textAlign: "center", mb: 6 }}>
      {achievement && (
        <AchievementAnimation
          message={achievement}
          onComplete={() => setAchievement(null)}
        />
      )}
      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          color: "#fff",
          mb: 2,
          textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
        }}
      >
        Su Takibi
      </Typography>
      <WaterContainer className={fillPercentage === 100 ? "goal-achieved" : ""}>
        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: "100%",
            transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
            transform: `scaleY(${fillPercentage / 100})`,
            transformOrigin: "bottom",
            overflow: "hidden",
          }}
        >
          <Lottie
            animationData={waterAnimation}
            loop={true}
            className={styles.lottieContainer}
          />
        </Box>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 2,
            textAlign: "center",
            width: "100%",
            padding: "20px",
          }}
        >
          <Typography
            variant="h2"
            sx={{
              fontWeight: 700,
              color: "#fff",
              textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
              mb: 3,
              animation: `${pulse} 2s infinite`,
            }}
          >
            {waterData.waterIntake} / {waterData.dailyWaterTarget} ml
          </Typography>
          <Box
            sx={{
              mt: 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Tooltip title="Su Bildirim Ayarları">
              <IconButton
                onClick={() => setWaterNotifDialogOpen(true)}
                sx={{
                  color: "#fff",
                  "&:hover": {
                    color: "#FFD700",
                    transform: "scale(1.1)",
                  },
                }}
              >
                {waterData.waterNotificationOption === "none" ? (
                  <NotificationsOffIcon />
                ) : (
                  <NotificationsIcon />
                )}
              </IconButton>
            </Tooltip>
          </Box>
          <Box
            sx={{ display: "flex", justifyContent: "center", gap: 3, mt: 2 }}
          >
            <Tooltip title="Su Eksilt" placement="left">
              <IconButton
                onClick={handleRemoveWater}
                sx={{
                  backgroundColor: "rgba(255,255,255,0.2)",
                  backdropFilter: "blur(10px)",
                  "&:hover": {
                    backgroundColor: "rgba(255,255,255,0.3)",
                    transform: "scale(1.1)",
                  },
                  transition: "all 0.3s ease",
                  padding: "15px",
                }}
              >
                <RemoveIcon sx={{ fontSize: 35, color: "#fff" }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Su Ekle" placement="right">
              <IconButton
                onClick={handleAddWater}
                sx={{
                  backgroundColor: "rgba(255,255,255,0.2)",
                  backdropFilter: "blur(10px)",
                  "&:hover": {
                    backgroundColor: "rgba(255,255,255,0.3)",
                    transform: "scale(1.1)",
                  },
                  transition: "all 0.3s ease",
                  padding: "15px",
                }}
              >
                <AddIcon sx={{ fontSize: 35, color: "#fff" }} />
              </IconButton>
            </Tooltip>
          </Box>
          <Typography variant="subtitle1" sx={{ color: "#785E", mt: 2 }}>
            Sonraki bildirim:{" "}
            {nextReminder
              ? new Date(nextReminder).toLocaleTimeString("tr-TR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Belirlenmedi"}
          </Typography>
        </Box>
      </WaterContainer>

      {/* "Dün içilen su" kartı */}

      <Box
        sx={{
          maxWidth: 400,
          mx: "auto",
          mt: 3,
          position: "relative",
          perspective: "1000px",
          transition: "all 0.3s ease",
          "&:hover": {
            transform: "translateY(-5px)",
          },
        }}
      >
        <GlowingCard
          glowColor="#21CBF3"
          sx={{
            background:
              "linear-gradient(145deg, rgba(33,150,243,0.15) 0%, rgba(33,203,243,0.2) 100%)",
            backdropFilter: "blur(12px)",
            borderRadius: "24px",
            p: 3,
            border: "1px solid rgba(255,255,255,0.2)",
            boxShadow: "0 8px 32px rgba(33,150,243,0.1)",
          }}
        >
          {/* Su Dalga Efekti */}
          <Box
            sx={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "30%",
              background:
                "linear-gradient(transparent 30%, rgba(33,203,243,0.1))",
              maskImage: "url('data:image/svg+xml,...')",
              animation: `${wave} 12s linear infinite`,
              opacity: 0.4,
            }}
          />

          {/* İçerik */}
          <Box
            sx={{
              position: "relative",
              zIndex: 1,
              textAlign: "center",
            }}
          >
            <Typography
              variant="h6"
              sx={{
                color: "#fff",
                mb: 2,
                fontWeight: 600,
                letterSpacing: "1px",
                textTransform: "uppercase",
                fontFamily: '"Montserrat", sans-serif',
              }}
            >
              🎯 Dünkü Hedef Performansı
            </Typography>

            {/* Dairesel İlerleme */}
            <Box
              sx={{
                position: "relative",
                width: 150,
                height: 150,
                mx: "auto",
                mb: 3,
                animation: `${bubble} 3s ease-in-out infinite`,
              }}
            >
              <CircularProgress
                variant="determinate"
                value={Math.min(
                  (waterData.yesterdayWaterIntake /
                    waterData.dailyWaterTarget) *
                    100,
                  100
                )}
                size="100%"
                thickness={4}
                sx={{
                  color: "rgba(255,255,255,0.1)",
                  position: "absolute",
                  "& .MuiCircularProgress-circle": {
                    strokeLinecap: "round",
                  },
                }}
              />
              <CircularProgress
                variant="determinate"
                value={Math.min(
                  (waterData.yesterdayWaterIntake /
                    waterData.dailyWaterTarget) *
                    100,
                  100
                )}
                size="100%"
                thickness={4}
                sx={{
                  color: "#21CBF3",
                  "& .MuiCircularProgress-circle": {
                    strokeLinecap: "round",
                  },
                }}
              />
              <Box
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  textAlign: "center",
                }}
              >
                <Typography
                  variant="h4"
                  sx={{
                    color: "#fff",
                    fontWeight: 800,
                    textShadow: "0 2px 8px rgba(33,203,243,0.5)",
                  }}
                >
                  {Math.round(
                    (waterData.yesterdayWaterIntake /
                      waterData.dailyWaterTarget) *
                      100
                  )}
                  %
                </Typography>
              </Box>
            </Box>

            {/* İstatistik Grid */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <Box
                  sx={{
                    bgcolor: "rgba(255,255,255,0.1)",
                    borderRadius: 2,
                    p: 2,
                    boxShadow: "0 2px 8px rgba(33,150,243,0.1)",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: "#21CBF3",
                      fontWeight: 500,
                      mb: 0.5,
                    }}
                  >
                    Hedef
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      color: "#fff",
                      fontWeight: 600,
                    }}
                  >
                    {waterData.dailyWaterTarget} ml
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box
                  sx={{
                    bgcolor: "rgba(255,255,255,0.1)",
                    borderRadius: 2,
                    p: 2,
                    boxShadow: "0 2px 8px rgba(33,150,243,0.1)",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: "#21CBF3",
                      fontWeight: 500,
                      mb: 0.5,
                    }}
                  >
                    İçilen
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      color: "#fff",
                      fontWeight: 600,
                    }}
                  >
                    {waterData.yesterdayWaterIntake} ml
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {/* Başarı Rozeti */}
            {waterData.yesterdayWaterIntake >= waterData.dailyWaterTarget && (
              <Box
                sx={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  width: 40,
                  height: 40,
                  bgcolor: "#4CAF50",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(76,175,80,0.3)",
                  animation: `${pulse} 2s infinite`,
                }}
              >
                <CheckCircle
                  sx={{
                    fontSize: 24,
                    color: "#fff",
                  }}
                />
              </Box>
            )}
          </Box>
        </GlowingCard>
      </Box>

      <Box sx={{ mt: 3, maxWidth: 500, mx: "auto" }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Bardak Boyutu"
              type="number"
              value={waterData.glassSize}
              onChange={(e) =>
                handleWaterSettingChange("glassSize", Number(e.target.value))
              }
              variant="filled"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SportsBar
                      sx={{
                        color: "#21CBF3",
                        fontSize: 28,
                        filter: "drop-shadow(0 2px 4px rgba(33,203,243,0.3))",
                      }}
                    />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">ml</InputAdornment>
                ),
                sx: {
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  border: "1px solid rgba(33,203,243,0.3)",
                  color: "#fff",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:hover": {
                    background: "rgba(255,255,255,0.15)",
                    transform: "translateY(-2px)",
                  },
                  "&.Mui-focused": {
                    boxShadow: "0 0 15px rgba(33,203,243,0.4)",
                    borderColor: "#21CBF3",
                  },
                },
              }}
              InputLabelProps={{
                sx: {
                  color: "rgba(255,255,255,0.7)",
                  "&.Mui-focused": { color: "#21CBF3" },
                },
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Günlük Hedef"
              type="number"
              value={waterData.dailyWaterTarget}
              onChange={(e) =>
                handleWaterSettingChange(
                  "dailyWaterTarget",
                  Number(e.target.value)
                )
              }
              variant="filled"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CheckCircle
                      sx={{
                        color: "#4CAF50",
                        fontSize: 28,
                        filter: "drop-shadow(0 2px 4px rgba(76,175,80,0.3))",
                      }}
                    />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">ml</InputAdornment>
                ),
                sx: {
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  border: "1px solid rgba(76,175,80,0.3)",
                  color: "#fff",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:hover": {
                    background: "rgba(255,255,255,0.15)",
                    transform: "translateY(-2px)",
                  },
                  "&.Mui-focused": {
                    boxShadow: "0 0 15px rgba(76,175,80,0.4)",
                    borderColor: "#4CAF50",
                  },
                },
              }}
              InputLabelProps={{
                sx: {
                  color: "rgba(255,255,255,0.7)",
                  "&.Mui-focused": { color: "#4CAF50" },
                },
              }}
            />
          </Grid>
        </Grid>
      </Box>
      <WaterNotificationSettingsDialog
        open={waterNotifDialogOpen}
        onClose={() => setWaterNotifDialogOpen(false)}
        waterSettings={waterData}
        onSave={(newSettings) => {
          handleWaterSettingChange(
            "waterNotificationOption",
            newSettings.waterNotificationOption
          );
          handleWaterSettingChange(
            "customNotificationInterval",
            newSettings.customNotificationInterval
          );
        }}
      />
    </Box>
  );
};

export default WaterTracker;
