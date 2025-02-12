import { useState, useCallback, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "react-toastify";
import { scheduleNotification } from "../../utils/weather-theme-notify/NotificationManager";
import { generateEventId } from "./calendarHelpers";

export const useCalendarEvents = (user) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [confirmUpdateModalOpen, setConfirmUpdateModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() =>
    format(new Date(), "yyyy-MM-dd")
  );

  // Etkinlik ekleme fonksiyonu
  const [calendarEvents, setCalendarEvents] = useState(() => {
    try {
      const storedEvents = localStorage.getItem(`${user}-calendarEvents`);
      if (storedEvents) {
        return JSON.parse(storedEvents);
      }
      return [];
    } catch (error) {
      console.error("Error loading calendar events:", error);
      return [];
    }
  });

  const [newEvent, setNewEvent] = useState({
    title: "",
    startTime: format(new Date(), "HH:mm"),
    endTime: format(new Date(Date.now() + 60 * 60000), "HH:mm"),
    notify: "none",
    repeat: "none",
  });

  const [editingEvent, setEditingEvent] = useState(null);

  // Bir saat ekleyen yardımcı fonksiyon
  const addOneHour = (time) => {
    const [hours, minutes] = time.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    date.setHours(date.getHours() + 1); // 1 saat ekle
    return `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes()
    ).padStart(2, "0")}`;
  };

  // Etkinlik Ekleme Fonksiyonu (Güncellenmiş)
  const addCalendarEvent = () => {
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }

    if (newEvent.title.trim() && selectedDate) {
      const startDateTime = new Date(`${selectedDate}T${newEvent.startTime}`);
      const endDateTime = new Date(`${selectedDate}T${newEvent.endTime}`);

      const baseEvent = {
        id: generateEventId("event"),
        title: newEvent.title,
        start: startDateTime,
        end: endDateTime,
        allDay: newEvent.startTime === "00:00" && newEvent.endTime === "23:59",
        extendedProps: {
          notify: newEvent.notify,
          repeat: newEvent.repeat,
        },
      };

      const eventsToAdd = generateRecurringEvents(baseEvent);
      const updatedEvents = [...calendarEvents, ...eventsToAdd];

      setCalendarEvents(updatedEvents);
      localStorage.setItem(
        `${user}-calendarEvents`,
        JSON.stringify(updatedEvents)
      );
      scheduleNotification(newEvent.title, startDateTime, newEvent.notify);

      setNewEvent({
        title: "",
        startTime: format(new Date(), "HH:mm"),
        endTime: format(new Date(Date.now() + 60 * 60000), "HH:mm"),
        notify: "none",
        repeat: "none",
      });

      toast.success("Etkinlik başarıyla eklendi");
    }
  };

  const handleEventDrop = (dropInfo) => {
    setCalendarEvents((prevEvents) => {
      const updatedEvents = prevEvents.map((event) =>
        event.id === dropInfo.event.id
          ? {
              ...event,
              start: dropInfo.event.start,
              end: dropInfo.event.end,
              allDay: dropInfo.event.allDay,
            }
          : event
      );
      localStorage.setItem(
        `${user}-calendarEvents`,
        JSON.stringify(updatedEvents)
      );
      return updatedEvents;
    });
  };

  // Tekrarlı Etkinlik Üretme Fonksiyonu
  const generateRecurringEvents = useCallback((baseEvent) => {
    const events = [];
    const repeatId = generateEventId("repeat");
    const duration = baseEvent.end - baseEvent.start;
    const repeatDuration = 30;

    if (baseEvent.extendedProps?.repeat === "daily") {
      for (let i = 0; i < repeatDuration; i++) {
        const newStart = new Date(baseEvent.start);
        newStart.setDate(newStart.getDate() + i);
        const newEnd = new Date(newStart.getTime() + duration);

        events.push({
          ...baseEvent,
          id: generateEventId(baseEvent.id),
          start: newStart,
          end: newEnd,
          extendedProps: {
            ...baseEvent.extendedProps,
            repeatId: repeatId,
          },
        });
      }
      return events;
    }
    return [baseEvent];
  }, []); // Bağımlılık yok

  // Event Silme Fonksiyonu
  const [deletedEvents, setDeletedEvents] = useState(() => {
    try {
      const storedData = localStorage.getItem(`${user}-deletedEvents`);
      return storedData ? JSON.parse(storedData) : [];
    } catch (error) {
      return [];
    }
  });
  // Güncelleme fonksiyonu
  const handleUpdateEvent = (updatedEventData) => {
    setEditingEvent(updatedEventData);
    setIsEditModalOpen(false);
    setConfirmUpdateModalOpen(true);
  };
  // Onay fonksiyonu
  const handleConfirmUpdate = (updateAll) => {
    const updatedEvents = calendarEvents.map((ev) => {
      const evStartDate =
        ev.start instanceof Date ? ev.start : new Date(ev.start);
      const startDateString = format(evStartDate, "yyyy-MM-dd");

      if (ev.id === editingEvent.id) {
        return {
          ...ev,
          title: editingEvent.title,
          start: new Date(`${startDateString}T${editingEvent.startTime}`),
          end: new Date(`${startDateString}T${editingEvent.endTime}`),
          extendedProps: {
            ...ev.extendedProps,
            notify: editingEvent.notify,
          },
        };
      }

      if (
        updateAll &&
        ev.extendedProps?.repeatId === editingEvent.extendedProps?.repeatId
      ) {
        return {
          ...ev,
          title: editingEvent.title,
          start: new Date(`${startDateString}T${editingEvent.startTime}`),
          end: new Date(`${startDateString}T${editingEvent.endTime}`),
          extendedProps: {
            ...ev.extendedProps,
            notify: editingEvent.notify,
          },
        };
      }

      return ev;
    });

    // Direkt JSON.stringify ile kaydet
    setCalendarEvents(updatedEvents);
    localStorage.setItem(
      `${user}-calendarEvents`,
      JSON.stringify(updatedEvents)
    );

    setEditingEvent(null);
    setConfirmUpdateModalOpen(false);
    toast.success("Etkinlik başarıyla güncellendi");
  };

  // Yeni eventResize handler ekleyin
  const handleEventResize = (resizeInfo) => {
    setCalendarEvents((prevEvents) => {
      const updatedEvents = prevEvents.map((event) =>
        event.id === resizeInfo.event.id
          ? {
              ...event,
              start: resizeInfo.event.start,
              end: resizeInfo.event.end,
              allDay: resizeInfo.event.allDay,
            }
          : event
      );
      localStorage.setItem(
        `${user}-calendarEvents`,
        JSON.stringify(updatedEvents)
      );
      return updatedEvents;
    });
  };

  const handleDeleteConfirm = (deleteAll) => {
    if (!selectedEventId) return;

    const eventToDelete = calendarEvents.find((e) => e.id === selectedEventId);
    let eventsToDelete = [];
    let updatedEvents;

    if (deleteAll && eventToDelete?.extendedProps?.repeatId) {
      updatedEvents = calendarEvents.filter(
        (e) =>
          e.extendedProps?.repeatId !== eventToDelete.extendedProps?.repeatId
      );
      eventsToDelete = calendarEvents.filter(
        (e) =>
          e.extendedProps?.repeatId === eventToDelete.extendedProps?.repeatId
      );
    } else {
      updatedEvents = calendarEvents.filter((e) => e.id !== selectedEventId);
      eventsToDelete = [eventToDelete];
    }

    setDeletedEvents((prev) => [...prev, ...eventsToDelete]);
    setCalendarEvents(updatedEvents);

    try {
      // Direkt JSON.stringify ile kaydet
      localStorage.setItem(
        `${user}-calendarEvents`,
        JSON.stringify(updatedEvents)
      );
      localStorage.setItem(
        `${user}-deletedEvents`,
        JSON.stringify([...deletedEvents, ...eventsToDelete])
      );

      toast.success("Etkinlik başarıyla silindi");
    } catch (error) {
      console.error("Storage error:", error);
      toast.error("Etkinlik silinirken bir hata oluştu");
    }

    setConfirmModalOpen(false);
  };

  const deleteEvent = (eventId) => {
    setSelectedEventId(eventId);
    setConfirmModalOpen(true);
  };

  // 🟢 Silme işlemi için geri alma fonksiyonu
  const handleUndo = () => {
    if (deletedEvents.length === 0) return;

    try {
      const restoredEvents = [...calendarEvents, ...deletedEvents];
      setCalendarEvents(restoredEvents);
      setDeletedEvents([]);

      // Direkt JSON.stringify ile kaydet
      localStorage.setItem(
        `${user}-calendarEvents`,
        JSON.stringify(restoredEvents)
      );
      localStorage.removeItem(`${user}-deletedEvents`);

      toast.success("Etkinlikler başarıyla geri yüklendi", {
        toastId: "undoSuccess",
      });
    } catch (error) {
      console.error("Geri alma işlemi başarısız oldu:", error);
      toast.error("Geri alma işlemi başarısız oldu");
    }
  };

  // Timer'ı useEffect içinde kullanın
  useEffect(() => {
    if (deletedEvents.length > 0) {
      const cleanupTimer = setTimeout(() => {
        setDeletedEvents((prev) => {
          if (prev.length === 0) return prev;
          toast.info("Geri alma süresi doldu. Silinenler temizlendi.");
          localStorage.removeItem(`${user}-deletedEvents`);
          return [];
        });
      }, 30000);

      return () => clearTimeout(cleanupTimer);
    }
  }, [deletedEvents, user]);

  return {
    selectedDate,
    setSelectedDate,
    newEvent,
    setNewEvent,
    calendarEvents,
    setCalendarEvents,
    addOneHour,
    addCalendarEvent,
    handleEventDrop,
    generateRecurringEvents,
    handleUpdateEvent,
    handleConfirmUpdate,
    handleEventResize,
    handleDeleteConfirm,
    deleteEvent,
    handleUndo,
    editingEvent, // EKLENDİ
    setEditingEvent, // EKLENDİ
    isEditModalOpen,
    confirmUpdateModalOpen,
    confirmModalOpen,
    setIsEditModalOpen,
    setConfirmUpdateModalOpen,
    setConfirmModalOpen,
    deletedEvents,
    setDeletedEvents,
  };
};
