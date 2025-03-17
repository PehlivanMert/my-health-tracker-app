import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Tooltip,
  alpha,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogContent,
  IconButton,
  Button,
} from "@mui/material";
import { motion } from "framer-motion";
import CloseIcon from "@mui/icons-material/Close";

// Yardımcı fonksiyonlar
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
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));
  // Seçilen gün için dialog state
  const [selectedDay, setSelectedDay] = useState(null);

  // Tema renkleri
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

  // Belirli bir tarih için rutinleri döndüren fonksiyon
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

    // Tekrarlanan rutinleri groupId ile deduplicate ediyoruz
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

  // Takvim verisi hesaplama
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

    // Sonraki ayın günleri (takvimi tamamlama)
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

    // Haftalara bölme
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    return weeks;
  }, [currentMonth, currentYear, routines]);

  // Günün tekil ID'sini oluşturma
  const getDayId = (date) => {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  };

  // Rutin kartı bileşeni
  const RoutineCard = ({ routine, isCompact = false }) => (
    <Tooltip title={`${routine.time} - ${routine.title}`} arrow placement="top">
      <motion.div
        onClick={(e) => {
          e.stopPropagation();
          onRoutineClick(routine);
          // Dialog kapansın
          setSelectedDay(null);
        }}
        whileTap={{ scale: 0.98 }}
        style={{
          backgroundColor: alpha(
            categoryColors[routine.category] || categoryColors.Default,
            0.2
          ),
          padding: isCompact ? "1px 3px" : "2px 4px",
          borderRadius: "4px",
          fontSize: isCompact ? "0.6rem" : "0.7rem",
          color: categoryColors[routine.category] || categoryColors.Default,
          marginBottom: "2px",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          overflow: "hidden",
          cursor: "pointer",
          borderLeft: `2px solid ${
            categoryColors[routine.category] || categoryColors.Default
          }`,
        }}
      >
        {routine.time} - {routine.title}
      </motion.div>
    </Tooltip>
  );

  // Gün hücre bileşeni
  const CalendarDayCell = ({ day }) => {
    const visibleRoutinesCount = isMobile ? 1 : isTablet ? 2 : 3;
    const remainingRoutines = day.routines.length - visibleRoutinesCount;

    const handleDayClick = () => {
      setSelectedDay(day);
    };

    return (
      <Box sx={{ position: "relative", width: "100%", height: "100%" }}>
        <motion.div
          onClick={handleDayClick}
          style={{
            height: "100%",
            padding: isMobile ? "4px" : "8px",
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
            cursor: "pointer",
            transition: "all 0.2s ease",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Typography
            variant={isMobile ? "caption" : "body2"}
            sx={{
              fontWeight: day.isToday ? 700 : 500,
              color: day.isToday ? colors.primary : colors.text.primary,
            }}
          >
            {day.dayNumber}
          </Typography>
          <Box sx={{ flexGrow: 1, overflow: "hidden" }}>
            {day.routines.slice(0, visibleRoutinesCount).map((routine) => (
              <RoutineCard
                key={routine.id}
                routine={routine}
                isCompact={isMobile}
              />
            ))}
            {remainingRoutines > 0 && (
              <Typography
                variant="caption"
                sx={{
                  color: colors.text.secondary,
                  fontSize: isMobile ? "0.5rem" : "0.6rem",
                  display: "block",
                  textAlign: "center",
                  padding: "1px",
                  backgroundColor: alpha(colors.surface, 0.3),
                  borderRadius: "3px",
                }}
              >
                +{remainingRoutines} daha...
              </Typography>
            )}
          </Box>
        </motion.div>
      </Box>
    );
  };

  // Dialog kapatma fonksiyonu
  const handleCloseDialog = () => {
    setSelectedDay(null);
  };

  return (
    <Box sx={{ mt: 1, position: "relative" }}>
      {/* Haftanın günleri başlığı */}
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
            variant={isMobile ? "caption" : "subtitle2"}
            sx={{
              color: colors.text.secondary,
              fontWeight: 500,
              fontSize: isMobile ? "0.6rem" : isTablet ? "0.75rem" : "0.875rem",
            }}
          >
            {day}
          </Typography>
        ))}
      </Box>

      {/* Takvim grid'i */}
      <Box
        sx={{
          display: "grid",
          gap: isMobile ? 0.5 : 1,
        }}
      >
        {calendarData.map((week, weekIndex) => (
          <Box
            key={`week-${weekIndex}`}
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: isMobile ? 0.5 : 1,
              height: isMobile ? "70px" : isTablet ? "90px" : "110px",
            }}
          >
            {week.map((day, dayIndex) => (
              <CalendarDayCell key={`day-${weekIndex}-${dayIndex}`} day={day} />
            ))}
          </Box>
        ))}
      </Box>

      {/* Dialog: Seçilen günün rutinlerini gösterir veya boşsa ekleme seçeneği sunar */}
      <Dialog
        open={Boolean(selectedDay)}
        onClose={handleCloseDialog}
        PaperProps={{
          sx: {
            backgroundColor: colors.background,
            borderRadius: "16px",
            boxShadow: "0 6px 30px rgba(0,0,0,0.3)",
            border: `1px solid ${alpha(colors.primary, 0.5)}`,
            p: 2,
            width: isMobile ? "90%" : isTablet ? "70%" : "50%",
            maxWidth: isMobile ? "95%" : 400,
          },
        }}
      >
        {selectedDay && (
          <>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 1,
                borderBottom: `1px solid ${alpha(colors.surface, 0.5)}`,
                pb: 1,
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  color: colors.text.primary,
                  fontWeight: 600,
                }}
              >
                Rutinler
              </Typography>
              <IconButton onClick={handleCloseDialog}>
                <CloseIcon sx={{ color: colors.text.secondary }} />
              </IconButton>
            </Box>
            <Typography
              variant="caption"
              sx={{ color: colors.text.secondary, mb: 2, display: "block" }}
            >
              {selectedDay.date.toLocaleDateString("tr-TR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </Typography>
            <DialogContent sx={{ p: 0 }}>
              {selectedDay.routines.length > 0 ? (
                <>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    {selectedDay.routines.map((routine) => (
                      <Box
                        key={routine.id}
                        component={motion.div}
                        whileHover={{ scale: 1.02 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onRoutineClick(routine);
                          handleCloseDialog();
                        }}
                        sx={{
                          padding: "8px",
                          backgroundColor: alpha(
                            categoryColors[routine.category] ||
                              categoryColors.Default,
                            0.2
                          ),
                          borderRadius: "8px",
                          borderLeft: `4px solid ${
                            categoryColors[routine.category] ||
                            categoryColors.Default
                          }`,
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.5,
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: "0.9rem",
                              fontWeight: 600,
                              color:
                                categoryColors[routine.category] ||
                                categoryColors.Default,
                            }}
                          >
                            {routine.title}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: "0.8rem",
                              color: colors.text.secondary,
                              fontWeight: 500,
                            }}
                          >
                            {routine.time}
                          </Typography>
                        </Box>
                        {routine.description && (
                          <Typography
                            sx={{
                              fontSize: "0.8rem",
                              color: colors.text.muted,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {routine.description}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Box>
                  <Box sx={{ mt: 2, textAlign: "center" }}>
                    <Button
                      variant="contained"
                      onClick={() => {
                        onDayClick(selectedDay.date);
                        handleCloseDialog();
                      }}
                      sx={{
                        backgroundColor: colors.primary,
                        "&:hover": { backgroundColor: colors.secondary },
                        textTransform: "none",
                        fontWeight: 600,
                      }}
                    >
                      Yeni Rutin Ekle
                    </Button>
                  </Box>
                </>
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    mt: 2,
                    gap: 2,
                  }}
                >
                  <Typography sx={{ color: colors.text.secondary }}>
                    Bu gün için rutin bulunamadı.
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => {
                      onDayClick(selectedDay.date);
                      handleCloseDialog();
                    }}
                    sx={{
                      backgroundColor: colors.primary,
                      "&:hover": { backgroundColor: colors.secondary },
                      textTransform: "none",
                      fontWeight: 600,
                    }}
                  >
                    Yeni Rutin Ekle
                  </Button>
                </Box>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default MonthCalendar;
