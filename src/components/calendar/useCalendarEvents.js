import { useState, useEffect, useCallback, useRef } from "react";
import { format } from "date-fns";
import { toast } from "react-toastify";
import {
  doc,
  collection,
  query,
  where,
  writeBatch,
  onSnapshot,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../auth/firebaseConfig";
import { scheduleNotification } from "../../utils/weather-theme-notify/NotificationManager";

export const useCalendarEvents = (user) => {
  const [calendarEvents, setCalendarEvents] = useState([]);
  // deletedEvents: UI’da silinmiş (beklemede olan) etkinlikleri tutar.
  const [deletedEvents, setDeletedEvents] = useState([]);
  // 30 saniyelik bekleme süresi için timer ID'si
  const [deleteTimer, setDeleteTimer] = useState(null);
  const pendingDeletionRef = useRef([]); // Silinmesi beklenen etkinlikleri saklamak için

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

  // Sadece seçili tarihin bulunduğu ayın etkinliklerini getiriyoruz.
  useEffect(() => {
    if (!eventsRef) return;

    // selectedDate üzerinden ay başlangıcı ve bitişi hesaplanıyor.
    const current = new Date(selectedDate);
    const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    const qEvents = query(
      eventsRef,
      where("start", ">=", Timestamp.fromDate(monthStart)),
      where("start", "<=", Timestamp.fromDate(monthEnd))
    );

    const unsubscribe = onSnapshot(qEvents, (snapshot) => {
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
            repeatId: data.extendedProps?.repeatId || null,
          },
        };
      });
      setCalendarEvents(events);
    });

    return () => unsubscribe();
  }, [eventsRef, selectedDate]);

  // UI’da silinmiş (beklemede) etkinlikleri göstermiyoruz.
  const visibleCalendarEvents = calendarEvents.filter(
    (event) => !deletedEvents.some((de) => de.id === event.id)
  );

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

    if (baseEvent.repeat === "daily") {
      for (let i = 0; i < 30; i++) {
        const newStart = new Date(baseEvent.start);
        newStart.setDate(newStart.getDate() + i);
        const newEnd = new Date(newStart.getTime() + duration);

        events.push({
          ...baseEvent,
          start: newStart,
          end: newEnd,
          extendedProps: {
            notify: baseEvent.notify,
            repeat: baseEvent.repeat,
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
          extendedProps: event.extendedProps || {},
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

  // Silme modalı açılır.
  const deleteEvent = (eventId) => {
    if (!eventsRef) return;
    setSelectedEventId(eventId);
    setConfirmModalOpen(true);
  };

  /* 
    handleDeleteConfirm:
    - Modalda tek veya toplu silme seçeneğine göre silinecek etkinlik(ler) belirlenir.
    - Belirlenen etkinlik(ler) UI’dan kaldırılır (deletedEvents state güncellenir)
      ve aynı zamanda pendingDeletionRef üzerinden saklanır.
    - 30 saniyelik timer başlatılır; sürenin sonunda commitDeletion çağrılarak Firestore’dan kalıcı silinir.
  */
  const handleDeleteConfirm = (deleteAll) => {
    if (!selectedEventId || !eventsRef) return;

    const eventToDelete = calendarEvents.find((e) => e.id === selectedEventId);
    if (!eventToDelete) return;

    let eventsToDelete = [];
    if (deleteAll && eventToDelete.extendedProps?.repeatId) {
      eventsToDelete = calendarEvents.filter(
        (e) =>
          e.extendedProps?.repeatId === eventToDelete.extendedProps.repeatId
      );
    } else {
      eventsToDelete = [eventToDelete];
    }

    // Önceden ayakta timer varsa temizleyelim.
    if (deleteTimer) {
      clearTimeout(deleteTimer);
    }

    // Pending deletion için ref ve state güncelleniyor.
    pendingDeletionRef.current = eventsToDelete;
    setDeletedEvents(eventsToDelete);

    // 30 saniye sonra commitDeletion çağrılır.
    const timer = setTimeout(() => {
      commitDeletion();
    }, 30000);
    setDeleteTimer(timer);
    setConfirmModalOpen(false);
    toast.info("Etkinlik(ler) silindi. 30 saniye içinde geri alabilirsiniz.");
  };

  // 30 saniye sonunda veya başka şekilde beklemeden commitDeletion çağrılarak Firestore'dan kalıcı silme yapılır.
  const commitDeletion = async () => {
    const eventsToDelete = pendingDeletionRef.current;
    if (!eventsToDelete.length || !eventsRef) return;
    try {
      const batch = writeBatch(db);
      eventsToDelete.forEach((event) => {
        const docRef = doc(eventsRef, event.id);
        batch.delete(docRef);
      });
      await batch.commit();
      toast.success("Silme işlemi tamamlandı.");
    } catch (error) {
      toast.error("Silme işlemi başarısız: " + error.message);
    }
    // Hem ref hem de state temizleniyor.
    pendingDeletionRef.current = [];
    setDeletedEvents([]);
    setDeleteTimer(null);
  };

  // Kullanıcı geri alma tuşuna basarsa: timer iptal edilir, pending deletion iptal edilir ve etkinlikler UI’da yeniden görünür.
  const handleUndo = () => {
    if (deleteTimer) {
      clearTimeout(deleteTimer);
      setDeleteTimer(null);
    }
    pendingDeletionRef.current = [];
    setDeletedEvents([]);
    toast.success("Silme işlemi geri alındı.");
  };

  /* 
    handleUpdateEvent:
    - Güncelleme öncesinde start ve end değerlerinin Date nesnesi olduğundan emin olunur.
    - Eğer toplu güncelleme seçilmişse, ilgili repeatId’ye sahip tüm etkinlikler batch ile güncellenir.
    - Aksi halde sadece seçili etkinlik güncellenir.
  */
  const handleUpdateEvent = async (updatedEvent) => {
    if (!eventsRef) return;

    try {
      const startDate =
        updatedEvent.start instanceof Date
          ? updatedEvent.start
          : new Date(updatedEvent.start);
      const endDate =
        updatedEvent.end instanceof Date
          ? updatedEvent.end
          : new Date(updatedEvent.end);

      if (confirmUpdateModalOpen && updatedEvent.extendedProps?.repeatId) {
        const eventsToUpdate = calendarEvents.filter(
          (e) =>
            e.extendedProps?.repeatId === updatedEvent.extendedProps.repeatId
        );
        const batch = writeBatch(db);
        eventsToUpdate.forEach((event) => {
          const docRef = doc(eventsRef, event.id);
          batch.update(docRef, {
            title: updatedEvent.title,
            start: Timestamp.fromDate(startDate),
            end: Timestamp.fromDate(endDate),
            "extendedProps.notify": updatedEvent.extendedProps.notify,
          });
          scheduleNotification(
            updatedEvent.title,
            startDate,
            updatedEvent.extendedProps.notify
          );
        });
        await batch.commit();
        toast.success("Tüm tekrarlayan etkinlikler güncellendi");
      } else {
        await updateDoc(doc(eventsRef, updatedEvent.id), {
          title: updatedEvent.title,
          start: Timestamp.fromDate(startDate),
          end: Timestamp.fromDate(endDate),
          "extendedProps.notify": updatedEvent.extendedProps.notify,
        });
        scheduleNotification(
          updatedEvent.title,
          startDate,
          updatedEvent.extendedProps.notify
        );
        toast.success("Etkinlik güncellendi");
      }
    } catch (error) {
      toast.error("Güncelleme başarısız: " + error.message);
    }
  };

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

  return {
    selectedDate,
    setSelectedDate,
    newEvent,
    setNewEvent,
    // UI’da gösterim için silinmiş (beklemede) etkinlikler hariç tutuluyor.
    calendarEvents: visibleCalendarEvents,
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
    // UI’da "Geri Al" butonunun görünmesi için deletedEvents döndürülüyor.
    deletedEvents,
  };
};
