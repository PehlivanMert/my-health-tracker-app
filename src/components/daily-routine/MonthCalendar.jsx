import React, { useMemo } from "react";
import { Box, Typography, Tooltip, alpha, useTheme } from "@mui/material";
import { motion } from "framer-motion";

const normalizeDate = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const isSameDay = (d1, d2) =>
  d1.getFullYear() === d2.getFullYear() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getDate() === d2.getDate();

const getTurkeyLocalDateString = (date = new Date()) => {
  return new Date(
    date.toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
  ).toLocaleDateString("en-CA");
};

const getLocalDateString = (date) => getTurkeyLocalDateString(date);

const MonthCalendar = ({
  routines,
  currentMonth,
  currentYear,
  categoryColors,
  onRoutineClick,
  onDayClick,
  onCheck,
}) => {
  const theme = useTheme();
  const colors = {
    primary: "#3a7bd5",
    secondary: "#00d2ff",
    background: alpha("#121858", 0.7),
    surface: alpha("#ffffff", 0.1),
    text: {
      primary: "#ffffff",
      secondary: alpha("#ffffff", 0.7),
      muted: alpha("#ffffff", 0.5),
    },
    today: alpha("#3a7bd5", 0.3),
    weekend: alpha("#ffffff", 0.05),
    otherMonth: alpha("#ffffff", 0.03),
  };

  const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

  const getRoutinesForDate = (date) => {
    const cellDate = normalizeDate(date);
    const dateStr = getLocalDateString(cellDate);
    const filtered = routines.filter((r) => {
      if (!r.date) return false;
      if (r.repeat && r.repeat !== "none") {
        const isCompleted = r.completedDates?.includes(dateStr);
        if (isCompleted) return false;
      } else {
        if (r.completed) return false;
      }
      const initialDate = normalizeDate(new Date(r.date));
      const count = Number(r.repeatCount) || 1;
      if (!r.repeat || r.repeat === "none") {
        return isSameDay(initialDate, cellDate);
      }
      if (r.repeat === "daily") {
        const diffDays = Math.floor(
          (cellDate - initialDate) / (1000 * 3600 * 24)
        );
        return diffDays >= 0 && diffDays < count;
      }
      if (r.repeat === "weekly") {
        const diffDays = Math.floor(
          (cellDate - initialDate) / (1000 * 3600 * 24)
        );
        if (diffDays < 0 || diffDays % 7 !== 0) return false;
        return diffDays / 7 < count;
      }
      if (r.repeat === "monthly") {
        if (cellDate.getDate() !== initialDate.getDate()) return false;
        const diffMonths =
          (cellDate.getFullYear() - initialDate.getFullYear()) * 12 +
          (cellDate.getMonth() - initialDate.getMonth());
        return diffMonths >= 0 && diffMonths < count;
      }
      return false;
    });
    // Aynı tekrarlayan rutinleri groupId ile deduplicate ediyoruz.
    const unique = [];
    const seen = new Set();
    filtered.forEach((r) => {
      if (r.repeat && r.repeat !== "none" && r.groupId) {
        if (!seen.has(r.groupId)) {
          unique.push(r);
          seen.add(r.groupId);
        }
      } else {
        unique.push(r);
      }
    });
    return unique;
  };

  const calendarData = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    let firstDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (firstDayOfWeek === -1) firstDayOfWeek = 6;
    const daysInMonth = lastDayOfMonth.getDate();
    const lastDayOfPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
    let days = [];

    // Önceki ayın günleri
    for (let i = 0; i < firstDayOfWeek; i++) {
      const dayNumber = lastDayOfPrevMonth - firstDayOfWeek + i + 1;
      const date = new Date(currentYear, currentMonth - 1, dayNumber);
      days.push({
        dayNumber,
        isCurrentMonth: false,
        date,
        routines: getRoutinesForDate(date),
      });
    }
    // Mevcut ayın günleri
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentYear, currentMonth, i);
      days.push({
        dayNumber: i,
        isCurrentMonth: true,
        date,
        isToday: isSameDay(new Date(), date),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        routines: getRoutinesForDate(date),
      });
    }
    // Sonraki ayın günleri (takvimi tamamlamak için)
    const totalCells = Math.ceil(days.length / 7) * 7;
    const remainingDays = totalCells - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(currentYear, currentMonth + 1, i);
      days.push({
        dayNumber: i,
        isCurrentMonth: false,
        date,
        routines: getRoutinesForDate(date),
      });
    }
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    return weeks;
  }, [currentMonth, currentYear, routines]);

  // CalendarDayCell: Tüm hücreler başlangıçta aynı boyutta (örneğin 100px yüksekliğinde) olacak.
  // Mouse üzerine geldiğinde yalnızca o hücre whileHover ile sabit olarak scale: 1.3 olur.
  const CalendarDayCell = ({ day }) => {
    return (
      <motion.div
        onClick={() => onDayClick(day.date)}
        initial={{ scale: 1 }}
        whileHover={{ scale: 1.3, zIndex: 2 }}
        transition={{ duration: 0.3, type: "tween" }}
        style={{
          cursor: "pointer",
          position: "relative",
          height: "100px",
          width: "100%", // hücreler başlangıçta eşit genişlikte olsun
        }}
      >
        <Box
          sx={{
            padding: "8px",
            backgroundColor: day.isToday
              ? colors.today
              : day.isWeekend && day.isCurrentMonth
              ? colors.weekend
              : day.isCurrentMonth
              ? colors.surface
              : colors.otherMonth,
            borderRadius: "12px",
            display: "flex",
            flexDirection: "column",
            gap: 0.5,
            border: day.isToday
              ? `1px solid ${colors.primary}`
              : `1px solid ${alpha(colors.surface, 0.2)}`,
            opacity: day.isCurrentMonth ? 1 : 0.5,
            height: "100%", // kutu hücreyle aynı yükseklikte
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: day.isToday ? 700 : 500,
              color: day.isToday ? colors.primary : colors.text.primary,
            }}
          >
            {day.dayNumber}
          </Typography>
          <Box sx={{ flexGrow: 1, overflow: "visible" }}>
            {day.routines.map((routine) => (
              <Tooltip
                key={routine.id}
                title={`${routine.time} - ${routine.title}`}
                arrow
              >
                <Box
                  component={motion.div}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRoutineClick(routine);
                  }}
                  whileHover={{ scale: 1.05 }}
                  sx={{
                    backgroundColor: alpha(
                      categoryColors[routine.category] ||
                        categoryColors.Default,
                      0.2
                    ),
                    padding: "2px 4px",
                    borderRadius: "4px",
                    fontSize: "0.7rem",
                    color:
                      categoryColors[routine.category] ||
                      categoryColors.Default,
                    marginBottom: "2px",
                  }}
                >
                  {routine.title}
                </Box>
              </Tooltip>
            ))}
          </Box>
        </Box>
      </motion.div>
    );
  };

  return (
    <Box sx={{ mt: 1 }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          mb: 1,
          textAlign: "center",
        }}
      >
        {WEEKDAYS.map((day) => (
          <Typography
            key={day}
            variant="subtitle2"
            sx={{ color: colors.text.secondary, fontWeight: 500 }}
          >
            {day}
          </Typography>
        ))}
      </Box>
      <Box sx={{ display: "grid", gap: 1 }}>
        {calendarData.map((week, weekIndex) => (
          <Box
            key={`week-${weekIndex}`}
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 1,
            }}
          >
            {week.map((day, dayIndex) => (
              <CalendarDayCell key={`day-${weekIndex}-${dayIndex}`} day={day} />
            ))}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default MonthCalendar;
