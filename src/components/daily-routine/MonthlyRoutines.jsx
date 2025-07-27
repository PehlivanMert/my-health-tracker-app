import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  useTheme,
  alpha,
} from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  CalendarToday,
  List,
  Grid3x3,
} from "@mui/icons-material";
import MonthCalendar from "./MonthCalendar";
import MonthlyRoutineItem from "./MonthlyRoutineItem";

const getTurkeyLocalDateString = (date = new Date()) => {
  return new Date(
    date.toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
  ).toLocaleDateString("en-CA");
};

const getLocalDateString = (date) => getTurkeyLocalDateString(date);

const normalizeDate = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const isSameDay = (d1, d2) =>
  d1.getFullYear() === d2.getFullYear() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getDate() === d2.getDate();

const routineOccursOnDate = (routine, date) => {
  if (!routine.date) return false;
  const cellDate = normalizeDate(date);
  const dateStr = getLocalDateString(cellDate);

  if (routine.repeat && routine.repeat !== "none") {
    if (routine.completedDates && routine.completedDates.includes(dateStr))
      return false;
  } else {
    if (routine.completed) return false;
  }

  const initialDate = normalizeDate(new Date(routine.date));
  const count = Number(routine.repeatCount) || 1;
  if (!routine.repeat || routine.repeat === "none") {
    return isSameDay(initialDate, cellDate);
  }
  if (routine.repeat === "daily") {
    const diffDays = Math.floor((cellDate - initialDate) / (1000 * 3600 * 24));
    return diffDays >= 0 && diffDays < count;
  }
  if (routine.repeat === "weekly") {
    const diffDays = Math.floor((cellDate - initialDate) / (1000 * 3600 * 24));
    if (diffDays < 0 || diffDays % 7 !== 0) return false;
    return diffDays / 7 < count;
  }
  if (routine.repeat === "monthly") {
    if (cellDate.getDate() !== initialDate.getDate()) return false;
    const diffMonths =
      (cellDate.getFullYear() - initialDate.getFullYear()) * 12 +
      (cellDate.getMonth() - initialDate.getMonth());
    return diffMonths >= 0 && diffMonths < count;
  }
  return false;
};

const VIEW_MODES = {
  CALENDAR: "calendar",
  LIST: "list",
  GRID: "grid",
};

const MONTHS = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

const MonthlyRoutines = ({
  routines,
  currentTime,
  onCheck,
  onEdit,
  onDelete,
  onToggleNotification,
  notificationsEnabled,
  categoryColors,
  timeFilter,
  onDayClick,
}) => {
  const theme = useTheme();
  const colors = {
    primary: "#3a7bd5",
    secondary: "#00d2ff",
    background: alpha("#121858", 0.7),
    surface: alpha("#ffffff", 0.1),
    text: { primary: "#ffffff", secondary: alpha("#ffffff", 0.7) },
  };

  const [viewMode, setViewMode] = useState(VIEW_MODES.CALENDAR);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(currentDate.getMonth());
  const [currentYear, setCurrentYear] = useState(currentDate.getFullYear());
  const [filteredRoutines, setFilteredRoutines] = useState([]);

  useEffect(() => {
    const firstDay = normalizeDate(new Date(currentYear, currentMonth, 1));
    const lastDay = normalizeDate(new Date(currentYear, currentMonth + 1, 0));
    let daysInMonth = [];
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      daysInMonth.push(new Date(d));
    }

    console.log("MonthlyRoutines useEffect çalıştı");
    console.log("Toplam rutin sayısı:", routines.length);
    console.log("Rutinler:", routines.map(r => ({ title: r.title, date: r.date, repeat: r.repeat, groupId: r.groupId })));

    let filtered = [];
    if (timeFilter !== "Monthly") {
      const targetDate = normalizeDate(new Date());
      if (timeFilter === "Tomorrow")
        targetDate.setDate(targetDate.getDate() + 1);
      else if (timeFilter === "Yesterday")
        targetDate.setDate(targetDate.getDate() - 1);
      filtered = routines.filter((routine) =>
        routineOccursOnDate(routine, targetDate)
      );
    } else {
      filtered = routines.filter((routine) => {
        if (!routine.date) return false;
        
        // Tekrarlanan rutinler için routineOccursOnDate kullan
        if (routine.repeat && routine.repeat !== "none") {
          return daysInMonth.some((day) => routineOccursOnDate(routine, day));
        } else {
          // Tekrarlanmayan rutinler için normal kontrol
          const routineDate = normalizeDate(new Date(routine.date));
          return (
            routineDate >= firstDay &&
            routineDate <= lastDay
          );
        }
      });
    }
    
    console.log("Filtrelenen rutin sayısı:", filtered.length);
    console.log("Filtrelenen rutinler:", filtered.map(r => ({ title: r.title, date: r.date, repeat: r.repeat, groupId: r.groupId })));
    
    setFilteredRoutines(filtered);
  }, [routines, currentMonth, currentYear, timeFilter]);

  const goToPreviousMonth = () => {
    const newDate = new Date(currentYear, currentMonth - 1, 1);
    setCurrentMonth(newDate.getMonth());
    setCurrentYear(newDate.getFullYear());
  };

  const goToNextMonth = () => {
    const newDate = new Date(currentYear, currentMonth + 1, 1);
    setCurrentMonth(newDate.getMonth());
    setCurrentYear(newDate.getFullYear());
  };

  const goToCurrentMonth = () => {
    const today = new Date();
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  const ViewToggleButtons = () => (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        gap: 1,
        mb: 2,
        backgroundColor: alpha(colors.surface, 0.3),
        padding: "4px",
        borderRadius: "20px",
      }}
    >

      <Button
        size="small"
        startIcon={<CalendarToday />}
        onClick={() => setViewMode(VIEW_MODES.CALENDAR)}
        sx={{
          borderRadius: "18px",
          fontSize: "0.8rem",
          backgroundColor:
            viewMode === VIEW_MODES.CALENDAR
              ? alpha(colors.primary, 0.2)
              : "transparent",
          color:
            viewMode === VIEW_MODES.CALENDAR
              ? colors.text.primary
              : colors.text.secondary,
          "&:hover": { backgroundColor: alpha(colors.primary, 0.3) },
        }}
      >
        Takvim
      </Button>

      <Button
        size="small"
        startIcon={<List />}
        onClick={() => setViewMode(VIEW_MODES.LIST)}
        sx={{
          borderRadius: "18px",
          fontSize: "0.8rem",
          backgroundColor:
            viewMode === VIEW_MODES.LIST
              ? alpha(colors.primary, 0.2)
              : "transparent",
          color:
            viewMode === VIEW_MODES.LIST
              ? colors.text.primary
              : colors.text.secondary,
          "&:hover": { backgroundColor: alpha(colors.primary, 0.3) },
        }}
      >
        Liste
      </Button>
      <Button
        size="small"
        startIcon={<Grid3x3 />}
        onClick={() => setViewMode(VIEW_MODES.GRID)}
        sx={{
          borderRadius: "18px",
          fontSize: "0.8rem",
          backgroundColor:
            viewMode === VIEW_MODES.GRID
              ? alpha(colors.primary, 0.2)
              : "transparent",
          color:
            viewMode === VIEW_MODES.GRID
              ? colors.text.primary
              : colors.text.secondary,
          "&:hover": { backgroundColor: alpha(colors.primary, 0.3) },
        }}
      >
        Grid
      </Button>
    </Box>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Box
        sx={{
          backgroundColor: colors.background,
          borderRadius: "24px",
          padding: "20px",
          boxShadow: `0 8px 32px 0 ${alpha("#000", 0.2)}`,
          backdropFilter: "blur(10px)",
          border: `1px solid ${alpha("#fff", 0.1)}`,
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
          <IconButton
            onClick={goToPreviousMonth}
            sx={{
              color: colors.text.primary,
              backgroundColor: alpha(colors.surface, 0.3),
              "&:hover": { backgroundColor: alpha(colors.surface, 0.5) },
            }}
          >
            <ChevronLeft />
          </IconButton>
          <Box sx={{ textAlign: "center" }}>
            <Typography
              variant="h5"
              component="div"
              sx={{
                color: colors.text.primary,
                fontWeight: 600,
                background: `linear-gradient(45deg, ${colors.primary}, ${colors.secondary})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
              onClick={goToCurrentMonth}
            >
              {MONTHS[currentMonth]} {currentYear}
            </Typography>
          </Box>
          <IconButton
            onClick={goToNextMonth}
            sx={{
              color: colors.text.primary,
              backgroundColor: alpha(colors.surface, 0.3),
              "&:hover": { backgroundColor: alpha(colors.surface, 0.5) },
            }}
          >
            <ChevronRight />
          </IconButton>
        </Box>

        <ViewToggleButtons />

        <AnimatePresence mode="wait">
          {viewMode === VIEW_MODES.CALENDAR && (
            <MonthCalendar
              key="calendar"
              routines={filteredRoutines}
              currentMonth={currentMonth}
              currentYear={currentYear}
              categoryColors={categoryColors}
              onRoutineClick={onEdit}
              onDayClick={onDayClick}
              onCheck={onCheck}
            />
          )}
          {viewMode === VIEW_MODES.LIST && (
            <Box
              key="list"
              component={motion.div}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {filteredRoutines.length === 0 ? (
                <Box
                  sx={{
                    textAlign: "center",
                    padding: "32px 0",
                    backgroundColor: alpha(colors.surface, 0.2),
                    borderRadius: "12px",
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{ color: colors.text.secondary }}
                  >
                    Bu ay için rutin bulunamadı.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      color: "#fff",
                      mb: 2,
                      fontWeight: "bold",
                      textAlign: "center",
                      textTransform: "uppercase",
                    }}
                  >
                    Aktif Rutinler
                  </Typography>
                  <AnimatePresence>
                    {filteredRoutines.map((routine) => (
                      <motion.div
                        key={routine.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                      >
                        <MonthlyRoutineItem
                          routine={routine}
                          currentTime={currentTime}
                          onCheck={onCheck}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          onToggleNotification={onToggleNotification}
                          notificationsEnabled={notificationsEnabled}
                          categoryColors={categoryColors}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </Box>
              )}
            </Box>
          )}
          {viewMode === VIEW_MODES.GRID && (
            <Box
              key="grid"
              component={motion.div}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                gap: 2,
              }}
            >
              {filteredRoutines.length === 0 ? (
                <Box
                  sx={{
                    textAlign: "center",
                    padding: "32px 0",
                    backgroundColor: alpha(colors.surface, 0.2),
                    borderRadius: "12px",
                    gridColumn: "1 / -1",
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{ color: colors.text.secondary }}
                  >
                    Bu ay için rutin bulunamadı.
                  </Typography>
                </Box>
              ) : (
                filteredRoutines.map((routine) => (
                  <MonthlyRoutineItem
                    key={routine.id}
                    routine={routine}
                    currentTime={currentTime}
                    onCheck={onCheck}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onToggleNotification={onToggleNotification}
                    notificationsEnabled={notificationsEnabled}
                    categoryColors={categoryColors}
                    gridView
                  />
                ))
              )}
            </Box>
          )}
        </AnimatePresence>
      </Box>
    </motion.div>
  );
};

export default MonthlyRoutines;
