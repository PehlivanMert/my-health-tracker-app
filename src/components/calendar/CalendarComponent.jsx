// CalendarComponent.jsx

import React, { useCallback, useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import multiMonthPlugin from "@fullcalendar/multimonth";
import rrulePlugin from "@fullcalendar/rrule";
import { DateTime, Duration } from "luxon";
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
  Select,
  MenuItem,
  useMediaQuery,
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

// Bildirim işlevlerini içeren modül (kodun başındaki bildirim sınıfı)
import { requestNotificationPermission } from "../../utils/weather-theme-notify/NotificationManager";

// ----------------------------------------------------------------
// Renk seçimi için ayrı bir Dialog
const ColorPickerDialog = ({
  container,
  open,
  onClose,
  onColorSelect,
  colors,
  selectedColor,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  
  return (
    <Dialog
      container={container}
      open={open}
      onClose={onClose}
      disableEnforceFocus
      PaperProps={{
        sx: {
          zIndex: 99999,
          background: "rgba(83, 134, 176, 0.33)",
          backdropFilter: "blur(10px)",
          borderRadius: "24px",
          border: "1px solid rgba(33, 150, 243, 0.2)",
          color: "#fff",
          p: 2,
          maxWidth: { xs: "95vw", sm: 400 },
          width: { xs: "95vw", sm: "auto" },
          maxHeight: { xs: "80vh", sm: "70vh" },
          margin: "auto",
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        },
      }}
      sx={{
        "& .MuiDialog-paper": {
          margin: 0,
        },
      }}
    >
      <DialogTitle sx={{ 
        fontSize: { xs: "1rem", md: "1.25rem" },
        flexShrink: 0,
        pb: 1,
      }}>
        Renk Seç
      </DialogTitle>
      <DialogContent
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: { xs: 1, sm: 2 },
          maxWidth: { xs: "90vw", sm: 400 },
          maxHeight: { xs: "60vh", sm: 300 },
          overflowY: "auto",
          overflowX: "hidden",
          flex: 1,
          "&::-webkit-scrollbar": {
            width: "6px",
          },
          "&::-webkit-scrollbar-track": {
            background: "rgba(255,255,255,0.1)",
            borderRadius: "3px",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "rgba(255,255,255,0.3)",
            borderRadius: "3px",
            "&:hover": {
              background: "rgba(255,255,255,0.5)",
            },
          },
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
              fontSize: { xs: "0.7rem", md: "0.75rem" },
              height: { xs: "2rem", md: "2.5rem" },
              minWidth: { xs: "calc(50% - 4px)", sm: "auto" },
              "&:hover": {
                opacity: 0.8,
                transform: "scale(1.05)",
              },
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
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));
  const calendarRef = useRef(null);
  const paperRef = useRef(null);

  // Neon renkler
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
    // Yeni eklenen 10 renk
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

  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editEvent, setEditEvent] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const now = DateTime.local();
  const [newEvent, setNewEvent] = useState({
    title: "",
    start: now.set({ hour: 10, minute: 0, second: 0, millisecond: 0 }),
    end: now.set({ hour: 12, minute: 0, second: 0, millisecond: 0 }),
    allDay: false,
    color: calendarColors.fosfor,
    notification: "none", // "none", "on-time", "15-minutes", "1-hour", "1-day"
    isRecurring: false,
    recurrenceType: "", // "daily", "weekly", "monthly", "yearly"
    recurrenceUntil: DateTime.local().plus({ months: 1 }),
  });

  // Korumalı veri yönetimi için ref'ler
  const lastEventsState = useRef([]);
  const isDataLoading = useRef(true);
  const isInitialLoad = useRef(true);

  // Etkinlikleri Firestore'dan çek
  const fetchEvents = useCallback(async () => {
    if (!user) return;
    try {
      const eventsRef = collection(db, "users", user.uid, "calendarEvents");
      const q = query(eventsRef);
      const snapshot = await getDocs(q);
      // fetchEvents fonksiyonundaki değişiklik
      const eventsData = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const colorValue = data.color || calendarColors.limon;
        const baseEvent = {
          id: docSnap.id,
          title: data.title,
          start: data.start.toDate(),
          end: data.end.toDate(),
          allDay: data.allDay,
          backgroundColor: colorValue,
          borderColor: colorValue,
          textColor: "#fff",
          extendedProps: {
            calendarId: data.calendarId,
            notification: data.notification || "none",
            notificationId: data.notificationId || null,
            recurrence: data.recurrence || null,
          },
        };

        if (data.recurrence) {
          let freq;
          switch (data.recurrence.recurrenceType) {
            case "daily":
              freq = "DAILY";
              break;
            case "weekly":
              freq = "WEEKLY";
              break;
            case "monthly":
              freq = "MONTHLY";
              break;
            case "yearly":
              freq = "YEARLY";
              break;
            default:
              freq = null;
          }
          if (freq) {
            const rruleObj = {
              freq,
              dtstart: data.start.toDate(),
              tzid: "Europe/Istanbul",
            };
            let untilDate;
            if (data.recurrence.recurrenceUntil) {
              untilDate = data.recurrence.recurrenceUntil.toDate();
              // Ayarlama: Seçilen sonlanma tarihini gün sonuna çekiyoruz.
              untilDate.setHours(23, 59, 59, 999);
              rruleObj.until = untilDate;
            } else {
              untilDate = DateTime.local()
                .plus({ months: 1 })
                .endOf("day")
                .toJSDate();
              rruleObj.until = untilDate;
            }
            baseEvent.rrule = rruleObj;
            const diff = data.end.toDate() - data.start.toDate();
            baseEvent.duration = {
              hours: Math.floor(diff / (1000 * 60 * 60)),
              minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
              seconds: Math.floor((diff % (1000 * 60)) / 1000),
            };
            // Tekrarlı etkinliklerde 'end' özelliğini kaldırıyoruz.
            delete baseEvent.end;
            // extendedProps.recurrence bölümünü güncelliyoruz:
            baseEvent.extendedProps.recurrence = {
              recurrenceType: data.recurrence.recurrenceType,
              recurrenceUntil: untilDate,
            };
          }
        }

        return baseEvent;
      });
      setEvents(eventsData);
      lastEventsState.current = [...eventsData];
      isDataLoading.current = false;
    } catch (error) {
      toast.error(`Etkinlikler yüklenemedi: ${error.message}`);
      isDataLoading.current = false;
    }
  }, [user, calendarColors.limon]);

  useEffect(() => {
    fetchEvents();
    // Bildirim izni isteği
    requestNotificationPermission();
  }, [fetchEvents]);

  // Takvim olayları değişikliklerini izle ve korumalı güncelleme yap
  useEffect(() => {
    if (!user || isInitialLoad.current || isDataLoading.current) return;
    
    // Sadece gerçek değişiklik varsa güncelle
    const hasRealChange = JSON.stringify(events) !== JSON.stringify(lastEventsState.current);
    
    // Boş diziye geçiş kontrolü
    const eventsEmpty = Array.isArray(events) && events.length === 0;
    const wasEventsEmpty = Array.isArray(lastEventsState.current) && lastEventsState.current.length === 0;
    
    if (hasRealChange && !(eventsEmpty && !wasEventsEmpty)) {
      // Takvim olayları ayrı koleksiyonlarda tutulduğu için burada sadece state'i güncelle
      lastEventsState.current = [...events];
    }
  }, [events, user]);

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
        notification: newEvent.notification,
        recurrence: newEvent.isRecurring
          ? {
              recurrenceType: newEvent.recurrenceType,
              recurrenceUntil: newEvent.recurrenceUntil.endOf("day").toJSDate(),
            }
          : null,
      };

      const docRef = doc(eventsRef);
      batch.set(docRef, eventData);
      await batch.commit();

      await fetchEvents();
      setOpenDialog(false);
      const now = DateTime.local();
      setNewEvent({
        title: "",
        start: now.set({ hour: 10, minute: 0, second: 0, millisecond: 0 }),
        end: now.set({ hour: 12, minute: 0, second: 0, millisecond: 0 }),
        allDay: false,
        color: theme.palette.primary.main,
        notification: "none",
        isRecurring: false,
        recurrenceType: "",
        recurrenceUntil: DateTime.local().plus({ months: 1 }),
      });
      toast.success("Etkinlik başarıyla eklendi");
    } catch (error) {
      toast.error(`Etkinlik oluşturma hatası: ${error.message}`);
    }
  };

  // Etkinlik sil
  const handleDeleteEvent = async (eventId, notificationId) => {
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
          notification: editEvent.notification,
          recurrence: editEvent.isRecurring
            ? {
                recurrenceType: editEvent.recurrenceType,
                recurrenceUntil: editEvent.recurrenceUntil.toJSDate(),
              }
            : null,
        }
      );
      // scheduleNotification çağrısı kaldırıldı.
      await fetchEvents();
      setOpenEditDialog(false);
      setSelectedEvent(null);
      toast.success("Etkinlik güncellendi");
    } catch (error) {
      toast.error(`Güncelleme hatası: ${error.message}`);
    }
  };
  // Tarih seçildiğinde yeni etkinlik diyalogunu aç

  const handleDateSelect = (selectInfo) => {
    const selectedDate = DateTime.fromJSDate(selectInfo.start);
    setNewEvent({
      title: "",
      start: selectedDate.set({
        hour: 10,
        minute: 0,
        second: 0,
        millisecond: 0,
      }),
      end: selectedDate.set({ hour: 12, minute: 0, second: 0, millisecond: 0 }),
      allDay: false, // her zaman false olarak ayarlandı
      color: calendarColors.lavanta,
      notification: "none",
      isRecurring: false,
      recurrenceType: "",
      // Seçilen tarihin sonuna kadar (23:59:59) olacak şekilde ayarlanıyor:
      recurrenceUntil: DateTime.fromJSDate(selectInfo.start)
        .plus({ months: 1 })
        .endOf("day"),
    });
    setOpenDialog(true);
  };

  // Sürükle-bırak sonrası güncelle
  const handleEventDrop = async (dropInfo) => {
    try {
      const updatedEvent = {
        id: dropInfo.event.id,
        start: DateTime.fromJSDate(dropInfo.event.start),
        end: DateTime.fromJSDate(dropInfo.event.end),
        allDay: dropInfo.event.allDay,
      };
      await updateDoc(
        doc(db, "users", user.uid, "calendarEvents", updatedEvent.id),
        {
          start: Timestamp.fromDate(updatedEvent.start.toJSDate()),
          end: Timestamp.fromDate(updatedEvent.end.toJSDate()),
          allDay: updatedEvent.allDay,
        }
      );
      await fetchEvents();
    } catch (error) {
      toast.error(`Güncelleme hatası: ${error.message}`);
    }
  };

  // Resize sonrası güncelle
  const handleEventResize = async (resizeInfo) => {
    try {
      const updatedEvent = {
        id: resizeInfo.event.id,
        start: DateTime.fromJSDate(resizeInfo.event.start),
        end: DateTime.fromJSDate(resizeInfo.event.end),
        allDay: resizeInfo.event.allDay,
      };
      await updateDoc(
        doc(db, "users", user.uid, "calendarEvents", updatedEvent.id),
        {
          start: Timestamp.fromDate(updatedEvent.start.toJSDate()),
          end: Timestamp.fromDate(updatedEvent.end.toJSDate()),
        }
      );
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
        if (prev.allDay) {
          newValue.start = newValue.start.startOf("day");
          // Tüm gün etkinliklerinde bitiş tarihini de güncelle
          if (prev.end && prev.end.isValid) {
            const duration = prev.end.diff(prev.start);
            newValue.end = dt.plus(duration).endOf("day");
          }
        } else {
          // Normal etkinliklerde hem tarih hem saat değişikliklerinde bitiş zamanını güncelle
          if (prev.end && prev.end.isValid) {
            const duration = prev.end.diff(prev.start);
            newValue.end = dt.plus(duration);
          }
        }
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
      container.requestFullscreen?.() ||
        container.mozRequestFullScreen?.() ||
        container.webkitRequestFullscreen?.() ||
        container.msRequestFullscreen?.();
    } else {
      document.exitFullscreen?.() ||
        document.mozCancelFullScreen?.() ||
        document.webkitExitFullscreen?.() ||
        document.msExitFullscreen?.();
    }
  };

  const RecurrenceDialog = ({
    container,
    open,
    onClose,
    onSave,
    recurrenceType,
    recurrenceUntil,
  }) => {
    const [type, setType] = useState(recurrenceType || "");
    const [until, setUntil] = useState(
      recurrenceUntil?.toFormat("yyyy-MM-dd") || ""
    );

    return (
      <Dialog
        container={container}
        open={open}
        onClose={onClose}
        disableEnforceFocus
        PaperProps={{
          sx: {
            zIndex: 99999,
            background: "rgba(83, 134, 176, 0.33)",
            backdropFilter: "blur(10px)",
            borderRadius: "24px",
            border: "1px solid rgba(33, 150, 243, 0.2)",
            color: "#fff",
            p: 2,
          },
        }}
      >
        <DialogTitle>Tekrarlama Ayarları</DialogTitle>
        <DialogContent>
          <Select
            value={type}
            onChange={(e) => setType(e.target.value)}
            fullWidth
            sx={{ mb: 2, color: "#fff" }}
          >
            <MenuItem value="daily">Her Gün</MenuItem>
            <MenuItem value="weekly">Her Hafta</MenuItem>
            <MenuItem value="monthly">Her Ay</MenuItem>
            <MenuItem value="yearly">Her Yıl</MenuItem>
          </Select>
          <TextField
            label="Sonlanma Tarihi"
            type="date"
            value={until}
            onChange={(e) => setUntil(e.target.value)}
            fullWidth
            sx={{ color: "#fff" }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} sx={{ color: "#fff" }}>İptal</Button>
          <Button
            onClick={() => onSave(type, until)}
            variant="contained"
          >
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  const NotificationDialog = ({
    container,
    open,
    onClose,
    onSave,
    notification,
  }) => {
    const [localNotification, setLocalNotification] = useState(
      notification || "none"
    );

    useEffect(() => {
      setLocalNotification(notification || "none");
    }, [notification]);

    const handleSave = () => {
      onSave(localNotification);
      onClose();
    };

    return (
      <Dialog
        container={container}
        open={open}
        onClose={onClose}
        disableEnforceFocus
        PaperProps={{
          sx: {
            zIndex: 99999,
            background: "rgba(83, 134, 176, 0.33)",
            backdropFilter: "blur(10px)",
            borderRadius: "24px",
            border: "1px solid rgba(33, 150, 243, 0.2)",
            color: "#fff",
            p: 2,
          },
        }}
      >
        <DialogTitle>Bildirim Ayarları</DialogTitle>
        <DialogContent
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <Typography variant="subtitle1">Bildirim Zamanı</Typography>
          <Select
            value={localNotification}
            onChange={(e) => setLocalNotification(e.target.value)}
            fullWidth
            sx={{ color: "#fff", borderColor: "#fff" }}
          >
            <MenuItem value="none">Yok</MenuItem>
            <MenuItem value="on-time">Tam Zamanında</MenuItem>
            <MenuItem value="15-minutes">15 Dakika Önce</MenuItem>
            <MenuItem value="1-hour">1 Saat Önce</MenuItem>
            <MenuItem value="1-day">1 Gün Önce</MenuItem>
          </Select>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} sx={{ color: "#fff" }}>
            İptal
          </Button>
          <Button onClick={handleSave} variant="contained">
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <Paper ref={paperRef} sx={styles.container}>
      <Box sx={styles.controls}>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
          sx={{
            fontSize: { xs: "0.75rem", sm: "0.875rem", md: "inherit" },
            padding: { xs: "6px 12px", sm: "8px 16px", md: "10px 20px" },
          }}
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
            rrulePlugin,
          ]}
          initialView={isMobile ? "timeGridDay" : "dayGridMonth"}
          firstDay={1}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: isMobile
              ? "dayGridMonth,timeGridWeek,timeGridDay"
              : isTablet
              ? "dayGridMonth,timeGridWeek,timeGridDay,multiMonthYear"
              : "dayGridMonth,timeGridWeek,timeGridDay,multiMonthYear,fullscreenButton",
          }}
          customButtons={{
            fullscreenButton: {
              text: "⛶",
              click: handleToggleFullScreen,
            },
          }}
          eventTimeFormat={{
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }}
          events={events}
          editable={true}
          selectable={true}
          locale="tr"
          eventContent={renderEventContent}
          select={handleDateSelect}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          eventDragStart={(dragInfo) => {
            // Sürükleme başladığında, öğeyi 10px yukarı kaydırıyoruz.
            dragInfo.el.style.transform = "translateY(-50px)";
          }}
          eventDragStop={(dragInfo) => {
            // Sürükleme bittiğinde öğeyi eski konumuna döndürüyoruz.
            dragInfo.el.style.transform = "";
          }}
          eventClick={(clickInfo) => {
            // Başlangıç zamanını düzgün formatta alıyoruz
            const eventStart = DateTime.fromJSDate(
              clickInfo.event.start
            ).setZone("Europe/Istanbul");

            // Bitiş zamanını düzgün hesaplıyoruz
            let eventEnd = null;
            if (clickInfo.event.end) {
              eventEnd = DateTime.fromJSDate(clickInfo.event.end).setZone(
                "Europe/Istanbul"
              );
            } else if (clickInfo.event.extendedProps.recurrence) {
              // Tekrarlanan etkinliklerde süreyi kullanarak bitiş zamanını hesaplıyoruz
              const duration = clickInfo.event.duration || { hours: 1 };
              eventEnd = eventStart.plus(duration);
            }

            const ev = {
              id: clickInfo.event.id,
              title: clickInfo.event.title,
              start: eventStart,
              end: eventEnd,
              color: clickInfo.event.backgroundColor,
              allDay: clickInfo.event.allDay,
              notification:
                clickInfo.event.extendedProps.notification || "none",
              isRecurring: !!clickInfo.event.extendedProps.recurrence,
              recurrenceType: clickInfo.event.extendedProps.recurrence
                ? clickInfo.event.extendedProps.recurrence.recurrenceType
                : "",
              recurrenceUntil:
                clickInfo.event.extendedProps.recurrence &&
                clickInfo.event.extendedProps.recurrence.recurrenceUntil
                  ? DateTime.fromJSDate(
                      new Date(
                        clickInfo.event.extendedProps.recurrence.recurrenceUntil
                      )
                    ).setZone("Europe/Istanbul")
                  : DateTime.local()
                      .plus({ months: 1 })
                      .setZone("Europe/Istanbul"),
              notificationId:
                clickInfo.event.extendedProps.notificationId || null,
            };
            setSelectedEvent(ev);
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
            maxWidth: { xs: "95vw", sm: "500px" },
            width: { xs: "95vw", sm: "auto" },
            margin: "auto",
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          },
        }}
        sx={{
          "& .MuiDialog-paper": {
            margin: 0,
          },
        }}
      >
        <DialogTitle sx={{ 
          fontSize: { xs: "1.1rem", md: "1.25rem" },
          flexShrink: 0,
          pb: 1,
        }}>
          Etkinlik Detayları
        </DialogTitle>
        <DialogContent sx={{ 
          ...styles.dialogContent,
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          "&::-webkit-scrollbar": {
            width: "6px",
          },
          "&::-webkit-scrollbar-track": {
            background: "rgba(255,255,255,0.1)",
            borderRadius: "3px",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "rgba(255,255,255,0.3)",
            borderRadius: "3px",
            "&:hover": {
              background: "rgba(255,255,255,0.5)",
            },
          },
        }}>
          <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: "1rem", md: "1.25rem" } }}>
            {selectedEvent?.title}
          </Typography>
          <Typography variant="body2" color="#fff" sx={{ fontSize: { xs: "0.85rem", md: "1rem" } }}>
            Başlangıç:{" "}
            {selectedEvent?.start?.toFormat("dd.MM.yyyy HH:mm") || "-"}
          </Typography>
          <Typography variant="body2" color="#fff" sx={{ fontSize: { xs: "0.85rem", md: "1rem" } }}>
            Bitiş: {selectedEvent?.end?.toFormat("dd.MM.yyyy HH:mm") || "-"}
          </Typography>
        </DialogContent>
        <Box sx={{ 
          mt: 2, 
          display: "flex", 
          flexDirection: { xs: "column", sm: "row" }, 
          gap: 1,
          flexShrink: 0,
          borderTop: "1px solid rgba(255,255,255,0.1)",
          pt: 2,
        }}>
          <Button
            variant="contained"
            startIcon={<Edit />}
            onClick={() => {
              setEditEvent(selectedEvent);
              setOpenEditDialog(true);
            }}
            sx={{ fontSize: { xs: "0.8rem", md: "inherit" } }}
          >
            Düzenle
          </Button>
          <Button
            color="error"
            startIcon={<Delete />}
            onClick={() =>
              handleDeleteEvent(
                selectedEvent.id,
                selectedEvent.notificationId
              )
            }
            sx={{ fontSize: { xs: "0.8rem", md: "inherit" } }}
          >
            Sil
          </Button>
        </Box>
      </Dialog>
    </Paper>
  );
};

// ----------------------------------------------------------------
// Etkinliğin nasıl görüneceğini özelleştiren içerik fonksiyonu
const renderEventContent = (eventInfo) => {
  const startStr = DateTime.fromJSDate(eventInfo.event.start)
    .setZone("Europe/Istanbul") // İstanbul saat dilimine ayarla
    .toFormat("HH:mm");

  const endStr = DateTime.fromJSDate(eventInfo.event.end)
    .setZone("Europe/Istanbul") // İstanbul saat dilimine ayarla
    .toFormat("HH:mm");

  const isAllDay = eventInfo.event.allDay;

  return (
    <Box
      sx={{
        backgroundColor: eventInfo.event.backgroundColor,
        // Mobilde daha geniş padding, yuvarlatılmış kenarlar ve hafif gölge ile Apple Calendar benzeri görünüm
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
      <Typography 
        variant="body2" 
        sx={{ 
          fontWeight: 600, 
          fontSize: { xs: "0.65rem", sm: "0.75rem", md: "0.85rem" },
          lineHeight: 1.1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {eventInfo.event.title}
      </Typography>
      {!isAllDay && (
        <Typography 
          variant="caption" 
          sx={{ 
            fontSize: { xs: "0.55rem", sm: "0.65rem", md: "0.75rem" },
            opacity: 0.9,
            lineHeight: 1,
          }}
        >
          {startStr} - {endStr}
        </Typography>
      )}
    </Box>
  );
};

// ----------------------------------------------------------------7

// EventDialog: Etkinlik oluşturma/düzenleme diyaloğu (bildirim ve tekrarlı ayarlar eklendi)
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
  // Eğer event null ise bileşeni hiç render etmeyelim
  if (!event) return null;

  const [openColorPicker, setOpenColorPicker] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleAllDayChange = (e) => {
    setEvent((prev) => ({
      ...(prev || {}),
      allDay: e.target.checked,
      start: e.target.checked ? prev.start.startOf("day") : prev.start,
      end: e.target.checked ? prev.end.endOf("day") : prev.end,
    }));
  };

  // Bildirim seçenekleri
  const notificationOptions = [
    { value: "none", label: "Yok" },
    { value: "on-time", label: "Tam Zamanında" },
    { value: "15-minutes", label: "15 Dakika Önce" },
    { value: "1-hour", label: "1 Saat Önce" },
    { value: "1-day", label: "1 Gün Önce" },
  ];

  // Tekrarlama seçenekleri
  const recurrenceOptions = [
    { value: "daily", label: "Her Gün" },
    { value: "weekly", label: "Her Hafta" },
    { value: "monthly", label: "Her Ay" },
    { value: "yearly", label: "Her Yıl" },
  ];

  return (
    <>
      <Dialog
        container={container}
        open={open}
        onClose={onClose}
        disableEnforceFocus
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            background: "rgba(83, 134, 176, 0.33)",
            backdropFilter: "blur(10px)",
            borderRadius: "24px",
            border: "1px solid rgba(33, 150, 243, 0.2)",
            color: "#fff",
            p: 2,
            maxWidth: { xs: "95vw", sm: "600px" },
            width: { xs: "95vw", sm: "auto" },
            maxHeight: { xs: "90vh", sm: "80vh" },
            margin: "auto",
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          },
        }}
        sx={{
          "& .MuiDialog-paper": {
            margin: 0,
          },
        }}
      >
        <DialogTitle sx={{ 
          fontSize: { xs: "1.1rem", md: "1.25rem" },
          flexShrink: 0,
          pb: 1,
        }}>
          {title}
        </DialogTitle>
        <DialogContent sx={{ 
          py: 2, 
          minWidth: { xs: "90vw", sm: 480 },
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          "&::-webkit-scrollbar": {
            width: "6px",
          },
          "&::-webkit-scrollbar-track": {
            background: "rgba(255,255,255,0.1)",
            borderRadius: "3px",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "rgba(255,255,255,0.3)",
            borderRadius: "3px",
            "&:hover": {
              background: "rgba(255,255,255,0.5)",
            },
          },
        }}>
          <TextField
            label="Etkinlik Başlığı"
            fullWidth
            margin="normal"
            value={event.title || ""}
            onChange={(e) =>
              setEvent((prev) => ({ ...(prev || {}), title: e.target.value }))
            }
            sx={{ 
              input: { color: "#fff", fontSize: { xs: "0.9rem", md: "1rem" } }, 
              label: { color: "#fff", fontSize: { xs: "0.85rem", md: "1rem" } } 
            }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={event.allDay ?? true}
                onChange={handleAllDayChange}
                sx={{ color: "#fff" }}
              />
            }
            label="Tüm Gün"
            sx={{ mt: 1, color: "#fff", fontSize: { xs: "0.85rem", md: "1rem" } }}
          />
          <Box sx={{
            ...styles.timeInputs,
            flexDirection: { xs: "column", sm: "row" },
            gap: { xs: 1, sm: 2 }
          }}>
            <TextField
              label="Başlangıç"
              type={event.allDay ? "date" : "datetime-local"}
              InputLabelProps={{ shrink: true }}
              value={
                event.start?.isValid
                  ? event.start.toFormat(
                      event.allDay ? "yyyy-MM-dd" : "yyyy-MM-dd'T'HH:mm"
                    )
                  : ""
              }
              onChange={(e) =>
                handleDateTimeChange(e.target.value, true, event, setEvent)
              }
              fullWidth
              sx={{ 
                input: { color: "#fff", fontSize: { xs: "0.85rem", md: "1rem" } }, 
                label: { color: "#fff", fontSize: { xs: "0.8rem", md: "1rem" } } 
              }}
            />
            <TextField
              label="Bitiş"
              type={event.allDay ? "date" : "datetime-local"}
              InputLabelProps={{ shrink: true }}
              value={
                event.end?.isValid
                  ? event.end.toFormat(
                      event.allDay ? "yyyy-MM-dd" : "yyyy-MM-dd'T'HH:mm"
                    )
                  : ""
              }
              onChange={(e) =>
                handleDateTimeChange(e.target.value, false, event, setEvent)
              }
              fullWidth
              sx={{ 
                input: { color: "#fff", fontSize: { xs: "0.85rem", md: "1rem" } }, 
                label: { color: "#fff", fontSize: { xs: "0.8rem", md: "1rem" } } 
              }}
            />
          </Box>

          {/* Renk Seçimi */}
          <Typography variant="subtitle1" sx={{ mt: 2, fontSize: { xs: "0.9rem", md: "1rem" } }}>
            Seçili Renk
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, flexWrap: "wrap" }}>
            <Chip
              label=""
              sx={{
                backgroundColor: event.color || colors.lavanta,
                width: { xs: "2rem", md: "1cm" },
                height: { xs: "2rem", md: "1cm" },
              }}
            />
            <Button
              variant="contained"
              onClick={() => setOpenColorPicker(true)}
              sx={{ fontSize: { xs: "0.75rem", md: "inherit" } }}
            >
              Renk Seç
            </Button>
          </Box>

          {/* Bildirim Zamanı Seçimi */}
          <Typography variant="subtitle1" sx={{ mt: 2, fontSize: { xs: "0.9rem", md: "1rem" } }}>
            Bildirim Zamanı
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
            {notificationOptions.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                onClick={() =>
                  setEvent((prev) => ({
                    ...(prev || {}),
                    notification: option.value,
                  }))
                }
                sx={{
                  width: { xs: "calc(50% - 4px)", sm: "4cm" },
                  height: { xs: "2rem", md: "0.7cm" },
                  backgroundColor:
                    (event.notification || "none") === option.value
                      ? "primary.main"
                      : "grey.500",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: { xs: "0.7rem", md: "0.75rem" },
                }}
              />
            ))}
          </Box>

          {/* Tekrarlı Etkinlik Seçimi */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={event.isRecurring || false}
                  onChange={(e) =>
                    setEvent((prev) => ({
                      ...(prev || {}),
                      isRecurring: e.target.checked,
                      recurrenceType: "", // yeni seçim yapılması için sıfırla
                    }))
                  }
                  sx={{ color: "#fff" }}
                />
              }
              label="Tekrarlı Etkinlik"
              sx={{ color: "#fff", fontSize: { xs: "0.85rem", md: "1rem" } }}
            />
          </Box>
          {event.isRecurring && (
            <>
              <Typography variant="subtitle1" sx={{ mt: 2, fontSize: { xs: "0.9rem", md: "1rem" } }}>
                Tekrarlama Türü
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
                {recurrenceOptions.map((option) => (
                  <Chip
                    key={option.value}
                    label={option.label}
                    onClick={() =>
                      setEvent((prev) => ({
                        ...(prev || {}),
                        recurrenceType: option.value,
                      }))
                    }
                    sx={{
                      width: { xs: "calc(50% - 4px)", sm: "4cm" },
                      height: { xs: "2rem", md: "0.7cm" },
                      backgroundColor:
                        event.recurrenceType === option.value
                          ? "primary.main"
                          : "grey.500",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: { xs: "0.7rem", md: "0.75rem" },
                    }}
                  />
                ))}
              </Box>
              <TextField
                label="Sonlanma Tarihi"
                style={{ marginTop: 14 }}
                type="date"
                InputLabelProps={{ shrink: true }}
                value={
                  event.recurrenceUntil?.isValid
                    ? event.recurrenceUntil.toFormat("yyyy-MM-dd")
                    : ""
                }
                onChange={(e) =>
                  setEvent((prev) => ({
                    ...(prev || {}),
                    recurrenceUntil: DateTime.fromISO(e.target.value),
                  }))
                }
                fullWidth
                sx={{
                  input: { color: "#fff", mt: 1, fontSize: { xs: "0.85rem", md: "1rem" } },
                  label: { color: "#fff", fontSize: { xs: "0.8rem", md: "1rem" } },
                }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ 
          flexDirection: { xs: "column", sm: "row" }, 
          gap: { xs: 1, sm: 0 },
          padding: { xs: 2, sm: 3 },
          flexShrink: 0,
          borderTop: "1px solid rgba(255,255,255,0.1)",
        }}>
          <Button 
            onClick={onClose}
            sx={{ 
              color: "#fff",
              fontSize: { xs: "0.8rem", md: "inherit" },
              width: { xs: "100%", sm: "auto" }
            }}
          >
            İptal
          </Button>
          <Button
            onClick={onSubmit}
            variant="contained"
            sx={{ 
              fontSize: { xs: "0.8rem", md: "inherit" },
              width: { xs: "100%", sm: "auto" }
            }}
          >
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>

      {/* Renk Seçici Dialog */}
      <ColorPickerDialog
        container={container}
        open={openColorPicker}
        onClose={() => setOpenColorPicker(false)}
        onColorSelect={(color) =>
          setEvent((prev) => ({ ...(prev || {}), color }))
        }
        colors={colors}
        selectedColor={event.color}
      />
    </>
  );
};

// ----------------------------------------------------------------
// Stil tanımları
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
    overflow: "hidden",
    "& .fc": {
      fontFamily: "inherit",
      color: "rgba(0, 0, 0, 0.9)",
      height: "100%",

      "& th": {
        background:
          "linear-gradient(135deg, #1a2a6c, #2196F3 50%, #3F51B5 100%)",
        padding: { xs: "4px 2px", sm: "6px 3px", md: "8px 4px" },
        fontSize: { xs: "0.7rem", sm: "0.8rem", md: "0.875rem" },
      },
      "& .fc-day-today": {
        backgroundColor: "rgba(19, 89, 107, 0.25)",
      },
      "& .fc-daygrid-day.fc-day-today": {
        backgroundColor: "rgba(19, 89, 107, 0.25)",
      },
      "& .fc-timegrid-col.fc-day-today": {
        backgroundColor: "rgba(19, 89, 107, 0.25)",
      },
      "& .fc-event": {
        width: "100%",
        border: "none",
        boxShadow: "0px 2px 4px rgba(0,0,0,0.3)",
        cursor: "move",
        transition: "all 0.2s",
        fontSize: { xs: "0.7rem", sm: "0.8rem", md: "0.875rem" },
        "&:hover": {
          boxShadow: "0px 4px 8px rgba(0,0,0,0.5)",
        },

        "& .fc-now-indicator": {
          borderColor: "#FF5252",
        },
        "& .fc-button": {
          backgroundColor: "#3674B5",
          color: "white",
          border: "none",
          borderRadius: "8px",
          boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
          transition: "all 0.3s ease",
          fontSize: { xs: "0.6rem", sm: "0.7rem", md: "0.875rem" },
          padding: { xs: "2px 4px", sm: "4px 8px", md: "6px 12px" },
          "&:hover": {
            backgroundColor: "#2E5A8F",
            transform: "translateY(-1px)",
          },
        },
        "& .fc-toolbar .fc-button": {
          backgroundColor: "#3674B5",
          color: "white",
          border: "none",
          borderRadius: "8px",
          boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
          transition: "all 0.3s ease",
          fontSize: { xs: "0.6rem", sm: "0.7rem", md: "0.875rem" },
          padding: { xs: "2px 4px", sm: "4px 8px", md: "6px 12px" },
          "&:hover": {
            backgroundColor: "#2E5A8F",
            transform: "translateY(-1px)",
          },
        },
        "& .fc-toolbar-title": {
          fontSize: { xs: "0.9rem", sm: "1.1rem", md: "1.25rem" },
          fontWeight: 600,
        },
        "& .fc-daygrid-day-number": {
          fontSize: { xs: "0.7rem", sm: "0.8rem", md: "0.875rem" },
          padding: { xs: "2px", sm: "4px", md: "6px" },
        },
        "& .fc-timegrid-slot-label": {
          fontSize: { xs: "0.6rem", sm: "0.7rem", md: "0.75rem" },
        },
        "& .fc-timegrid-axis": {
          fontSize: { xs: "0.6rem", sm: "0.7rem", md: "0.75rem" },
        },
      },
    },
  },
  timeInputs: {
    display: "flex",
    gap: 2,
    mt: 2,
  },
  dialogContent: {
    minWidth: { xs: "90vw", sm: 400 },
    "& .MuiTypography-root": {
      color: "#fff",
    },
  },
};

export default CalendarComponent;
