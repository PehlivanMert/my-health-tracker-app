import React from "react";
import {
  Box,
  Typography,
  Paper,
  useTheme,
  alpha,
  IconButton,
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import { motion } from "framer-motion";
import { CheckCircle, Circle } from "@mui/icons-material";

const getTurkeyLocalDateString = (date = new Date()) => {
  return new Date(
    date.toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
  ).toLocaleDateString("en-CA");
};

const normalizeDate = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const isSameDay = (d1, d2) =>
  d1.getFullYear() === d2.getFullYear() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getDate() === d2.getDate();

const getRoutineCompletedStatus = (routine, date) => {
  if (!routine.date) return false;
  
  const dateStr = getTurkeyLocalDateString(date);
  const routineDateStr = getTurkeyLocalDateString(new Date(routine.date));
  
  // Eğer bu rutin bu tarihte değilse, tamamlanmamış sayılır
  if (dateStr !== routineDateStr) return false;
  
  if (routine.repeat && routine.repeat !== "none") {
    return routine.completedDates && routine.completedDates.includes(dateStr);
  } else {
    // Tekrarsız rutinler için completed durumunu kontrol et
    return routine.completed;
  }
};

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
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const colors = {
    primary: "#3a7bd5",
    secondary: "#00d2ff",
    background: alpha("#121858", 0.7),
    surface: alpha("#ffffff", 0.1),
    text: { primary: "#ffffff", secondary: alpha("#ffffff", 0.7) },
  };

  // Ayın ilk gününü ve son gününü hesapla
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  
  // Ayın ilk gününün haftanın hangi günü olduğunu bul (0 = Pazar)
  const firstDayOfWeek = firstDayOfMonth.getDay();
  
  // Takvimde gösterilecek toplam gün sayısı
  const daysInMonth = lastDayOfMonth.getDate();
  
  // Takvimde gösterilecek toplam hücre sayısı (6 hafta x 7 gün)
  const totalCells = 42;
  
  // Takvim hücrelerini oluştur
  const calendarCells = [];
  
  for (let i = 0; i < totalCells; i++) {
    const dayOffset = i - firstDayOfWeek;
    const cellDate = new Date(currentYear, currentMonth, dayOffset + 1);
    
    // Bu hücrenin bu ayın bir günü olup olmadığını kontrol et
    const isCurrentMonth = cellDate.getMonth() === currentMonth;
    
    // Bu güne ait rutinleri bul
    const routinesForDay = routines.filter(routine => {
      if (!routine.date) return false;
      
      const routineDate = normalizeDate(new Date(routine.date));
      return isSameDay(routineDate, cellDate);
    });
    
    calendarCells.push({
      date: cellDate,
      isCurrentMonth,
      routines: routinesForDay,
    });
  }

  const weekDays = ["Pzr", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

  return (
    <Box
      sx={{
        backgroundColor: colors.background,
        borderRadius: "16px",
        padding: { xs: "10px", sm: "20px" },
        boxShadow: `0 8px 32px 0 ${alpha("#000", 0.2)}`,
        backdropFilter: "blur(10px)",
        border: `1px solid ${alpha("#fff", 0.1)}`,
        overflow: "hidden",
        width: "100%",
      }}
    >
      {/* Haftanın günleri başlığı */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: { xs: 0.5, sm: 1 },
          mb: 2,
        }}
      >
        {weekDays.map((day) => (
          <Box
            key={day}
            sx={{
              textAlign: "center",
              padding: { xs: "4px", sm: "8px" },
              fontWeight: "bold",
              color: colors.text.secondary,
              fontSize: { xs: "0.7rem", sm: "0.9rem" },
            }}
          >
            {day}
          </Box>
        ))}
      </Box>

      {/* Takvim hücreleri */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: { xs: 0.5, sm: 1 },
        }}
      >
        {calendarCells.map((cell, index) => (
          <Paper
            key={index}
            component={motion.div}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onDayClick && onDayClick(cell.date)}
            sx={{
              aspectRatio: "1",
              padding: { xs: "2px", sm: "8px" },
              backgroundColor: cell.isCurrentMonth 
                ? alpha(colors.surface, 0.3) 
                : alpha(colors.surface, 0.1),
              border: `1px solid ${alpha("#fff", 0.1)}`,
              borderRadius: { xs: "4px", sm: "8px" },
              cursor: "pointer",
              position: "relative",
              minHeight: { xs: "50px", sm: "80px" },
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              width: "100%",
            }}
          >
            {/* Gün numarası */}
            <Typography
              variant="body2"
              sx={{
                color: cell.isCurrentMonth 
                  ? colors.text.primary 
                  : colors.text.secondary,
                fontWeight: "bold",
                fontSize: { xs: "0.7rem", sm: "0.9rem" },
                textAlign: "center",
                mb: { xs: 0.5, sm: 1 },
              }}
            >
              {cell.date.getDate()}
            </Typography>

            {/* Rutinler */}
            <Box
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 0.5,
                overflow: "hidden",
              }}
            >
              {cell.routines.slice(0, isMobile ? 4 : 5).map((routine, routineIndex) => {
                const isCompleted = getRoutineCompletedStatus(routine, cell.date);
                
                return (
                  <Tooltip
                    key={routine.id || routineIndex}
                    title={`${routine.title} - ${isCompleted ? 'Tamamlandı' : 'Bekliyor'}`}
                    placement="top"
                  >
                    <Box
                      onClick={(e) => {
                        e.stopPropagation();
                        onRoutineClick && onRoutineClick(routine);
                      }}
                                              sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: { xs: 0.25, sm: 0.5 },
                          padding: { xs: "1px 2px", sm: "2px 4px" },
                          borderRadius: { xs: "2px", sm: "4px" },
                          backgroundColor: alpha(
                            categoryColors[routine.category] || colors.primary,
                            0.2
                          ),
                          border: `1px solid ${alpha(
                            categoryColors[routine.category] || colors.primary,
                            0.3
                          )}`,
                          cursor: "pointer",
                          "&:hover": {
                            backgroundColor: alpha(
                              categoryColors[routine.category] || colors.primary,
                              0.3
                            ),
                          },
                        }}
                    >
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCheck && onCheck(routine, !isCompleted);
                        }}
                        sx={{
                          padding: 0,
                          color: isCompleted 
                            ? colors.primary 
                            : colors.text.secondary,
                        }}
                      >
                        {isCompleted ? (
                          <CheckCircle fontSize="small" />
                        ) : (
                          <Circle fontSize="small" />
                        )}
                      </IconButton>
                      
                      <Typography
                        variant="caption"
                        sx={{
                          color: colors.text.primary,
                          fontSize: { xs: "0.55rem", sm: "0.65rem" },
                          fontWeight: isCompleted ? "bold" : "normal",
                          textDecoration: isCompleted ? "line-through" : "none",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: 1,
                        }}
                      >
                        {routine.title}
                      </Typography>
                    </Box>
                  </Tooltip>
                );
              })}
              
              {/* Daha fazla rutin varsa göster */}
              {cell.routines.length > (isMobile ? 4 : 5) && (
                <Typography
                  variant="caption"
                  sx={{
                    color: colors.text.secondary,
                    fontSize: { xs: "0.6rem", sm: "0.7rem" },
                    textAlign: "center",
                    fontStyle: "italic",
                    backgroundColor: alpha(colors.surface, 0.3),
                    padding: { xs: "1px 3px", sm: "2px 4px" },
                    borderRadius: { xs: "2px", sm: "4px" },
                    marginTop: { xs: 0.5, sm: 1 },
                  }}
                >
                  +{cell.routines.length - (isMobile ? 4 : 5)} daha
                </Typography>
              )}
            </Box>
          </Paper>
        ))}
      </Box>
    </Box>
  );
};

export default MonthCalendar; 