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
  Card,
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
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  requestNotificationPermission,
  showToast,
} from "../../utils/weather-theme-notify/NotificationManager";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../auth/firebaseConfig";
import { initialRoutines } from "../../utils/constant/ConstantData";
import { keyframes } from "@mui/system";

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
  const [routines, setRoutines] = useState([]);
  const isInitialLoad = useRef(true);

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
          notificationEnabled: false, // Bildirim varsayılan kapalı
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
  };

  // Bildirim aç/kapa: Artık lokal zamanlama yapılmıyor, sadece
  // her rutinin Firestore'da saklanan verisinde "notificationEnabled" alanını güncelliyoruz.
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
  };

  // Tüm bildirimleri aç/kapa: Tüm rutinlerin "notificationEnabled" alanını güncelliyoruz.
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
          };
          await setDoc(userDocRef, initialData);
          setRoutines(initialRoutines);
        }
        isInitialLoad.current = false;
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
            animation: `${keyframes`
              0% { transform: translateY(0px); }
              50% { transform: translateY(-20px); }
              100% { transform: translateY(0px); }
            `} 3s ease-in-out infinite`,
            fontSize: { xs: "1.5rem" },
          }}
        >
          <AccessTime sx={{ fontSize: 50, verticalAlign: "middle", mr: 2 }} />
          Günlük Rutinler
        </Typography>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={4} sm={4} md={4}>
            <Card
              sx={{
                p: 3,
                background: "rgba(255, 255, 255, 0.1)",
                backdropFilter: "blur(10px)",
                borderRadius: "24px",
                boxShadow: "0 0 20px #2196F322",
              }}
            >
              <Box sx={{ textAlign: "center", mb: 2 }}>
                <Box sx={{ fontSize: 40, color: "#4CAF50" }}>
                  <DoneAll sx={{ fontSize: { xs: "1.0rem", sm: "2rem" } }} />
                </Box>
              </Box>
              <Typography
                variant="h6"
                sx={{ color: "#fff", textAlign: "center" }}
              >
                Günlük Başarı
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
                {routines.filter((r) => r.checked).length}/{routines.length}
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
                    width: `${
                      (routines.filter((r) => r.checked).length /
                        routines.length) *
                      100
                    }%`,
                    height: "100%",
                    background: `linear-gradient(90deg, #4CAF50, ${alpha(
                      "#4CAF50",
                      0.7
                    )})`,
                    transition: "width 0.5s ease",
                  }}
                />
              </Box>
            </Card>
          </Grid>
          <Grid item xs={4} sm={4} md={4}>
            <Card
              sx={{
                p: 3,
                background: "rgba(255, 255, 255, 0.1)",
                backdropFilter: "blur(10px)",
                borderRadius: "24px",
                boxShadow: "0 0 20px #2196F322",
              }}
            >
              <Box sx={{ textAlign: "center", mb: 2 }}>
                <Box sx={{ fontSize: 40, color: "#2196F3" }}>
                  <CheckCircleOutline
                    sx={{ fontSize: { xs: "1.0rem", sm: "2rem" } }}
                  />
                </Box>
              </Box>
              <Typography
                variant="h6"
                sx={{ color: "#fff", textAlign: "center" }}
              >
                Haftalık Başarı
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
                {weeklyStats.completed}/{weeklyStats.total}
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
                    width: `${
                      (weeklyStats.completed / weeklyStats.total) * 100
                    }%`,
                    height: "100%",
                    background: `linear-gradient(90deg, #2196F3, ${alpha(
                      "#2196F3",
                      0.7
                    )})`,
                    transition: "width 0.5s ease",
                  }}
                />
              </Box>
            </Card>
          </Grid>
          <Grid item xs={4} sm={4} md={4}>
            <Card
              sx={{
                p: 3,
                background: "rgba(255, 255, 255, 0.1)",
                backdropFilter: "blur(10px)",
                borderRadius: "24px",
                boxShadow: "0 0 20px #2196F322",
              }}
            >
              <Box sx={{ textAlign: "center", mb: 2 }}>
                <Box sx={{ fontSize: 40, color: "#9C27B0" }}>
                  <NotificationsActive
                    sx={{ fontSize: { xs: "1.0rem", sm: "2rem" } }}
                  />
                </Box>
              </Box>
              <Typography
                variant="h6"
                sx={{ color: "#fff", textAlign: "center" }}
              >
                Aylık Başarı
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
                {monthlyStats.completed}/{monthlyStats.total}
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
                    width: `${
                      (monthlyStats.completed / monthlyStats.total) * 100
                    }%`,
                    height: "100%",
                    background: `linear-gradient(90deg, #9C27B0, ${alpha(
                      "#9C27B0",
                      0.7
                    )})`,
                    transition: "width 0.5s ease",
                  }}
                />
              </Box>
            </Card>
          </Grid>
        </Grid>

        <Card
          sx={{
            p: 3,
            background: "rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(10px)",
            borderRadius: "24px",
            boxShadow: "0 0 20px #2196F322",
            mb: 4,
          }}
        >
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

          <Button
            fullWidth
            onClick={() => setModalOpen(true)}
            startIcon={<Add />}
            sx={{
              mb: 3,
              background: "linear-gradient(45deg, #2196F3 30%, #3F51B5 90%)",
              color: "#fff",
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
                style={{ textAlign: "center", padding: "16px 0" }}
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
                      padding: 2,
                      marginBottom: 2,
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
                    <Box sx={{ flex: 1, marginLeft: 2 }}>
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
                        color: routine.notificationEnabled ? "#FFA726" : "#fff",
                      }}
                    >
                      {routine.notificationEnabled ? (
                        <NotificationImportant />
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
        </Card>

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
              sx={{ marginBottom: 2 }}
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
            <Button
              onClick={handleSaveRoutine}
              sx={{
                background: "linear-gradient(45deg, #2196F3 30%, #3F51B5 90%)",
                color: "#fff",
              }}
            >
              {editRoutineId ? "Güncelle" : "Kaydet"}
            </Button>
          </DialogActions>
        </Dialog>

        <Grid container spacing={2} sx={{ marginTop: 2 }}>
          <Grid item xs={12} sm={4}>
            <Button
              fullWidth
              onClick={handleSelectAll}
              startIcon={<DoneAll />}
              sx={{
                background: "linear-gradient(45deg, #9C27B0 10%, #81C784 60%)",
              }}
            >
              Tümünü İşaretle
            </Button>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button
              fullWidth
              onClick={handleUnselectAll}
              startIcon={<HighlightOff />}
              sx={{
                background:
                  "linear-gradient(45deg, rgb(156,39,136) 30%, #FFB74D 60%)",
              }}
            >
              İşaretleri Kaldır
            </Button>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button
              fullWidth
              onClick={handleDeleteAll}
              startIcon={<DeleteSweep />}
              sx={{
                background: "linear-gradient(45deg, #9C27B0 30%, #EF5350 90%)",
              }}
            >
              Tümünü Sil
            </Button>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default DailyRoutine;
