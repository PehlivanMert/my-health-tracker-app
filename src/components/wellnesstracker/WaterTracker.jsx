import React, { useState, useEffect, useRef } from "react";
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
  getDailyAverageWeatherData,
  getMotivationalMessageForTime,
} from "../notify/NotificationScheduler";
import CheckCircle from "@mui/icons-material/CheckCircle";
import CircularProgress from "@mui/material/CircularProgress";
import InputAdornment from "@mui/material/InputAdornment";
import { SportsBar } from "@mui/icons-material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import useMediaQuery from "@mui/material/useMediaQuery";
import EmojiFoodBeverageIcon from '@mui/icons-material/EmojiFoodBeverage';
import LocalDrinkIcon from '@mui/icons-material/LocalDrink';
import WineBarIcon from '@mui/icons-material/WineBar';
import SportsBarIcon from '@mui/icons-material/SportsBar';
import LocalBarIcon from '@mui/icons-material/LocalBar';
import SvgIcon from '@mui/material/SvgIcon';

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

const slideInFromBottom = keyframes`
  0% { 
    transform: translateY(100vh) scale(0.8); 
    opacity: 0; 
  }
  50% { 
    transform: translateY(-20px) scale(1.1); 
    opacity: 1; 
  }
  100% { 
    transform: translateY(0) scale(1); 
    opacity: 1; 
  }
`;

const bounce = keyframes`
  0%, 20%, 53%, 80%, 100% { 
    transform: translate3d(0,0,0); 
  }
  40%, 43% { 
    transform: translate3d(0, -30px, 0); 
  }
  70% { 
    transform: translate3d(0, -15px, 0); 
  }
  90% { 
    transform: translate3d(0, -4px, 0); 
  }
`;

const shimmer = keyframes`
  0% { 
    background-position: -200% center; 
  }
  100% { 
    background-position: 200% center; 
  }
`;

const rotate = keyframes`
  from { 
    transform: rotate(0deg); 
  }
  to { 
    transform: rotate(360deg); 
  }
`;

const ModernAchievementOverlay = styled(Box)(({ theme }) => ({
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "radial-gradient(circle at center, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.95) 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  overflow: "hidden",
  backdropFilter: "blur(10px)",
  animation: `${fadeIn} 0.5s ease-out`,
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `linear-gradient(45deg, 
      ${alpha(theme.palette.primary.main, 0.1)} 0%, 
      ${alpha(theme.palette.secondary.main, 0.1)} 25%,
      ${alpha("#4CAF50", 0.1)} 50%,
      ${alpha(theme.palette.primary.main, 0.1)} 75%,
      ${alpha(theme.palette.secondary.main, 0.1)} 100%
    )`,
    animation: `${particleFloat} 15s linear infinite`,
    pointerEvents: "none",
  },
}));

const ModernAchievementCard = styled(Box)(({ theme }) => ({
  position: "relative",
  background: "rgba(255, 255, 255, 0.1)",
  backdropFilter: "blur(20px)",
  borderRadius: "24px",
  padding: theme.spacing(4),
  border: "1px solid rgba(255, 255, 255, 0.2)",
  boxShadow: "0 25px 50px rgba(0, 0, 0, 0.3)",
  textAlign: "center",
  maxWidth: "90vw",
  width: "400px",
  animation: `${slideInFromBottom} 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)`,
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(3),
    width: "85vw",
    borderRadius: "20px",
  },
  "&::before": {
    content: '""',
    position: "absolute",
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    background: `linear-gradient(45deg, 
      ${theme.palette.primary.main}, 
      ${theme.palette.secondary.main}, 
      #4CAF50, 
      ${theme.palette.primary.main}
    )`,
    borderRadius: "26px",
    zIndex: -1,
    backgroundSize: "400% 400%",
    animation: `${shimmer} 3s ease-in-out infinite`,
    [theme.breakpoints.down("sm")]: {
      borderRadius: "22px",
    },
  },
}));

const ModernNeonText = styled(Typography)(({ theme }) => ({
  textAlign: "center",
  position: "relative",
  fontWeight: 800,
  background: `linear-gradient(45deg, 
    ${theme.palette.primary.main} 0%, 
    ${theme.palette.secondary.main} 25%, 
    #4CAF50 50%, 
    ${theme.palette.primary.main} 75%, 
    ${theme.palette.secondary.main} 100%
  )`,
  backgroundSize: "200% 200%",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
  animation: `${shimmer} 2s ease-in-out infinite, ${bounce} 2s ease-in-out infinite`,
  fontSize: "2.5rem",
  lineHeight: 1.2,
  textShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.5)}`,
  [theme.breakpoints.down("sm")]: {
    fontSize: "2rem",
  },
  [theme.breakpoints.down("xs")]: {
    fontSize: "1.8rem",
  },
}));

const ModernIconContainer = styled(Box)(({ theme }) => ({
  position: "relative",
  width: "120px",
  height: "120px",
  margin: "0 auto 20px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  background: `linear-gradient(45deg, 
    ${theme.palette.primary.main}, 
    ${theme.palette.secondary.main}, 
    #4CAF50
  )`,
  backgroundSize: "200% 200%",
  animation: `${shimmer} 2s ease-in-out infinite, ${rotate} 10s linear infinite`,
  boxShadow: `0 0 30px ${alpha(theme.palette.primary.main, 0.5)}`,
  [theme.breakpoints.down("sm")]: {
    width: "100px",
    height: "100px",
  },
  "&::before": {
    content: '""',
    position: "absolute",
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
    borderRadius: "50%",
    background: `linear-gradient(45deg, 
      ${theme.palette.primary.main}, 
      ${theme.palette.secondary.main}, 
      #4CAF50
    )`,
    backgroundSize: "200% 200%",
    animation: `${shimmer} 2s ease-in-out infinite reverse`,
    zIndex: -1,
    opacity: 0.3,
  },
}));

const ModernParticle = styled(Box)(({ theme, delay, duration, size }) => ({
  position: "absolute",
  width: size || 8,
  height: size || 8,
  background: `radial-gradient(circle, ${theme.palette.primary.main}, transparent)`,
  borderRadius: "50%",
  animation: `${particleFloat} ${duration || 5}s linear infinite`,
  animationDelay: `${delay || 0}s`,
  opacity: 0.7,
  filter: "blur(1px)",
}));

const ModernAchievementAnimation = ({ message, onComplete }) => {
  const theme = useTheme();
  
  return (
    <ModernAchievementOverlay onClick={onComplete}>
      {/* Enhanced Particle System */}
      {[...Array(30)].map((_, i) => (
        <ModernParticle
          key={i}
          delay={Math.random() * 3}
          duration={5 + Math.random() * 10}
          size={4 + Math.random() * 8}
          sx={{
            top: Math.random() * 100 + "%",
            left: Math.random() * 100 + "%",
          }}
        />
      ))}
      
      {/* Floating Icons */}
      {["💧", "🚀", "🎉", "🌊", "⭐"].map((icon, i) => (
        <Box
          key={i}
          sx={{
            position: "absolute",
            top: Math.random() * 80 + 10 + "%",
            left: Math.random() * 80 + 10 + "%",
            fontSize: { xs: "2rem", sm: "2.5rem" },
            animation: `${bounce} ${2 + Math.random() * 2}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 2}s`,
            opacity: 0.8,
            filter: "blur(0.5px)",
            pointerEvents: "none",
          }}
        >
          {icon}
        </Box>
      ))}

      <ModernAchievementCard>
        <ModernIconContainer>
          <Box
            component="span"
            sx={{
              fontSize: { xs: "3rem", sm: "4rem" },
              color: "#fff",
              filter: "drop-shadow(0 0 10px rgba(255,255,255,0.5))",
            }}
          >
            🎯
          </Box>
        </ModernIconContainer>
        
        <ModernNeonText variant="h2">
          {message}
        </ModernNeonText>
        
        <Typography
          variant="body1"
          sx={{
            color: "rgba(255,255,255,0.8)",
            mt: 2,
            fontSize: { xs: "0.9rem", sm: "1rem" },
            fontWeight: 500,
          }}
        >
          Tebrikler! Hedefinize ulaştınız! 🎊
        </Typography>
        
        <Box
          sx={{
            mt: 3,
            display: "flex",
            justifyContent: "center",
            gap: 1,
          }}
        >
          {["🏆", "💪", "🌟", "🔥", "✨"].map((emoji, i) => (
            <Box
              key={i}
              sx={{
                fontSize: { xs: "1.5rem", sm: "2rem" },
                animation: `${bounce} ${1.5 + i * 0.2}s ease-in-out infinite`,
                animationDelay: `${i * 0.1}s`,
              }}
            >
              {emoji}
            </Box>
          ))}
        </Box>
        
        <Typography
          variant="caption"
          sx={{
            display: "block",
            color: "rgba(255,255,255,0.6)",
            mt: 2,
            fontSize: { xs: "0.75rem", sm: "0.8rem" },
          }}
        >
          Kapatmak için tıklayın
        </Typography>
      </ModernAchievementCard>
    </ModernAchievementOverlay>
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

const STANDARD_GLASS_SIZES = [
  { value: 100, label: "100ml", icon: <EmojiFoodBeverageIcon fontSize="small" sx={{ color: '#1976d2' }} />, desc: 'Çay Bardağı' },
  { value: 200, label: "200ml", icon: <LocalDrinkIcon fontSize="small" sx={{ color: '#2196f3' }} />, desc: 'Küçük Su Bardağı' },
  { value: 250, label: "250ml", icon: <WineBarIcon fontSize="small" sx={{ color: '#00bcd4' }} />, desc: 'Orta Bardak' },
  { value: 300, label: "300ml", icon: <SportsBarIcon fontSize="small" sx={{ color: '#43a047' }} />, desc: 'Kupa' },
  { value: 500, label: "500ml", icon: <LocalBarIcon fontSize="small" sx={{ color: '#fbc02d' }} />, desc: 'Şişe' },
];

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
    nextWaterReminderTime: null,
    nextWaterReminderMessage: null,
    activityLevel: "orta",
  });
  const [dataFetched, setDataFetched] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [achievement, setAchievement] = useState(null);
  const [nextReminder, setNextReminder] = useState(null);
  const [weatherSuggestion, setWeatherSuggestion] = useState("");
  const [waterNotifDialogOpen, setWaterNotifDialogOpen] = useState(false);
  
  // Korumalı veri yönetimi için ref'ler
  const lastWaterDataState = useRef(null);
  const isDataLoading = useRef(true);
  const isInitialLoad = useRef(true);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));

  // For mobile/tablet menu
  const [anchorEl, setAnchorEl] = useState(null);
  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleStandardGlassSelect = (size) => {
    handleWaterSettingChange("glassSize", size);
    handleMenuClose();
  };

  const getWaterDocRef = () => doc(db, "users", user.uid, "water", "current");

  const checkIfResetNeeded = async (data) => {
    const todayStr = getTurkeyTime().toLocaleDateString("en-CA", {
      timeZone: "Europe/Istanbul",
    });
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
      const newWaterData = {
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
        nextWaterReminderMessage: data.nextWaterReminderMessage || null,
        activityLevel: data.activityLevel || "orta",
      };
      setWaterData(newWaterData);
      lastWaterDataState.current = { ...newWaterData };
      setDataFetched(true);
      isDataLoading.current = false;
      await checkIfResetNeeded(data);
      if (onWaterDataChange) onWaterDataChange(data);
    } else {
      // Doküman yoksa default değerlerle state'i güncelle
      const defaultWaterData = {
        waterIntake: 0,
        dailyWaterTarget: 2000,
        glassSize: 250,
        history: [],
        yesterdayWaterIntake: 0,
        lastResetDate: null,
        waterNotificationOption: "smart",
        customNotificationInterval: 1,
        notificationWindow: { start: "08:00", end: "22:00" },
        nextWaterReminderTime: null,
        nextWaterReminderMessage: null,
        activityLevel: "orta",
      };
      setWaterData(defaultWaterData);
      lastWaterDataState.current = { ...defaultWaterData };
      setDataFetched(true);
      isDataLoading.current = false;
      if (onWaterDataChange) onWaterDataChange(defaultWaterData);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchWaterData();
  }, [user]);

  useEffect(() => {
    // Hava durumu önerisini çek
    const fetchWeatherSuggestion = async () => {
      try {
        const weather = await getDailyAverageWeatherData();
        if (weather) {
          const msg = getMotivationalMessageForTime(new Date(), weather);
          setWeatherSuggestion(msg);
        } else {
          setWeatherSuggestion("Hava durumu verisi alınamadı. Yine de bol su içmeyi unutma!");
        }
      } catch (e) {
        setWeatherSuggestion("Hava durumu verisi alınamadı. Yine de bol su içmeyi unutma!");
      }
    };
    fetchWeatherSuggestion();
  }, []);

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
      // Eğer aktivite seviyesi değiştiyse, önce bildirimleri ve hedefi güncelle, sonra fetchWaterData ile UI'yı güncelle
      if (field === "activityLevel") {
        const result = await scheduleWaterNotifications(user);
        setNextReminder(result.nextReminder);
        await fetchWaterData(); // En son çağır, UI güncellensin
        return;
      }
      await fetchWaterData();
      const result = await scheduleWaterNotifications(user);
      setNextReminder(result.nextReminder);
    } catch (error) {
      console.error("handleWaterSettingChange error:", error);
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

  // Su verisi değişikliklerini izle ve korumalı güncelleme yap
  useEffect(() => {
    if (!user || isInitialLoad.current || isDataLoading.current) return;
    
    // Sadece gerçek değişiklik varsa güncelle
    const hasRealChange = JSON.stringify(waterData) !== JSON.stringify(lastWaterDataState.current);
    
    if (hasRealChange) {
      const updateWaterDataInFirestore = async () => {
        try {
          const ref = getWaterDocRef();
          await setDoc(ref, waterData, { merge: true });
          lastWaterDataState.current = { ...waterData };
        } catch (error) {
          console.error("Su verisi güncelleme hatası:", error);
        }
      };
      updateWaterDataInFirestore();
    }
  }, [waterData, user]);

  return (
    <Box sx={{ textAlign: "center", mb: 6 }}>
      {showConfetti && (
        <Confetti
          recycle={false}
          numberOfPieces={800}
          colors={[
            "#2196F3", 
            "#64B5F6", 
            "#BBDEFB", 
            "#E3F2FD", 
            "#FFFFFF",
            "#4CAF50",
            "#81C784",
            "#C8E6C9",
            "#FF9800",
            "#FFB74D"
          ]}
          drawShape={(ctx) => {
            const shapes = ['circle', 'square', 'triangle'];
            const shape = shapes[Math.floor(Math.random() * shapes.length)];
            
            ctx.beginPath();
            if (shape === 'circle') {
              ctx.arc(0, 0, 4, 0, 2 * Math.PI);
            } else if (shape === 'square') {
              ctx.rect(-3, -3, 6, 6);
            } else if (shape === 'triangle') {
              ctx.moveTo(0, -4);
              ctx.lineTo(-3, 3);
              ctx.lineTo(3, 3);
              ctx.closePath();
            }
            ctx.fill();
          }}
          gravity={0.12}
          wind={0.03}
          initialVelocityY={12}
          initialVelocityX={2}
          confettiSource={{
            x: window.innerWidth / 2,
            y: window.innerHeight,
            w: 0,
            h: 0,
          }}
          onConfettiComplete={() => setShowConfetti(false)}
          tweenDuration={4000}
          style={{ 
            pointerEvents: "none",
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 9998
          }}
        />
      )}
      {achievement && (
        <ModernAchievementAnimation
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
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <TextField
                fullWidth
                label="Bardak Boyutu"
                type="number"
                value={waterData.glassSize}
                onChange={(e) => handleWaterSettingChange("glassSize", Number(e.target.value))}
                variant="filled"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SportsBar sx={{ color: "#21CBF3", fontSize: 28, filter: "drop-shadow(0 2px 4px rgba(33,203,243,0.3))" }} />
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
                    minWidth: 0,
                    flex: 1,
                  },
                }}
                InputLabelProps={{
                  sx: {
                    color: "rgba(255,255,255,0.7)",
                    "&.Mui-focused": { color: "#21CBF3" },
                  },
                }}
              />
              {/* Her zaman ... menüsü */}
              <IconButton onClick={handleMenuOpen} sx={{ ml: 1, color: "#21CBF3", width: 36, height: 36 }}>
                <MoreVertIcon />
              </IconButton>
              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
                {STANDARD_GLASS_SIZES.map((glass) => (
                  <MenuItem key={glass.value} onClick={() => handleStandardGlassSelect(glass.value)} selected={waterData.glassSize === glass.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {glass.icon}
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{glass.label}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{glass.desc}</Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Menu>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Tooltip
              title={
                waterData.waterNotificationOption === "smart"
                  ? "Günlük hedef, hava ve aktiviteye göre otomatik hesaplanıyor."
                  : "Günlük hedefi kendin belirleyebilirsin."
              }
              arrow
              placement="top"
            >
              <span>
                <TextField
                  fullWidth
                  label="Günlük Hedef"
                  type="number"
                  value={waterData.dailyWaterTarget}
                  onChange={(e) => {
                    if (waterData.waterNotificationOption === "custom") {
                      handleWaterSettingChange(
                        "dailyWaterTarget",
                        Number(e.target.value)
                      );
                    }
                  }}
                  variant="filled"
                  disabled={waterData.waterNotificationOption === "smart"}
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
              </span>
            </Tooltip>
          </Grid>
        </Grid>
      </Box>

      {/* Responsive ve başlıksız hava durumu önerisi kutusu */}
      <Box
        sx={{
          maxWidth: { xs: '100%', sm: 400 },
          mx: "auto",
          mt: 2,
          position: "relative",
          borderRadius: "16px",
          background: "linear-gradient(135deg, #2196F3 0%, #21CBF3 100%)",
          boxShadow: "0 6px 24px rgba(33,150,243,0.15)",
          p: { xs: 2, sm: 3 },
          color: "#fff",
          textAlign: "center",
          fontSize: { xs: "1rem", sm: "1.1rem" },
          fontWeight: 500,
          mb: 2,
        }}
      >
        {weatherSuggestion}
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
