import React, { useState, useMemo, useEffect, useRef } from "react";
import { Box, Button, Typography, IconButton, useTheme, useMediaQuery } from "@mui/material";
import { Add, ChevronLeft, ChevronRight, CalendarMonth, AccessTime, Autorenew } from "@mui/icons-material";
import { DateTime } from "luxon";
import { motion, AnimatePresence } from "framer-motion";

import { useCalendarData } from "../../hooks/useCalendarData";
import { useCalendarForm } from "../../hooks/useCalendarForm";
import { CalendarEventForm } from "./CalendarEventForm";
import { CalendarEventDetails } from "./CalendarEventDetails";
import { CalendarColorPicker } from "./CalendarColorPicker";
import { requestNotificationPermission } from "../../utils/weather-theme-notify/NotificationManager";

const calendarColors = {
  indigo:   "#6366f1",
  cyan:     "#06b6d4",
  violet:   "#8b5cf6",
  emerald:  "#10b981",
  rose:     "#f43f5e",
  amber:    "#f59e0b",
  sky:      "#38bdf8",
  pink:     "#ec4899",
  teal:     "#14b8a6",
  orange:   "#f97316",
  lime:     "#84cc16",
  fuchsia:  "#d946ef",
  red:      "#ef4444",
  yellow:   "#eab308",
  green:    "#22c55e",
  blue:     "#3b82f6",
  slate:    "#94a3b8",
  limon: "#84cc16",
  sakız: "#d946ef",
  kızılÖte: "#f43f5e",
  mandalina: "#f97316",
  buz: "#06b6d4",
  üzüm: "#8b5cf6",
  okyanus: "#38bdf8",
  güneş: "#eab308",
  lavanta: "#8b5cf6",
  zümrüt: "#10b981",
  şeker: "#ec4899",
  gökyüzü: "#38bdf8",
  ateş: "#ef4444",
  neonGece: "#6366f1",
  fosfor: "#22c55e",
  şafak: "#f43f5e",
  yıldız: "#f59e0b",
  galaksi: "#8b5cf6",
  aurora: "#10b981",
  neonRüya: "#d946ef",
  mercan: "#f43f5e",
  turkuaz: "#14b8a6",
  altın: "#f59e0b",
  pembe: "#ec4899",
  mor: "#8b5cf6",
  turuncu: "#f97316",
  yeşil: "#22c55e",
  kırmızı: "#ef4444",
  mavi: "#6366f1",
  gümüş: "#94a3b8",
};

const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

const CalendarComponent = ({ user }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const containerRef = useRef(null);

  // States
  const [currentDate, setCurrentDate] = useState(DateTime.local().setZone("Europe/Istanbul"));
  const [selectedDate, setSelectedDate] = useState(DateTime.local().setZone("Europe/Istanbul"));
  const [openColorPicker, setOpenColorPicker] = useState(false);
  const [currentColorTarget, setCurrentColorTarget] = useState("new");

  // Hooks
  const { events, addEvent, deleteEvent, updateEvent } = useCalendarData(user, calendarColors);
  const {
    openDialog, setOpenDialog,
    openEditDialog, setOpenEditDialog,
    selectedEvent, setSelectedEvent,
    newEvent, setNewEvent,
    editEvent, setEditEvent,
    handleDateTimeChange,
    resetNewEvent,
  } = useCalendarForm(calendarColors.indigo);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Handlers
  const handleCreateEventSubmit = async () => {
    const success = await addEvent(newEvent);
    if (success) { setOpenDialog(false); resetNewEvent(); }
  };

  const handleUpdateEventSubmit = async () => {
    const success = await updateEvent(editEvent);
    if (success) { setOpenEditDialog(false); setSelectedEvent(null); }
  };

  const handleDeleteEventSubmit = async (id) => {
    const success = await deleteEvent(id);
    if (success) setSelectedEvent(null);
  };

  const handleColorSelect = (color) => {
    if (currentColorTarget === "new") setNewEvent(p => ({ ...p, color }));
    else setEditEvent(p => ({ ...p, color }));
  };

  const prevMonth = () => setCurrentDate(prev => prev.minus({ months: 1 }));
  const nextMonth = () => setCurrentDate(prev => prev.plus({ months: 1 }));
  const goToday = () => {
    const now = DateTime.local().setZone("Europe/Istanbul");
    setCurrentDate(now);
    setSelectedDate(now);
  };

  // Calendar Grid Logic
  const daysInMonth = useMemo(() => {
    const startOfMonth = currentDate.startOf("month");
    const endOfMonth = currentDate.endOf("month");
    
    // JS 0=Sun, 1=Mon... Luxon 1=Mon, 7=Sun
    const startOffset = startOfMonth.weekday - 1; 
    
    const days = [];
    // Prev month padding
    for (let i = 0; i < startOffset; i++) {
      days.push({ date: startOfMonth.minus({ days: startOffset - i }), isCurrentMonth: false });
    }
    // Current month days
    for (let i = 1; i <= endOfMonth.day; i++) {
      days.push({ date: startOfMonth.set({ day: i }), isCurrentMonth: true });
    }
    // Next month padding (to complete the grid)
    const remainingDays = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ date: endOfMonth.plus({ days: i }), isCurrentMonth: false });
    }
    
    return days;
  }, [currentDate]);

  // Recurrence & Event Parsing
  // Events for selected date
  const selectedDateEvents = useMemo(() => {
    const checkDateStr = selectedDate.toFormat("yyyy-MM-dd");
    const selectedDayOfWeek = selectedDate.weekday; // 1-7
    const selectedDayOfMonth = selectedDate.day;

    return events.filter(evt => {
      const startStr = DateTime.fromJSDate(evt.start).toFormat("yyyy-MM-dd");
      
      // Normal event
      if (!evt.isRecurring && startStr === checkDateStr) return true;
      
      // Recurring event
      if (evt.isRecurring) {
        const evtStart = DateTime.fromJSDate(evt.start);
        const until = evt.recurrenceUntil ? DateTime.fromJSDate(evt.recurrenceUntil) : null;
        
        // Before start or after until -> false
        if (selectedDate < evtStart.startOf('day')) return false;
        if (until && selectedDate > until.endOf('day')) return false;

        if (evt.recurrenceType === "daily") return true;
        if (evt.recurrenceType === "weekly" && evtStart.weekday === selectedDayOfWeek) return true;
        if (evt.recurrenceType === "monthly" && evtStart.day === selectedDayOfMonth) return true;
      }
      return false;
    }).sort((a, b) => a.start - b.start);
  }, [events, selectedDate]);

  // Get dots for a specific day in the grid
  const getEventDots = (gridDate) => {
    const dateStr = gridDate.toFormat("yyyy-MM-dd");
    const dayOfWeek = gridDate.weekday;
    const dayOfMonth = gridDate.day;

    const dayEvents = events.filter(evt => {
      const startStr = DateTime.fromJSDate(evt.start).toFormat("yyyy-MM-dd");
      if (!evt.isRecurring && startStr === dateStr) return true;
      if (evt.isRecurring) {
        const evtStart = DateTime.fromJSDate(evt.start);
        const until = evt.recurrenceUntil ? DateTime.fromJSDate(evt.recurrenceUntil) : null;
        if (gridDate < evtStart.startOf('day')) return false;
        if (until && gridDate > until.endOf('day')) return false;

        if (evt.recurrenceType === "daily") return true;
        if (evt.recurrenceType === "weekly" && evtStart.weekday === dayOfWeek) return true;
        if (evt.recurrenceType === "monthly" && evtStart.day === dayOfMonth) return true;
      }
      return false;
    });

    return dayEvents.slice(0, 3).map(e => e.color); // Max 3 dots
  };

  return (
    <Box
      ref={containerRef}
      component={motion.div}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      sx={{
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        gap: { xs: 2, md: 3 },
        minHeight: "calc(100vh - 140px)",
      }}
    >
      {/* ── Sol: Takvim Grid ── */}
      <Box
        sx={{
          flex: { xs: "none", md: 2 },
          background: "rgba(15,23,42,0.85)",
          backdropFilter: "blur(20px)",
          borderRadius: "24px",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 16px 40px rgba(0,0,0,0.3)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Calendar Header */}
        <Box sx={{ p: { xs: 1.5, sm: 2.5 }, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ p: 1, borderRadius: "10px", background: "linear-gradient(135deg, #6366f1, #06b6d4)", display: "flex" }}>
              <CalendarMonth sx={{ fontSize: 20, color: "#fff" }} />
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: "1.1rem", color: "#fff", textTransform: "capitalize" }}>
              {currentDate.toFormat("MMMM yyyy", { locale: "tr" })}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              onClick={goToday}
              size="small"
              sx={{ minWidth: 0, px: 1.5, py: 0.5, borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", fontSize: "0.75rem", "&:hover": { background: "rgba(255,255,255,0.05)", color: "#fff" } }}
            >
              Bugün
            </Button>
            <IconButton onClick={prevMonth} size="small" sx={{ border: "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: "8px" }}>
              <ChevronLeft fontSize="small" />
            </IconButton>
            <IconButton onClick={nextMonth} size="small" sx={{ border: "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: "8px" }}>
              <ChevronRight fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Calendar Body */}
        <Box sx={{ p: { xs: 1, sm: 2 } }}>
          {/* Weekdays */}
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", mb: 1 }}>
            {WEEKDAYS.map(day => (
              <Typography key={day} align="center" sx={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.4)", mb: 1 }}>
                {day}
              </Typography>
            ))}
          </Box>
          
          {/* Days Grid */}
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: { xs: 0.5, sm: 1 } }}>
            {daysInMonth.map((dayObj, i) => {
              const isSelected = dayObj.date.hasSame(selectedDate, "day");
              const isToday = dayObj.date.hasSame(DateTime.local(), "day");
              const dots = getEventDots(dayObj.date);

              return (
                <Box
                  key={i}
                  onClick={() => setSelectedDate(dayObj.date)}
                  sx={{
                    aspectRatio: "1/1",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    borderRadius: "14px",
                    position: "relative",
                    transition: "all 0.2s ease",
                    border: isSelected ? "1px solid rgba(99,102,241,0.5)" : "1px solid transparent",
                    background: isSelected 
                      ? "rgba(99,102,241,0.15)" 
                      : isToday 
                        ? "rgba(255,255,255,0.08)" 
                        : "transparent",
                    opacity: dayObj.isCurrentMonth ? 1 : 0.3,
                    "&:hover": {
                      background: isSelected ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.05)"
                    }
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: { xs: "0.85rem", sm: "0.95rem" },
                      fontWeight: isSelected || isToday ? 700 : 500,
                      color: isSelected ? "#818cf8" : isToday ? "#06b6d4" : "#fff"
                    }}
                  >
                    {dayObj.date.day}
                  </Typography>

                  {/* Event Dots */}
                  <Box sx={{ display: "flex", gap: "2px", mt: 0.5 }}>
                    {dots.map((color, idx) => (
                      <Box key={idx} sx={{ width: 4, height: 4, borderRadius: "50%", background: color }} />
                    ))}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>

      {/* ── Sağ/Alt: Etkinlik Listesi ── */}
      <Box
        sx={{
          flex: { xs: "none", md: 1 },
          background: "rgba(15,23,42,0.6)",
          backdropFilter: "blur(20px)",
          borderRadius: "24px",
          border: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minHeight: { xs: "300px", md: "auto" }
        }}
      >
        <Box sx={{ p: { xs: 1.5, sm: 2.5 }, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <Typography sx={{ fontWeight: 600, color: "#fff", fontSize: "1rem" }}>
            {selectedDate.toFormat("d MMMM yyyy", { locale: "tr" })}
          </Typography>
          <Button
            onClick={() => { resetNewEvent(); setOpenDialog(true); }}
            sx={{
              minWidth: 0, width: 32, height: 32, borderRadius: "10px", p: 0,
              background: "linear-gradient(135deg, #6366f1, #06b6d4)",
              color: "#fff",
              "&:hover": { filter: "brightness(1.1)", transform: "translateY(-1px)" }
            }}
          >
            <Add fontSize="small" />
          </Button>
        </Box>

        <Box sx={{ p: { xs: 1, sm: 2 }, flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1.5 }}>
          <AnimatePresence mode="popLayout">
            {selectedDateEvents.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Box sx={{ textAlign: "center", py: 5, color: "rgba(255,255,255,0.3)" }}>
                  <CalendarMonth sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
                  <Typography variant="body2">Bu güne ait etkinlik bulunamadı.</Typography>
                </Box>
              </motion.div>
            ) : (
              selectedDateEvents.map((evt) => {
                const startStr = DateTime.fromJSDate(evt.start).toFormat("HH:mm");
                const endStr = evt.end ? DateTime.fromJSDate(evt.end).toFormat("HH:mm") : "";
                
                return (
                  <motion.div
                    key={evt.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Box
                      onClick={() => {
                        const eventStart = DateTime.fromJSDate(evt.start);
                        const eventEnd = evt.end ? DateTime.fromJSDate(evt.end) : null;
                        setSelectedEvent({
                          id: evt.id,
                          title: evt.title,
                          start: eventStart,
                          end: eventEnd,
                          color: evt.color,
                          allDay: evt.allDay,
                          notification: evt.notification,
                          isRecurring: evt.isRecurring,
                          recurrenceType: evt.recurrenceType || "",
                          recurrenceUntil: evt.recurrenceUntil ? DateTime.fromJSDate(evt.recurrenceUntil) : null,
                          notificationId: evt.notificationId,
                        });
                      }}
                      sx={{
                        p: 1.5,
                        borderRadius: "14px",
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.05)",
                        borderLeft: `4px solid ${evt.color}`,
                        cursor: "pointer",
                        transition: "all 0.2s",
                        "&:hover": { background: "rgba(255,255,255,0.06)", transform: "translateY(-1px)" }
                      }}
                    >
                      <Typography sx={{ fontWeight: 600, color: "#fff", fontSize: "0.9rem", mb: 0.5 }}>{evt.title}</Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        {!evt.allDay && (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "rgba(255,255,255,0.5)" }}>
                            <AccessTime sx={{ fontSize: 12 }} />
                            <Typography sx={{ fontSize: "0.75rem" }}>{startStr} {endStr && `- ${endStr}`}</Typography>
                          </Box>
                        )}
                        {evt.isRecurring && (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "rgba(255,255,255,0.5)" }}>
                            <Autorenew sx={{ fontSize: 12 }} />
                            <Typography sx={{ fontSize: "0.75rem" }}>Tekrarlı</Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </Box>
      </Box>

      {/* Dialoglar */}
      <CalendarEventForm
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        title="Yeni Etkinlik"
        event={newEvent}
        setEvent={setNewEvent}
        onSubmit={handleCreateEventSubmit}
        colors={calendarColors}
        handleDateTimeChange={(val, isStart) => handleDateTimeChange(val, isStart, false)}
        openColorPickerCb={() => { setCurrentColorTarget("new"); setOpenColorPicker(true); }}
      />

      <CalendarEventForm
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        title="Etkinliği Düzenle"
        event={editEvent}
        setEvent={setEditEvent}
        onSubmit={handleUpdateEventSubmit}
        colors={calendarColors}
        handleDateTimeChange={(val, isStart) => handleDateTimeChange(val, isStart, true)}
        openColorPickerCb={() => { setCurrentColorTarget("edit"); setOpenColorPicker(true); }}
      />

      <CalendarEventDetails
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        selectedEvent={selectedEvent}
        onEdit={() => { setEditEvent(selectedEvent); setOpenEditDialog(true); }}
        onDelete={handleDeleteEventSubmit}
      />

      <CalendarColorPicker
        container={containerRef.current}
        open={openColorPicker}
        onClose={() => setOpenColorPicker(false)}
        onColorSelect={handleColorSelect}
        colors={calendarColors}
      />
    </Box>
  );
};

export default CalendarComponent;
