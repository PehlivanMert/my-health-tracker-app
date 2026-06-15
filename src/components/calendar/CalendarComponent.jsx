import React, { useRef, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import multiMonthPlugin from "@fullcalendar/multimonth";
import rrulePlugin from "@fullcalendar/rrule";
import { DateTime } from "luxon";
import { Paper, Box, Button, useTheme, useMediaQuery, Typography } from "@mui/material";
import { Add } from "@mui/icons-material";
import { motion } from "framer-motion";

// Custom Hooks & Components
import { useCalendarData } from "../../hooks/useCalendarData";
import { useCalendarForm } from "../../hooks/useCalendarForm";
import { CalendarEventForm } from "./CalendarEventForm";
import { CalendarEventDetails } from "./CalendarEventDetails";
import { CalendarColorPicker } from "./CalendarColorPicker";

// Bildirim
import { requestNotificationPermission } from "../../utils/weather-theme-notify/NotificationManager";

// FullCalendar CSS
import "@fullcalendar/core";
import "@fullcalendar/daygrid";
import "@fullcalendar/timegrid";
import "@fullcalendar/multimonth";

// Neon Renk Paleti
const calendarColors = {
  limon: "#00ff87",
  sakız: "#ff00ff",
  kızılÖte: "#ff0055",
  mandalina: "#ff9100",
  buz: "#00ffcc",
  üzüm: "#bf00ff",
  okyanus: "#00ffff",
  güneş: "#ffff00",
  lavanta: "#E066FF",
  zümrüt: "#00FF7F",
  şeker: "#FF1493",
  gökyüzü: "#87CEFA",
  ateş: "#FF4500",
  neonGece: "#4D4DFF",
  fosfor: "#39FF14",
  şafak: "#FF69B4",
  yıldız: "#FFD700",
  galaksi: "#8A2BE2",
  aurora: "#00FF00",
  neonRüya: "#FF1177",
  mercan: "#FF6B6B",
  turkuaz: "#40E0D0",
  altın: "#FFD700",
  pembe: "#FFC0CB",
  mor: "#9370DB",
  turuncu: "#FFA500",
  yeşil: "#32CD32",
  kırmızı: "#DC143C",
  mavi: "#4169E1",
  gümüş: "#C0C0C0",
};

const CalendarComponent = ({ user }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));
  const calendarRef = useRef(null);
  const paperRef = useRef(null);

  const { events, addEvent, deleteEvent, updateEvent, updateEventDates } = useCalendarData(user, calendarColors);
  
  const {
    openDialog, setOpenDialog,
    openEditDialog, setOpenEditDialog,
    selectedEvent, setSelectedEvent,
    newEvent, setNewEvent,
    editEvent, setEditEvent,
    handleDateTimeChange,
    handleDateSelect,
    resetNewEvent,
  } = useCalendarForm(calendarColors.lavanta);

  const [openColorPicker, setOpenColorPicker] = React.useState(false);
  const [currentColorTarget, setCurrentColorTarget] = React.useState("new"); // "new" or "edit"

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const handleCreateEventSubmit = async () => {
    const success = await addEvent(newEvent);
    if (success) {
      setOpenDialog(false);
      resetNewEvent();
    }
  };

  const handleUpdateEventSubmit = async () => {
    const success = await updateEvent(editEvent);
    if (success) {
      setOpenEditDialog(false);
      setSelectedEvent(null);
    }
  };

  const handleDeleteEventSubmit = async (id) => {
    const success = await deleteEvent(id);
    if (success) {
      setSelectedEvent(null);
    }
  };

  const handleEventDrop = async (dropInfo) => {
    const start = DateTime.fromJSDate(dropInfo.event.start);
    const end = dropInfo.event.end ? DateTime.fromJSDate(dropInfo.event.end) : null;
    await updateEventDates(dropInfo.event.id, start, end, dropInfo.event.allDay);
  };

  const handleEventResize = async (resizeInfo) => {
    const start = DateTime.fromJSDate(resizeInfo.event.start);
    const end = DateTime.fromJSDate(resizeInfo.event.end);
    await updateEventDates(resizeInfo.event.id, start, end, resizeInfo.event.allDay);
  };

  const handleToggleFullScreen = () => {
    const container = paperRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen?.() || container.mozRequestFullScreen?.() || container.webkitRequestFullscreen?.() || container.msRequestFullscreen?.();
    } else {
      document.exitFullscreen?.() || document.mozCancelFullScreen?.() || document.webkitExitFullscreen?.() || document.msExitFullscreen?.();
    }
  };

  const handleColorSelect = (color) => {
    if (currentColorTarget === "new") {
      setNewEvent((prev) => ({ ...prev, color }));
    } else {
      setEditEvent((prev) => ({ ...prev, color }));
    }
  };

  const renderEventContent = (eventInfo) => {
    const startStr = DateTime.fromJSDate(eventInfo.event.start).setZone("Europe/Istanbul").toFormat("HH:mm");
    const endStr = eventInfo.event.end ? DateTime.fromJSDate(eventInfo.event.end).setZone("Europe/Istanbul").toFormat("HH:mm") : "";
    const isAllDay = eventInfo.event.allDay;

    return (
      <Box
        sx={{
          backgroundColor: eventInfo.event.backgroundColor,
          padding: { xs: "4px 6px", sm: "6px 8px", md: "6px 10px" },
          borderRadius: "6px",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          lineHeight: 1.2,
          width: "100%",
          color: "#fff",
          minHeight: { xs: "20px", sm: "24px", md: "28px" },
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: { xs: "0.65rem", sm: "0.75rem", md: "0.85rem" }, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {eventInfo.event.title}
        </Typography>
        {!isAllDay && (
          <Typography variant="caption" sx={{ fontSize: { xs: "0.55rem", sm: "0.65rem", md: "0.75rem" }, opacity: 0.9 }}>
            {startStr} {endStr ? `- ${endStr}` : ""}
          </Typography>
        )}
      </Box>
    );
  };

  return (
    <Paper
      component={motion.div}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      ref={paperRef}
      sx={styles.container}
    >
      <Box sx={styles.controls}>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => { resetNewEvent(); setOpenDialog(true); }}
          sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem", md: "inherit" }, padding: { xs: "6px 12px", sm: "8px 16px", md: "10px 20px" }, borderRadius: "20px" }}
        >
          Yeni Etkinlik
        </Button>
      </Box>

      <Box sx={{ ...styles.calendarWrapper, position: "relative", zIndex: 1 }}>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, multiMonthPlugin, rrulePlugin]}
          initialView="dayGridMonth"
          firstDay={1}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: isMobile ? "dayGridMonth,timeGridWeek,timeGridDay" : isTablet ? "dayGridMonth,timeGridWeek,timeGridDay,multiMonthYear" : "dayGridMonth,timeGridWeek,timeGridDay,multiMonthYear,fullscreenButton",
          }}
          customButtons={{ fullscreenButton: { text: "⛶", click: handleToggleFullScreen } }}
          eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
          events={events}
          editable={true}
          selectable={true}
          locale="tr"
          eventContent={renderEventContent}
          select={handleDateSelect}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          eventClick={(clickInfo) => {
            const eventStart = DateTime.fromJSDate(clickInfo.event.start).setZone("Europe/Istanbul");
            let eventEnd = clickInfo.event.end ? DateTime.fromJSDate(clickInfo.event.end).setZone("Europe/Istanbul") : null;
            if (!eventEnd && clickInfo.event.extendedProps.recurrence) {
              const duration = clickInfo.event.duration || { hours: 1 };
              eventEnd = eventStart.plus(duration);
            }
            setSelectedEvent({
              id: clickInfo.event.id,
              title: clickInfo.event.title,
              start: eventStart,
              end: eventEnd,
              color: clickInfo.event.backgroundColor,
              allDay: clickInfo.event.allDay,
              notification: clickInfo.event.extendedProps.notification || "none",
              isRecurring: !!clickInfo.event.extendedProps.recurrence,
              recurrenceType: clickInfo.event.extendedProps.recurrence?.recurrenceType || "",
              recurrenceUntil: clickInfo.event.extendedProps.recurrence?.recurrenceUntil ? DateTime.fromJSDate(new Date(clickInfo.event.extendedProps.recurrence.recurrenceUntil)).setZone("Europe/Istanbul") : DateTime.local().plus({ months: 1 }).setZone("Europe/Istanbul"),
              notificationId: clickInfo.event.extendedProps.notificationId || null,
            });
          }}
          height="100%"
          nowIndicator={true}
          dayHeaderClassNames="fc-day-header"
          dayCellClassNames="fc-day-cell"
        />
      </Box>

      <CalendarEventForm
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        title="Yeni Etkinlik Oluştur"
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
        container={paperRef.current}
        open={openColorPicker}
        onClose={() => setOpenColorPicker(false)}
        onColorSelect={handleColorSelect}
        colors={calendarColors}
      />
    </Paper>
  );
};

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    background: "linear-gradient(135deg, #1a2a6c, #2196F3 50%, #3F51B5 100%)",
    color: "#fff",
    overflow: "hidden",
  },
  controls: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    p: { xs: 1, sm: 2, md: 3 },
    background: "rgba(255,255,255,0.1)",
    backdropFilter: "blur(10px)",
    borderBottom: "1px solid rgba(255,255,255,0.2)",
  },
  calendarWrapper: {
    flex: 1,
    minHeight: { xs: 400, sm: 500, md: 600 },
    borderRadius: 5,
    background: "rgba(255,255,255,0.1)",
    backdropFilter: "blur(10px)",
    overflowX: "auto",
    overflowY: "hidden",
    "& .fc": {
      minWidth: { xs: "600px", sm: "auto" },
      fontFamily: "inherit",
      color: "rgba(0, 0, 0, 0.9)",
      height: "100%",
      "& .fc-timegrid-slot": { height: { xs: 26, sm: 32, md: 38 } },
      "& th": {
        background: "linear-gradient(135deg, #1a2a6c, #2196F3 50%, #3F51B5 100%)",
        padding: { xs: "4px 2px", sm: "6px 3px", md: "8px 4px" },
        fontSize: { xs: "0.7rem", sm: "0.8rem", md: "0.875rem" },
      },
      "& .fc-day-today, & .fc-daygrid-day.fc-day-today, & .fc-timegrid-col.fc-day-today": {
        backgroundColor: "rgba(19, 89, 107, 0.25)",
      },
      "& .fc-event": {
        border: "none",
        boxShadow: "0px 2px 4px rgba(0,0,0,0.3)",
        cursor: "move",
        transition: "all 0.2s",
        "&:hover": { boxShadow: "0px 4px 8px rgba(0,0,0,0.5)" },
      },
      "& .fc-button": {
        backgroundColor: "rgba(255,255,255,0.2)",
        color: "white",
        border: "1px solid rgba(255,255,255,0.3)",
        borderRadius: "8px",
        backdropFilter: "blur(10px)",
        transition: "all 0.3s ease",
        "&:hover": { backgroundColor: "rgba(255,255,255,0.3)" },
      },
      "& .fc-toolbar-title": {
        fontSize: { xs: "0.9rem", sm: "1.1rem", md: "1.25rem" },
        fontWeight: 600,
        color: "#fff",
      },
      "& .fc-daygrid-day-number, & .fc-timegrid-slot-label, & .fc-timegrid-axis": {
        color: "#fff",
      },
    },
  },
};

export default CalendarComponent;
