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
  Select,
  MenuItem,
  Button,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Chip,
  useTheme,
  Typography,
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

const timeZones = [
  "Europe/Istanbul",
  "Europe/London",
  "America/New_York",
  "Asia/Tokyo",
];

const CalendarComponent = ({ user }) => {
  const theme = useTheme();
  const calendarRef = useRef(null);
  const [currentView, setCurrentView] = useState("dayGridMonth");
  const [currentTimeZone, setCurrentTimeZone] = useState("Europe/Istanbul");
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editEvent, setEditEvent] = useState(null);
  const [newEvent, setNewEvent] = useState({
    title: "",
    start: DateTime.now().setZone("Europe/Istanbul"),
    end: DateTime.now().setZone("Europe/Istanbul"),
    calendarId: "1",
    allDay: false,
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [deletedEvents, setDeletedEvents] = useState([]);

  const headerToolbar = {
    left: "prev,next today",
    center: "title",
    right: "dayGridMonth,timeGridWeek,timeGridDay,multiMonthYear",
  };

  const calendarColors = {
    1: theme.palette.primary.main,
    2: theme.palette.secondary.main,
  };

  const fetchEvents = useCallback(async () => {
    if (!user) return;

    try {
      const eventsRef = collection(db, "users", user.uid, "calendarEvents");
      const q = query(eventsRef);
      const snapshot = await getDocs(q);

      const eventsData = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          const start = DateTime.fromJSDate(data.start.toDate()).setZone(
            currentTimeZone
          );
          const end = DateTime.fromJSDate(data.end.toDate()).setZone(
            currentTimeZone
          );

          return {
            id: doc.id,
            title: data.title,
            start: start.isValid ? start.toJSDate() : null,
            end: end.isValid ? end.toJSDate() : null,
            allDay: data.allDay,
            extendedProps: {
              calendarId: data.calendarId,
            },
            backgroundColor: calendarColors[data.calendarId],
          };
        })
        .filter((event) => event.start && event.end);

      setEvents(eventsData);
    } catch (error) {
      toast.error(`Etkinlikler yüklenemedi: ${error.message}`);
    }
  }, [user, currentTimeZone]);

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
        calendarId: newEvent.calendarId,
      };

      const docRef = doc(eventsRef);
      batch.set(docRef, eventData);
      await batch.commit();

      await fetchEvents();
      setOpenDialog(false);
      toast.success("Etkinlik başarıyla eklendi");
    } catch (error) {
      toast.error(`Etkinlik oluşturma hatası: ${error.message}`);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      await deleteDoc(doc(db, "users", user.uid, "calendarEvents", eventId));
      setDeletedEvents((prev) => [...prev, eventId]);
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
          calendarId: editEvent.calendarId,
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
      ...newEvent,
      start: DateTime.fromJSDate(selectInfo.start).setZone(currentTimeZone),
      end: DateTime.fromJSDate(selectInfo.end).setZone(currentTimeZone),
      allDay: selectInfo.allDay,
    });
    setOpenDialog(true);
  };

  const handleDateTimeChange = (value, isStart) => {
    const dt = DateTime.fromISO(value, { zone: "local" });
    if (dt.isValid) {
      const converted = dt.setZone(currentTimeZone);
      setNewEvent((prev) => ({
        ...prev,
        [isStart ? "start" : "end"]: converted,
      }));
    }
  };

  const handleEditDateTimeChange = (value, isStart) => {
    const dt = DateTime.fromISO(value, { zone: "local" });
    if (dt.isValid) {
      const converted = dt.setZone(currentTimeZone);
      setEditEvent((prev) => ({
        ...prev,
        [isStart ? "start" : "end"]: converted,
      }));
    }
  };

  return (
    <Paper sx={styles.container}>
      <Box sx={styles.controls}>
        <Box sx={styles.controlsGroup}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpenDialog(true)}
            sx={{ mr: 2 }}
          >
            Yeni Etkinlik
          </Button>

          <Select
            value={currentView}
            onChange={(e) => setCurrentView(e.target.value)}
            sx={styles.viewSelector}
          >
            <MenuItem value="dayGridMonth">Aylık</MenuItem>
            <MenuItem value="timeGridWeek">Haftalık</MenuItem>
            <MenuItem value="timeGridDay">Günlük</MenuItem>
            <MenuItem value="multiMonthYear">Çoklu Ay</MenuItem>
          </Select>

          <Select
            value={currentTimeZone}
            onChange={(e) => setCurrentTimeZone(e.target.value)}
            sx={styles.timezoneSelector}
          >
            {timeZones.map((tz) => (
              <MenuItem key={tz} value={tz}>
                {tz}
              </MenuItem>
            ))}
          </Select>
        </Box>
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
          initialView={currentView}
          headerToolbar={headerToolbar}
          events={events}
          editable={true}
          selectable={true}
          locale="tr"
          timeZone={currentTimeZone}
          eventContent={renderEventContent}
          select={handleDateSelect}
          eventClick={(clickInfo) => {
            const event = {
              ...clickInfo.event,
              id: clickInfo.event.id,
              title: clickInfo.event.title,
              start: DateTime.fromJSDate(clickInfo.event.start),
              end: DateTime.fromJSDate(clickInfo.event.end),
              allDay: clickInfo.event.allDay,
              calendarId: clickInfo.event.extendedProps.calendarId,
            };
            setSelectedEvent(event);
          }}
          height="100%"
        />
      </Box>

      {/* Yeni Etkinlik Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Yeni Etkinlik Oluştur</DialogTitle>
        <DialogContent sx={styles.dialogContent}>
          <TextField
            label="Etkinlik Başlığı"
            fullWidth
            margin="normal"
            value={newEvent.title}
            onChange={(e) =>
              setNewEvent({ ...newEvent, title: e.target.value })
            }
          />

          <Box sx={styles.timeInputs}>
            <TextField
              label="Başlangıç"
              type="datetime-local"
              InputLabelProps={{ shrink: true }}
              value={newEvent.start.toFormat("yyyy-MM-dd'T'HH:mm")}
              onChange={(e) => handleDateTimeChange(e.target.value, true)}
              error={!newEvent.start.isValid}
              helperText={!newEvent.start.isValid && "Geçersiz tarih"}
            />
            <TextField
              label="Bitiş"
              type="datetime-local"
              InputLabelProps={{ shrink: true }}
              value={newEvent.end.toFormat("yyyy-MM-dd'T'HH:mm")}
              onChange={(e) => handleDateTimeChange(e.target.value, false)}
              error={!newEvent.end.isValid}
              helperText={!newEvent.end.isValid && "Geçersiz tarih"}
            />
          </Box>

          <FormControl fullWidth margin="normal">
            <InputLabel>Takvim</InputLabel>
            <Select
              value={newEvent.calendarId}
              onChange={(e) =>
                setNewEvent({ ...newEvent, calendarId: e.target.value })
              }
            >
              <MenuItem value="1">
                <Chip sx={{ bgcolor: calendarColors["1"], mr: 1 }} /> Kişisel
              </MenuItem>
              <MenuItem value="2">
                <Chip sx={{ bgcolor: calendarColors["2"], mr: 1 }} /> İş
              </MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>İptal</Button>
          <Button
            variant="contained"
            onClick={handleCreateEvent}
            disabled={!newEvent.start.isValid || !newEvent.end.isValid}
          >
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>

      {/* Etkinlik Detayları Dialog */}
      <Dialog open={!!selectedEvent} onClose={() => setSelectedEvent(null)}>
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

      {/* Etkinlik Düzenleme Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)}>
        <DialogTitle>Etkinliği Düzenle</DialogTitle>
        <DialogContent sx={styles.dialogContent}>
          <TextField
            label="Etkinlik Başlığı"
            fullWidth
            margin="normal"
            value={editEvent?.title || ""}
            onChange={(e) =>
              setEditEvent({ ...editEvent, title: e.target.value })
            }
          />

          <Box sx={styles.timeInputs}>
            <TextField
              label="Başlangıç"
              type="datetime-local"
              InputLabelProps={{ shrink: true }}
              value={editEvent?.start.toFormat("yyyy-MM-dd'T'HH:mm")}
              onChange={(e) => handleEditDateTimeChange(e.target.value, true)}
              error={!editEvent?.start.isValid}
              helperText={!editEvent?.start.isValid && "Geçersiz tarih"}
            />
            <TextField
              label="Bitiş"
              type="datetime-local"
              InputLabelProps={{ shrink: true }}
              value={editEvent?.end.toFormat("yyyy-MM-dd'T'HH:mm")}
              onChange={(e) => handleEditDateTimeChange(e.target.value, false)}
              error={!editEvent?.end.isValid}
              helperText={!editEvent?.end.isValid && "Geçersiz tarih"}
            />
          </Box>

          <FormControl fullWidth margin="normal">
            <InputLabel>Takvim</InputLabel>
            <Select
              value={editEvent?.calendarId || "1"}
              onChange={(e) =>
                setEditEvent({ ...editEvent, calendarId: e.target.value })
              }
            >
              <MenuItem value="1">
                <Chip sx={{ bgcolor: calendarColors["1"], mr: 1 }} /> Kişisel
              </MenuItem>
              <MenuItem value="2">
                <Chip sx={{ bgcolor: calendarColors["2"], mr: 1 }} /> İş
              </MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>İptal</Button>
          <Button
            variant="contained"
            onClick={handleUpdateEvent}
            disabled={!editEvent?.start.isValid || !editEvent?.end.isValid}
          >
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={deletedEvents.length > 0}
        autoHideDuration={3000}
        onClose={() => setDeletedEvents([])}
        message="Etkinlik silindi"
      />
    </Paper>
  );
};

const renderEventContent = (eventInfo) => (
  <Box sx={styles.eventContent}>
    <Typography variant="body2" sx={{ fontWeight: "bold" }}>
      {eventInfo.event.title}
    </Typography>
    <Typography variant="caption">{eventInfo.timeText}</Typography>
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
  },
  controls: {
    display: "flex",
    justifyContent: "space-between",
    mb: 2,
    gap: 2,
    flexWrap: "wrap",
  },
  controlsGroup: {
    display: "flex",
    gap: 1,
    alignItems: "center",
  },
  viewSelector: {
    minWidth: 160,
    "& .MuiSelect-select": { py: 1 },
  },
  timezoneSelector: {
    minWidth: 200,
    "& .MuiSelect-select": { py: 1 },
  },
  calendarWrapper: {
    flex: 1,
    minHeight: 600,
    borderRadius: 2,
    overflow: "hidden",
    "& .fc": {
      fontFamily: "inherit",
      height: "100%",
      "& th": {
        backgroundColor: "action.selected",
        padding: "8px 4px",
      },
      "& .fc-event": {
        border: "none",
        borderRadius: 4,
        boxShadow: 1,
        padding: "2px 4px",
      },
    },
  },
  eventContent: {
    p: 0.5,
    px: 1,
    color: "common.white",
    overflow: "hidden",
    textOverflow: "ellipsis",
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
};

export default CalendarComponent;
