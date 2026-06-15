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

      // Tarih aralığı belirle (3 ay öncesi ve 6 ay sonrası)
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 6, 31);

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
              untilDate.setHours(23, 59, 59, 999);
              rruleObj.until = untilDate;
            } else {
              untilDate = DateTime.local().plus({ months: 1 }).endOf("day").toJSDate();
              rruleObj.until = untilDate;
            }
            baseEvent.rrule = rruleObj;
            const diff = data.end.toDate() - data.start.toDate();
            baseEvent.duration = {
              hours: Math.floor(diff / (1000 * 60 * 60)),
              minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
              seconds: Math.floor((diff % (1000 * 60)) / 1000),
            };
            delete baseEvent.end;
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
      isInitialLoad.current = false;
    } catch (error) {
      toast.error(`Etkinlikler yüklenemedi: ${error.message}`);
      isDataLoading.current = false;
    }
  }, [user, calendarColors]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Yeni etkinlik oluştur
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

  // Etkinlik sil
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

  // Etkinlik güncelle
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

  // Sürükle-bırak veya resize sonrası kısmi güncelleme
  const updateEventDates = async (eventId, start, end, allDay) => {
    try {
      const updateData = {
        start: Timestamp.fromDate(start.toJSDate()),
        allDay: allDay,
      };
      if (end) {
        updateData.end = Timestamp.fromDate(end.toJSDate());
      }
      await updateDoc(doc(db, "users", user.uid, "calendarEvents", eventId), updateData);
      await fetchEvents();
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
    updateEventDates,
  };
};
