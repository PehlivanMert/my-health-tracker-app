import { useState } from "react";
import { v4 as uuidv4 } from "uuid";

export const categoryColors = {
  Work: "bg-blue-500", 
  Personal: "bg-teal-400",
  Exercise: "bg-green-500",
  Study: "bg-orange-500",
  Health: "bg-red-500",
  Finance: "bg-purple-500",
  Social: "bg-yellow-400",
  Hobby: "bg-lime-500",
  Travel: "bg-cyan-500",
  Shopping: "bg-pink-500",
  Food: "bg-amber-500",
  Entertainment: "bg-indigo-400",
  Other: "bg-slate-500",
  Default: "bg-slate-500",
};

export const categoryIcons = {
  Work: "💼", Personal: "👤", Exercise: "💪", Study: "📚",
  Health: "❤️", Finance: "💰", Social: "👥", Hobby: "🎨",
  Travel: "✈️", Shopping: "🛍️", Food: "🍽️", Entertainment: "🎬",
  Other: "📌", Default: "📌",
};

export const categoryNames = {
  Work: "İş", Personal: "Kişisel", Exercise: "Egzersiz", Study: "Çalışma",
  Health: "Sağlık", Finance: "Finans", Social: "Sosyal", Hobby: "Hobi",
  Travel: "Seyahat", Shopping: "Alışveriş", Food: "Yemek", Entertainment: "Eğlence",
  Other: "Diğer", Default: "Diğer",
};

export const useDailyRoutineForm = (addRoutine, saveRoutineGroup, updateRoutine, timeFilter) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState(null);
  const [newRoutineDate, setNewRoutineDate] = useState("");

  const getTurkeyLocalDateString = (date = new Date()) =>
    new Date(date.toLocaleString("en-US", { timeZone: "Europe/Istanbul" })).toLocaleDateString("en-CA");

  const handleOpenModal = () => {
    let targetDate = new Date();
    if (timeFilter === "Yesterday") targetDate.setDate(targetDate.getDate() - 1);
    else if (timeFilter === "Tomorrow") targetDate.setDate(targetDate.getDate() + 1);
    
    setNewRoutineDate(getTurkeyLocalDateString(targetDate));
    setEditingRoutine(null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingRoutine(null);
  };

  const handleSaveRoutine = (routineData) => {
    const baseRoutine = {
      title: routineData.title,
      time: routineData.time,
      endTime: routineData.endTime,
      category: routineData.category,
      icon: routineData.icon,
      notificationEnabled: false,
      completed: false,
      completedDates: routineData.repeat && routineData.repeat !== "none" ? [] : undefined,
      createdAt: editingRoutine ? editingRoutine.createdAt || new Date().toISOString() : new Date().toISOString(),
      repeat: routineData.repeat,
      repeatCount: routineData.repeatCount,
    };

    if (editingRoutine) {
      if (routineData.repeat && routineData.repeat !== "none") {
        const groupId = editingRoutine.groupId || uuidv4();
        const count = Number(routineData.repeatCount) || 1;
        const startDate = new Date(routineData.date);
        let newGroupRoutines = [];
        for (let i = 0; i < count; i++) {
          let occurrenceDate = new Date(startDate);
          if (routineData.repeat === "daily") {
            occurrenceDate.setDate(startDate.getDate() + i);
          } else if (routineData.repeat === "weekly") {
            occurrenceDate.setDate(startDate.getDate() + i * 7);
          } else if (routineData.repeat === "monthly") {
            occurrenceDate.setMonth(startDate.getMonth() + i);
          }
          newGroupRoutines.push({
            ...baseRoutine,
            id: uuidv4(),
            date: getTurkeyLocalDateString(occurrenceDate),
            groupId,
          });
        }
        saveRoutineGroup(newGroupRoutines, groupId);
      } else {
        updateRoutine(editingRoutine.id, {
          ...baseRoutine,
          date: getTurkeyLocalDateString(new Date(routineData.date))
        });
      }
    } else {
      if (routineData.repeat && routineData.repeat !== "none") {
        const groupId = uuidv4();
        const count = Number(routineData.repeatCount) || 1;
        const startDate = new Date(routineData.date);
        let newGroupRoutines = [];
        for (let i = 0; i < count; i++) {
          let occurrenceDate = new Date(startDate);
          if (routineData.repeat === "daily") {
            occurrenceDate.setDate(startDate.getDate() + i);
          } else if (routineData.repeat === "weekly") {
            occurrenceDate.setDate(startDate.getDate() + i * 7);
          } else if (routineData.repeat === "monthly") {
            occurrenceDate.setMonth(startDate.getMonth() + i);
          }
          newGroupRoutines.push({
            ...baseRoutine,
            id: uuidv4(),
            date: getTurkeyLocalDateString(occurrenceDate),
            groupId,
          });
        }
        saveRoutineGroup(newGroupRoutines, null);
      } else {
        addRoutine({
          ...baseRoutine,
          id: uuidv4(),
          date: getTurkeyLocalDateString(new Date(routineData.date)),
        });
      }
    }
    handleCloseModal();
  };

  const handleEditRoutine = (routine) => {
    setEditingRoutine(routine);
    setModalOpen(true);
  };

  return {
    modalOpen, setModalOpen,
    editingRoutine, setEditingRoutine,
    newRoutineDate, setNewRoutineDate,
    handleOpenModal,
    handleCloseModal,
    handleSaveRoutine,
    handleEditRoutine
  };
};
