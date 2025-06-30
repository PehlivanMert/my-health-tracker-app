import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  Typography,
  Grid,
  TextField,
  IconButton,
  Tooltip,
  useTheme,
} from "@mui/material";
import { styled, keyframes, alpha } from "@mui/material/styles";
import Confetti from "react-confetti";
import Lottie from "lottie-react";
import waterAnimation from "../../assets/waterAnimation.json";
import { db } from "../auth/firebaseConfig";
import { doc, updateDoc, getDoc, setDoc, arrayUnion } from "firebase/firestore";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import WaterNotificationSettingsDialog from "./WaterNotificationSettingsDialog";
import styles from "./waterAnimation.module.css";
import {
  saveNextWaterReminderTime,
  scheduleWaterNotifications,
} from "../notify/NotificationScheduler";
import CheckCircle from "@mui/icons-material/CheckCircle";
import CircularProgress from "@mui/material/CircularProgress";
import InputAdornment from "@mui/material/InputAdornment";
import { SportsBar } from "@mui/icons-material";

// --- Animasyon ve stil tanımlamaları ---
const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const particleFloat = keyframes`
  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; }
`;

const AchievementOverlay = styled(Box)(({ theme }) => ({
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "radial-gradient(circle at center, #000814 0%, #001220 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  overflow: "hidden",
  "&::before": {
    content: '""',
    position: "absolute",
    width: "150%",
    height: "150%",
    background: `linear-gradient(
      45deg,
      ${alpha(theme.palette.primary.main, 0.1)} 0%,
      ${alpha(theme.palette.secondary.main, 0.1)} 100%
    )`,
    animation: `${particleFloat} 20s linear infinite`,
    pointerEvents: "none",
  },
}));

const NeonText = styled(Typography)(({ theme }) => ({
  textAlign: "center",
  position: "relative",
  "&::before": {
    content: "attr(data-text)",
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    filter: "blur(15px)",
    color: theme.palette.primary.main,
    mixBlendMode: "screen",
  },
}));

const AchievementAnimation = ({ message, onComplete }) => {
  const theme = useTheme();
  return (
    <AchievementOverlay onClick={onComplete}>
      <Box sx={{ position: "relative", textAlign: "center" }}>
        {/* Particle System */}
        {[...Array(50)].map((_, i) => (
          <Box
            key={i}
            sx={{
              position: "absolute",
              top: Math.random() * 100 + "%",
              left: Math.random() * 100 + "%",
              width: 8,
              height: 8,
              background: `radial-gradient(${theme.palette.primary.main}, transparent)`,
              borderRadius: "50%",
              animation: `${particleFloat} ${
                5 + Math.random() * 10
              }s linear infinite`,
              opacity: 0.6,
            }}
          />
        ))}

        <NeonText
          data-text={message}
          variant="h2"
          sx={{
            background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            animation: `${pulse} 1.5s ease-in-out infinite`,
            fontSize: "3.5rem",
            textShadow: `0 0 10px ${alpha(theme.palette.primary.main, 0.5)}`,
            px: 4,
            py: 6,
            borderRadius: 4,
            cursor: "pointer",
            transition: "transform 0.3s ease",
            "&:hover": {
              transform: "scale(1.05)",
            },
          }}
        >
          {message}
        </NeonText>
      </Box>
    </AchievementOverlay>
  );
};

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

const WaterContainer = styled(Box)(({ theme }) => ({
  position: "relative",
  width: "100%",
  height: "500px",
  borderRadius: "30px",
  overflow: "hidden",
  background: "rgba(0, 0, 0, 0.2)",
  boxShadow: "inset 0 0 50px rgba(0, 0, 0, 0.2)",
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

const getTurkeyTime = () =>
  new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));

// ─── YENİ RESET İŞLEVİ ─────────────────────────────────────────────
// Bu versiyonda, Firestore'dan çekilen en güncel veriyi (currentFirestoreData) kullanıyoruz
// ve arrayUnion ile history dizisine yeni entry ekleyerek, eski kayıtların silinmesini engelliyoruz.
const resetDailyWaterIntake = async (
  getWaterDocRef,
  currentFirestoreData,
  fetchWaterData,
  user
) => {
  const ref = getWaterDocRef();
  const todayStr = getTurkeyTime().toLocaleDateString("en-CA");

  // Eğer bugün zaten reset yapılmışsa, tekrar yapma
  if (currentFirestoreData.lastResetDate === todayStr) {
    return;
  }

  // Dünkü su tüketimini history'ye kaydet (sadece intake > 0 ise veya her zaman kaydetmek isteniyorsa)
  const yesterday = new Date(getTurkeyTime());
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString("en-CA");

  // Sadece dünkü intake'i kaydet, yeni gün için 0'lı kayıt eklenmesin
  const newHistoryEntry = {
    date: yesterdayStr,
    intake: currentFirestoreData.waterIntake || 0,
  };

  try {
    // Sadece dünkü intake'i, dünkü tarih ile kaydet
    await updateDoc(ref, {
      waterIntake: 0,
      yesterdayWaterIntake: currentFirestoreData.waterIntake || 0,
      lastResetDate: todayStr,
      history: arrayUnion(newHistoryEntry),
    });
    await fetchWaterData();

    // Gün sonu özeti bildirimi gönder
    const waterIntake = currentFirestoreData.waterIntake || 0;
    const dailyTarget = currentFirestoreData.dailyWaterTarget || 2000;
    await sendDailyWaterSummary(user, waterIntake, dailyTarget);
    console.log(`Gün sonu özeti: ${waterIntake}ml`);
  } catch (error) {
    console.error("Reset işlemi sırasında hata oluştu:", error);
  }
};

// ─────────────────────────────────────────────────────────────────

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
    notificationWindow: { start: "07:00", end: "21:00" },
    nextWaterReminderTime: null,
    nextWaterReminderMessage: null,
    activityLevel: "orta",
  });
  const [dataFetched, setDataFetched] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [achievement, setAchievement] = useState(null);
  const [nextReminder, setNextReminder] = useState(null);
  const [waterNotifDialogOpen, setWaterNotifDialogOpen] = useState(false);

  const theme = useTheme();

  const getWaterDocRef = () => doc(db, "users", user.uid, "water", "current");

  // Güncelleme öncesinde Firestore'dan çekilen veriyi kullanarak sıfırlama gerekip gerekmediğini kontrol ediyoruz.
  const checkIfResetNeeded = async (data) => {
    const nowTurkey = getTurkeyTime();
    const todayStr = nowTurkey.toLocaleDateString("en-CA");
    
    // Eğer lastResetDate yoksa veya bugünden farklıysa reset yap
    if (!data.lastResetDate || data.lastResetDate !== todayStr) {
      // NOT: Burada state'deki waterData yerine, Firestore'dan çekilen data (en güncel veri) kullanılıyor.
      await resetDailyWaterIntake(getWaterDocRef, data, fetchWaterData, user);
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
          start: "07:00",
          end: "21:00",
        },
        nextWaterReminderTime: data.nextWaterReminderTime || null,
        nextWaterReminderMessage: data.nextWaterReminderMessage || null,
        activityLevel: data.activityLevel || "orta",
      });
      setDataFetched(true);
      await checkIfResetNeeded(data);
      if (onWaterDataChange) onWaterDataChange(data);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchWaterData();
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
          activityLevel: waterData.activityLevel,
        },
        { merge: true }
      );
      await fetchWaterData();
      const result = await scheduleWaterNotifications(user);
      console.log("handleAddWater - Bildirimler yeniden hesaplandı:", result);
      setNextReminder(result.nextReminder);
    } catch (error) {
      console.error("Error updating water intake:", error);
    }
    if (isGoalAchieved) {
      setShowConfetti(true);
      setAchievement("💧🚀 Su Hedefini Aştın! 🎉🌊");
      // Otomatik kapatma süresini 7 saniyeye çıkar
      setTimeout(() => {
        setShowConfetti(false);
        setAchievement(null);
      }, 7000);
    }
  };

  const handleRemoveWater = async () => {
    const newIntake = Math.max(0, waterData.waterIntake - waterData.glassSize);
    const ref = getWaterDocRef();
    try {
      await setDoc(ref, { waterIntake: newIntake }, { merge: true });
      await fetchWaterData();
      const result = await scheduleWaterNotifications(user);
      console.log(
        "handleRemoveWater - Bildirimler yeniden hesaplandı:",
        result
      );
      setNextReminder(result.nextReminder);
    } catch (error) {
      console.error("Error updating water intake:", error);
    }
  };

  const handleWaterSettingChange = async (field, value) => {
    const ref = getWaterDocRef();
    try {
      await setDoc(ref, { [field]: value }, { merge: true });
      await fetchWaterData();
      const result = await scheduleWaterNotifications(user);
      console.log(
        "handleWaterSettingChange - Bildirimler yeniden hesaplandı:",
        result
      );
      setNextReminder(result.nextReminder);
    } catch (error) {
      console.error("Error updating water settings:", error);
    }
  };

  const fillPercentage = Math.min(
    (waterData.waterIntake / waterData.dailyWaterTarget) * 100,
    100
  );

  // ─── GECE YARISI RESET LOGİĞİ ─────────────────────────────
  // Bu useEffect, gün değişiminde (gece yarısı) sıfırlama işlemini tetikler.
  useEffect(() => {
    const scheduleReset = () => {
      const now = getTurkeyTime();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0); // Gece yarısı
      const msUntilMidnight = tomorrow.getTime() - now.getTime();

      const timeoutId = setTimeout(async () => {
        // Burada state'deki waterData yerine, fetchWaterData ile çekilen en güncel veriyi kullanmak daha sağlıklı olabilir.
        await resetDailyWaterIntake(getWaterDocRef, waterData, fetchWaterData, user);
        scheduleReset(); // Bir sonraki gün için yeniden zamanla
      }, msUntilMidnight);

      return timeoutId;
    };

    const resetTimeout = scheduleReset();
    return () => clearTimeout(resetTimeout);
  }, [user]);

  useEffect(() => {
    if (!user?.uid || !dataFetched) return;
    const now = getTurkeyTime();

    if (
      waterData.nextWaterReminderTime &&
      new Date(waterData.nextWaterReminderTime).getTime() >
        now.getTime() + 60000
    ) {
      setNextReminder({
        time: waterData.nextWaterReminderTime,
        message: waterData.nextWaterReminderMessage,
      });
    } else if (waterData.waterNotificationOption !== "none") {
      saveNextWaterReminderTime(user)
        .then((next) => {
          console.log("WaterTracker - nextReminder hesaplandı:", next);
          setNextReminder(next);
        })
        .catch((err) =>
          console.error("WaterTracker - saveNextWaterReminderTime hatası:", err)
        );
    } else {
      setNextReminder(null);
    }
  }, [
    user?.uid,
    waterData.nextWaterReminderTime,
    waterData.waterNotificationOption,
    dataFetched,
    waterData.waterIntake,
    waterData.dailyWaterTarget,
    waterData.customNotificationInterval,
    waterData.activityLevel,
    waterData.notificationWindow?.start,
    waterData.notificationWindow?.end,
  ]);

  return (
    <Box sx={{ textAlign: "center", mb: 6 }}>
      {showConfetti && (
        <Confetti
          recycle={false}
          numberOfPieces={1200}
          colors={["#2196F3", "#64B5F6", "#BBDEFB", "#E3F2FD", "#FFFFFF"]}
          drawShape={(ctx) => {
            ctx.beginPath();
            ctx.arc(0, 0, 5, 0, 2 * Math.PI);
            ctx.fill();
          }}
          gravity={0.15}
          wind={0.02}
          initialVelocityY={15}
          confettiSource={{
            x: window.innerWidth / 2,
            y: window.innerHeight,
            w: 0,
            h: 0,
          }}
          onConfettiComplete={() => setShowConfetti(false)}
          tweenDuration={5000}
          style={{ pointerEvents: "none" }}
        />
      )}
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
        Su Tüketimi
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
          <Typography variant="subtitle1" sx={{ color: "#fff", mt: 2 }}>
            Sonraki bildirim:{" "}
            {waterData.waterIntake >= waterData.dailyWaterTarget &&
            waterData.waterNotificationOption !== "none"
              ? "Tebrikler hedefe ulaştınız"
              : waterData.waterNotificationOption === "none"
              ? "Bildirim Kapalı"
              : nextReminder
              ? new Date(nextReminder.time).toLocaleTimeString("tr-TR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Belirlenmedi"}
          </Typography>
        </Box>
      </WaterContainer>

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

      <Box
        sx={{
          maxWidth: 300,
          mx: "auto",
          mt: 2,
          position: "relative",
          perspective: "800px",
          transition: "all 0.3s ease",
          "&:hover": {
            transform: "translateY(-3px)",
          },
        }}
      >
        <GlowingCard
          glowColor="#21CBF3"
          sx={{
            background:
              "linear-gradient(145deg, rgba(33,150,243,0.15) 0%, rgba(33,203,243,0.2) 100%)",
            backdropFilter: "blur(10px)",
            borderRadius: "16px",
            p: 2,
            border: "1px solid rgba(255,255,255,0.2)",
            boxShadow: "0 6px 24px rgba(33,150,243,0.1)",
          }}
        >
          <Box sx={{ position: "relative", zIndex: 1, textAlign: "center" }}>
            <Typography
              variant="h6"
              sx={{
                color: "#fff",
                mb: 1,
                fontWeight: 600,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                fontFamily: '"Montserrat", sans-serif',
              }}
            >
              🎯 Dünkü Hedef
            </Typography>
            <Box
              sx={{
                position: "relative",
                width: 120,
                height: 120,
                mx: "auto",
                mb: 2,
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
                sx={{ color: "rgba(255,255,255,0.1)", position: "absolute" }}
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
                sx={{ color: "#21CBF3" }}
              />
              <Box
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              >
                <Typography
                  variant="h5"
                  sx={{ color: "#fff", fontWeight: 800 }}
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
            <Grid container spacing={1} sx={{ mb: 1 }}>
              <Grid item xs={6}>
                <Box
                  sx={{
                    bgcolor: "rgba(255,255,255,0.1)",
                    borderRadius: 1.5,
                    p: 1.5,
                    boxShadow: "0 2px 6px rgba(33,150,243,0.1)",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ color: "#21CBF3", mb: 0.5 }}
                  >
                    Hedef
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{ color: "#fff", fontWeight: 600 }}
                  >
                    {waterData.dailyWaterTarget} ml
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box
                  sx={{
                    bgcolor: "rgba(255,255,255,0.1)",
                    borderRadius: 1.5,
                    p: 1.5,
                    boxShadow: "0 2px 6px rgba(33,150,243,0.1)",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ color: "#21CBF3", mb: 0.5 }}
                  >
                    İçilen
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{ color: "#fff", fontWeight: 600 }}
                  >
                    {waterData.yesterdayWaterIntake} ml
                  </Typography>
                </Box>
              </Grid>
            </Grid>
            {waterData.yesterdayWaterIntake >= waterData.dailyWaterTarget && (
              <Box
                sx={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  width: 30,
                  height: 30,
                  bgcolor: "#4CAF50",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CheckCircle sx={{ fontSize: 18, color: "#fff" }} />
              </Box>
            )}
          </Box>
        </GlowingCard>
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
          if (newSettings.activityLevel) {
            handleWaterSettingChange(
              "activityLevel",
              newSettings.activityLevel
            );
          }
        }}
      />
    </Box>
  );
};

export default WaterTracker;
