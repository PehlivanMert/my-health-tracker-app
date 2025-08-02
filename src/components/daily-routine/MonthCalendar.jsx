import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  useTheme,
  alpha,
  IconButton,
  Tooltip,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  Chip,
  Divider,
  Badge,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle, 
  Circle, 
  Close,
  CalendarToday,
  Schedule,
} from "@mui/icons-material";

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
  const [selectedCell, setSelectedCell] = useState(null);
  const [showRoutinesDialog, setShowRoutinesDialog] = useState(false);
  
  const colors = {
    primary: "#2196F3",
    secondary: "#3F51B5",
    background: alpha("#1a2a6c", 0.8),
    surface: alpha("#ffffff", 0.1),
    text: { primary: "#ffffff", secondary: alpha("#ffffff", 0.7) },
  };

  const handleCellClick = (cell) => {
    if (cell.routines.length > 0) {
      setSelectedCell(cell);
      setShowRoutinesDialog(true);
    } else if (onDayClick) {
      onDayClick(cell.date);
    }
  };

  const handleCloseDialog = () => {
    setShowRoutinesDialog(false);
    setSelectedCell(null);
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
        background: "linear-gradient(135deg, #1a2a6c 0%, #2196F3 50%, #3F51B5 100%)",
        borderRadius: "16px",
        padding: { xs: "10px", sm: "20px" },
        boxShadow: `0 8px 32px 0 ${alpha("#000", 0.3)}`,
        backdropFilter: "blur(10px)",
        border: `1px solid ${alpha("#fff", 0.15)}`,
        overflow: "hidden",
        width: "100%",
        position: "relative",
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(255, 255, 255, 0.05)",
          borderRadius: "16px",
          zIndex: 0,
        },
      }}
    >
      {/* Haftanın günleri başlığı */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: { xs: 0.5, sm: 1 },
          mb: 2,
          position: "relative",
          zIndex: 1,
        }}
      >
        {weekDays.map((day) => (
          <Box
            key={day}
            sx={{
              textAlign: "center",
              padding: { xs: "4px", sm: "8px" },
              fontWeight: "bold",
              color: "#ffffff",
              fontSize: { xs: "0.7rem", sm: "0.9rem" },
              textShadow: "0 1px 2px rgba(0,0,0,0.3)",
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
          position: "relative",
          zIndex: 1,
        }}
      >
        {calendarCells.map((cell, index) => (
          <Paper
            key={index}
            component={motion.div}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleCellClick(cell)}
            sx={{
              aspectRatio: "1",
              padding: { xs: "2px", sm: "8px" },
              backgroundColor: cell.isCurrentMonth 
                ? "rgba(255, 255, 255, 0.15)" 
                : "rgba(255, 255, 255, 0.05)",
              border: `1px solid ${alpha("#fff", 0.2)}`,
              borderRadius: { xs: "4px", sm: "8px" },
              cursor: "pointer",
              position: "relative",
              minHeight: { xs: "50px", sm: "80px" },
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              width: "100%",
              backdropFilter: "blur(5px)",
              transition: "all 0.3s ease",
              "&:hover": {
                backgroundColor: cell.isCurrentMonth 
                  ? "rgba(255, 255, 255, 0.25)" 
                  : "rgba(255, 255, 255, 0.1)",
                transform: "scale(1.02)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              },
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
                            <Box sx={{ position: "relative", width: "100%" }}>
                {routines.filter(routine => {
                  if (!routine.date) return false;
                  const routineDate = normalizeDate(new Date(routine.date));
                  return isSameDay(routineDate, cell.date);
                }).slice(0, isMobile ? 2 : 3).map((routine, routineIndex) => {
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
                          marginBottom: { xs: 0.5, sm: 1 },
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
                            onCheck && onCheck(routine.id);
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
                
                {/* Daha fazla rutin varsa badge göster */}
                {(() => {
                  const dayRoutines = routines.filter(routine => {
                    if (!routine.date) return false;
                    const routineDate = normalizeDate(new Date(routine.date));
                    return isSameDay(routineDate, cell.date);
                  });
                  return dayRoutines.length > (isMobile ? 2 : 3) && (
                    <Badge
                      badgeContent={dayRoutines.length - (isMobile ? 2 : 3)}
                    color="primary"
                    sx={{
                      position: "absolute",
                      top: -5,
                      right: -5,
                      "& .MuiBadge-badge": {
                        fontSize: { xs: "0.6rem", sm: "0.7rem" },
                        minWidth: { xs: "16px", sm: "20px" },
                        height: { xs: "16px", sm: "20px" },
                        backgroundColor: colors.primary,
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: { xs: "16px", sm: "20px" },
                        height: { xs: "16px", sm: "20px" },
                        backgroundColor: "transparent",
                      }}
                    />
                  </Badge>
                );
                })()}
              </Box>
              

            </Box>
          </Paper>
        ))}
      </Box>

      {/* Rutin Detay Popup */}
      <Dialog
        open={showRoutinesDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: "linear-gradient(135deg, #1a2a6c 0%, #2196F3 50%, #3F51B5 100%)",
            borderRadius: "16px",
            border: `1px solid ${alpha("#fff", 0.15)}`,
            backdropFilter: "blur(15px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          },
        }}
      >
        <DialogTitle
          sx={{
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: `1px solid ${alpha("#fff", 0.2)}`,
            background: "rgba(255, 255, 255, 0.05)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CalendarToday sx={{ color: colors.primary }} />
            <Typography variant="h6">
              {selectedCell && new Date(selectedCell.date).toLocaleDateString('tr-TR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Typography>
          </Box>
          <IconButton
            onClick={handleCloseDialog}
            sx={{ color: colors.text.secondary }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ padding: 0 }}>
          {selectedCell && (
            <Box sx={{ padding: 2 }}>
              <Typography
                variant="body2"
                sx={{
                  color: colors.text.secondary,
                  mb: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Schedule fontSize="small" />
                {routines.filter(routine => {
                  if (!routine.date) return false;
                  const routineDate = normalizeDate(new Date(routine.date));
                  return isSameDay(routineDate, selectedCell.date);
                }).length} rutin
              </Typography>
              
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {routines.filter(routine => {
                  if (!routine.date) return false;
                  const routineDate = normalizeDate(new Date(routine.date));
                  return isSameDay(routineDate, selectedCell.date);
                }).map((routine, index) => {
                  const isCompleted = getRoutineCompletedStatus(routine, selectedCell.date);
                  
                  return (
                    <motion.div
                      key={routine.id || index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Paper
                        sx={{
                          padding: 2,
                          backgroundColor: "rgba(255, 255, 255, 0.1)",
                          border: `1px solid ${alpha("#fff", 0.2)}`,
                          borderRadius: "12px",
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          backdropFilter: "blur(10px)",
                          "&:hover": {
                            backgroundColor: "rgba(255, 255, 255, 0.2)",
                            transform: "translateY(-3px)",
                            boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
                          },
                        }}
                        onClick={() => {
                          onRoutineClick && onRoutineClick(routine);
                          handleCloseDialog();
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              onCheck && onCheck(routine.id);
                            }}
                            sx={{
                              color: isCompleted ? "#2196F3" : "rgba(255, 255, 255, 0.7)",
                              backgroundColor: "rgba(255, 255, 255, 0.1)",
                              "&:hover": {
                                backgroundColor: "rgba(33, 150, 243, 0.2)",
                                transform: "scale(1.1)",
                              },
                            }}
                          >
                            {isCompleted ? <CheckCircle /> : <Circle />}
                          </IconButton>
                          
                          <Box sx={{ flex: 1 }}>
                            <Typography
                              variant="h6"
                              sx={{
                                color: colors.text.primary,
                                fontWeight: isCompleted ? "bold" : "normal",
                                textDecoration: isCompleted ? "line-through" : "none",
                                mb: 0.5,
                              }}
                            >
                              {routine.title}
                            </Typography>
                            
                            {routine.description && (
                              <Typography
                                variant="body2"
                                sx={{
                                  color: colors.text.secondary,
                                  mb: 1,
                                }}
                              >
                                {routine.description}
                              </Typography>
                            )}
                            
                            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                              {routine.category && (
                                <Chip
                                  label={routine.category}
                                  size="small"
                                  sx={{
                                    backgroundColor: alpha(
                                      categoryColors[routine.category] || "#2196F3",
                                      0.2
                                    ),
                                    color: categoryColors[routine.category] || "#2196F3",
                                    border: `1px solid ${alpha(
                                      categoryColors[routine.category] || "#2196F3",
                                      0.4
                                    )}`,
                                    backdropFilter: "blur(5px)",
                                  }}
                                />
                              )}
                              
                              {routine.repeat && routine.repeat !== "none" && (
                                <Chip
                                  label={`${routine.repeat} (${routine.repeatCount})`}
                                  size="small"
                                  variant="outlined"
                                  sx={{
                                    color: colors.text.secondary,
                                    borderColor: alpha("#fff", 0.2),
                                  }}
                                />
                              )}
                              
                              <Chip
                                label={isCompleted ? "Tamamlandı" : "Bekliyor"}
                                size="small"
                                color={isCompleted ? "success" : "warning"}
                                variant="outlined"
                              />
                            </Box>
                          </Box>
                        </Box>
                      </Paper>
                    </motion.div>
                  );
                })}
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default MonthCalendar; 