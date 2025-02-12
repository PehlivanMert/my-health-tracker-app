import React, { useRef, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Select,
  MenuItem,
  Button,
  IconButton,
} from "@mui/material";
import { Delete } from "@mui/icons-material";
import { format } from "date-fns";
import tippy from "tippy.js";
import ConfirmUpdateModal from "../../utils/modal/ConfirmUpdateModal";
import EditEventModal from "../../utils/modal/EditEventModal";
import { toast } from "react-toastify";
import { addOneHour } from "./calendarHelpers";

const Calendar = ({
  user,
  selectedDate,
  setSelectedDate,
  newEvent,
  setNewEvent,
  calendarEvents,
  setCalendarEvents,
  addCalendarEvent,
  handleEventDrop,
  handleEventResize,
  deleteEvent,
  confirmUpdateModalOpen,
  setConfirmUpdateModalOpen,
  editingEvent,
  setEditingEvent,
  isEditModalOpen,
  setIsEditModalOpen,
  handleUpdateEvent,
  handleConfirmUpdate,
  deletedEvents,
  setDeletedEvents,
  handleUndo,
}) => {
  const calendarRef = useRef(null);

  // Calendar.js
  useEffect(() => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.refetchEvents();
    }
  }, [calendarEvents]);

  // Etkinlik tıklama düzeltmesi
  const handleEventDoubleClick = (clickInfo) => {
    const existingEvent = calendarEvents?.find(
      (ev) => ev.id === clickInfo.event.id
    );
    if (!existingEvent) {
      toast.error("Etkinlik bulunamadı");
      return;
    }
    const notify = existingEvent.extendedProps?.notify || "none";
    setEditingEvent({
      ...existingEvent,
      start: format(existingEvent.start || new Date(), "yyyy-MM-dd"),
      startTime: format(existingEvent.start || new Date(), "HH:mm"),
      endTime: format(
        existingEvent.end || existingEvent.start || new Date(),
        "HH:mm"
      ),
      notify,
    });
    setIsEditModalOpen(true);
  };

  return (
    <Paper sx={{ p: 3, borderRadius: 2 }} className="tab-panel">
      <Typography
        variant="h5"
        gutterBottom
        sx={{
          mb: 3,
          display: "flex",
          alignItems: "center",
          gap: 1,
          color: "primary.main",
          fontWeight: "bold",
        }}
      >
        📅 Takvim
      </Typography>
      {/* Takvim Girdi Alanları */}
      <Box
        sx={{
          mb: 2,
          display: "flex",
          gap: 2,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <TextField
          id="calendarDate"
          name="calendarDate"
          label="Tarih"
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          sx={{ width: 200 }}
        />
        <TextField
          id="calendarStartTime"
          name="calendarStartTime"
          label="Başlangıç Saati"
          type="time"
          value={newEvent.startTime}
          onChange={(e) => {
            const newStartTime = e.target.value;
            const newEndTime = addOneHour(newStartTime);
            setNewEvent({
              ...newEvent,
              startTime: newStartTime,
              endTime: newEndTime,
            });
          }}
        />
        <TextField
          id="calendarEndTime"
          name="calendarEndTime"
          label="Bitiş Saati"
          type="time"
          value={newEvent.endTime}
          onChange={(e) =>
            setNewEvent({ ...newEvent, endTime: e.target.value })
          }
        />
        <TextField
          id="calendar-title"
          name="title"
          label="Etkinlik Adı"
          value={newEvent.title}
          onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
          sx={{ flex: 1 }}
        />

        <Select
          id="calendar-notify"
          name="notifycalendar"
          value={newEvent.notify || "none"}
          onChange={(e) => setNewEvent({ ...newEvent, notify: e.target.value })}
          sx={{
            width: { xs: "100%", sm: 120 },
            mt: { xs: 2, sm: 1 },
          }}
          displayEmpty
        >
          <MenuItem value="none">Hatırlatma Yok</MenuItem>
          <MenuItem value="15-minutes">15 Dakika Önce</MenuItem>
          <MenuItem value="1-hour">1 Saat Önce</MenuItem>
          <MenuItem value="1-day">1 Gün Önce</MenuItem>
          <MenuItem value="on-time">Vaktinde</MenuItem>
        </Select>
        <Select
          id="calendar-repeat"
          name="repeatcalendar"
          value={newEvent.repeat || "none"}
          onChange={(e) => setNewEvent({ ...newEvent, repeat: e.target.value })}
          sx={{
            width: { xs: "100%", sm: 120 },
            mt: { xs: 2, sm: 1 },
          }}
          displayEmpty
        >
          <MenuItem value="none">Tekrarlama</MenuItem>
          <MenuItem value="daily">Günlük</MenuItem>
          <MenuItem value="weekly">Haftalık</MenuItem>
          <MenuItem value="monthly">Aylık</MenuItem>
        </Select>

        <Button
          variant="contained"
          onClick={addCalendarEvent}
          disabled={!newEvent.title.trim()}
          sx={{ height: 56 }}
        >
          Ekle
        </Button>
      </Box>
      {/* Takvim Görüntüleme Alanı */}
      <Box id="calendar-container">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth" // İlk view burada tanımlı, ancak view değişiklikleri kullanıcı tarafından yapılabiliyor.
          events={calendarEvents}
          editable
          selectable
          selectMirror
          eventClick={(info) => {
            console.log("Etkinlik tıklandı:", info);
            handleEventDoubleClick(info);
          }}
          eventResizableFromStart
          eventDrop={(info) => {
            console.log("Drop Info:", {
              newStart: info.event.start,
              newEnd: info.event.end,
              revert: info.revert,
            });
            handleEventDrop({
              event: info.event,
              oldEvent: info.oldEvent,
              revert: info.revert,
            });
            // Tooltip güncellemesi:
            const start = format(new Date(info.event.start), "HH:mm");
            const end = format(new Date(info.event.end), "HH:mm");
            if (info.el._tippy) {
              info.el._tippy.setContent(`${start} - ${end}`);
            } else {
              tippy(info.el, {
                content: `${start} - ${end}`,
                placement: "top",
              });
            }
          }}
          eventResize={(info) => {
            // Durum güncellemesi
            handleEventResize({
              event: info.event,
              oldEvent: info.oldEvent,
              revert: info.revert,
            });
            // Tooltip güncellemesi:
            const start = format(new Date(info.event.start), "HH:mm");
            const end = format(new Date(info.event.end), "HH:mm");
            if (info.el._tippy) {
              info.el._tippy.setContent(`${start} - ${end}`);
            } else {
              tippy(info.el, {
                content: `${start} - ${end}`,
                placement: "top",
              });
            }
          }}
          eventDidMount={(info) => {
            const start = format(new Date(info.event.start), "HH:mm");
            const end = format(new Date(info.event.end), "HH:mm");
            info.el.title = `${start} - ${end}`;
            tippy(info.el, {
              content: `${start} - ${end}`,
              placement: "top",
            });
          }}
          eventContent={(info) => {
            if (!info.event.start || !info.event.end) return null;

            return (
              <div
                style={{
                  color: "white",
                  padding: "2px 5px",
                  borderRadius: "4px",
                  margin: "2px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>{info.event.title}</span>
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteEvent(info.event.id);
                  }}
                  size="small"
                  sx={{ color: "white", ml: 1, padding: "4px" }}
                >
                  <Delete fontSize="inherit" />
                </IconButton>
              </div>
            );
          }}
          eventClassNames={(info) => {
            const eventStart = new Date(info.event.startStr);
            const now = new Date();
            return eventStart < now ? "past-event" : "";
          }}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
        />
      </Box>
      {/* Etkinlik Düzenleme Modali */}
      {isEditModalOpen && editingEvent && (
        <EditEventModal
          key={editingEvent.id} // ✅ Modal stabil hale gelecek
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          event={editingEvent}
          onSave={handleUpdateEvent}
        />
      )}

      {/* Onaylama  Modali */}
      <ConfirmUpdateModal
        isOpen={confirmUpdateModalOpen}
        onClose={() => setConfirmUpdateModalOpen(false)}
        onConfirm={(updateAll) => handleConfirmUpdate(updateAll, editingEvent)}
      />
    </Paper>
  );
};
export default Calendar;
