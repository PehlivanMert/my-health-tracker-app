import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { toast } from "react-toastify";
import {
  doc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  onSnapshot,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../auth/firebaseConfig";
import { scheduleNotification } from "../../utils/weather-theme-notify/NotificationManager";

export const useCalendarEvents = (user) => {
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [deletedEvents, setDeletedEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() =>
    format(new Date(), "yyyy-MM-dd")
  );
  const [newEvent, setNewEvent] = useState({
    title: "",
    startTime: format(new Date(), "HH:mm"),
    endTime: format(new Date(Date.now() + 60 * 60000), "HH:mm"),
    notify: "none",
    repeat: "none",
  });
  const [editingEvent, setEditingEvent] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [confirmUpdateModalOpen, setConfirmUpdateModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);

  const eventsRef = user
    ? collection(db, "users", user.uid, "calendarEvents")
    : null;

  useEffect(() => {
    if (!eventsRef) return;

    const unsubscribe = onSnapshot(eventsRef, (snapshot) => {
      const events = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          start: data.start.toDate(),
          end: data.end.toDate(),
          extendedProps: {
            notify: data.notify || "none",
            repeat: data.repeat || "none",
          },
        };
      });
      setCalendarEvents(events);
    });

    return () => unsubscribe();
  }, [eventsRef]);

  const addOneHour = (time) => {
    const [hours, minutes] = time.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    date.setHours(date.getHours() + 1);
    return `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes()
    ).padStart(2, "0")}`;
  };

  const generateRecurringEvents = useCallback((baseEvent) => {
    const events = [];
    const repeatId = Date.now().toString();
    const duration = baseEvent.end - baseEvent.start;

    if (baseEvent.extendedProps?.repeat === "daily") {
      for (let i = 0; i < 30; i++) {
        const newStart = new Date(baseEvent.start);
        newStart.setDate(newStart.getDate() + i);
        const newEnd = new Date(newStart.getTime() + duration);

        events.push({
          ...baseEvent,
          start: newStart,
          end: newEnd,
          extendedProps: {
            ...baseEvent.extendedProps,
            repeatId,
          },
        });
      }
    }
    return events.length > 0 ? events : [baseEvent];
  }, []);

  const addCalendarEvent = async () => {
    if (!eventsRef || !newEvent.title.trim()) return;

    const startDateTime = new Date(`${selectedDate}T${newEvent.startTime}`);
    const endDateTime = new Date(`${selectedDate}T${newEvent.endTime}`);

    const baseEvent = {
      title: newEvent.title,
      start: startDateTime,
      end: endDateTime,
      allDay: newEvent.startTime === "00:00" && newEvent.endTime === "23:59",
      notify: newEvent.notify,
      repeat: newEvent.repeat,
    };

    try {
      const eventsToAdd = generateRecurringEvents(baseEvent);
      const batch = writeBatch(db);

      eventsToAdd.forEach((event) => {
        const docRef = doc(eventsRef);
        batch.set(docRef, {
          ...event,
          start: Timestamp.fromDate(event.start),
          end: Timestamp.fromDate(event.end),
          notify: event.notify,
          repeat: event.repeat,
        });
        scheduleNotification(event.title, event.start, event.notify);
      });

      await batch.commit();
      toast.success("Etkinlik(ler) başarıyla eklendi");
      setNewEvent({
        title: "",
        startTime: format(new Date(), "HH:mm"),
        endTime: addOneHour(format(new Date(), "HH:mm")),
        notify: "none",
        repeat: "none",
      });
    } catch (error) {
      toast.error("Etkinlik eklenemedi: " + error.message);
    }
  };

  const deleteEvent = async (eventId) => {
    if (!eventsRef) return;
    setSelectedEventId(eventId);
    setConfirmModalOpen(true);
  };

  const handleDeleteConfirm = async (deleteAll) => {
    if (!selectedEventId || !eventsRef) return;

    try {
      const eventToDelete = calendarEvents.find(
        (e) => e.id === selectedEventId
      );
      if (!eventToDelete) return;

      const eventsToDelete =
        deleteAll && eventToDelete.extendedProps?.repeatId
          ? calendarEvents.filter(
              (e) =>
                e.extendedProps?.repeatId ===
                eventToDelete.extendedProps.repeatId
            )
          : [eventToDelete];

      setDeletedEvents((prev) => [...prev, ...eventsToDelete]);

      const batch = writeBatch(db);
      if (deleteAll && eventToDelete.extendedProps?.repeatId) {
        const q = query(
          eventsRef,
          where(
            "extendedProps.repeatId",
            "==",
            eventToDelete.extendedProps.repeatId
          )
        );
        const snapshot = await getDocs(q);
        snapshot.forEach((docSnap) => batch.delete(docSnap.ref));
      } else {
        batch.delete(doc(eventsRef, selectedEventId));
      }

      await batch.commit();
      toast.success(
        deleteAll ? "Tüm tekrarlayan etkinlikler silindi" : "Etkinlik silindi"
      );
    } catch (error) {
      toast.error("Silme işlemi başarısız: " + error.message);
    }
    setConfirmModalOpen(false);
  };

  const handleUndo = async () => {
    if (!eventsRef || deletedEvents.length === 0) return;

    try {
      const batch = writeBatch(db);
      deletedEvents.forEach((event) => {
        const docRef = doc(eventsRef, event.id);
        batch.set(docRef, {
          ...event,
          start: Timestamp.fromDate(event.start),
          end: Timestamp.fromDate(event.end),
        });
      });
      await batch.commit();
      setDeletedEvents([]);
      toast.success("Etkinlikler geri yüklendi");
    } catch (error) {
      toast.error("Geri alma başarısız: " + error.message);
    }
  };

  useEffect(() => {
    if (deletedEvents.length === 0) return;

    const timer = setTimeout(() => {
      setDeletedEvents([]);
      toast.info("Geri alma süresi doldu");
    }, 30000);

    return () => clearTimeout(timer);
  }, [deletedEvents]);

  const handleEventDrop = async (dropInfo) => {
    if (!eventsRef) return;

    try {
      await updateDoc(doc(eventsRef, dropInfo.event.id), {
        start: Timestamp.fromDate(dropInfo.event.start),
        end: Timestamp.fromDate(dropInfo.event.end),
        allDay: dropInfo.event.allDay,
      });
    } catch (error) {
      toast.error("Güncelleme başarısız: " + error.message);
    }
  };

  const handleEventResize = async (resizeInfo) => {
    if (!eventsRef) return;

    try {
      await updateDoc(doc(eventsRef, resizeInfo.event.id), {
        start: Timestamp.fromDate(resizeInfo.event.start),
        end: Timestamp.fromDate(resizeInfo.event.end),
      });
    } catch (error) {
      toast.error("Güncelleme başarısız: " + error.message);
    }
  };

  const handleUpdateEvent = async (updatedEvent) => {
    if (!eventsRef) return;

    try {
      await updateDoc(doc(eventsRef, updatedEvent.id), {
        title: updatedEvent.title,
        start: Timestamp.fromDate(updatedEvent.start),
        end: Timestamp.fromDate(updatedEvent.end),
        "extendedProps.notify": updatedEvent.extendedProps.notify,
      });
      toast.success("Etkinlik güncellendi");
    } catch (error) {
      toast.error("Güncelleme başarısız: " + error.message);
    }
  };

  return {
    selectedDate,
    setSelectedDate,
    newEvent,
    setNewEvent,
    calendarEvents,
    addOneHour,
    addCalendarEvent,
    handleEventDrop,
    generateRecurringEvents,
    handleUpdateEvent,
    handleEventResize,
    deleteEvent,
    handleDeleteConfirm,
    handleUndo,
    editingEvent,
    setEditingEvent,
    isEditModalOpen,
    setIsEditModalOpen,
    confirmModalOpen,
    setConfirmModalOpen,
    confirmUpdateModalOpen,
    setConfirmUpdateModalOpen,
    deletedEvents,
  };
};
