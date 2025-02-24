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
  FormControlLabel,
  Checkbox,
  useTheme,
  Typography,
  Chip,
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

// ----------------------------------------------------------------
// Renk seçimi için ayrı bir Dialog
const ColorPickerDialog = ({
  open,
  onClose,
  onColorSelect,
  colors,
  selectedColor,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          background: "rgba(83, 134, 176, 0.33)",
          backdropFilter: "blur(10px)",
          borderRadius: "24px",
          border: "1px solid rgba(33, 150, 243, 0.2)",
          color: "#fff",
          p: 2,
        },
      }}
    >
      <DialogTitle>Renk Seç</DialogTitle>
      <DialogContent
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          maxWidth: 400,
          maxHeight: 300,
          overflowY: "auto", // Çok renk varsa dikey kaydırma
        }}
      >
        {Object.entries(colors).map(([name, color]) => (
          <Chip
            key={name}
            label={name}
            sx={{
              bgcolor: color,
              color: "#fff",
              cursor: "pointer",
              fontWeight: "bold",
            }}
            onClick={() => {
              onColorSelect(color);
              onClose();
            }}
          />
        ))}
      </DialogContent>
    </Dialog>
  );
};

// ----------------------------------------------------------------
// Ana takvim bileşeni
const CalendarComponent = ({ user }) => {
  const theme = useTheme();
  const calendarRef = useRef(null);
  const paperRef = useRef(null);

  // Neon renkler
  const calendarColors = {
    limon: "#00ff87", // Neon yeşil
    sakız: "#ff00ff", // Neon pembe
    kızılÖte: "#ff0055", // Neon kırmızı
    mandalina: "#ff9100", // Neon turuncu
    buz: "#00ffcc", // Neon turkuaz
    üzüm: "#bf00ff", // Neon mor
    okyanus: "#00ffff", // Neon mavi
    güneş: "#ffff00", // Neon sarı
    lavanta: "#E066FF", // Neon açık mor
    zümrüt: "#00FF7F", // Neon açık yeşil
    şeker: "#FF1493", // Neon koyu pembe
    gökyüzü: "#87CEFA", // Parlak mavi
    ateş: "#FF4500", // Parlak turuncu-kırmızı
    neonGece: "#4D4DFF", // Elektrik mavisi
    fosfor: "#39FF14", // Fosforlu yeşil
    şafak: "#FF69B4", // Sıcak pembe
    yıldız: "#FFD700", // Parlak altın
    galaksi: "#8A2BE2", // Parlak menekşe
    aurora: "#00FF00", // Saf yeşil
    neonRüya: "#FF1177", // Sıcak pembe
  };

  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editEvent, setEditEvent] = useState(null);
  const [newEvent, setNewEvent] = useState({
    title: "",
    start: DateTime.local().startOf("day"),
    end: DateTime.local().endOf("day"),
    allDay: false,
    color: calendarColors.fosfor,
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);

  // Etkinlikleri Firestore'dan çek
  const fetchEvents = useCallback(async () => {
    if (!user) return;
    try {
      const eventsRef = collection(db, "users", user.uid, "calendarEvents");
      const q = query(eventsRef);
      const snapshot = await getDocs(q);
      const eventsData = snapshot.docs.map((doc) => {
        const data = doc.data();
        const colorValue = data.color || calendarColors.limon;
        return {
          id: doc.id,
          title: data.title,
          start: data.start.toDate(),
          end: data.end.toDate(),
          allDay: data.allDay,
          backgroundColor: colorValue,
          borderColor: colorValue,
          textColor: "#fff",
          extendedProps: {
            calendarId: data.calendarId,
          },
        };
      });
      setEvents(eventsData);
    } catch (error) {
      toast.error(`Etkinlikler yüklenemedi: ${error.message}`);
    }
  }, [user, calendarColors.limon]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Yeni etkinlik oluştur
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
        allDay: false,
        color: theme.palette.primary.main,
      });
      toast.success("Etkinlik başarıyla eklendi");
    } catch (error) {
      toast.error(`Etkinlik oluşturma hatası: ${error.message}`);
    }
  };

  // Etkinlik sil
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

  // Etkinlik güncelle
  const handleUpdateEvent = async () => {
    try {
      await updateDoc(
        doc(db, "users", user.uid, "calendarEvents", editEvent.id),
        {
          title: editEvent.title,
          start: Timestamp.fromDate(editEvent.start.toJSDate()),
          end: Timestamp.fromDate(editEvent.end.toJSDate()),
          allDay: editEvent.allDay,
          color: editEvent.color,
        }
      );
      await fetchEvents();
      setOpenEditDialog(false);
      toast.success("Etkinlik güncellendi");
    } catch (error) {
      toast.error(`Güncelleme hatası: ${error.message}`);
    }
  };

  // Tarih seçildiğinde yeni etkinlik diyalogunu aç
  const handleDateSelect = (selectInfo) => {
    setNewEvent({
      title: "",
      start: DateTime.fromJSDate(selectInfo.start),
      end: DateTime.fromJSDate(selectInfo.end),
      allDay: selectInfo.allDay,
      color: calendarColors.lavanta,
    });
    setOpenDialog(true);
  };

  // Sürükle-bırak sonrası güncelle
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

  // Resize sonrası güncelle
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

  // Tarih/saat seçimi
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

  // Tam ekran
  const handleToggleFullScreen = () => {
    const container = paperRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if (container.mozRequestFullScreen) {
        container.mozRequestFullScreen();
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      } else if (container.msRequestFullscreen) {
        container.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  };

  return (
    <Paper ref={paperRef} sx={styles.container}>
      <Box sx={styles.controls}>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
        >
          Yeni Etkinlik
        </Button>
      </Box>

      <Box
        sx={{
          ...styles.calendarWrapper,
          backgroundColor: "rgb(33, 150, 243)",
          "&:fullscreen, &:full-screen, &:-webkit-full-screen, &:-ms-fullscreen":
            {
              backgroundColor: "rgb(33, 150, 243) !important",
            },
          "&:fullscreen::backdrop, &:-webkit-full-screen::backdrop, &:-ms-fullscreen::backdrop":
            {
              backgroundColor: "rgb(33, 150, 243) !important",
            },
          position: "relative",
          zIndex: 1,
        }}
      >
        <FullCalendar
          ref={calendarRef}
          plugins={[
            dayGridPlugin,
            timeGridPlugin,
            interactionPlugin,
            multiMonthPlugin,
          ]}
          initialView="dayGridMonth"
          firstDay={1} // Haftanın Pazartesi'den başlaması
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right:
              "dayGridMonth,timeGridWeek,timeGridDay,multiMonthYear,fullscreenButton",
          }}
          customButtons={{
            fullscreenButton: {
              text: "⛶",
              click: handleToggleFullScreen,
            },
          }}
          // Saat formatı (dayGrid’de tam aralığı göstersin)
          eventTimeFormat={{
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }}
          events={events}
          editable={true}
          selectable={true}
          locale="tr"
          eventContent={renderEventContent} // Özel render
          select={handleDateSelect}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          eventClick={(clickInfo) => {
            const event = {
              id: clickInfo.event.id,
              title: clickInfo.event.title,
              start: DateTime.fromJSDate(clickInfo.event.start),
              end: DateTime.fromJSDate(clickInfo.event.end),
              color: clickInfo.event.backgroundColor,
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

      {/* Yeni Etkinlik Diyaloğu */}
      <EventDialog
        container={paperRef.current}
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        title="Yeni Etkinlik Oluştur"
        event={newEvent}
        setEvent={setNewEvent}
        onSubmit={handleCreateEvent}
        colors={calendarColors}
        handleDateTimeChange={handleDateTimeChange}
      />

      {/* Etkinlik Düzenleme Diyaloğu */}
      <EventDialog
        container={paperRef.current}
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        title="Etkinliği Düzenle"
        event={editEvent}
        setEvent={setEditEvent}
        onSubmit={handleUpdateEvent}
        colors={calendarColors}
        handleDateTimeChange={handleDateTimeChange}
      />

      {/* Etkinlik Detay Diyaloğu */}
      <Dialog
        container={paperRef.current}
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        disableEnforceFocus
        PaperProps={{
          sx: {
            background: "rgba(33, 150, 243, 0.1)",
            backdropFilter: "blur(10px)",
            borderRadius: "24px",
            border: "1px solid rgba(33, 150, 243, 0.2)",
            color: "#fff",
            p: 2,
          },
        }}
      >
        <DialogTitle>Etkinlik Detayları</DialogTitle>
        <DialogContent sx={styles.dialogContent}>
          <Typography variant="h6" gutterBottom>
            {selectedEvent?.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Başlangıç:{" "}
            {selectedEvent?.start?.toFormat("dd.MM.yyyy HH:mm") || "-"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Bitiş: {selectedEvent?.end?.toFormat("dd.MM.yyyy HH:mm") || "-"}
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

// ----------------------------------------------------------------
// EventContent: Etkinliğin nasıl görüneceğini özelleştirir
const renderEventContent = (eventInfo) => {
  const startStr = DateTime.fromJSDate(eventInfo.event.start).toFormat("HH:mm");
  const endStr = DateTime.fromJSDate(eventInfo.event.end).toFormat("HH:mm");
  const isAllDay = eventInfo.event.allDay;

  return (
    <Box
      sx={{
        ...styles.eventContent,
        backgroundColor: eventInfo.event.backgroundColor,
        border: `1px solid ${eventInfo.event.borderColor}`,
        padding: "2px 8px",
        borderRadius: "4px",
        lineHeight: 1.2,
        width: "100%",
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.8rem" }}>
        {eventInfo.event.title}
      </Typography>
      {!isAllDay && (
        <Typography variant="caption" sx={{ fontSize: "0.7rem" }}>
          {startStr} - {endStr}
        </Typography>
      )}
    </Box>
  );
};

// ----------------------------------------------------------------
// EventDialog: Etkinlik oluşturma/düzenleme diyaloğu
const EventDialog = ({
  container,
  open,
  onClose,
  title,
  event,
  setEvent,
  onSubmit,
  colors,
  handleDateTimeChange,
}) => {
  // Renk seçimi için ayrı diyaloğu kontrol edecek state
  const [openColorPicker, setOpenColorPicker] = useState(false);

  const handleAllDayChange = (e) => {
    setEvent((prev) => ({
      ...prev,
      allDay: e.target.checked,
      start: e.target.checked ? prev.start.startOf("day") : prev.start,
      end: e.target.checked ? prev.end.endOf("day") : prev.end,
    }));
  };

  return (
    <>
      <Dialog
        container={container}
        open={open}
        onClose={onClose}
        disableEnforceFocus
        PaperProps={{
          sx: {
            background: "rgba(83, 134, 176, 0.33)",
            backdropFilter: "blur(10px)",
            borderRadius: "24px",
            border: "1px solid rgba(33, 150, 243, 0.2)",
            color: "#fff",
            p: 2,
          },
        }}
      >
        <DialogTitle>{title}</DialogTitle>
        <DialogContent sx={styles.dialogContent}>
          <TextField
            label="Etkinlik Başlığı"
            fullWidth
            margin="normal"
            value={event?.title || ""}
            onChange={(e) => setEvent({ ...event, title: e.target.value })}
            sx={{ input: { color: "#fff" }, label: { color: "#fff" } }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={event?.allDay ?? true}
                onChange={handleAllDayChange}
                sx={{ color: "#fff" }}
              />
            }
            label="Tüm Gün"
            sx={{ mt: 1, color: "#fff" }}
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
              sx={{ input: { color: "#fff" }, label: { color: "#fff" } }}
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
              sx={{ input: { color: "#fff" }, label: { color: "#fff" } }}
            />
          </Box>

          {/* Mevcut rengi gösteren küçük bir Chip */}
          <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 2 }}>
            <Chip
              label="Seçili Renk"
              sx={{
                bgcolor: event?.color || colors.lavanta,
                color: "#fff",
                width: 100,
                justifyContent: "center",
              }}
            />
            <Button
              variant="contained"
              onClick={() => setOpenColorPicker(true)}
            >
              Renk Seç
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} sx={{ color: "#fff" }}>
            İptal
          </Button>
          <Button
            variant="contained"
            onClick={onSubmit}
            disabled={!event?.start?.isValid || !event?.end?.isValid}
          >
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>

      {/* Renk Seçim Diyaloğu (ayrı pencere) */}
      <ColorPickerDialog
        open={openColorPicker}
        onClose={() => setOpenColorPicker(false)}
        onColorSelect={(color) => {
          setEvent((prev) => ({ ...prev, color }));
        }}
        colors={colors}
        selectedColor={event?.color}
      />
    </>
  );
};

// ----------------------------------------------------------------
// Stil tanımları
const styles = {
  container: {
    p: 3,
    borderRadius: 4,
    boxShadow: (theme) => theme.shadows[3],
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    height: "95vh",
    background:
      "linear-gradient(135deg, #1a2a6c 0%, #2196F3 50%, #3F51B5 100%)",
    color: "#fff",
  },
  controls: {
    mb: 2,
    color: "#fff",
  },
  calendarWrapper: {
    flex: 1,
    minHeight: 600,
    borderRadius: 5,
    background: "rgba(255,255,255,0.1)",
    backdropFilter: "blur(10px)",
    overflow: "hidden",
    "& .fc": {
      fontFamily: "inherit",
      color: "rgba(0, 0, 0, 0.9)",
      height: "100%",
      "& th": {
        background:
          "linear-gradient(135deg, #1a2a6c, #2196F3 50%, #3F51B5 100%)",
        padding: "8px 4px",
      },
      "& .fc-day-today": {
        backgroundColor: "#98E4FF",
      },
      "& .fc-daygrid-day.fc-day-today": {
        backgroundColor: "#98E4FF",
      },
      "& .fc-timegrid-col.fc-day-today": {
        backgroundColor: "#98E4FF",
      },
      "& .fc-event": {
        width: "100%",
        border: "none",
        boxShadow: "0px 2px 4px rgba(0,0,0,0.3)",
        cursor: "move",
        transition: "all 0.2s",
        "&:hover": {
          boxShadow: "0px 4px 8px rgba(0,0,0,0.5)",
        },
      },
      "& .fc-now-indicator": {
        borderColor: colors.red[600],
      },
      "& .fc-button": {
        backgroundColor: "#3674B5",
        color: "white",
        border: "none",
        borderRadius: "8px",
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
        transition: "all 0.3s ease",
      },
      "& .fc-button:hover": {
        backgroundColor: "#A1E3F9",
        transform: "translateY(-2px)",
      },
      "& .fc-button-primary.fc-button-active": {
        backgroundColor: "#98E4FF",
        color: "black",
      },
      "& .fc-toolbar-title": {
        color: "#fff",
        fontSize: "1.5rem",
        fontWeight: "bold",
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
    color: "#fff",
  },
};

export default CalendarComponent;
