// src/components/Calendar/FullCalendarComponent.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import multiMonthPlugin from "@fullcalendar/multimonth";
import { DateTime } from "luxon";
import {
  Paper,
  Box,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Chip,
  MenuItem,
  Select,
  Checkbox,
  FormControlLabel,
  useTheme,
  Typography,
  colors,
} from "@mui/material";
import { Delete, Add, Edit } from "@mui/icons-material";
import { toast } from "react-toastify";
import {
  collection,
  query,
  getDocs,
  doc,
  deleteDoc,
  writeBatch,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../auth/firebaseConfig";

// FullCalendar CSS
import "@fullcalendar/core";
import "@fullcalendar/daygrid";
import "@fullcalendar/timegrid";
import "@fullcalendar/multimonth";
import { lightGreen } from "@mui/material/colors";
import { color } from "framer-motion";

const CalendarComponent = ({ user }) => {
  const theme = useTheme();
  const calendarRef = useRef(null);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editEvent, setEditEvent] = useState(null);
  const [newEvent, setNewEvent] = useState({
    title: "",
    start: DateTime.local().startOf("day"),
    end: DateTime.local().endOf("day"),
    allDay: true,
    color: theme.palette.primary.main,
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);

  const calendarColors = {
    primary: theme.palette.primary.main,
    secondary: theme.palette.secondary.main,
    error: colors.red[600],
    warning: colors.orange[600],
    success: colors.green[600],
  };

  const fetchEvents = useCallback(async () => {
    if (!user) return;

    try {
      const eventsRef = collection(db, "users", user.uid, "calendarEvents");
      const q = query(eventsRef);
      const snapshot = await getDocs(q);

      const eventsData = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          start: data.start.toDate(),
          end: data.end.toDate(),
          allDay: data.allDay,
          color: data.color || calendarColors.primary,
          extendedProps: {
            calendarId: data.calendarId,
          },
        };
      });

      setEvents(eventsData);
    } catch (error) {
      toast.error(`Etkinlikler yüklenemedi: ${error.message}`);
    }
  }, [user, calendarColors.primary]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleCreateEvent = async () => {
    if (!newEvent.title.trim()) {
      toast.error("Etkinlik başlığı gereklidir");
      return;
    }

    try {
      const batch = writeBatch(db);
      const eventsRef = collection(db, "users", user.uid, "calendarEvents");

      const eventData = {
        title: newEvent.title,
        start: Timestamp.fromDate(newEvent.start.toJSDate()),
        end: Timestamp.fromDate(newEvent.end.toJSDate()),
        allDay: newEvent.allDay,
        color: newEvent.color,
      };

      const docRef = doc(eventsRef);
      batch.set(docRef, eventData);
      await batch.commit();

      await fetchEvents();
      setOpenDialog(false);
      setNewEvent({
        title: "",
        start: DateTime.local().startOf("day"),
        end: DateTime.local().endOf("day"),
        allDay: true,
        color: theme.palette.primary.main,
      });
      toast.success("Etkinlik başarıyla eklendi");
    } catch (error) {
      toast.error(`Etkinlik oluşturma hatası: ${error.message}`);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      await deleteDoc(doc(db, "users", user.uid, "calendarEvents", eventId));
      await fetchEvents();
      toast.success("Etkinlik silindi");
      setSelectedEvent(null);
    } catch (error) {
      toast.error(`Silme hatası: ${error.message}`);
    }
  };

  const handleUpdateEvent = async () => {
    try {
      await updateDoc(
        doc(db, "users", user.uid, "calendarEvents", editEvent.id),
        {
          title: editEvent.title,
          start: Timestamp.fromDate(editEvent.start.toJSDate()),
          end: Timestamp.fromDate(editEvent.end.toJSDate()),
          allDay: editEvent.allDay,
          color: editEvent.color || calendarColors.primary, // Eklendi
        }
      );
      await fetchEvents();
      setOpenEditDialog(false);
      toast.success("Etkinlik güncellendi");
    } catch (error) {
      toast.error(`Güncelleme hatası: ${error.message}`);
    }
  };

  const handleDateSelect = (selectInfo) => {
    setNewEvent({
      title: "",
      start: DateTime.fromJSDate(selectInfo.start),
      end: DateTime.fromJSDate(selectInfo.end),
      allDay: selectInfo.allDay,
      color: calendarColors.primary,
    });
    setOpenDialog(true);
  };

  const handleEventDrop = async (dropInfo) => {
    try {
      const event = {
        id: dropInfo.event.id,
        start: DateTime.fromJSDate(dropInfo.event.start),
        end: DateTime.fromJSDate(dropInfo.event.end),
        allDay: dropInfo.event.allDay,
      };

      await updateDoc(doc(db, "users", user.uid, "calendarEvents", event.id), {
        start: Timestamp.fromDate(event.start.toJSDate()),
        end: Timestamp.fromDate(event.end.toJSDate()),
        allDay: event.allDay,
      });
      await fetchEvents();
    } catch (error) {
      toast.error(`Güncelleme hatası: ${error.message}`);
    }
  };

  const handleEventResize = async (resizeInfo) => {
    try {
      const event = {
        id: resizeInfo.event.id,
        start: DateTime.fromJSDate(resizeInfo.event.start),
        end: DateTime.fromJSDate(resizeInfo.event.end),
        allDay: resizeInfo.event.allDay,
      };

      await updateDoc(doc(db, "users", user.uid, "calendarEvents", event.id), {
        start: Timestamp.fromDate(event.start.toJSDate()),
        end: Timestamp.fromDate(event.end.toJSDate()),
      });
      await fetchEvents();
    } catch (error) {
      toast.error(`Güncelleme hatası: ${error.message}`);
    }
  };

  const handleDateTimeChange = (value, isStart, event, setEvent) => {
    const dt = DateTime.fromISO(value);
    if (!dt.isValid) return;

    setEvent((prev) => {
      const newValue = { ...prev };
      if (isStart) {
        newValue.start = dt;
        if (prev.allDay) newValue.start = newValue.start.startOf("day");
      } else {
        newValue.end = dt;
        if (prev.allDay) newValue.end = newValue.end.endOf("day");
      }
      return newValue;
    });
  };

  return (
    <Paper sx={styles.container}>
      <Box sx={[styles.controls]}>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
        >
          Yeni Etkinlik
        </Button>
      </Box>

      <Box sx={styles.calendarWrapper}>
        <FullCalendar
          ref={calendarRef}
          plugins={[
            dayGridPlugin,
            timeGridPlugin,
            interactionPlugin,
            multiMonthPlugin,
          ]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay,multiMonthYear",
          }}
          events={events}
          editable={true}
          selectable={true}
          locale="tr"
          eventContent={renderEventContent}
          select={handleDateSelect}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          eventClick={(clickInfo) => {
            const event = {
              id: clickInfo.event.id,
              title: clickInfo.event.title,
              start: DateTime.fromJSDate(clickInfo.event.start),
              end: DateTime.fromJSDate(clickInfo.event.end),
              color:
                clickInfo.event.extendedProps.color || calendarColors.primary, // Eklendi
              allDay: clickInfo.event.allDay,
            };
            setSelectedEvent(event);
          }}
          height="100%"
          nowIndicator={true}
          dayHeaderClassNames="fc-day-header"
          dayCellClassNames="fc-day-cell"
        />
      </Box>

      <EventDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        title="Yeni Etkinlik Oluştur"
        event={newEvent}
        setEvent={setNewEvent}
        onSubmit={handleCreateEvent}
        colors={calendarColors}
        handleDateTimeChange={handleDateTimeChange}
      />

      <EventDialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        title="Etkinliği Düzenle"
        event={editEvent}
        setEvent={setEditEvent}
        onSubmit={handleUpdateEvent}
        colors={calendarColors}
        handleDateTimeChange={handleDateTimeChange}
      />

      <Dialog
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        disableEnforceFocus
      >
        <DialogTitle>Etkinlik Detayları</DialogTitle>
        <DialogContent sx={styles.dialogContent}>
          <Typography variant="h6" gutterBottom>
            {selectedEvent?.title}
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Başlangıç: {selectedEvent?.start?.toFormat("dd.MM.yyyy HH:mm")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Bitiş: {selectedEvent?.end?.toFormat("dd.MM.yyyy HH:mm")}
          </Typography>

          <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<Edit />}
              onClick={() => {
                setEditEvent(selectedEvent);
                setOpenEditDialog(true);
              }}
            >
              Düzenle
            </Button>
            <Button
              color="error"
              startIcon={<Delete />}
              onClick={() => handleDeleteEvent(selectedEvent.id)}
            >
              Sil
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Paper>
  );
};

const EventDialog = ({
  open,
  onClose,
  title,
  event,
  setEvent,
  onSubmit,
  colors,
  handleDateTimeChange,
}) => {
  const handleAllDayChange = (e) => {
    setEvent((prev) => ({
      ...prev,
      allDay: e.target.checked,
      start: e.target.checked ? prev.start.startOf("day") : prev.start,
      end: e.target.checked ? prev.end.endOf("day") : prev.end,
    }));
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={styles.dialogContent}>
        <TextField
          label="Etkinlik Başlığı"
          fullWidth
          margin="normal"
          value={event?.title || ""}
          onChange={(e) => setEvent({ ...event, title: e.target.value })}
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={event?.allDay ?? true}
              onChange={handleAllDayChange}
            />
          }
          label="Tüm Gün"
          sx={{ mt: 1 }}
        />

        <Box sx={styles.timeInputs}>
          <TextField
            label="Başlangıç"
            type={event?.allDay ? "date" : "datetime-local"}
            InputLabelProps={{ shrink: true }}
            value={
              event?.start?.isValid
                ? event.start.toFormat(
                    event.allDay ? "yyyy-MM-dd" : "yyyy-MM-dd'T'HH:mm"
                  )
                : ""
            }
            onChange={(e) =>
              handleDateTimeChange(e.target.value, true, event, setEvent)
            }
            fullWidth
          />
          <TextField
            label="Bitiş"
            type={event?.allDay ? "date" : "datetime-local"}
            InputLabelProps={{ shrink: true }}
            value={
              event?.end?.isValid
                ? event.end.toFormat(
                    event.allDay ? "yyyy-MM-dd" : "yyyy-MM-dd'T'HH:mm"
                  )
                : ""
            }
            onChange={(e) =>
              handleDateTimeChange(e.target.value, false, event, setEvent)
            }
            fullWidth
          />
        </Box>

        <FormControl fullWidth margin="normal">
          <InputLabel>Renk</InputLabel>
          <Select
            value={event?.color || colors.primary}
            onChange={(e) => setEvent({ ...event, color: e.target.value })}
          >
            {Object.entries(colors).map(([name, color]) => (
              <MenuItem key={name} value={color}>
                <Chip
                  sx={{
                    bgcolor: color,
                    width: 24,
                    height: 24,
                    mr: 1,
                    borderRadius: "4px",
                  }}
                />
                {name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>İptal</Button>
        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={!event?.start?.isValid || !event?.end?.isValid}
        >
          Kaydet
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const renderEventContent = (eventInfo) => (
  <Box
    sx={{
      ...styles.eventContent,
      backgroundColor: eventInfo.event.extendedProps.color,
      padding: "2px 8px",
      borderRadius: "4px",
      lineHeight: 1.2,
    }}
  >
    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.8rem" }}>
      {eventInfo.event.title}
    </Typography>
    {!eventInfo.event.allDay && (
      <Typography variant="caption" sx={{ fontSize: "0.7rem" }}>
        {eventInfo.timeText}
      </Typography>
    )}
  </Box>
);

const styles = {
  container: {
    p: 3,
    borderRadius: 4,
    bgcolor: "background.paper",
    boxShadow: (theme) => theme.shadows[3],
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    height: "95vh",
    background: {
      xs: "linear-gradient(135deg, #f0f8ff 0%, #e6f7ff 100%)", // Küçük ekranlar
      md: "linear-gradient(135deg, #f0f8ff 0%, #e6f7ff 100%)", // Orta ve büyük ekranlar
      lg: "linear-gradient(135deg, #f0f8ff 0%, #e6f7ff 100%)", // Büyük ekranlar
    },
  },
  controls: {
    mb: 2,
    color: "#2196F3",
  },
  calendarWrapper: {
    flex: 1,
    minHeight: 600,
    borderRadius: 5,
    background: "linear-gradient(135deg, #f5f5f5 0%, #fff8e7 100%)",
    overflow: "hidden",
    "& .fc": {
      fontFamily: "inherit",
      color: "#2196F3",
      height: "100%",
      "& th": {
        background:
          "linear-gradient(135deg, #f5f5f5 0%, #fff8e7 50%, #f0e6d2 100%)",
        padding: "8px 4px",
      },
      "& .fc-day-today": {
        backgroundColor: "#D1F8EF",
      },
      "& .fc-daygrid-day.fc-day-today": {
        backgroundColor: "#D1F8EF",
      },
      "& .fc-timegrid-col.fc-day-today": {
        backgroundColor: "#D1F8EF",
      },
      "& .fc-event": {
        border: "none",
        boxShadow: 1,
        cursor: "move",
        transition: "all 0.2s",
        "&:hover": {
          boxShadow: 3,
        },
      },
      "& .fc-now-indicator": {
        borderColor: colors.red[600],
      },
      "& .fc-button": {
        backgroundColor: "#3674B5", // Mavi arka plan
        color: "white", // Yazı rengi beyaz
        border: "none", // Kenarlık kaldırma
        borderRadius: "8px", // Yuvarlatılmış kenarlar
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)", // Gölgelendirme
        transition: "all 0.3s ease", // Geçiş efekti
      },
      "& .fc-button:hover": {
        backgroundColor: "#A1E3F9", // Daha koyu mavi
        transform: "translateY(-2px)", // Hafif yukarı kaydırma
      },
      "& .fc-button-primary.fc-button-active": {
        backgroundColor: "#FAFFAF", // Sarı arka plan
        color: "black", // Yazı rengi siyah
      },
      "& .fc-toolbar-title": {
        color: "#333", // Başlık rengi
        fontSize: "1.5rem", // Yazı boyutu
        fontWeight: "bold", // Kalın yazı
      },
    },
  },
  dialogContent: {
    py: 2,
    minWidth: 400,
    "& .MuiTextField-root": { my: 1 },
  },

  timeInputs: {
    display: "grid",
    gap: 2,
    gridTemplateColumns: "1fr 1fr",
    my: 2,
  },
  eventContent: {
    color: "common.white",
  },
};

export default CalendarComponent;
