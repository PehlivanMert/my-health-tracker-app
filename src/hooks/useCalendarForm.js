import { useState, useCallback } from "react";
import { DateTime } from "luxon";

export const useCalendarForm = (defaultColor) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const getInitialNewEvent = useCallback((baseDate = DateTime.local()) => {
    return {
      title: "",
      start: baseDate.set({ hour: 10, minute: 0, second: 0, millisecond: 0 }),
      end: baseDate.set({ hour: 12, minute: 0, second: 0, millisecond: 0 }),
      allDay: false,
      color: defaultColor || "#E066FF",
      notification: "none",
      isRecurring: false,
      recurrenceType: "",
      recurrenceUntil: baseDate.plus({ months: 1 }).endOf("day"),
    };
  }, [defaultColor]);

  const [newEvent, setNewEvent] = useState(getInitialNewEvent());
  const [editEvent, setEditEvent] = useState(null);

  const handleDateTimeChange = useCallback((value, isStart, isEdit = false) => {
    const dt = DateTime.fromISO(value);
    if (!dt.isValid) return;

    const setFunc = isEdit ? setEditEvent : setNewEvent;

    setFunc((prev) => {
      const newValue = { ...prev };
      if (isStart) {
        newValue.start = dt;
        if (prev.allDay) {
          newValue.start = newValue.start.startOf("day");
          if (prev.end && prev.end.isValid) {
            const duration = prev.end.diff(prev.start);
            newValue.end = dt.plus(duration).endOf("day");
          }
        } else {
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
  }, []);

  const handleDateSelect = useCallback((selectInfo) => {
    const isAllDaySelection = !!selectInfo.allDay;
    const startDt = DateTime.fromJSDate(selectInfo.start);
    const endCandidate = selectInfo.end ? DateTime.fromJSDate(selectInfo.end) : null;

    if (isAllDaySelection) {
      const base = startDt;
      setNewEvent({
        ...getInitialNewEvent(base),
        color: defaultColor || "#E066FF",
      });
      setOpenDialog(true);
      return;
    }

    const start = startDt.set({ second: 0, millisecond: 0 });
    let end = endCandidate ? endCandidate.set({ second: 0, millisecond: 0 }) : start.plus({ hours: 1 });

    if (!end.isValid || end <= start) {
      end = start.plus({ hours: 1 });
    }

    setNewEvent({
      ...getInitialNewEvent(start),
      start,
      end,
      color: defaultColor || "#E066FF",
    });
    setOpenDialog(true);
  }, [getInitialNewEvent, defaultColor]);

  const resetNewEvent = useCallback(() => {
    setNewEvent(getInitialNewEvent());
  }, [getInitialNewEvent]);

  return {
    openDialog,
    setOpenDialog,
    openEditDialog,
    setOpenEditDialog,
    selectedEvent,
    setSelectedEvent,
    newEvent,
    setNewEvent,
    editEvent,
    setEditEvent,
    handleDateTimeChange,
    handleDateSelect,
    resetNewEvent,
  };
};
