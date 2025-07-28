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
  currentMonth: parentCurrentMonth,
  currentYear: parentCurrentYear,
  onMonthChange,
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
  const [currentMonth, setCurrentMonth] = useState(parentCurrentMonth || currentDate.getMonth());
  const [currentYear, setCurrentYear] = useState(parentCurrentYear || currentDate.getFullYear());
  const [filteredRoutines, setFilteredRoutines] = useState([]);

    // Parent'tan gelen değerleri takip et
  useEffect(() => {
    if (parentCurrentMonth !== undefined && parentCurrentMonth !== currentMonth) {
      setCurrentMonth(parentCurrentMonth);
    }
    if (parentCurrentYear !== undefined && parentCurrentYear !== currentYear) {
      setCurrentYear(parentCurrentYear);
    }
  }, [parentCurrentMonth, parentCurrentYear, currentMonth, currentYear]);

  useEffect(() => {
    const firstDay = normalizeDate(new Date(currentYear, currentMonth, 1));
    const lastDay = normalizeDate(new Date(currentYear, currentMonth + 1, 0));
    let daysInMonth = [];
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      daysInMonth.push(new Date(d));
    }



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
    

    
    setFilteredRoutines(filtered);
  }, [routines, currentMonth, currentYear, timeFilter]);

  const goToPreviousMonth = () => {
    const newDate = new Date(currentYear, currentMonth - 1, 1);
    const newMonth = newDate.getMonth();
    const newYear = newDate.getFullYear();
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
    if (onMonthChange) {
      onMonthChange(newMonth, newYear);
    }
  };

  const goToNextMonth = () => {
    const newDate = new Date(currentYear, currentMonth + 1, 1);
    const newMonth = newDate.getMonth();
    const newYear = newDate.getFullYear();
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
    if (onMonthChange) {
      onMonthChange(newMonth, newYear);
    }
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
        background: "linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(63, 81, 181, 0.1) 100%)",
        padding: "6px",
        borderRadius: "24px",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        backdropFilter: "blur(10px)",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
      }}
    >

      <Button
        size="small"
        startIcon={<CalendarToday />}
        onClick={() => setViewMode(VIEW_MODES.CALENDAR)}
        sx={{
          borderRadius: "20px",
          fontSize: "0.8rem",
          fontWeight: 600,
          background: viewMode === VIEW_MODES.CALENDAR
            ? "linear-gradient(45deg, #2196F3 30%, #3F51B5 90%)"
            : "transparent",
          color: viewMode === VIEW_MODES.CALENDAR
            ? "#ffffff"
            : "rgba(255, 255, 255, 0.8)",
          border: viewMode === VIEW_MODES.CALENDAR
            ? "none"
            : "1px solid rgba(255, 255, 255, 0.2)",
          padding: "8px 16px",
          transition: "all 0.3s ease",
          "&:hover": {
            background: viewMode === VIEW_MODES.CALENDAR
              ? "linear-gradient(45deg, #1976D2 30%, #303F9F 90%)"
              : "rgba(255, 255, 255, 0.1)",
            transform: "translateY(-1px)",
            boxShadow: "0 4px 12px rgba(33, 150, 243, 0.3)",
          },
        }}
      >
        Takvim
      </Button>

      <Button
        size="small"
        startIcon={<List />}
        onClick={() => setViewMode(VIEW_MODES.LIST)}
        sx={{
          borderRadius: "20px",
          fontSize: "0.8rem",
          fontWeight: 600,
          background: viewMode === VIEW_MODES.LIST
            ? "linear-gradient(45deg, #2196F3 30%, #3F51B5 90%)"
            : "transparent",
          color: viewMode === VIEW_MODES.LIST
            ? "#ffffff"
            : "rgba(255, 255, 255, 0.8)",
          border: viewMode === VIEW_MODES.LIST
            ? "none"
            : "1px solid rgba(255, 255, 255, 0.2)",
          padding: "8px 16px",
          transition: "all 0.3s ease",
          "&:hover": {
            background: viewMode === VIEW_MODES.LIST
              ? "linear-gradient(45deg, #1976D2 30%, #303F9F 90%)"
              : "rgba(255, 255, 255, 0.1)",
            transform: "translateY(-1px)",
            boxShadow: "0 4px 12px rgba(33, 150, 243, 0.3)",
          },
        }}
      >
        Liste
      </Button>
      <Button
        size="small"
        startIcon={<Grid3x3 />}
        onClick={() => setViewMode(VIEW_MODES.GRID)}
        sx={{
          borderRadius: "20px",
          fontSize: "0.8rem",
          fontWeight: 600,
          background: viewMode === VIEW_MODES.GRID
            ? "linear-gradient(45deg, #2196F3 30%, #3F51B5 90%)"
            : "transparent",
          color: viewMode === VIEW_MODES.GRID
            ? "#ffffff"
            : "rgba(255, 255, 255, 0.8)",
          border: viewMode === VIEW_MODES.GRID
            ? "none"
            : "1px solid rgba(255, 255, 255, 0.2)",
          padding: "8px 16px",
          transition: "all 0.3s ease",
          "&:hover": {
            background: viewMode === VIEW_MODES.GRID
              ? "linear-gradient(45deg, #1976D2 30%, #303F9F 90%)"
              : "rgba(255, 255, 255, 0.1)",
            transform: "translateY(-1px)",
            boxShadow: "0 4px 12px rgba(33, 150, 243, 0.3)",
          },
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
          background: "linear-gradient(135deg, #1a2a6c 0%, #2196F3 50%, #3F51B5 100%)",
          borderRadius: "24px",
          padding: "20px",
          boxShadow: `0 8px 32px 0 ${alpha("#000", 0.3)}`,
          backdropFilter: "blur(10px)",
          border: `1px solid ${alpha("#fff", 0.15)}`,
          position: "relative",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(255, 255, 255, 0.05)",
            borderRadius: "24px",
            zIndex: 0,
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
            position: "relative",
            zIndex: 1,
          }}
        >
          <IconButton
            onClick={goToPreviousMonth}
            sx={{
              color: "#ffffff",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              backdropFilter: "blur(10px)",
              transition: "all 0.3s ease",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                transform: "scale(1.1)",
                boxShadow: "0 4px 12px rgba(33, 150, 243, 0.3)",
              },
            }}
          >
            <ChevronLeft />
          </IconButton>
          <Box sx={{ textAlign: "center" }}>
            <Typography
              variant="h5"
              component="div"
              sx={{
                color: "#ffffff",
                fontWeight: 700,
                textShadow: "0 2px 4px rgba(0,0,0,0.3)",
                cursor: "pointer",
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "scale(1.05)",
                  textShadow: "0 4px 8px rgba(0,0,0,0.4)",
                },
              }}
              onClick={goToCurrentMonth}
            >
              {MONTHS[currentMonth]} {currentYear}
            </Typography>
          </Box>
          <IconButton
            onClick={goToNextMonth}
            sx={{
              color: "#ffffff",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              backdropFilter: "blur(10px)",
              transition: "all 0.3s ease",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                transform: "scale(1.1)",
                boxShadow: "0 4px 12px rgba(33, 150, 243, 0.3)",
              },
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
