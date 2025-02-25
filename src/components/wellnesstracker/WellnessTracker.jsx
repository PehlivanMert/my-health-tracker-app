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
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc,
} from "firebase/firestore";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  RadialBarChart,
  RadialBar,
} from "recharts";
import styles from "./waterAnimation.module.css";

// Animated keyframes
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

// Styled Components
const GlowingCard = styled(Card)(({ theme, glowColor }) => ({
  position: "relative",
  background: "rgba(33, 150, 243, 0.1)",
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
  "&:hover::before": {
    opacity: 1,
  },
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

// Özel StyledAccordionSummary: Accordion kapalıyken AnimatedButton benzeri görünsün
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
  // Accordion açıldığında (expanded) header sadeleşsin
  "&.Mui-expanded": {
    background: "transparent",
    boxShadow: "none",
    transform: "none",
    "&::after": {
      display: "none",
    },
  },
}));

// Color utility
const getVitaminColor = (remainingPercentage) => {
  if (remainingPercentage > 66) return "#2196F3";
  if (remainingPercentage > 33) return "#00BCD4";
  return "#3F51B5";
};

// Achievement Component
const Achievement = ({ message }) => (
  <Slide direction="down" in={true}>
    <Box
      sx={{
        position: "fixed",
        top: "10%",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 2000,
        background: "linear-gradient(45deg, #00E676 30%, #1DE9B6 90%)",
        borderRadius: "20px",
        padding: "20px 40px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
        animation: `${pulse} 1s infinite`,
      }}
    >
      <Typography variant="h5" sx={{ color: "white", textAlign: "center" }}>
        🎉 Tebrikler! 🎉
      </Typography>
    </Box>
  </Slide>
);

// VitaminCard Component
const VitaminCard = ({
  supplement,
  onConsume,
  onDelete,
  consumedToday = 0,
}) => {
  const remainingPercentage =
    (supplement.quantity / supplement.initialQuantity) * 100;
  const cardColor = getVitaminColor(remainingPercentage);
  const remainingForToday = Math.max(0, supplement.dailyUsage - consumedToday);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 0.5 }}
    >
      <GlowingCard glowColor={cardColor}>
        <CardContent sx={{ p: 4 }}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h5" sx={{ fontWeight: 700, color: "#fff" }}>
              {supplement.name}
            </Typography>
            <IconButton
              onClick={() => onDelete(supplement.id)}
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
              Kalan: {supplement.quantity} / {supplement.initialQuantity}
            </Typography>
            <Typography variant="body1" sx={{ color: "#fff", opacity: 0.9 }}>
              Tahmini Kalan Gün:{" "}
              {Math.floor(supplement.quantity / supplement.dailyUsage)}
            </Typography>
            <Typography
              variant="body1"
              sx={{ color: "#fff", opacity: 0.9, mt: 1 }}
            >
              Bugün: Tüketilen {consumedToday} / Kalan {remainingForToday}
            </Typography>
          </Box>

          <AnimatedButton
            fullWidth
            onClick={() => onConsume(supplement.id)}
            disabled={supplement.quantity <= 0}
            startIcon={<EmojiEventsIcon />}
          >
            Günlük Dozu Al
          </AnimatedButton>
        </CardContent>
      </GlowingCard>
    </motion.div>
  );
};

// YesterdayWaterCard Component
const YesterdayWaterCard = ({ amount }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5, ease: "easeOut" }}
  >
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
          Dün {amount} ml su içtin! Harika!
        </Typography>
      </CardContent>
    </Card>
  </motion.div>
);

// WaterTracker Component
const WaterTracker = ({ user, onWaterDataChange }) => {
  const [waterData, setWaterData] = useState({
    waterIntake: 0,
    dailyWaterTarget: 2000,
    glassSize: 250,
    history: [],
    yesterdayWaterIntake: 0,
  });
  const [showConfetti, setShowConfetti] = useState(false);
  const [achievement, setAchievement] = useState(null);
  const theme = useTheme();
  const timerRef = useRef(null);

  const getWaterDocRef = () => {
    return doc(db, "users", user.uid, "water", "current");
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
      });
    }
  };

  const resetDailyWaterIntake = async () => {
    try {
      // Türkiye saat dilimi için tarih ayarı
      const now = new Date(
        new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })
      );
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);

      const yesterdayStr = yesterday.toISOString().split("T")[0];
      const todayStr = now.toISOString().split("T")[0];

      // Firestore transaction ile güvenli güncelleme
      await runTransaction(db, async (transaction) => {
        const ref = getWaterDocRef();
        const doc = await transaction.get(ref);

        if (!doc.exists()) throw "Document does not exist!";

        const currentData = doc.data();
        const newHistory = currentData.history.filter(
          (entry) => entry.date !== yesterdayStr && entry.date !== todayStr
        );

        transaction.update(ref, {
          history: [
            ...newHistory,
            {
              date: yesterdayStr,
              intake: currentData.waterIntake,
            },
          ],
          yesterdayWaterIntake: currentData.waterIntake,
          waterIntake: 0,
        });
      });

      await fetchWaterData();
    } catch (error) {
      console.error("Reset error:", error);
    }
  };

  useEffect(() => {
    // Eğer user yoksa hiçbir hook çalıştırılmasın
    if (!user) return;
    fetchWaterData();
    const scheduleMidnightReset = () => {
      const now = new Date();
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1
      );
      const msUntilMidnight = nextMidnight - now;
      timerRef.current = setTimeout(() => {
        resetDailyWaterIntake();
        scheduleMidnightReset();
      }, msUntilMidnight);
    };
    scheduleMidnightReset();
    return () => clearTimeout(timerRef.current);
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
      await setDoc(ref, { [field]: Number(value) }, { merge: true });
      await fetchWaterData();
    } catch (error) {
      console.error("Error updating water settings:", error);
    }
  };

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
            sx={{ display: "flex", justifyContent: "center", gap: 3, mt: 2 }}
          >
            <Tooltip title="Remove Water" placement="left">
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
            <Tooltip title="Add Water" placement="right">
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
                handleWaterSettingChange("glassSize", e.target.value)
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
                handleWaterSettingChange("dailyWaterTarget", e.target.value)
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
        <YesterdayWaterCard amount={waterData.yesterdayWaterIntake} />
      </Box>
    </Box>
  );
};

// WaterConsumptionChart Component
const WaterConsumptionChart = ({ waterHistory }) => {
  const formattedData = waterHistory.slice(-7).map((entry) => ({
    ...entry,
    date: new Date(entry.date).toLocaleDateString("tr-TR"),
  }));

  return (
    <GlowingCard glowColor="#2196F322">
      <CardContent>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            color: "#fff",
            mb: 3,
            textAlign: "center",
          }}
        >
          Son 7 Gün Su Tüketimi
        </Typography>

        {formattedData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={formattedData}>
              <defs>
                <linearGradient id="waterColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2196F3" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#2196F3" stopOpacity={0.1} />
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
                stroke="#4dabf5"
                fillOpacity={1}
                fill="url(#waterColor)"
                strokeWidth={3}
                activeDot={{
                  r: 8,
                  fill: "#fff",
                  stroke: "#2196F3",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <Box
            sx={{
              height: 250,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              borderRadius: 2,
              padding: 2,
            }}
          >
            <WaterDropIcon
              sx={{ fontSize: 60, color: "rgba(255, 255, 255, 0.7)", mb: 2 }}
            />
            <Typography variant="body1" color="#fff" textAlign="center">
              Henüz su tüketim verisi bulunmamaktadır
            </Typography>
            <Typography
              variant="body2"
              color="rgba(255, 255, 255, 0.7)"
              mt={1}
              textAlign="center"
            >
              Su içmeye başladığınızda burada grafiğiniz görünecektir
            </Typography>
          </Box>
        )}
      </CardContent>
    </GlowingCard>
  );
};

// SupplementConsumptionChart Component
const SupplementConsumptionChart = ({ user }) => {
  const [consumptionData, setConsumptionData] = useState([]);
  const theme = useTheme();

  const getConsumptionDocRef = () => {
    return doc(db, "users", user.uid, "stats", "supplementConsumption");
  };

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
          };

          allSuppNames.forEach((suppName) => {
            const count = dayStats[suppName] || 0;
            dayData[suppName] = count;
          });

          return dayData;
        });

        setConsumptionData(chartData.slice(-7));
      }
    } catch (error) {
      console.error("Error fetching supplement consumption data:", error);
    }
  };

  useEffect(() => {
    if (user) fetchConsumptionData();
  }, [user]);

  const colors = [
    "#4CAF50", // Green
    "#FF9800", // Orange
    "#F44336", // Red
    "#2196F3", // Blue
    "#9C27B0", // Purple
    "#00BCD4", // Cyan
  ];

  return (
    <GlowingCard glowColor="#3F51B522">
      <CardContent>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            color: "#fff",
            mb: 3,
            textAlign: "center",
          }}
        >
          Takviye Kullanım İstatistikleri
        </Typography>

        {consumptionData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={consumptionData}
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
                itemStyle={{ color: "#fff" }}
              />
              <Legend
                wrapperStyle={{ color: "#fff" }}
                formatter={(value) => (
                  <span style={{ color: "#fff" }}>{value}</span>
                )}
              />
              {consumptionData.length > 0 &&
                Array.from(
                  new Set(
                    consumptionData.flatMap((day) =>
                      Object.keys(day).filter(
                        (key) => key !== "date" && key !== "total"
                      )
                    )
                  )
                ).map((key, index) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    fill={colors[index % colors.length]}
                    name={key}
                    radius={[4, 4, 0, 0]}
                    animationDuration={1500}
                    animationEasing="ease-out"
                    // Remove the stackId to make bars grouped instead of stacked
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
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              borderRadius: 2,
              padding: 2,
            }}
          >
            <EmojiEventsIcon
              sx={{ fontSize: 60, color: "rgba(255, 255, 255, 0.7)", mb: 2 }}
            />
            <Typography variant="body1" color="#fff" textAlign="center">
              Henüz takviye kullanım verisi bulunmamaktadır
            </Typography>
            <Typography
              variant="body2"
              color="rgba(255, 255, 255, 0.7)"
              mt={1}
              textAlign="center"
            >
              Takviyeleri kullanmaya başladığınızda burada istatistikleriniz
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
  // Eğer user yoksa, bileşenin hiç render edilmemesi için erken dönüş yapıyoruz.
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

  const getSupplementsRef = () => {
    return collection(db, "users", user.uid, "supplements");
  };

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
      const today = new Date().toISOString().split("T")[0];
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
      const today = new Date().toISOString().split("T")[0];
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
        <Typography
          variant="h2"
          sx={{
            textAlign: "center",
            color: "#fff",
            fontWeight: 800,
            mb: { xs: 2, md: 6 },
            ml: { xs: 2, md: 7 },
            mt: { xs: 4, md: 6 },
            textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
            animation: `${float} 3s ease-in-out infinite`,
            fontSize: { xs: "2rem", md: "3rem" },
          }}
        >
          <WaterDropIcon
            sx={{
              fontSize: { xs: 30, md: 50 },
              color: "lightblue",
              mr: { xs: -3, md: -15 },
              mb: { xs: -7, md: -13 },
            }}
          />
          Takviye Takibi
        </Typography>

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
          <StyledAccordionSummary
            expandIcon={<ExpandMoreIcon sx={{ color: "#fff" }} />}
          >
            <Typography variant="h5" sx={{ fontWeight: 700, color: "#fff" }}>
              Takviyeler
            </Typography>
          </StyledAccordionSummary>
          <AccordionDetails>
            <Grid container spacing={4} sx={{ mt: 2 }}>
              <AnimatePresence>
                {supplements.map((supplement) => (
                  <Grid item xs={12} sm={6} md={4} key={supplement.id}>
                    <VitaminCard
                      supplement={supplement}
                      onConsume={handleConsume}
                      onDelete={handleDelete}
                      consumedToday={
                        supplementConsumptionToday[supplement.name] || 0
                      }
                    />
                  </Grid>
                ))}
              </AnimatePresence>
            </Grid>
          </AccordionDetails>
        </Accordion>

        <Grid container spacing={4} sx={{ mt: 4 }}>
          <Grid item xs={12} md={6}>
            <WaterConsumptionChart waterHistory={waterData.history} />
          </Grid>
          <Grid item xs={12} md={6}>
            <SupplementConsumptionChart user={user} />
          </Grid>
        </Grid>

        <Dialog
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          PaperProps={{
            sx: {
              background: "rgba(149, 157, 163, 0.83)",
              backdropFilter: "blur(10px)",
              borderRadius: "24px",
              padding: 2,
              border: "1px solid rgba(33, 150, 243, 0.2)",
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
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button onClick={handleAddSupplement}>Add</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default WellnessTracker;
