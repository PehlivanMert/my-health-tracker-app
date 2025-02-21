import React, { useEffect, useState, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  Box,
  Button,
  TextField,
  Paper,
  Typography,
  IconButton,
  Checkbox,
  Stack,
  Card,
  CardContent,
  Grid,
  useMediaQuery,
  useTheme,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  DeleteForever,
  EventNote,
  NotificationImportant,
  NotificationsOff,
  DoneAll,
  HighlightOff,
  Add,
  Edit,
  PlaylistAdd,
  DeleteSweep,
  AccessTime,
  CheckCircleOutline,
  RadioButtonUnchecked,
  NotificationsActive,
  NotificationsNone,
} from "@mui/icons-material";
import ProgressChart from "../../utils/ProgressChart";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  requestNotificationPermission,
  scheduleNotification,
  cancelScheduledNotifications,
} from "../../utils/weather-theme-notify/NotificationManager";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore"; // Firestore fonksiyonları
import { db } from "../auth/firebaseConfig"; // Firestore bağlantısı
import { initialRoutines } from "../../utils/constant/ConstantData";

const StatCard = ({ title, value, total, icon, color }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const percentage = (value / total) * 100 || 0;

  const handleClick = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      style={{ width: "100%" }}
    >
      <Card
        onClick={handleClick}
        sx={{
          width: "100%",
          cursor: "pointer",
          background: `linear-gradient(135deg, ${color}20 0%, ${color}05 100%)`,
          border: `1px solid ${color}30`,
          borderRadius: 2,
          boxShadow: theme.shadows[4],
          height: 200,
        }}
      >
        <CardContent>
          <Stack spacing={1} alignItems="center">
            <Box sx={{ fontSize: isMobile ? 32 : 40 }}>{icon}</Box>
            <Typography
              variant={isMobile ? "body2" : "body1"}
              color="text.secondary"
              align="center"
              sx={{ fontWeight: 500 }}
            >
              {title}
            </Typography>
            <Box sx={{ position: "relative", width: "100%" }}>
              <Typography
                variant={isMobile ? "h5" : "h4"}
                align="center"
                sx={{
                  fontWeight: "bold",
                  color: color,
                  textShadow: "2px 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                {value}/{total}
              </Typography>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                style={{
                  height: "4px",
                  background: color,
                  borderRadius: "2px",
                  marginTop: "8px",
                }}
              />
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const DailyRoutine = ({ user }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [newRoutine, setNewRoutine] = useState({ title: "", time: "" });
  const [editRoutineId, setEditRoutineId] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState({});
  const [weeklyStats, setWeeklyStats] = useState({ completed: 0, total: 0 });
  const [monthlyStats, setMonthlyStats] = useState({ completed: 0, total: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [allNotifications, setAllNotifications] = useState(false);
  const [scheduledNotifications, setScheduledNotifications] = useState({});
  const [routines, setRoutines] = useState([]);
  const isInitialLoad = useRef(true); // İlk yükleme kontrolü

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

  // Bildirim izni iste
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Haftalık ve aylık istatistikleri güncelle
  useEffect(() => {
    const now = new Date();
    const currentWeek = getWeekNumber(now);
    const currentMonth = now.getMonth();

    const weeklyCompleted = routines.filter(
      (r) =>
        r.checked && getWeekNumber(new Date(r.completionDate)) === currentWeek
    ).length;

    const monthlyCompleted = routines.filter(
      (r) => r.checked && isSameMonth(new Date(r.completionDate), now)
    ).length;

    setWeeklyStats({
      completed: weeklyCompleted,
      total: routines.filter(
        (r) => getWeekNumber(new Date(r.createdAt)) === currentWeek
      ).length,
    });

    setMonthlyStats({
      completed: monthlyCompleted,
      total: routines.filter((r) => isSameMonth(new Date(r.createdAt), now))
        .length,
    });
  }, [routines]);

  // Haftalık ve aylık istatistikleri sıfırla
  useEffect(() => {
    const checkReset = () => {
      const now = new Date();
      const nextMonday = new Date(now);
      nextMonday.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7));
      nextMonday.setHours(0, 0, 0, 0);

      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const timeoutWeekly = setTimeout(() => {
        setWeeklyStats({ completed: 0, total: 0 });
      }, nextMonday - now);

      const timeoutMonthly = setTimeout(() => {
        setMonthlyStats({ completed: 0, total: 0 });
      }, nextMonth - now);

      return () => {
        clearTimeout(timeoutWeekly);
        clearTimeout(timeoutMonthly);
      };
    };

    const timer = setInterval(checkReset, 3600000);
    return () => clearInterval(timer);
  }, []);

  // Rutin kaydetme işlemi
  const handleSaveRoutine = () => {
    if (!newRoutine.title || !newRoutine.time) return;

    let updatedRoutines;

    if (editRoutineId) {
      updatedRoutines = routines.map((r) =>
        r.id === editRoutineId ? { ...newRoutine, id: r.id } : r
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
        },
      ];
    }

    // Rutinleri saate göre sırala
    updatedRoutines = sortRoutinesByTime(updatedRoutines);

    setRoutines(updatedRoutines);
    setModalOpen(false);
    setNewRoutine({ title: "", time: "" });
    setEditRoutineId(null);
  };

  // Rutin silme işlemi
  const deleteRoutine = (id) => {
    setRoutines(routines.filter((routine) => routine.id !== id));
  };

  // Rutin işaretleme işlemi
  const handleCheckboxChange = (routineId) => {
    setRoutines(
      routines.map((r) =>
        r.id === routineId
          ? {
              ...r,
              checked: !r.checked,
              completionDate: !r.checked ? new Date().toISOString() : null,
            }
          : r
      )
    );
  };

  // Tüm rutinleri işaretle
  const handleSelectAll = () => {
    setRoutines(
      routines.map((r) => ({
        ...r,
        checked: true,
        completionDate: new Date().toISOString(),
      }))
    );
  };

  // Tüm rutinlerin işaretini kaldır
  const handleUnselectAll = () => {
    setRoutines(
      routines.map((r) => ({
        ...r,
        checked: false,
        completionDate: null,
      }))
    );
  };

  // Tüm rutinleri sil
  const handleDeleteAll = () => {
    setRoutines([]);
    // Tüm zamanlanmış bildirimleri iptal et
    Object.values(scheduledNotifications).forEach((ids) => {
      ids.forEach((id) => cancelScheduledNotifications(id));
    });
    setScheduledNotifications({});
  };

  // Yeni bildirim zamanla
  const scheduleNewNotification = (routine) => {
    const [hours, minutes] = routine.time.split(":");
    const targetTime = new Date();
    targetTime.setHours(parseInt(hours));
    targetTime.setMinutes(parseInt(minutes));
    targetTime.setSeconds(0);
    targetTime.setMilliseconds(0);

    if (targetTime < new Date()) {
      targetTime.setDate(targetTime.getDate() + 1);
    }

    const reminderTime = new Date(targetTime.getTime() - 15 * 60000);

    const reminderId = scheduleNotification(
      `Hatırlatma: ${routine.title}`,
      reminderTime,
      "15-minutes"
    );

    const mainId = scheduleNotification(routine.title, targetTime, "on-time");

    setScheduledNotifications((prev) => ({
      ...prev,
      [routine.id]: [reminderId, mainId],
    }));
  };

  // Bildirim aç/kapa
  const handleNotificationChange = (routineId) => {
    const routine = routines.find((r) => r.id === routineId);
    if (!routine) return;

    const isEnabled = !notificationsEnabled[routineId];

    if (isEnabled) {
      scheduleNewNotification(routine);
    } else {
      // Bildirimleri iptal et
      const ids = scheduledNotifications[routineId];
      if (ids) {
        ids.forEach((id) => cancelScheduledNotifications(id));
        setScheduledNotifications((prev) => {
          const newState = { ...prev };
          delete newState[routineId];
          return newState;
        });
      }
    }

    setNotificationsEnabled((prev) => ({
      ...prev,
      [routineId]: isEnabled,
    }));
  };

  // Tüm bildirimleri aç/kapa
  const toggleAllNotifications = () => {
    const newState = !allNotifications;
    setAllNotifications(newState);
    const updatedNotifications = {};

    routines.forEach((r) => {
      updatedNotifications[r.id] = newState;
      if (newState) {
        scheduleNewNotification(r);
      } else {
        const ids = scheduledNotifications[r.id];
        if (ids) {
          ids.forEach((id) => cancelScheduledNotifications(id));
          setScheduledNotifications((prev) => {
            const newState = { ...prev };
            delete newState[r.id];
            return newState;
          });
        }
      }
    });

    setNotificationsEnabled(updatedNotifications);
  };

  // Günlük istatistikler
  const dailyStats = {
    completed: routines.filter((r) => r.checked).length,
    total: routines.length,
  };

  // Firestore'dan rutinleri yükle

  useEffect(() => {
    const loadRoutines = async () => {
      if (!user) return;
      try {
        const userDocRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          // Eğer routines alanı tanımlı değilse, default rutinleri kullan
          setRoutines(data.routines || initialRoutines);
        } else {
          // Kullanıcıya ait belge yoksa, default rutinlerle yeni belge oluştur
          const initialData = {
            routines: initialRoutines,
            // Diğer default alanlar eklenebilir
          };
          await setDoc(userDocRef, initialData);
          setRoutines(initialRoutines);
        }
        isInitialLoad.current = false; // İlk yükleme tamamlandı
      } catch (error) {
        console.error("Rutin yükleme hatası:", error);
      }
    };
    loadRoutines();
  }, [user]);

  // Firestore'a rutinleri kaydet
  useEffect(() => {
    if (!user || isInitialLoad.current) return;
    const updateRoutinesInFirestore = async () => {
      try {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, { routines });
      } catch (error) {
        console.error("Rutin kaydetme hatası:", error);
      }
    };
    updateRoutinesInFirestore();
  }, [routines, user]);

  return (
    <Box
      sx={{
        background: "linear-gradient(135deg, #f0f8ff 0%, #e6f7ff 100%)",
        width: "100%",
        maxWidth: 1200,
        mx: "auto",
        p: isMobile ? 1 : 3,
      }}
    >
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={4} sm={4}>
          <StatCard
            title="Günlük Başarı"
            value={dailyStats.completed}
            total={dailyStats.total}
            icon={<DoneAll fontSize="inherit" />}
            color="#4CAF50"
          />
        </Grid>
        <Grid item xs={4} sm={4}>
          <StatCard
            title="Haftalık Başarı"
            value={weeklyStats.completed}
            total={weeklyStats.total}
            icon={<CheckCircleOutline fontSize="inherit" />}
            color="#2196F3"
          />
        </Grid>
        <Grid item xs={4} sm={4}>
          <StatCard
            title="Aylık Başarı"
            value={monthlyStats.completed}
            total={monthlyStats.total}
            icon={<PlaylistAdd fontSize="inherit" />}
            color="#9C27B0"
          />
        </Grid>
      </Grid>

      <Paper
        sx={{
          p: isMobile ? 1 : 3,
          borderRadius: 4,
          mb: 2,
          background: "linear-gradient(135deg, #f0f8ff 0%, #e6f7ff 100%)",
          boxShadow: theme.shadows[3],
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography
            variant={isMobile ? "h6" : "h5"}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              color: "primary.main",
              fontWeight: "bold",
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            <AccessTime fontSize={isMobile ? "small" : "medium"} /> Günlük Rutin
          </Typography>
          <IconButton
            onClick={toggleAllNotifications}
            sx={{ color: allNotifications ? "#FFA726" : "text.secondary" }}
          >
            {allNotifications ? <NotificationsActive /> : <NotificationsNone />}
          </IconButton>
        </Box>

        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setModalOpen(true)}
          size={isMobile ? "small" : "medium"}
          fullWidth
          sx={{
            mb: 2,
            borderRadius: 2,
            textTransform: "none",
            background: "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)",
            boxShadow: theme.shadows[2],
            "&:hover": {
              boxShadow: theme.shadows[4],
              transform: "translateY(-1px)",
            },
            transition: "all 0.2s ease",
          }}
        >
          Yeni Rutin Ekle
        </Button>

        <AnimatePresence>
          {routines.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Box
                sx={{
                  textAlign: "center",
                  py: 4,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <img
                  src="/empty-state.svg"
                  alt="Boş rutin"
                  style={{ height: 100, opacity: 0.8 }}
                />
                <Typography variant="body1" color="textSecondary">
                  Henüz rutin eklenmemiş
                </Typography>
              </Box>
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
                    p: 1,
                    mb: 1,
                    background:
                      "linear-gradient(135deg, #f5f5f5 0%, #fff8e7 100%)",
                    borderRadius: 2,
                    transition: "all 0.2s ease-in-out",
                    opacity: routine.checked ? 0.4 : 1,
                    textDecoration: routine.checked ? "line-through" : "none",
                    border: `1px solid ${
                      routine.checked ? "#d3d3d3" : "#e0e0e0"
                    }`,
                    "&:hover": {
                      transform: "translateX(5px)",
                      boxShadow: theme.shadows[1],
                      background:
                        "linear-gradient(135deg, #f5f5f5 0%, #fff8e7 50%, #f0e6d2 100%)",
                    },
                  }}
                >
                  <Checkbox
                    checked={routine.checked || false}
                    onChange={() => handleCheckboxChange(routine.id)}
                    icon={<RadioButtonUnchecked />}
                    checkedIcon={<CheckCircleOutline />}
                    size="small"
                    color="primary"
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        textDecoration: routine.checked
                          ? "line-through"
                          : "none",
                        color: routine.checked
                          ? "text.secondary"
                          : "text.primary",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        fontFamily: "'Poppins', sans-serif",
                      }}
                    >
                      {routine.time} | {routine.title}
                    </Typography>
                  </Box>
                  <IconButton
                    onClick={() => {
                      setNewRoutine(routine);
                      setEditRoutineId(routine.id);
                      setModalOpen(true);
                    }}
                    size="small"
                    sx={{ color: theme.palette.primary.main }}
                  >
                    <EventNote fontSize="small" />
                  </IconButton>
                  <IconButton
                    onClick={() => deleteRoutine(routine.id)}
                    size="small"
                    sx={{ color: theme.palette.error.main }}
                  >
                    <DeleteForever fontSize="small" />
                  </IconButton>
                  <IconButton
                    onClick={() => handleNotificationChange(routine.id)}
                    size="small"
                    sx={{
                      color: notificationsEnabled[routine.id]
                        ? theme.palette.warning.main
                        : "text.secondary",
                    }}
                  >
                    {notificationsEnabled[routine.id] ? (
                      <NotificationImportant fontSize="small" />
                    ) : (
                      <NotificationsOff fontSize="small" />
                    )}
                  </IconButton>
                </Box>
              </motion.div>
            ))
          )}
        </AnimatePresence>

        <ProgressChart
          completedRoutines={dailyStats.completed}
          totalRoutines={dailyStats.total}
          sx={{
            mt: 2,
            mx: "auto",
            maxWidth: 400,
            height: 100,
          }}
        />
      </Paper>

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)}>
        <DialogTitle>
          {editRoutineId ? "Rutini Düzenle" : "Yeni Rutin Ekle"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2, minWidth: 300 }}>
            <TextField
              id="routine-time"
              name="time"
              label="Saat"
              type="time"
              size="medium"
              fullWidth
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <AccessTime />
                  </InputAdornment>
                ),
              }}
              value={newRoutine.time || ""}
              onChange={(e) =>
                setNewRoutine({ ...newRoutine, time: e.target.value })
              }
            />
            <TextField
              id="routine-title"
              name="title"
              label="Rutin Açıklaması"
              placeholder="Örn: Kahvaltı Yap"
              size="medium"
              fullWidth
              value={newRoutine.title || ""}
              onChange={(e) =>
                setNewRoutine({ ...newRoutine, title: e.target.value })
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)}>İptal</Button>
          <Button
            onClick={handleSaveRoutine}
            variant="contained"
            disabled={!newRoutine.title || !newRoutine.time}
          >
            {editRoutineId ? "Güncelle" : "Kaydet"}
          </Button>
        </DialogActions>
      </Dialog>

      <Stack
        direction={isMobile ? "column" : "row"}
        spacing={2}
        sx={{
          justifyContent: "center",
          mt: 2,
        }}
      >
        <Button
          variant="contained"
          startIcon={<DoneAll />}
          onClick={handleSelectAll}
          size="small"
          fullWidth={isMobile}
          sx={{
            background: "linear-gradient(45deg, #4CAF50 30%, #81C784 90%)",
            color: "white",
            borderRadius: 2,
            textTransform: "none",
            boxShadow: theme.shadows[2],
            "&:hover": {
              boxShadow: theme.shadows[4],
            },
          }}
        >
          Tümünü İşaretle
        </Button>
        <Button
          variant="contained"
          startIcon={<HighlightOff />}
          onClick={handleUnselectAll}
          size="small"
          fullWidth={isMobile}
          sx={{
            background: "linear-gradient(45deg, #FFA726 30%, #FFB74D 90%)",
            color: "white",
            borderRadius: 2,
            textTransform: "none",
            boxShadow: theme.shadows[2],
            "&:hover": {
              boxShadow: theme.shadows[4],
            },
          }}
        >
          İşaretleri Kaldır
        </Button>
        <Button
          variant="contained"
          color="error"
          startIcon={<DeleteSweep />}
          onClick={handleDeleteAll}
          size="small"
          fullWidth={isMobile}
          sx={{
            background: "linear-gradient(45deg, #F44336 30%, #EF5350 90%)",
            color: "white",
            borderRadius: 2,
            textTransform: "none",
            boxShadow: theme.shadows[2],
            "&:hover": {
              boxShadow: theme.shadows[4],
            },
          }}
        >
          Tümünü Sil
        </Button>
      </Stack>
    </Box>
  );
};

export default DailyRoutine;
