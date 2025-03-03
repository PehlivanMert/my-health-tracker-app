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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Slide,
  Container,
  useTheme,
  alpha,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { styled, keyframes } from "@mui/material/styles";
import Confetti from "react-confetti";
import Lottie from "lottie-react";
import waterAnimation from "../../assets/waterAnimation.json";
import { db } from "../auth/firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
} from "firebase/firestore";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  AreaChart,
  Area,
} from "recharts";
import styles from "./waterAnimation.module.css";

// ---------------------
// Utility Functions
// ---------------------

// Returns the current Turkey time
const getTurkeyTime = () =>
  new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));

// Fetches the user’s environmental context (temperature, activity level, time context) – mimicking the sendPushNotification.js logic :contentReference[oaicite:2]{index=2}
const getUserEnvironmentalContext = async (user) => {
  const context = {
    temperature: 22,
    activityLevel: "normal",
    timeContext: "day",
  };
  try {
    if (user.location && user.location.lat && user.location.lon) {
      const url = `${process.env.REACT_APP_OPEN_METEO_API_URL}?latitude=${user.location.lat}&longitude=${user.location.lon}&current_weather=true`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.current_weather) {
        context.temperature = data.current_weather.temperature;
        const weatherCode = data.current_weather.weathercode;
        if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(weatherCode)) {
          context.activityLevel = "low";
        } else if (context.temperature > 30) {
          context.activityLevel = "low";
        } else if (
          context.temperature > 18 &&
          context.temperature < 28 &&
          [0, 1, 2, 3].includes(weatherCode)
        ) {
          context.activityLevel = "high";
        }
      }
    }
    const nowTurkey = getTurkeyTime();
    const hour = nowTurkey.getHours();
    if (hour >= 6 && hour < 9) {
      context.timeContext = "morning";
    } else if (hour >= 12 && hour < 14) {
      context.timeContext = "lunch";
    } else if (hour >= 17 && hour < 20) {
      context.timeContext = "evening";
    } else if (hour >= 22 || hour < 6) {
      context.timeContext = "night";
      context.activityLevel = "low";
    }
  } catch (error) {
    console.error("Error getting environmental context:", error);
  }
  return context;
};

// Analyzes water consumption history to determine peak drinking hours :contentReference[oaicite:3]{index=3}
const analyzeWaterHabits = (waterHistory = []) => {
  if (!waterHistory || waterHistory.length < 5) return null;
  const hourlyDistribution = Array(24).fill(0);
  let totalEntries = 0;
  const recentHistory = waterHistory.slice(-14);
  recentHistory.forEach((entry) => {
    if (entry.timestamp) {
      const entryTime = entry.timestamp.toDate
        ? entry.timestamp.toDate()
        : new Date(entry.timestamp);
      const entryHour = entryTime.getHours();
      hourlyDistribution[entryHour]++;
      totalEntries++;
    }
  });
  if (totalEntries === 0) return null;
  const normalizedDistribution = hourlyDistribution.map(
    (count) => count / totalEntries
  );
  const peakHours = normalizedDistribution
    .map((val, idx) => ({ hour: idx, value: val }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .filter((peak) => peak.value > 0);
  return {
    peakHours,
    hourlyDistribution: normalizedDistribution,
  };
};

// Computes a dynamic water reminder interval based on user profile, current weather, time of day and water history – following sendPushNotification.js :contentReference[oaicite:4]{index=4}, :contentReference[oaicite:5]{index=5}
const computeDynamicWaterInterval = async (user, waterData) => {
  if (
    waterData.waterNotificationOption === "custom" &&
    waterData.customNotificationInterval
  ) {
    return Number(waterData.customNotificationInterval) * 60;
  } else if (waterData.waterNotificationOption === "smart") {
    let intervalMinutes = 120;
    const envContext = await getUserEnvironmentalContext(user);
    let weight = user.profile && user.profile.weight ? user.profile.weight : 70;
    let age = user.profile && user.profile.age ? user.profile.age : 30;
    let height =
      user.profile && user.profile.height ? user.profile.height : 170;
    let baseRate = 0.55 * weight; // ml/dakika
    const activityMultiplier = { low: 0.8, normal: 1.0, high: 1.3 };
    baseRate *= activityMultiplier[envContext.activityLevel] || 1.0;
    if (envContext.temperature > 30) {
      baseRate *= 1.4;
    } else if (envContext.temperature > 25) {
      baseRate *= 1.2;
    } else if (envContext.temperature < 10) {
      baseRate *= 0.9;
    }
    const nowTurkey = getTurkeyTime();
    const hour = nowTurkey.getHours();
    if (hour >= 6 && hour < 10) {
      baseRate *= 1.3;
    } else if (hour >= 22 || hour < 6) {
      baseRate *= 0.5;
    }
    if (age > 50) {
      baseRate *= 0.9;
    } else if (age < 18) {
      baseRate *= 1.1;
    }
    const bmi = weight / Math.pow(height / 100, 2);
    if (bmi > 25) {
      baseRate *= 1.1;
    } else if (bmi < 18.5) {
      baseRate *= 0.9;
    }
    let glassSize = waterData.glassSize || 250;
    let computedInterval = Math.round(glassSize / baseRate);
    const habits = waterData.history
      ? analyzeWaterHabits(waterData.history)
      : null;
    if (habits && habits.peakHours.length > 0) {
      const currentHour = nowTurkey.getHours();
      const isNearPeakHour = habits.peakHours.some(
        (peak) => Math.abs(peak.hour - currentHour) <= 1 && peak.value > 0.15
      );
      if (isNearPeakHour) {
        computedInterval = Math.round(computedInterval * 0.8);
      }
    }
    intervalMinutes = Math.max(5, Math.min(computedInterval, 120));
    const percentCompleted =
      (waterData.waterIntake / waterData.dailyWaterTarget) * 100;
    if (percentCompleted < 30 && envContext.timeContext === "evening") {
      intervalMinutes = Math.round(intervalMinutes * 0.7);
    } else if (percentCompleted > 80) {
      intervalMinutes = Math.round(intervalMinutes * 1.3);
    }
    return intervalMinutes;
  }
  return 120;
};

// Computes water reminder times based on the global notification window and dynamic interval :contentReference[oaicite:6]{index=6}
const computeReminderTimes = async (user, waterData) => {
  if (!waterData.notificationWindow && !user.notificationWindow) return [];
  const nowTurkey = getTurkeyTime();
  const todayStr = nowTurkey.toLocaleDateString("en-CA");
  const windowStartStr = user.notificationWindow?.start || "08:00";
  const windowEndStr = user.notificationWindow?.end || "22:00";
  const windowStart = new Date(`${todayStr}T${windowStartStr}:00`);
  const windowEnd = new Date(`${todayStr}T${windowEndStr}:00`);
  const dynamicInterval = await computeDynamicWaterInterval(user, waterData);
  const reminderTimes = [];
  let t = Math.max(windowStart.getTime(), nowTurkey.getTime());
  while (t <= windowEnd.getTime()) {
    reminderTimes.push(new Date(t));
    t += dynamicInterval * 60000;
  }
  return reminderTimes;
};

// Gets the next water reminder time
const getNextReminderTime = async (user, waterData) => {
  const reminderTimes = await computeReminderTimes(user, waterData);
  const now = new Date();
  for (const time of reminderTimes) {
    if (time > now) return time;
  }
  return null;
};

// ---------------------
// Styled Components & Animations
// ---------------------

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
  100% { transform: translateY(0px); }
`;
const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;
const ripple = keyframes`
  0% { transform: scale(0.95); opacity: 0.7; }
  50% { transform: scale(1.05); opacity: 0.4; }
  100% { transform: scale(0.95); opacity: 0.7; }
`;

const GlowingCard = styled(Card, {
  shouldForwardProp: (prop) => prop !== "glowColor",
})(({ glowColor }) => ({
  position: "relative",
  background: "rgba(255, 255, 255, 0.1)",
  backdropFilter: "blur(10px)",
  borderRadius: "24px",
  overflow: "hidden",
  border: "1px solid rgba(33, 150, 243, 0.2)",
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
  boxShadow: "0 3px 5px 2px rgba(33, 150, 243, .3)",
  color: "white",
  padding: "12px 35px",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  position: "relative",
  overflow: "hidden",
  "&:hover": {
    transform: "scale(1.05)",
    boxShadow: "0 5px 15px 3px rgba(33, 150, 243, .4)",
  },
  "&::after": {
    content: '""',
    position: "absolute",
    top: "-50%",
    left: "-50%",
    width: "200%",
    height: "200%",
    background:
      "linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent)",
    transform: "rotate(45deg)",
    animation: `${ripple} 2s infinite`,
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
}));

const StyledAccordionSummary = styled(AccordionSummary)(({ theme }) => ({
  background: "linear-gradient(45deg, #2196F3 30%, #3F51B5 90%)",
  borderRadius: 25,
  boxShadow: "0 3px 5px 2px rgba(33, 150, 243, 0.3)",
  color: "white",
  padding: "12px 35px",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  position: "relative",
  overflow: "hidden",
  cursor: "pointer",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  "&:hover": {
    transform: "scale(1.05)",
    boxShadow: "0 5px 15px 3px rgba(33, 150, 243, 0.4)",
  },
  "&::after": {
    content: '""',
    position: "absolute",
    top: "-50%",
    left: "-50%",
    width: "200%",
    height: "200%",
    background:
      "linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent)",
    transform: "rotate(45deg)",
    animation: `${ripple} 2s infinite`,
  },
  "&.Mui-expanded": {
    background: "transparent",
    boxShadow: "none",
    transform: "none",
    "&::after": { display: "none" },
  },
}));

// ---------------------
// Components
// ---------------------

// Achievement Component – displays a congratulatory message and confetti when a goal is reached.
const Achievement = ({ message }) => (
  <Box
    sx={{
      position: "fixed",
      top: "20%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      backgroundColor: "rgba(0,0,0,0.7)",
      color: "#fff",
      padding: "20px",
      borderRadius: "10px",
      zIndex: 9999,
    }}
  >
    <Typography variant="h4">{message}</Typography>
  </Box>
);

// Weather Widget Component
const WeatherWidget = ({ userLocation }) => {
  const [temperature, setTemperature] = useState(null);
  useEffect(() => {
    const fetchWeather = async () => {
      if (userLocation && userLocation.lat && userLocation.lon) {
        try {
          const response = await fetch(
            `${process.env.REACT_APP_OPEN_METEO_API_URL}?latitude=${userLocation.lat}&longitude=${userLocation.lon}&current_weather=true`
          );
          const data = await response.json();
          if (data.current_weather) {
            setTemperature(data.current_weather.temperature);
          }
        } catch (error) {
          console.error("Hava durumu alınamadı:", error);
        }
      }
    };
    fetchWeather();
  }, [userLocation]);
  return (
    <Box sx={{ color: "#fff", mt: 2 }}>
      {temperature !== null ? (
        <Typography variant="body2">
          Şu anki sıcaklık: {temperature}°C
        </Typography>
      ) : (
        <Typography variant="body2">Hava durumu alınamadı.</Typography>
      )}
    </Box>
  );
};

// Global Notification Settings Dialog
const NotificationSettingsDialog = ({ open, onClose, user, onSave }) => {
  const [start, setStart] = useState(user.notificationWindow?.start || "08:00");
  const [end, setEnd] = useState(user.notificationWindow?.end || "22:00");
  const handleSave = () => {
    onSave({ start, end });
    onClose();
  };
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Global Bildirim Ayarları</DialogTitle>
      <DialogContent>
        <TextField
          label="Başlangıç Saati"
          type="time"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
          sx={{ mt: 2 }}
        />
        <TextField
          label="Bitiş Saati"
          type="time"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>İptal</Button>
        <Button onClick={handleSave}>Kaydet</Button>
      </DialogActions>
    </Dialog>
  );
};

// Water Notification Settings Dialog
const WaterNotificationSettingsDialog = ({
  open,
  onClose,
  waterSettings,
  onSave,
}) => {
  const [notificationOption, setNotificationOption] = useState(
    waterSettings.waterNotificationOption || "smart"
  );
  const [customInterval, setCustomInterval] = useState(
    waterSettings.customNotificationInterval || 1
  );
  const handleSave = () => {
    onSave({
      waterNotificationOption: notificationOption,
      customNotificationInterval: customInterval,
    });
    onClose();
  };
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Su Bildirim Ayarları</DialogTitle>
      <DialogContent>
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>Mod Seçimi</InputLabel>
          <Select
            value={notificationOption}
            label="Mod Seçimi"
            onChange={(e) => setNotificationOption(e.target.value)}
          >
            <MenuItem value="none">Kapalı</MenuItem>
            <MenuItem value="smart">
              Akıllı (Hava & Geçmiş Veriye Göre)
            </MenuItem>
            <MenuItem value="custom">Özel (Kaç saatte bir)</MenuItem>
          </Select>
        </FormControl>
        {notificationOption === "custom" && (
          <TextField
            label="Bildirim Aralığı (saat)"
            type="number"
            fullWidth
            value={customInterval}
            onChange={(e) => setCustomInterval(Number(e.target.value))}
            InputLabelProps={{ shrink: true }}
            sx={{ mt: 2 }}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>İptal</Button>
        <Button onClick={handleSave}>Kaydet</Button>
      </DialogActions>
    </Dialog>
  );
};

// Supplement Notification Settings Dialog
const SupplementNotificationSettingsDialog = ({
  open,
  onClose,
  supplements,
  onSave,
}) => {
  const [localSupps, setLocalSupps] = useState([]);
  useEffect(() => {
    if (open) {
      setLocalSupps(
        supplements.map((supp) => ({
          id: supp.id,
          name: supp.name,
          notificationSchedule: supp.notificationSchedule
            ? supp.notificationSchedule.join(", ")
            : "",
          estimatedRemainingDays:
            supp.quantity && supp.dailyUsage
              ? (supp.quantity / supp.dailyUsage).toFixed(1)
              : "N/A",
        }))
      );
    }
  }, [open, supplements]);
  const handleChange = (id, field, value) => {
    setLocalSupps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };
  const handleSave = () => {
    const updatedSupps = localSupps.map((s) => ({
      id: s.id,
      notificationSchedule: s.notificationSchedule
        ? s.notificationSchedule.split(",").map((time) => time.trim())
        : [],
    }));
    onSave(updatedSupps);
    onClose();
  };
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Takviye Bildirim Ayarları</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2, color: "#555" }}>
          Lütfen, takviyeleriniz için bildirim gönderilmesini istediğiniz
          saatleri virgülle ayırarak giriniz (örn: "08:00, 14:00"). Eğer
          planlanmış zaman eklemezseniz, sistem kalan miktar ve günlük kullanım
          miktarınıza göre otomatik olarak hatırlatma yapar.
        </Typography>
        {localSupps.map((supp) => (
          <Box
            key={supp.id}
            sx={{ mb: 2, borderBottom: "1px solid rgba(0,0,0,0.1)", pb: 1 }}
          >
            <Typography variant="subtitle1">{supp.name}</Typography>
            <TextField
              label="Planlanmış Bildirim Zamanları"
              fullWidth
              value={supp.notificationSchedule}
              onChange={(e) =>
                handleChange(supp.id, "notificationSchedule", e.target.value)
              }
              helperText="Örn: 08:00, 14:00"
              sx={{ mb: 1 }}
            />
            <Typography variant="caption" sx={{ color: "#555" }}>
              Otomatik hesaplama (takviyeniz ne kadar gün kalacak):{" "}
              {supp.estimatedRemainingDays} gün
            </Typography>
          </Box>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>İptal</Button>
        <Button onClick={handleSave}>Kaydet</Button>
      </DialogActions>
    </Dialog>
  );
};

// WaterTracker Component – handles water intake, resetting daily values, and displaying water reminders.
// The computeReminderTimes function has been updated to use the dynamic interval from sendPushNotification.js :contentReference[oaicite:7]{index=7}.
const WaterTracker = ({ user, onWaterDataChange }) => {
  const [waterData, setWaterData] = useState({
    waterIntake: 0,
    dailyWaterTarget: 2000,
    glassSize: 250,
    history: [],
    yesterdayWaterIntake: 0,
    lastResetDate: null,
    waterNotificationOption: "smart", // "none", "smart", "custom"
    customNotificationInterval: 1,
    notificationWindow: { start: "08:00", end: "22:00" },
  });
  const [currentTemperature, setCurrentTemperature] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [achievement, setAchievement] = useState(null);
  const [waterNotifDialogOpen, setWaterNotifDialogOpen] = useState(false);
  const theme = useTheme();
  const timerRef = useRef(null);

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
      });
      await checkIfResetNeeded(data);
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

  const fetchTemperature = async () => {
    if (user.location && user.location.lat && user.location.lon) {
      try {
        const url = `${process.env.REACT_APP_OPEN_METEO_API_URL}?latitude=${user.location.lat}&longitude=${user.location.lon}&current_weather=true`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.current_weather) {
          setCurrentTemperature(data.current_weather.temperature);
        }
      } catch (error) {
        console.error("Hava durumu alınamadı:", error);
      }
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchWaterData();
    fetchTemperature();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [user]);

  useEffect(() => {
    if (onWaterDataChange) onWaterDataChange(waterData);
  }, [waterData, onWaterDataChange]);

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
      setAchievement("Tebrikler!");
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

  const [nextReminder, setNextReminder] = useState(null);
  useEffect(() => {
    const updateNextReminder = async () => {
      const next = await getNextReminderTime(user, waterData);
      setNextReminder(next);
    };
    updateNextReminder();
    const interval = setInterval(updateNextReminder, 60000);
    return () => clearInterval(interval);
  }, [waterData, user]);

  const fillPercentage = Math.min(
    (waterData.waterIntake / waterData.dailyWaterTarget) * 100,
    100
  );

  return (
    <Box sx={{ textAlign: "center", mb: 6 }}>
      {showConfetti && <Confetti recycle={false} numberOfPieces={400} />}
      {achievement && <Achievement message={achievement} />}
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
      <WaterContainer>
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
                sx={{ color: "#fff" }}
              >
                {waterData.waterNotificationOption === "none" ? (
                  <NotificationsOffIcon />
                ) : (
                  <NotificationsIcon />
                )}
              </IconButton>
            </Tooltip>
            {waterData.waterNotificationOption !== "none" && nextReminder && (
              <Typography variant="caption" sx={{ color: "#fff", mt: 1 }}>
                {nextReminder.toLocaleTimeString("tr-TR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Typography>
            )}
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
        </Box>
      </WaterContainer>
      <Box sx={{ mt: 2, maxWidth: 400, mx: "auto" }}>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField
              label="Bardak Boyutu (ml)"
              type="number"
              value={waterData.glassSize}
              onChange={(e) =>
                handleWaterSettingChange("glassSize", Number(e.target.value))
              }
              variant="outlined"
              fullWidth
              sx={{
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "rgba(255,255,255,0.1)",
                  color: "#fff",
                  backdropFilter: "blur(10px)",
                  borderRadius: 2,
                  transition: "all 0.3s ease",
                  "&:hover": { backgroundColor: "rgba(255,255,255,0.15)" },
                },
                "& .MuiInputLabel-root": { color: "#fff" },
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(255,255,255,0.3)",
                },
              }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Günlük Su Hedefi (ml)"
              type="number"
              value={waterData.dailyWaterTarget}
              onChange={(e) =>
                handleWaterSettingChange(
                  "dailyWaterTarget",
                  Number(e.target.value)
                )
              }
              variant="outlined"
              fullWidth
              sx={{
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "rgba(255,255,255,0.1)",
                  color: "#fff",
                  backdropFilter: "blur(10px)",
                  borderRadius: 2,
                  transition: "all 0.3s ease",
                  "&:hover": { backgroundColor: "rgba(255,255,255,0.15)" },
                },
                "& .MuiInputLabel-root": { color: "#fff" },
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(255,255,255,0.3)",
                },
              }}
            />
          </Grid>
        </Grid>
      </Box>
      <Box sx={{ mt: 2 }}>
        <Card
          sx={{
            borderRadius: "16px",
            padding: 1,
            maxWidth: "250px",
            margin: "0 auto",
            background: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.3)",
          }}
        >
          <CardContent sx={{ padding: "8px" }}>
            <Typography
              variant="subtitle1"
              sx={{ color: "#fff", textAlign: "center", fontWeight: "bold" }}
            >
              Dün {waterData.yesterdayWaterIntake} ml su içtin! Harika!
            </Typography>
          </CardContent>
        </Card>
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

// Water Consumption Chart Component
const WaterConsumptionChart = ({ waterHistory }) => {
  const [timeRange, setTimeRange] = useState("month");
  const [displayType, setDisplayType] = useState("area");
  const now = new Date();
  const filteredData = waterHistory
    .filter((entry) => {
      const entryDate = new Date(entry.date + "T00:00:00");
      if (timeRange === "year") {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        return entryDate >= oneYearAgo;
      } else if (timeRange === "month") {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        return entryDate >= oneMonthAgo;
      } else if (timeRange === "week") {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return entryDate >= oneWeekAgo;
      } else if (timeRange === "current") {
        return (
          entryDate.getMonth() === now.getMonth() &&
          entryDate.getFullYear() === now.getFullYear()
        );
      }
      return true;
    })
    .map((entry) => ({
      ...entry,
      date: new Date(entry.date + "T00:00:00").toLocaleDateString("tr-TR"),
    }));
  const averageWaterIntake =
    filteredData.length > 0
      ? (
          filteredData.reduce((sum, entry) => sum + entry.intake, 0) /
          filteredData.length
        ).toFixed(1)
      : 0;
  return (
    <GlowingCard glowColor="#3F51B522">
      <CardContent>
        <Typography
          variant="h6"
          sx={{ fontWeight: 700, color: "#fff", mb: 2, textAlign: "center" }}
        >
          Su Tüketimi
        </Typography>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mb: 2,
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel
              id="water-time-range-label"
              sx={{ color: "#fff", fontSize: "0.75rem" }}
            >
              Zaman Aralığı
            </InputLabel>
            <Select
              labelId="water-time-range-label"
              value={timeRange}
              label="Zaman Aralığı"
              onChange={(e) => setTimeRange(e.target.value)}
              size="small"
              sx={{
                color: "#fff",
                fontSize: "0.75rem",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(255,255,255,0.3)",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(255,255,255,0.5)",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#3F51B5",
                },
              }}
            >
              <MenuItem value="year">1 Yıllık</MenuItem>
              <MenuItem value="month">1 Aylık</MenuItem>
              <MenuItem value="week">1 Haftalık</MenuItem>
              <MenuItem value="current">Bu Ay</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel
              id="water-display-type-label"
              sx={{ color: "#fff", fontSize: "0.75rem" }}
            >
              Görüntüleme Tipi
            </InputLabel>
            <Select
              labelId="water-display-type-label"
              value={displayType}
              label="Görüntüleme Tipi"
              onChange={(e) => setDisplayType(e.target.value)}
              size="small"
              sx={{
                color: "#fff",
                fontSize: "0.75rem",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(255,255,255,0.3)",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(255,255,255,0.5)",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#3F51B5",
                },
              }}
            >
              <MenuItem value="area">Alan Grafiği</MenuItem>
              <MenuItem value="bar">Çubuk Grafiği</MenuItem>
            </Select>
          </FormControl>
        </Box>
        {filteredData.length > 0 && (
          <Box sx={{ mb: 2, textAlign: "center" }}>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
              Ortalama günlük su tüketimi:
              <Typography
                component="span"
                variant="body2"
                sx={{
                  ml: 1,
                  color: "rgba(255,255,255,0.7)",
                  fontWeight: "bold",
                }}
              >
                {averageWaterIntake} mL
              </Typography>
            </Typography>
          </Box>
        )}
        {filteredData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            {displayType === "area" ? (
              <AreaChart data={filteredData}>
                <defs>
                  <linearGradient id="waterColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fff" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3F51B5" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.2)"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#fff", fontSize: 12 }}
                  stroke="rgba(255,255,255,0.5)"
                />
                <YAxis
                  tick={{ fill: "#fff", fontSize: 12 }}
                  stroke="rgba(255,255,255,0.5)"
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "rgba(0, 10, 50, 0.8)",
                    border: "none",
                    borderRadius: "10px",
                    color: "#fff",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="intake"
                  stroke="#5c6bc0"
                  fillOpacity={1}
                  fill="url(#waterColor)"
                  strokeWidth={3}
                  name="Su Tüketimi (mL)"
                />
              </AreaChart>
            ) : (
              <BarChart
                data={filteredData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.2)"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#fff", fontSize: 12 }}
                  stroke="rgba(255,255,255,0.5)"
                />
                <YAxis
                  tick={{ fill: "#fff", fontSize: 12 }}
                  stroke="rgba(255,255,255,0.5)"
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "rgba(0, 10, 50, 0.8)",
                    border: "none",
                    borderRadius: "10px",
                    color: "#fff",
                  }}
                />
                <Legend
                  wrapperStyle={{ color: "#fff" }}
                  formatter={(value) => (
                    <span style={{ color: "#fff" }}>{value}</span>
                  )}
                />
                <Bar
                  dataKey="intake"
                  fill="#3F51B5"
                  name="Su Tüketimi (mL)"
                  radius={[4, 4, 0, 0]}
                  animationDuration={1500}
                  animationEasing="ease-out"
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        ) : (
          <Box
            sx={{
              height: 250,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              bgcolor: "rgba(255, 255, 255, 0.1)",
              borderRadius: 2,
              p: 2,
            }}
          >
            <WaterDropIcon
              sx={{ fontSize: 60, color: "rgba(255,255,255,0.7)", mb: 2 }}
            />
            <Typography variant="body1" color="#fff" align="center">
              Henüz su tüketim verisi bulunmamaktadır
            </Typography>
            <Typography
              variant="body2"
              color="rgba(255,255,255,0.7)"
              mt={1}
              textAlign="center"
            >
              Su tüketimlerinizi girdiğinizde istatistikleriniz burada
              görünecektir
            </Typography>
          </Box>
        )}
      </CardContent>
    </GlowingCard>
  );
};

// Supplement Consumption Chart Component
const SupplementConsumptionChart = ({
  user,
  supplements,
  onOpenSupplementNotificationSettings,
}) => {
  const [consumptionData, setConsumptionData] = useState([]);
  const [timeRange, setTimeRange] = useState("month");
  const [displayType, setDisplayType] = useState("bar");
  const theme = useTheme();
  const now = new Date();
  const getConsumptionDocRef = () =>
    doc(db, "users", user.uid, "stats", "supplementConsumption");
  const fetchConsumptionData = async () => {
    const ref = getConsumptionDocRef();
    try {
      const docSnap = await getDoc(ref);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const sortedDates = Object.keys(data).sort(
          (a, b) => new Date(a + "T00:00:00") - new Date(b + "T00:00:00")
        );
        const allSuppNames = new Set();
        sortedDates.forEach((date) => {
          Object.keys(data[date]).forEach((suppName) => {
            if (suppName !== "total") allSuppNames.add(suppName);
          });
        });
        const chartData = sortedDates.map((date) => {
          const dayStats = data[date];
          const dayData = {
            date: new Date(date + "T00:00:00").toLocaleDateString("tr-TR"),
            fullDate: date,
          };
          allSuppNames.forEach((suppName) => {
            dayData[suppName] = dayStats[suppName] || 0;
          });
          return dayData;
        });
        setConsumptionData(chartData);
      }
    } catch (error) {
      console.error("Error fetching supplement consumption data:", error);
    }
  };
  useEffect(() => {
    if (user) fetchConsumptionData();
  }, [user]);
  const getFilteredData = () => {
    return consumptionData.filter((entry) => {
      const entryDate = new Date(entry.fullDate + "T00:00:00");
      if (timeRange === "year") {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        return entryDate >= oneYearAgo;
      } else if (timeRange === "month") {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        return entryDate >= oneMonthAgo;
      } else if (timeRange === "week") {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return entryDate >= oneWeekAgo;
      } else if (timeRange === "current") {
        return (
          entryDate.getMonth() === now.getMonth() &&
          entryDate.getFullYear() === now.getFullYear()
        );
      }
      return true;
    });
  };
  const colors = [
    "#4CAF50",
    "#FF9800",
    "#F44336",
    "#2196F3",
    "#9C27B0",
    "#00BCD4",
    "#FFEB3B",
    "#795548",
  ];
  const filteredData = getFilteredData();
  const suppKeys =
    filteredData.length > 0
      ? Array.from(
          new Set(
            filteredData.flatMap((day) =>
              Object.keys(day).filter(
                (key) => key !== "date" && key !== "total" && key !== "fullDate"
              )
            )
          )
        )
      : [];
  return (
    <GlowingCard glowColor="#3F51B522">
      <CardContent>
        <Box sx={{ textAlign: "center", width: "100%" }}>
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, color: "#fff", mb: 2 }}
          >
            Takviye İstatistikleri
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mb: 2,
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel
              id="supp-time-range-label"
              sx={{ color: "#fff", fontSize: "0.75rem" }}
            >
              Zaman Aralığı
            </InputLabel>
            <Select
              labelId="supp-time-range-label"
              value={timeRange}
              label="Zaman Aralığı"
              onChange={(e) => setTimeRange(e.target.value)}
              size="small"
              sx={{
                color: "#fff",
                fontSize: "0.75rem",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(255,255,255,0.3)",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(255,255,255,0.5)",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#3F51B5",
                },
              }}
            >
              <MenuItem value="year">1 Yıllık</MenuItem>
              <MenuItem value="month">1 Aylık</MenuItem>
              <MenuItem value="week">1 Haftalık</MenuItem>
              <MenuItem value="current">Bu Ay</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel
              id="display-type-label"
              sx={{ color: "#fff", fontSize: "0.75rem" }}
            >
              Görüntüleme Tipi
            </InputLabel>
            <Select
              labelId="display-type-label"
              value={displayType}
              label="Görüntüleme Tipi"
              onChange={(e) => setDisplayType(e.target.value)}
              size="small"
              sx={{
                color: "#fff",
                fontSize: "0.75rem",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(255,255,255,0.3)",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(255,255,255,0.5)",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#3F51B5",
                },
              }}
            >
              <MenuItem value="bar">Gruplanmış</MenuItem>
              <MenuItem value="stacked">Yığılmış</MenuItem>
            </Select>
          </FormControl>
        </Box>
        {filteredData.length > 0 ? (
          <ResponsiveContainer width="100%" height={285}>
            <BarChart
              data={filteredData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.2)"
              />
              <XAxis
                dataKey="date"
                tick={{ fill: "#fff", fontSize: 12 }}
                stroke="rgba(255,255,255,0.5)"
              />
              <YAxis
                tick={{ fill: "#fff", fontSize: 12 }}
                stroke="rgba(255,255,255,0.5)"
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: "rgba(0, 10, 50, 0.8)",
                  border: "none",
                  borderRadius: "10px",
                  color: "#fff",
                }}
              />
              <Legend
                wrapperStyle={{ color: "#fff" }}
                formatter={(value) => (
                  <span style={{ color: "#fff" }}>{value}</span>
                )}
              />
              {suppKeys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={colors[index % colors.length]}
                  name={key}
                  radius={[4, 4, 0, 0]}
                  stackId={displayType === "stacked" ? "a" : undefined}
                  animationDuration={1500}
                  animationEasing="ease-out"
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Box
            sx={{
              height: 250,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              bgcolor: "rgba(255, 255, 255, 0.1)",
              borderRadius: 2,
              p: 2,
            }}
          >
            <EmojiEventsIcon
              sx={{ fontSize: 60, color: "rgba(255,255,255,0.7)", mb: 2 }}
            />
            <Typography variant="body1" color="#fff" align="center">
              Henüz takviye kullanım verisi bulunmamaktadır
            </Typography>
            <Typography
              variant="body2"
              color="rgba(255,255,255,0.7)"
              mt={1}
              textAlign="center"
            >
              Takviyeleri kullanmaya başladığınızda istatistikleriniz
              görünecektir
            </Typography>
          </Box>
        )}
      </CardContent>
    </GlowingCard>
  );
};

// Main WellnessTracker Component
const WellnessTracker = ({ user }) => {
  if (!user) return <div>Lütfen giriş yapın</div>;

  const [supplements, setSupplements] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [newSupplement, setNewSupplement] = useState({
    name: "",
    quantity: 0,
    dailyUsage: 1,
  });
  const [waterData, setWaterData] = useState({ history: [] });
  const [supplementConsumptionToday, setSupplementConsumptionToday] = useState(
    {}
  );
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [
    supplementNotificationDialogOpen,
    setSupplementNotificationDialogOpen,
  ] = useState(false);
  const [waterNotifDialogOpen, setWaterNotifDialogOpen] = useState(false);

  const getSupplementsRef = () =>
    collection(db, "users", user.uid, "supplements");

  const fetchSupplements = async () => {
    const ref = getSupplementsRef();
    try {
      const querySnapshot = await getDocs(ref);
      const supplementsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSupplements(supplementsData);
    } catch (error) {
      console.error("Error fetching supplements:", error);
    }
  };

  const fetchSupplementConsumptionToday = async () => {
    const docRef = doc(db, "users", user.uid, "stats", "supplementConsumption");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const today = new Date().toLocaleDateString("en-CA", {
        timeZone: "Europe/Istanbul",
      });
      setSupplementConsumptionToday(data[today] || {});
    }
  };

  useEffect(() => {
    fetchSupplements();
    fetchSupplementConsumptionToday();
  }, [user]);

  const handleAddSupplement = async () => {
    const ref = getSupplementsRef();
    try {
      await addDoc(ref, {
        ...newSupplement,
        quantity: Number(newSupplement.quantity),
        initialQuantity: Number(newSupplement.quantity),
        dailyUsage: Number(newSupplement.dailyUsage),
      });
      await fetchSupplements();
      setOpenDialog(false);
      setNewSupplement({ name: "", quantity: 0, dailyUsage: 1 });
    } catch (error) {
      console.error("Error adding supplement:", error);
    }
  };

  const handleConsume = async (id) => {
    const ref = getSupplementsRef();
    try {
      const supplement = supplements.find((supp) => supp.id === id);
      const newQuantity = Math.max(0, supplement.quantity - 1);
      const supplementRef = doc(ref, id);
      await updateDoc(supplementRef, { quantity: newQuantity });
      await fetchSupplements();
      const suppName = supplement.name;
      const today = new Date().toLocaleDateString("en-CA", {
        timeZone: "Europe/Istanbul",
      });
      const statsDocRef = doc(
        db,
        "users",
        user.uid,
        "stats",
        "supplementConsumption"
      );
      const statsDocSnap = await getDoc(statsDocRef);
      let updatedStats = statsDocSnap.exists() ? statsDocSnap.data() : {};
      if (!updatedStats[today]) updatedStats[today] = {};
      updatedStats[today][suppName] = (updatedStats[today][suppName] || 0) + 1;
      updatedStats[today].total = (updatedStats[today].total || 0) + 1;
      await setDoc(statsDocRef, updatedStats);
      await fetchSupplementConsumptionToday();
    } catch (error) {
      console.error("Error consuming supplement:", error);
    }
  };

  const handleDelete = async (id) => {
    const ref = getSupplementsRef();
    try {
      const supplementRef = doc(ref, id);
      await deleteDoc(supplementRef);
      await fetchSupplements();
    } catch (error) {
      console.error("Error deleting supplement:", error);
    }
  };

  const handleSaveNotificationWindow = async (window) => {
    const userRef = doc(db, "users", user.uid);
    try {
      await setDoc(userRef, { notificationWindow: window }, { merge: true });
    } catch (error) {
      console.error("Bildirim ayarları güncelleme hatası:", error);
    }
  };

  const handleSaveSupplementNotifications = async (updatedSupplements) => {
    const ref = getSupplementsRef();
    try {
      for (const supp of updatedSupplements) {
        const suppRef = doc(ref, supp.id);
        await updateDoc(suppRef, {
          notificationSchedule: supp.notificationSchedule,
        });
      }
      await fetchSupplements();
    } catch (error) {
      console.error("Takviye bildirim ayarları güncelleme hatası:", error);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #1a2a6c 0%, #2196F3 50%, #3F51B5 100%)",
        padding: { xs: 2, md: 4 },
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: { xs: 2, md: 4 },
          }}
        >
          <Typography
            variant="h2"
            sx={{
              textAlign: "center",
              color: "#fff",
              fontWeight: 800,
              mt: { xs: 4, md: 6 },
              textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
              animation: `${float} 3s ease-in-out infinite`,
              fontSize: { xs: "2rem", md: "3rem" },
            }}
          >
            <WaterDropIcon
              sx={{ fontSize: { xs: 30, md: 50 }, color: "lightblue", mr: 2 }}
            />
            Takviye Takibi
          </Typography>
          <Box>
            <Tooltip title="Global Bildirim Ayarları">
              <IconButton
                onClick={() => setNotificationDialogOpen(true)}
                sx={{ color: "#fff" }}
              >
                <NotificationsIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        {user.location && <WeatherWidget userLocation={user.location} />}
        <WaterTracker user={user} onWaterDataChange={setWaterData} />
        <Box sx={{ mt: 4, textAlign: "center" }}>
          <AnimatedButton
            onClick={() => setOpenDialog(true)}
            startIcon={<AddIcon />}
            sx={{ minWidth: 200 }}
          >
            Yeni Takviye Ekle
          </AnimatedButton>
        </Box>
        <Accordion
          defaultExpanded={false}
          sx={{
            background: "transparent",
            boxShadow: "none",
            color: "#fff",
            mt: 4,
          }}
        >
          <StyledAccordionSummary>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                width: "100%",
                justifyContent: "space-between",
              }}
            >
              <Typography variant="h5" sx={{ fontWeight: 700, color: "#fff" }}>
                Takviyeler
              </Typography>
              <Tooltip title="Takviye Bildirim Ayarları">
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    setSupplementNotificationDialogOpen(true);
                  }}
                  sx={{ color: "#fff" }}
                >
                  <NotificationsIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </StyledAccordionSummary>
          <AccordionDetails>
            <Grid container spacing={4} sx={{ mt: 2 }}>
              <AnimatePresence>
                {supplements.map((supplement) => (
                  <Grid item xs={12} sm={6} md={4} key={supplement.id}>
                    <GlowingCard
                      glowColor={
                        (supplement.quantity / supplement.initialQuantity) *
                          100 >
                        66
                          ? "#2196F3"
                          : (supplement.quantity / supplement.initialQuantity) *
                              100 >
                            33
                          ? "#00BCD4"
                          : "#3F51B5"
                      }
                    >
                      <CardContent sx={{ p: 4 }}>
                        <Box
                          display="flex"
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Typography
                            variant="h5"
                            sx={{ fontWeight: 700, color: "#fff" }}
                          >
                            {supplement.name}
                          </Typography>
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(supplement.id);
                            }}
                            sx={{
                              color: "#fff",
                              transition: "all 0.3s ease",
                              "&:hover": {
                                transform: "rotate(90deg)",
                                color: "#FF5252",
                              },
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                        <Box sx={{ mt: 3, mb: 3 }}>
                          <Typography
                            variant="body1"
                            sx={{ color: "#fff", opacity: 0.9, mb: 1 }}
                          >
                            Kalan: {supplement.quantity} /{" "}
                            {supplement.initialQuantity}
                          </Typography>
                          <Typography
                            variant="body1"
                            sx={{ color: "#fff", opacity: 0.9 }}
                          >
                            Tahmini Kalan Gün:{" "}
                            {Math.floor(
                              supplement.quantity / supplement.dailyUsage
                            )}
                          </Typography>
                          <Typography
                            variant="body1"
                            sx={{ color: "#fff", opacity: 0.9, mt: 1 }}
                          >
                            Bugün: Tüketilen{" "}
                            {supplementConsumptionToday[supplement.name] || 0} /
                            Kalan{" "}
                            {Math.max(
                              0,
                              supplement.dailyUsage -
                                (supplementConsumptionToday[supplement.name] ||
                                  0)
                            )}
                          </Typography>
                        </Box>
                        <AnimatedButton
                          fullWidth
                          onClick={() => handleConsume(supplement.id)}
                          disabled={supplement.quantity <= 0}
                          startIcon={<EmojiEventsIcon />}
                        >
                          Günlük Dozu Al
                        </AnimatedButton>
                      </CardContent>
                    </GlowingCard>
                  </Grid>
                ))}
              </AnimatePresence>
            </Grid>
          </AccordionDetails>
        </Accordion>
        <Accordion
          defaultExpanded={false}
          sx={{
            background: "transparent",
            boxShadow: "none",
            color: "#fff",
            mt: 4,
          }}
        >
          <StyledAccordionSummary>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "#fff" }}>
              İstatistikler
            </Typography>
          </StyledAccordionSummary>
          <AccordionDetails>
            <Grid container spacing={4} sx={{ mt: 2 }}>
              <Grid item xs={12} md={6}>
                <WaterConsumptionChart waterHistory={waterData.history} />
              </Grid>
              <Grid item xs={12} md={6}>
                <SupplementConsumptionChart
                  user={user}
                  supplements={supplements}
                  onOpenSupplementNotificationSettings={() =>
                    setSupplementNotificationDialogOpen(true)
                  }
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
        <Dialog
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          PaperProps={{
            sx: {
              background: "rgba(149, 157, 163, 0.83)",
              backdropFilter: "blur(10px)",
              borderRadius: "24px",
              padding: 2,
              border: "1px solid rgba(33,150,243,0.2)",
            },
          }}
        >
          <DialogTitle>Yeni Takviye Ekle</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Takviye Adı"
              fullWidth
              value={newSupplement.name}
              onChange={(e) =>
                setNewSupplement({ ...newSupplement, name: e.target.value })
              }
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Miktar"
              type="number"
              fullWidth
              value={newSupplement.quantity}
              onChange={(e) =>
                setNewSupplement({
                  ...newSupplement,
                  quantity: Number(e.target.value),
                })
              }
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Günlük Kullanım Miktarı"
              type="number"
              fullWidth
              value={newSupplement.dailyUsage}
              onChange={(e) =>
                setNewSupplement({
                  ...newSupplement,
                  dailyUsage: Number(e.target.value),
                })
              }
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>İptal</Button>
            <Button onClick={handleAddSupplement}>Ekle</Button>
          </DialogActions>
        </Dialog>
        <NotificationSettingsDialog
          open={notificationDialogOpen}
          onClose={() => setNotificationDialogOpen(false)}
          user={user}
          onSave={handleSaveNotificationWindow}
        />
        <SupplementNotificationSettingsDialog
          open={supplementNotificationDialogOpen}
          onClose={() => setSupplementNotificationDialogOpen(false)}
          supplements={supplements}
          onSave={handleSaveSupplementNotifications}
        />
      </Container>
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

export default WellnessTracker;
