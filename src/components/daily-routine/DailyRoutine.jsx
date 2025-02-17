import React, { useEffect, useState } from "react";
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
  Fade,
} from "@mui/material";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Delete, Edit, CheckCircle, RemoveCircle } from "@mui/icons-material";
import ProgressChart from "../../utils/ProgressChart";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import {
  requestNotificationPermission,
  scheduleNotification,
} from "../../utils/weather-theme-notify/NotificationManager";

// Eğlenceli istatistik kartı komponenti
const StatCard = ({ title, value, total, icon, color }) => {
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
      whileHover={{
        scale: 1.05,
        rotate: [0, -1, 1, -1, 0],
        transition: { duration: 0.3 },
      }}
      whileTap={{ scale: 0.95 }}
    >
      <Card
        onClick={handleClick}
        sx={{
          minWidth: 250,
          cursor: "pointer",
          background: `linear-gradient(135deg, ${color}20 0%, ${color}05 100%)`,
          border: `1px solid ${color}30`,
        }}
      >
        <CardContent>
          <Stack spacing={2} alignItems="center">
            {icon}
            <Typography variant="h6" color="text.secondary" align="center">
              {title}
            </Typography>
            <Box sx={{ position: "relative", width: "100%" }}>
              <Typography
                variant="h3"
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

const DailyRoutine = ({
  routines = [],
  setRoutines,
  newRoutine,
  setNewRoutine,
  handleSaveRoutine,
  editRoutineId,
  setEditRoutineId,
  onDragEnd,
  deleteRoutine,
  completedRoutines = 0,
  totalRoutines = 0,
}) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState({});
  const [stats, setStats] = useState({
    daily: { completed: 0, total: 0 },
    weekly: { completed: 0, total: 0 },
    monthly: { completed: 0, total: 0 },
  });

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // İstatistikleri hesaplama
  useEffect(() => {
    const dailyStats = {
      completed: routines.filter((r) => r.checked).length,
      total: routines.length,
    };

    const weeklyStats = {
      completed: dailyStats.completed * 7,
      total: dailyStats.total * 7,
    };

    const monthlyStats = {
      completed: dailyStats.completed * 30,
      total: dailyStats.total * 30,
    };

    setStats({
      daily: dailyStats,
      weekly: weeklyStats,
      monthly: monthlyStats,
    });
  }, [routines]);

  // Gece yarısı reset
  useEffect(() => {
    const midnightReset = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        setRoutines((prevRoutines) =>
          prevRoutines.map((routine) => ({ ...routine, checked: false }))
        );
      }
    }, 60000);

    return () => clearInterval(midnightReset);
  }, [setRoutines]);

  const handleNotificationChange = (routineId) => {
    setNotificationsEnabled((prev) => ({
      ...prev,
      [routineId]: !prev[routineId],
    }));

    if (!notificationsEnabled[routineId]) {
      const routine = routines.find((r) => r.id === routineId);
      const routineTime = new Date(
        `${new Date().toDateString()} ${routine.time}`
      );
      const reminderTime = new Date(routineTime - 15 * 60 * 1000);

      scheduleNotification(
        `Hatırlatma: ${routine.title}`,
        reminderTime,
        "15-minutes"
      );

      scheduleNotification(
        `Hatırlatma: ${routine.title}`,
        routineTime,
        "on-time"
      );
    }
  };

  const handleSelectAll = () => {
    setRoutines((prevRoutines) =>
      prevRoutines.map((routine) => ({ ...routine, checked: true }))
    );
  };

  const handleUnselectAll = () => {
    setRoutines((prevRoutines) =>
      prevRoutines.map((routine) => ({ ...routine, checked: false }))
    );
  };

  const handleDeleteAll = () => {
    setRoutines([]);
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", p: 3 }}>
      {/* İstatistik Kartları */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={3}
        sx={{
          mb: 6,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <StatCard
          title="Günlük Başarı"
          value={stats.daily.completed}
          total={stats.daily.total}
          icon={<CheckCircle sx={{ fontSize: 40 }} />}
          color="#4CAF50"
        />
        <StatCard
          title="Haftalık Başarı"
          value={stats.weekly.completed}
          total={stats.weekly.total}
          icon={<CheckCircle sx={{ fontSize: 40 }} />}
          color="#2196F3"
        />
        <StatCard
          title="Aylık Başarı"
          value={stats.monthly.completed}
          total={stats.monthly.total}
          icon={<CheckCircle sx={{ fontSize: 40 }} />}
          color="#9C27B0"
        />
      </Stack>

      {/* Ana İçerik */}
      <Paper sx={{ p: 3, borderRadius: 2, mb: 4 }}>
        <Typography
          variant="h5"
          sx={{
            mb: 4,
            display: "flex",
            alignItems: "center",
            gap: 1,
            color: "primary.main",
            fontWeight: "bold",
          }}
        >
          ⏰ Günlük Rutin
        </Typography>

        {/* Rutin Ekleme Formu */}
        <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
          <TextField
            id="routine-time"
            name="time"
            label="Saat"
            type="time"
            value={newRoutine.time || ""}
            onChange={(e) =>
              setNewRoutine({ ...newRoutine, time: e.target.value })
            }
          />
          <TextField
            id="routine-title"
            name="title"
            label="Rutin Açıklaması"
            placeholder="Rutin açıklaması"
            value={newRoutine.title || ""}
            onChange={(e) =>
              setNewRoutine({ ...newRoutine, title: e.target.value })
            }
            sx={{ flex: 1 }}
          />
          <Button
            variant="contained"
            onClick={handleSaveRoutine}
            disabled={!newRoutine.title}
          >
            {editRoutineId ? "Güncelle" : "Ekle"}
          </Button>
        </Box>

        {/* Rutinler Listesi */}
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="routines">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                style={{ minHeight: "100px" }}
              >
                {routines.length === 0 ? (
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
                      style={{ height: 150, opacity: 0.8 }}
                    />
                    <Typography variant="h6" color="textSecondary">
                      Henüz rutin eklenmemiş
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Yukarıdaki formu kullanarak yeni rutinler ekleyebilirsiniz
                    </Typography>
                  </Box>
                ) : (
                  routines.map((routine, index) => (
                    <Draggable
                      key={routine.id}
                      draggableId={routine.id}
                      index={index}
                    >
                      {(provided) => (
                        <Fade in>
                          <Box
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              p: 2,
                              mb: 1,
                              background:
                                "linear-gradient(145deg, #ffffff 0%, #f5f5f5 100%)",
                              borderRadius: 2,
                              transition: "all 0.2s ease-in-out",
                              opacity: routine.checked ? 0.4 : 1,
                              textDecoration: routine.checked
                                ? "line-through"
                                : "none",
                              // Border ve shadow eklemeleri
                              border: `2px solid ${
                                routine.checked ? "#d3d3d3" : "#d3d3d3"
                              }`, // Border rengi
                              boxShadow: routine.checked
                                ? "0px 4px 8px rgba(0, 0, 0, 0.1)" // Hafif gölge
                                : "0px 8px 16px rgba(0, 0, 0, 0.2)", // Daha güçlü gölge
                              "&.MuiFade-entered": {
                                opacity: `${
                                  routine.checked ? 0.4 : 1
                                } !important`,
                                textDecoration: `${
                                  routine.checked ? "line-through" : "none"
                                } !important`,
                              },
                              "&:hover": {
                                transform: "translateY(-3px)",
                                boxShadow: routine.checked
                                  ? "0px 6px 12px rgba(0, 0, 0, 0.15)" // Hover sırasında daha belirgin gölge
                                  : "0px 12px 24px rgba(0, 0, 0, 0.3)", // Hover'da daha güçlü gölge
                                border: `2px solid ${
                                  routine.checked ? "#b0b0b0" : "#d3d3d3"
                                }`, // Hover'da border rengi değişimi
                              },
                            }}
                          >
                            <Checkbox
                              checked={routine.checked || false}
                              onChange={() =>
                                setRoutines(
                                  routines.map((r) =>
                                    r.id === routine.id
                                      ? { ...r, checked: !r.checked }
                                      : r
                                  )
                                )
                              }
                            />
                            <Box sx={{ flex: 1 }}>
                              <Typography
                                variant="body1"
                                sx={{
                                  textDecoration: routine.checked
                                    ? "line-through"
                                    : "none",
                                  color: routine.checked
                                    ? "text.secondary"
                                    : "text.primary",
                                }}
                              >
                                {routine.time} | {routine.title}
                              </Typography>
                            </Box>
                            <IconButton
                              onClick={() => {
                                setNewRoutine(routine);
                                setEditRoutineId(routine.id);
                              }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                            <IconButton
                              onClick={() => deleteRoutine(routine.id)}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                            <IconButton
                              onClick={() =>
                                handleNotificationChange(routine.id)
                              }
                              sx={{
                                color: notificationsEnabled[routine.id]
                                  ? "primary.main"
                                  : "text.secondary",
                              }}
                            >
                              {notificationsEnabled[routine.id] ? "🔔" : "🔕"}
                            </IconButton>
                          </Box>
                        </Fade>
                      )}
                    </Draggable>
                  ))
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
        {/* Rutin İlerleme Grafiği */}
        <ProgressChart
          completedRoutines={completedRoutines}
          totalRoutines={totalRoutines}
          sx={{
            mt: 4,
            mx: "auto",
            maxWidth: 400,
          }}
        />
      </Paper>

      {/* Alt Aksiyonlar */}
      <Stack
        direction="row"
        spacing={2}
        sx={{
          justifyContent: "center",
          mt: 4,
        }}
      >
        <Button
          variant="outlined"
          startIcon={<CheckCircle />}
          onClick={handleSelectAll}
          size="large"
        >
          Tümünü İşaretle
        </Button>
        <Button
          variant="outlined"
          startIcon={<RemoveCircle />}
          onClick={handleUnselectAll}
          size="large"
        >
          İşaretleri Kaldır
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={<Delete />}
          onClick={handleDeleteAll}
          size="large"
        >
          Tümünü Sil
        </Button>
      </Stack>
    </Box>
  );
};

export default DailyRoutine;
