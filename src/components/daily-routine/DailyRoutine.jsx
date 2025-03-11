import React, { useEffect, useState, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  Box,
  Button,
  TextField,
  Typography,
  IconButton,
  Checkbox,
  Grid,
  useMediaQuery,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Container,
  alpha,
  styled,
  keyframes,
  CircularProgress,
  LinearProgress,
} from "@mui/material";
import {
  DeleteForever,
  EventNote,
  NotificationImportant,
  NotificationsOff,
  DoneAll,
  HighlightOff,
  Add,
  DeleteSweep,
  AccessTime,
  CheckCircleOutline,
  RadioButtonUnchecked,
  NotificationsActive,
  NotificationsNone,
} from "@mui/icons-material";
import CloseIcon from "@mui/icons-material/Close";
import { motion, AnimatePresence } from "framer-motion";
import { showToast } from "../../utils/weather-theme-notify/NotificationManager";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../auth/firebaseConfig";
import { initialRoutines } from "../../utils/constant/ConstantData";

// Animasyonlar
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

// Stilize Bileşenler
const GlowingCard = styled(({ glowColor, ...other }) => <Box {...other} />)(
  ({ theme, glowColor }) => ({
    position: "relative",
    background: "rgba(255, 255, 255, 0.1)",
    backdropFilter: "blur(10px)",
    borderRadius: "24px",
    overflow: "hidden",
    border: "1px solid rgba(33, 150, 243, 0.2)",
    boxShadow: `0 0 20px ${glowColor || "#2196F322"}`,
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    "&:hover": {
      transform: "translateY(-5px)",
      boxShadow: `0 0 40px ${glowColor || "#2196F344"}`,
    },
  })
);

const AnimatedButton = styled(Button)(({ theme }) => ({
  background: "linear-gradient(45deg, #2196F3 30%, #3F51B5 90%)",
  border: 0,
  borderRadius: 25,
  boxShadow: "0 3px 5px 2px rgba(33, 150, 243, .3)",
  color: "white",
  padding: "12px 30px",
  transition: "all 0.3s ease",
  "&:hover": {
    transform: "scale(1.05)",
    boxShadow: "0 5px 15px 3px rgba(33, 150, 243, .4)",
  },
}));

const StatCard = ({ title, value, total, icon, color }) => {
  const theme = useTheme();
  const percentage = total ? (value / total) * 100 : 0;
  return (
    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
      <GlowingCard glowColor={color} sx={{ p: 2 }}>
        <Box sx={{ textAlign: "center", mb: 2 }}>
          <Box sx={{ fontSize: 40, color }}>{icon}</Box>
        </Box>
        <Typography variant="h6" sx={{ color: "#fff", textAlign: "center" }}>
          {title}
        </Typography>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: "#fff",
            textAlign: "center",
            my: 1,
            textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
          }}
        >
          {value}/{total}
        </Typography>
        <Box
          sx={{
            height: 6,
            background: "rgba(255,255,255,0.1)",
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              width: `${percentage}%`,
              height: "100%",
              background: `linear-gradient(90deg, ${color}, ${alpha(
                color,
                0.7
              )})`,
              transition: "width 0.5s ease",
            }}
          />
        </Box>
      </GlowingCard>
    </motion.div>
  );
};

const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  padding: theme.spacing(3),
  background: "linear-gradient(135deg, #4b6cb7 0%, #182848 100%)",
  color: theme.palette.primary.contrastText,
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  "& .MuiTypography-root": {
    fontWeight: 700,
    fontSize: "1.25rem",
    textShadow: "0px 2px 4px rgba(0,0,0,0.2)",
  },
}));

const StyledDialogContent = styled(DialogContent)(({ theme }) => ({
  padding: theme.spacing(3),
  background: alpha("#f8f9fa", 0.95),
}));

const ActionButton = styled(Button)(({ theme }) => ({
  borderRadius: theme.spacing(3),
  padding: theme.spacing(1.2, 3.5),
  textTransform: "none",
  fontWeight: 600,
  letterSpacing: "0.5px",
  boxShadow: theme.shadows[3],
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    transform: "translateY(-3px) scale(1.02)",
    boxShadow: "0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)",
  },
  "&:active": {
    transform: "translateY(0) scale(0.98)",
  },
}));

const DailyRoutine = ({ user }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [newRoutine, setNewRoutine] = useState({ title: "", time: "" });
  const [editRoutineId, setEditRoutineId] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState({});
  // Kümülatif sayaçlar: haftalık ve aylık (eklenen ve tamamlanan)
  const [weeklyStats, setWeeklyStats] = useState({ added: 0, completed: 0 });
  const [monthlyStats, setMonthlyStats] = useState({ added: 0, completed: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [allNotifications, setAllNotifications] = useState(false);
  const [routines, setRoutines] = useState([]);
  const isInitialLoad = useRef(true);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [resetData, setResetData] = useState({
    daily: "",
    weekly: "",
    monthly: "",
  });

  useEffect(() => {
    const initialNotifications = {};
    routines.forEach((r) => {
      initialNotifications[r.id] = r.notificationEnabled;
    });
    setNotificationsEnabled(initialNotifications);
  }, [routines]);

  // Rutinleri saate göre sırala
  const sortRoutinesByTime = (routines) => {
    return routines.sort((a, b) => a.time.localeCompare(b.time));
  };

  // Hafta numarasını hesapla
  const getWeekNumber = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  };

  // Aynı ay kontrolü
  const isSameMonth = (date1, date2) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth()
    );
  };

  // Günlük istatistikler (UI tabanlı, resetlenecek)
  const dailyStats = {
    completed: routines.filter((r) => r.checked).length,
    total: routines.length,
  };

  // Gece yarısı UI reseti (check'ler sıfırlanır) ve haftalık/aylık kümülatif sayaçlar
  useEffect(() => {
    const getTurkeyTime = (date = new Date()) =>
      new Date(date.toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));

    const resetIfNeeded = async () => {
      if (!user) return;
      const nowTurkey = getTurkeyTime();
      const today = nowTurkey.toISOString().split("T")[0];
      const currentWeek = getWeekNumber(nowTurkey);
      const currentMonth = `${nowTurkey.getFullYear()}-${nowTurkey.getMonth()}`;

      // Eğer resetData henüz yüklenmediyse işlem yapmayın
      if (!resetData.daily || !resetData.weekly || !resetData.monthly) return;

      let updateRequired = false;
      const newResetData = { ...resetData };

      // Günlük reset: Eğer Firestore'daki son reset tarihi bugünden farklıysa
      if (resetData.daily !== today) {
        setRoutines((prevRoutines) =>
          prevRoutines.map((r) => ({
            ...r,
            checked: false,
            completionDate: null,
          }))
        );
        newResetData.daily = today;
        updateRequired = true;
      }

      // Haftalık reset: Eğer Firestore'daki hafta numarası farklıysa
      if (resetData.weekly !== String(currentWeek)) {
        setWeeklyStats({ added: 0, completed: 0 });
        newResetData.weekly = String(currentWeek);
        updateRequired = true;
      }

      // Aylık reset: Eğer Firestore'daki ay bilgisi farklıysa
      if (resetData.monthly !== currentMonth) {
        setMonthlyStats({ added: 0, completed: 0 });
        newResetData.monthly = currentMonth;
        updateRequired = true;
      }

      if (updateRequired) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          await updateDoc(userDocRef, {
            lastResetDaily: newResetData.daily,
            lastResetWeekly: newResetData.weekly,
            lastResetMonthly: newResetData.monthly,
          });
          setResetData(newResetData);
        } catch (error) {
          console.error("Reset bilgileri güncellenirken hata:", error);
        }
      }
    };

    // İlk sayfa yüklemesinde reset kontrolü
    resetIfNeeded();

    // Kullanıcı sekmeye geri döndüğünde reset kontrolü
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        resetIfNeeded();
      }
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [resetData, user]);

  // Rutin kaydetme işlemi
  const handleSaveRoutine = () => {
    if (!newRoutine.title || !newRoutine.time) return;

    let updatedRoutines;

    if (editRoutineId) {
      updatedRoutines = routines.map((r) =>
        r.id === editRoutineId
          ? {
              ...newRoutine,
              id: r.id,
              notificationEnabled: r.notificationEnabled || false,
            }
          : r
      );
    } else {
      updatedRoutines = [
        ...routines,
        {
          ...newRoutine,
          id: uuidv4(),
          createdAt: new Date().toISOString(),
          completionDate: null,
          checked: false,
          notificationEnabled: false,
        },
      ];
      // Yeni rutin eklendiğinde kümülatif sayaçlar güncellenir
      setWeeklyStats((prev) => ({ ...prev, added: prev.added + 1 }));
      setMonthlyStats((prev) => ({ ...prev, added: prev.added + 1 }));
    }

    updatedRoutines = sortRoutinesByTime(updatedRoutines);

    setRoutines(updatedRoutines);
    setModalOpen(false);
    setNewRoutine({ title: "", time: "" });
    setEditRoutineId(null);
  };

  // Rutin silme işlemi (kümülatif sayaçlar dokunulmaz)
  const deleteRoutine = (id) => {
    setRoutines(routines.filter((routine) => routine.id !== id));
  };

  // Rutin işaretleme işlemi
  const handleCheckboxChange = (routineId) => {
    setRoutines((prevRoutines) =>
      prevRoutines.map((r) => {
        if (r.id === routineId) {
          if (!r.checked) {
            // Manuel check yapıldığında tamamlanma sayaçları artar
            setWeeklyStats((prev) => ({
              ...prev,
              completed: prev.completed + 1,
            }));
            setMonthlyStats((prev) => ({
              ...prev,
              completed: prev.completed + 1,
            }));
          } else {
            // Check kaldırılırsa sayaçlar düşer
            setWeeklyStats((prev) => ({
              ...prev,
              completed: Math.max(prev.completed - 1, 0),
            }));
            setMonthlyStats((prev) => ({
              ...prev,
              completed: Math.max(prev.completed - 1, 0),
            }));
          }
          return {
            ...r,
            checked: !r.checked,
            completionDate: !r.checked ? new Date().toISOString() : null,
          };
        }
        return r;
      })
    );
  };

  // Tüm rutinleri işaretle
  const handleSelectAll = () => {
    const countToCheck = routines.filter((r) => !r.checked).length;
    if (countToCheck > 0) {
      setWeeklyStats((prev) => ({
        ...prev,
        completed: prev.completed + countToCheck,
      }));
      setMonthlyStats((prev) => ({
        ...prev,
        completed: prev.completed + countToCheck,
      }));
    }
    setRoutines((prevRoutines) =>
      prevRoutines.map((r) => ({
        ...r,
        checked: true,
        completionDate: new Date().toISOString(),
      }))
    );
  };

  // Tüm rutinlerin işaretini kaldır
  const handleUnselectAll = () => {
    const countToUncheck = routines.filter((r) => r.checked).length;
    if (countToUncheck > 0) {
      setWeeklyStats((prev) => ({
        ...prev,
        completed: Math.max(prev.completed - countToUncheck, 0),
      }));
      setMonthlyStats((prev) => ({
        ...prev,
        completed: Math.max(prev.completed - countToUncheck, 0),
      }));
    }
    setRoutines((prevRoutines) =>
      prevRoutines.map((r) => ({
        ...r,
        checked: false,
        completionDate: null,
      }))
    );
  };

  // Tüm rutinleri sil
  const handleDeleteAll = () => {
    if (window.confirm("Tüm rutinler silinecek! Emin misiniz?")) {
      setRoutines([]);
    }
  };

  // Her rutinin Firestore'daki "notificationEnabled" alanını güncelleme
  const handleNotificationChange = (routineId) => {
    const routine = routines.find((r) => r.id === routineId);
    if (!routine) return;

    const isEnabled = !routine.notificationEnabled;

    showToast(
      isEnabled ? "Bildirimler açıldı 🔔" : "Bildirimler kapatıldı 🔕",
      isEnabled ? "success" : "error"
    );

    const updatedRoutines = routines.map((r) =>
      r.id === routineId ? { ...r, notificationEnabled: isEnabled } : r
    );
    setRoutines(updatedRoutines);

    setNotificationsEnabled((prev) => ({
      ...prev,
      [routineId]: isEnabled,
    }));
  };

  // Tüm bildirimleri aç/kapa
  const toggleAllNotifications = () => {
    const newState = !allNotifications;

    showToast(
      newState ? "Tüm bildirimler açıldı 🔔" : "Tüm bildirimler kapatıldı 🔕",
      newState ? "success" : "error"
    );

    setAllNotifications(newState);

    const updatedRoutines = routines.map((r) => ({
      ...r,
      notificationEnabled: newState,
    }));

    setRoutines(updatedRoutines);

    const updatedNotifications = {};
    updatedRoutines.forEach((r) => {
      updatedNotifications[r.id] = newState;
    });

    setNotificationsEnabled(updatedNotifications);
  };

  // Firestore'dan rutinleri ve istatistikleri yükle
  useEffect(() => {
    const loadRoutines = async () => {
      if (!user) return;
      try {
        const userDocRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userDocRef);
        const nowTurkey = new Date(
          new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
        );
        const today = nowTurkey.toISOString().split("T")[0];
        const currentWeek = getWeekNumber(nowTurkey);
        const currentMonth = `${nowTurkey.getFullYear()}-${nowTurkey.getMonth()}`;

        if (docSnap.exists()) {
          const data = docSnap.data();
          setRoutines(data.routines || initialRoutines);
          setWeeklyStats(data.weeklyStats || { added: 0, completed: 0 });
          setMonthlyStats(data.monthlyStats || { added: 0, completed: 0 });
          setResetData({
            daily: data.lastResetDaily || today,
            weekly: data.lastResetWeekly || String(currentWeek),
            monthly: data.lastResetMonthly || currentMonth,
          });
        } else {
          const initialData = {
            routines: initialRoutines,
            weeklyStats: { added: 0, completed: 0 },
            monthlyStats: { added: 0, completed: 0 },
            lastResetDaily: today,
            lastResetWeekly: String(currentWeek),
            lastResetMonthly: currentMonth,
          };
          await setDoc(userDocRef, initialData);
          setRoutines(initialRoutines);
          setWeeklyStats({ added: 0, completed: 0 });
          setMonthlyStats({ added: 0, completed: 0 });
          setResetData({
            daily: today,
            weekly: String(currentWeek),
            monthly: currentMonth,
          });
        }
        isInitialLoad.current = false;
      } catch (error) {
        console.error("Rutin yükleme hatası:", error);
      }
    };

    loadRoutines();
  }, [user]);

  // Firestore'a rutinleri ve istatistikleri kaydet (state değiştikçe güncelle)
  useEffect(() => {
    if (!user || isInitialLoad.current) return;
    const updateDataInFirestore = async () => {
      try {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, { routines, weeklyStats, monthlyStats });
      } catch (error) {
        console.error("Rutin kaydetme hatası:", error);
      }
    };
    updateDataInFirestore();
  }, [routines, weeklyStats, monthlyStats, user]);

  // Tüm bildirimlerin durumunu kontrol et
  useEffect(() => {
    if (routines.length > 0) {
      const allEnabled = routines.every(
        (routine) => routine.notificationEnabled
      );
      setAllNotifications(allEnabled);
    }
  }, [routines]);

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
            mb: 6,
            textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
            animation: `${float} 3s ease-in-out infinite`,
            fontSize: { xs: "1.5rem" },
          }}
        >
          <AccessTime sx={{ fontSize: 50, verticalAlign: "middle", mr: 2 }} />
          Günlük Rutinler
        </Typography>

        <Grid container spacing={{ xs: 1, sm: 3 }} sx={{ mb: 3 }}>
          {[
            {
              title: "Günlük Başarı",
              value: routines.filter((r) => r.checked).length,
              total: routines.length,
              icon: <DoneAll />,
              color: "#4CAF50",
            },
            {
              title: "Haftalık Başarı",
              value: weeklyStats.completed,
              total: weeklyStats.added,
              icon: <CheckCircleOutline />,
              color: "#2196F3",
            },
            {
              title: "Aylık Başarı",
              value: monthlyStats.completed,
              total: monthlyStats.added,
              icon: <NotificationsActive />,
              color: "#9C27B0",
            },
          ].map((stat, index) => (
            <Grid item xs={4} sm={4} md={4} key={index}>
              <Box
                sx={{
                  position: "relative",
                  height: "100%",
                  borderRadius: "16px",
                  background: `linear-gradient(135deg, ${stat.color}40 0%, ${stat.color}20 100%)`,
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  overflow: "hidden",
                  "&:hover": {
                    transform: { xs: "none", sm: "translateY(-5px)" },
                    boxShadow: {
                      xs: "0 8px 32px rgba(0,0,0,0.1)",
                      sm: `0 12px 40px ${stat.color}40`,
                    },
                  },
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "30%",
                    background: `linear-gradient(transparent 20%, ${stat.color}20)`,
                    maskImage:
                      "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 100 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 15 Q25 5 50 15 T100 15 L100 20 L0 20 Z' fill='white'/%3E%3C/svg%3E\")",
                    animation: "wave 8s linear infinite",
                    opacity: { xs: 0.3, sm: 0.6 },
                  }}
                />
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    alignItems: "center",
                    p: { xs: 2, sm: 3 },
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  {isMobile ? (
                    <Box
                      sx={{
                        width: 50,
                        height: 50,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mb: 1,
                      }}
                    >
                      {React.cloneElement(stat.icon, {
                        sx: {
                          fontSize: "1.2rem",
                          color: "white",
                          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
                        },
                      })}
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        position: "relative",
                        mr: 2,
                        width: 80,
                        height: 80,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <CircularProgress
                        variant="determinate"
                        value={(stat.value / stat.total) * 100}
                        thickness={6}
                        size="100%"
                        sx={{
                          position: "absolute",
                          color: `${stat.color}30`,
                          "& .MuiCircularProgress-circle": {
                            strokeLinecap: "round",
                            stroke: stat.color,
                          },
                        }}
                      />
                      <Box
                        sx={{
                          width: "60%",
                          height: "60%",
                          borderRadius: "50%",
                          background: `linear-gradient(45deg, ${stat.color} 0%, ${stat.color}80 100%)`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: `0 4px 20px ${stat.color}40`,
                          position: "relative",
                        }}
                      >
                        {React.cloneElement(stat.icon, {
                          sx: {
                            fontSize: "2rem",
                            color: "white",
                            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
                          },
                        })}
                      </Box>
                    </Box>
                  )}
                  <Box sx={{ textAlign: { xs: "center", sm: "left" } }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        color: "text.secondary",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        fontSize: { xs: "0.7rem", sm: "0.875rem" },
                      }}
                    >
                      {stat.title}
                    </Typography>
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 800,
                        lineHeight: 1.2,
                        background: `linear-gradient(45deg, ${stat.color} 0%, ${stat.color}cc 100%)`,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        fontSize: { xs: "1.5rem", sm: "2.125rem" },
                      }}
                    >
                      {stat.value}
                      <Typography
                        component="span"
                        variant="body1"
                        sx={{
                          color: "text.secondary",
                          ml: 0.5,
                          fontWeight: 500,
                          fontSize: { xs: "0.8rem", sm: "1rem" },
                        }}
                      >
                        / {stat.total}
                      </Typography>
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        display: "block",
                        color: "text.secondary",
                        mt: 0.5,
                        fontSize: { xs: "0.7rem", sm: "0.875rem" },
                      }}
                    >
                      {((stat.value / stat.total) * 100).toFixed(1)}% Tamamlandı
                    </Typography>
                  </Box>
                </Box>
                {isMobile && (
                  <Box sx={{ px: { xs: 2, sm: 3 }, pb: 2 }}>
                    <LinearProgress
                      variant="determinate"
                      value={(stat.value / stat.total) * 100}
                      sx={{
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: `${stat.color}20`,
                        "& .MuiLinearProgress-bar": {
                          backgroundColor: stat.color,
                        },
                      }}
                    />
                  </Box>
                )}
              </Box>
            </Grid>
          ))}
        </Grid>

        <GlowingCard glowColor="#2196F3" sx={{ mb: 4, p: 3 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
            }}
          >
            <Typography variant="h5" sx={{ color: "#fff", fontWeight: 700 }}>
              Rutin Yönetimi
            </Typography>
            <IconButton
              onClick={toggleAllNotifications}
              sx={{ color: allNotifications ? "#FFA726" : "#fff" }}
            >
              {allNotifications ? (
                <NotificationsActive />
              ) : (
                <NotificationsNone />
              )}
            </IconButton>
          </Box>

          <AnimatedButton
            fullWidth
            onClick={() => setModalOpen(true)}
            startIcon={<Add />}
            sx={{ mb: 3 }}
          >
            Yeni Rutin Ekle
          </AnimatedButton>

          <AnimatePresence>
            {routines.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ textAlign: "center", py: 4 }}
              >
                <Typography
                  variant="body1"
                  sx={{ color: "#fff", opacity: 0.8 }}
                >
                  Henüz rutin eklenmedi
                </Typography>
              </motion.div>
            ) : (
              routines.map((routine) => (
                <motion.div
                  key={routine.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      p: 2,
                      mb: 2,
                      background: "rgba(255,255,255,0.1)",
                      borderRadius: 3,
                      transition: "all 0.3s ease",
                      "&:hover": {
                        background: "rgba(255,255,255,0.15)",
                        transform: "translateX(10px)",
                      },
                    }}
                  >
                    <Checkbox
                      checked={routine.checked}
                      onChange={() => handleCheckboxChange(routine.id)}
                      icon={<RadioButtonUnchecked sx={{ color: "#fff" }} />}
                      checkedIcon={
                        <CheckCircleOutline sx={{ color: "#4CAF50" }} />
                      }
                    />
                    <Box sx={{ flex: 1, ml: 2 }}>
                      <Typography
                        variant="body1"
                        sx={{
                          color: "#fff",
                          textDecoration: routine.checked
                            ? "line-through"
                            : "none",
                          opacity: routine.checked ? 0.7 : 1,
                        }}
                      >
                        {routine.time} - {routine.title}
                      </Typography>
                    </Box>
                    <IconButton
                      onClick={() => {
                        setNewRoutine(routine);
                        setEditRoutineId(routine.id);
                        setModalOpen(true);
                      }}
                      size="small"
                      sx={{ color: "#9C27B0" }}
                    >
                      <EventNote fontSize="small" />
                    </IconButton>
                    <IconButton
                      onClick={() => handleNotificationChange(routine.id)}
                      sx={{
                        color: notificationsEnabled[routine.id]
                          ? "#FFA726"
                          : "#fff",
                      }}
                    >
                      {notificationsEnabled[routine.id] ? (
                        <NotificationsActive />
                      ) : (
                        <NotificationsOff />
                      )}
                    </IconButton>
                    <IconButton
                      onClick={() => deleteRoutine(routine.id)}
                      sx={{ color: "#FF5252" }}
                    >
                      <DeleteForever />
                    </IconButton>
                  </Box>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </GlowingCard>

        <Dialog
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          PaperProps={{
            sx: {
              background: "rgba(255,255,255,0.9)",
              backdropFilter: "blur(10px)",
              borderRadius: "24px",
              border: "1px solid rgba(33, 150, 243, 0.2)",
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: 700 }}>
            {editRoutineId ? "Rutini Düzenle" : "Yeni Rutin Ekle"}
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              margin="dense"
              label="Saat"
              type="time"
              InputLabelProps={{ shrink: true }}
              value={newRoutine.time}
              onChange={(e) =>
                setNewRoutine({ ...newRoutine, time: e.target.value })
              }
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              margin="dense"
              label="Rutin Açıklaması"
              value={newRoutine.title}
              onChange={(e) =>
                setNewRoutine({ ...newRoutine, title: e.target.value })
              }
            />
          </DialogContent>
          <DialogActions>
            <AnimatedButton onClick={handleSaveRoutine}>
              {editRoutineId ? "Güncelle" : "Kaydet"}
            </AnimatedButton>
          </DialogActions>
        </Dialog>

        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={12} sm={4}>
            <AnimatedButton
              fullWidth
              onClick={handleSelectAll}
              startIcon={<DoneAll />}
              sx={{
                background: "linear-gradient(45deg, #9C27B0 10%, #81C784 60%)",
              }}
            >
              Tümünü İşaretle
            </AnimatedButton>
          </Grid>
          <Grid item xs={12} sm={4}>
            <AnimatedButton
              fullWidth
              onClick={handleUnselectAll}
              startIcon={<HighlightOff />}
              sx={{
                background:
                  "linear-gradient(45deg, rgb(156,39,136) 30%, #FFB74D 60%)",
              }}
            >
              İşaretleri Kaldır
            </AnimatedButton>
          </Grid>
          <Grid item xs={12} sm={4}>
            <AnimatedButton
              fullWidth
              onClick={() => setOpenDeleteDialog(true)}
              startIcon={<DeleteSweep />}
              sx={{
                background: "linear-gradient(45deg, #9C27B0 30%, #EF5350 90%)",
              }}
            >
              Tümünü Sil
            </AnimatedButton>
          </Grid>
        </Grid>
      </Container>
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            background: alpha("#f8f9fa", 0.95),
            backdropFilter: "blur(10px)",
            borderRadius: 4,
            boxShadow:
              "0 50px 100px rgba(0,0,0,0.25), 0 30px 60px rgba(0,0,0,0.22)",
            padding: 0,
          },
        }}
      >
        <StyledDialogTitle component="div">
          <Typography variant="h6" component="span">
            Tüm Rutinleri Sil
          </Typography>
          <IconButton
            onClick={() => setOpenDeleteDialog(false)}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              color: "#fff",
              background: alpha("#000", 0.2),
              "&:hover": { background: alpha("#000", 0.3) },
            }}
          >
            <CloseIcon />
          </IconButton>
        </StyledDialogTitle>
        <StyledDialogContent dividers>
          <Typography variant="body1">
            Tüm rutinler silinecek! Emin misiniz?
          </Typography>
        </StyledDialogContent>
        <DialogActions
          sx={{
            justifyContent: "space-between",
            p: 3,
            bgcolor: alpha("#f5f5f5", 0.5),
            background:
              "linear-gradient(rgba(255,255,255,0.8), rgba(245,245,245,0.9))",
            backdropFilter: "blur(10px)",
          }}
        >
          <ActionButton
            onClick={() => setOpenDeleteDialog(false)}
            variant="outlined"
            color="secondary"
            sx={{
              background: "linear-gradient(135deg, #182848 0%, #4b6cb7 100%)",
            }}
          >
            İptal
          </ActionButton>
          <ActionButton
            onClick={() => {
              setRoutines([]);
              setOpenDeleteDialog(false);
            }}
            variant="contained"
            color="primary"
            sx={{
              background: "linear-gradient(135deg, #4b6cb7 0%, #182848 100%)",
              ml: "auto",
            }}
          >
            Sil
          </ActionButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DailyRoutine;
