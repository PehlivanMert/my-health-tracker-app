import { useState, useCallback, useRef, useEffect } from "react";
import {
  collection,
  query,
  getDocs,
  doc,
  deleteDoc,
  writeBatch,
  Timestamp,
  updateDoc,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "../components/auth/firebaseConfig";
import { DateTime } from "luxon";
import { toast } from "react-toastify";

export const useCalendarData = (user, calendarColors) => {
  const [events, setEvents] = useState([]);
  const lastEventsState = useRef([]);
  const isDataLoading = useRef(true);
  const isInitialLoad = useRef(true);

  // Etkinlikleri Firestore'dan çek
  const fetchEvents = useCallback(async () => {
    if (!user) return;
    try {
      const eventsRef = collection(db, "users", user.uid, "calendarEvents");

      const now = new Date();
      // Veri yükünü hafifletmek için önceki 6 ay ve sonraki 1 yıl
      const startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      const endDate = new Date(now.getFullYear() + 1, now.getMonth() + 6, 31);

      const q = query(
        eventsRef,
        where("start", ">=", startDate),
        where("start", "<=", endDate),
        orderBy("start", "asc")
      );

      const snapshot = await getDocs(q);
      const eventsData = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const colorValue = data.color || calendarColors.limon;
        
        const baseEvent = {
          id: docSnap.id,
          title: data.title,
          start: data.start.toDate(),
          end: data.end.toDate(),
          allDay: data.allDay,
          color: colorValue,
          notification: data.notification || "none",
          notificationId: data.notificationId || null,
          isRecurring: !!data.recurrence,
          recurrenceType: data.recurrence?.recurrenceType || null,
          recurrenceUntil: data.recurrence?.recurrenceUntil?.toDate() || null,
        };

        return baseEvent;
      });
      
      setEvents(eventsData);
      lastEventsState.current = [...eventsData];
      isDataLoading.current = false;
      isInitialLoad.current = false;
    } catch (error) {
      toast.error(`Etkinlikler yüklenemedi: ${error.message}`);
      isDataLoading.current = false;
    }
  }, [user, calendarColors]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const addEvent = async (newEvent) => {
    if (!newEvent.title.trim()) {
      toast.error("Etkinlik başlığı gereklidir");
      return false;
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
      toast.success("Etkinlik başarıyla eklendi");
      return true;
    } catch (error) {
      toast.error(`Etkinlik oluşturma hatası: ${error.message}`);
      return false;
    }
  };

  const deleteEvent = async (eventId) => {
    try {
      await deleteDoc(doc(db, "users", user.uid, "calendarEvents", eventId));
      await fetchEvents();
      toast.success("Etkinlik silindi");
      return true;
    } catch (error) {
      toast.error(`Silme hatası: ${error.message}`);
      return false;
    }
  };

  const updateEvent = async (editEvent) => {
    try {
      await updateDoc(doc(db, "users", user.uid, "calendarEvents", editEvent.id), {
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
      });
      await fetchEvents();
      toast.success("Etkinlik güncellendi");
      return true;
    } catch (error) {
      toast.error(`Güncelleme hatası: ${error.message}`);
      return false;
    }
  };

  return {
    events,
    fetchEvents,
    addEvent,
    deleteEvent,
    updateEvent,
  };
};
