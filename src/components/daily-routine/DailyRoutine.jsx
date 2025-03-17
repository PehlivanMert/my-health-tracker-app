import React, { useEffect, useState, useRef } from "react";
import { Box, Container } from "@mui/material";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { AnimatePresence } from "framer-motion";
import StatsPanel from "./StatsPanel";
import FilterBar from "./FilterBar";
import ActionButtons from "./ActionButtons";
import RoutineModal from "./RoutineModal";
import MonthlyRoutines from "./MonthlyRoutines";
import RoutineLists from "./RoutineLists";
import RoutineHeader from "./RoutineHeader";
import DeleteNonRepeatDialog from "./DeleteNonRepeatDialog";
import DeleteRepeatingDialog from "./DeleteRepeatingDialog";
import DeleteFilteredDialog from "./DeleteFilteredDialog";
import { db } from "../auth/firebaseConfig";
import { showToast } from "../../utils/weather-theme-notify/NotificationManager";
import { initialRoutines } from "../../utils/constant/ConstantData";

const categoryColors = {
  Work: "#00FFFF", // Neon Cyan
  Personal: "#FF00FF", // Neon Magenta
  Exercise: "#39FF14", // Neon Green
  Study: "#FFFF33", // Neon Yellow
  Other: "#FF5F1F", // Neon Orange
  Travel: "#BF00FF", // Neon Purple
  Shopping: "#FF1493", // Neon Pink
  Entertainment: "#FF073A", // Neon Red
  Food: "#FFD700", // Neon Gold
  Health: "#00E5EE", // Neon Turquoise
  Finance: "#CCFF00", // Neon Lime
  Default: "#FF5F1F", // Varsayılan olarak 'Other' ile aynı neon orange tonu
};

const getTurkeyLocalDateString = (date = new Date()) =>
  new Date(
    date.toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
  ).toLocaleDateString("en-CA");

const getTurkeyDate = (dateStr) => {
  const [year, month, day] = dateStr.split("-");
  return new Date(Date.UTC(year, month - 1, day, 3, 0, 0));
};

const parseLocalDate = (dateStr) => getTurkeyDate(dateStr);

const routineOccursOn = (routine, filterDateStr) => {
  const routineDate = parseLocalDate(routine.date);
  const filterDate = parseLocalDate(filterDateStr);
  return routineDate.getTime() === filterDate.getTime();
};

const DailyRoutine = ({ user }) => {
  const [routines, setRoutines] = useState([]);
  const [weeklyStats, setWeeklyStats] = useState({ added: 0, completed: 0 });
  const [monthlyStats, setMonthlyStats] = useState({ added: 0, completed: 0 });
  const [resetData, setResetData] = useState({
    daily: "",
    weekly: "",
    monthly: "",
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notificationsEnabled, setNotificationsEnabled] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState(null);
  const [openDeleteNonRepeatDialog, setOpenDeleteNonRepeatDialog] =
    useState(false);
  const [openDeleteRepeatingDialog, setOpenDeleteRepeatingDialog] =
    useState(false);
  const [openDeleteFilteredDialog, setOpenDeleteFilteredDialog] =
    useState(false);
  const [routineToDelete, setRoutineToDelete] = useState(null);
  const [filterCategory, setFilterCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState("Today");
  const [newRoutineDate, setNewRoutineDate] = useState("");
  const isInitialLoad = useRef(true);

  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const notifs = {};
    routines.forEach((r) => {
      notifs[r.id] = r.notificationEnabled;
    });
    setNotificationsEnabled(notifs);
  }, [routines]);

  useEffect(() => {
    const getTurkeyTime = (date = new Date()) =>
      new Date(date.toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
    const getWeekNumber = (date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + 4 - (d.getDay() || 7));
      const yearStart = new Date(d.getFullYear(), 0, 1);
      return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    };
    const nowTurkey = getTurkeyTime();
    const todayStr = nowTurkey.toISOString().split("T")[0];
    const currentWeek = getWeekNumber(nowTurkey);
    const currentMonthStr = `${nowTurkey.getFullYear()}-${nowTurkey.getMonth()}`;
    if (!resetData.daily || !resetData.weekly || !resetData.monthly) return;
    let updateRequired = false;
    const newReset = { ...resetData };
    if (resetData.daily !== todayStr) {
      setRoutines((prev) =>
        prev.map((r) => (r.repeat === "none" ? { ...r, completed: false } : r))
      );
      newReset.daily = todayStr;
      updateRequired = true;
    }
    if (resetData.weekly !== String(currentWeek)) {
      setWeeklyStats({ added: 0, completed: 0 });
      setRoutines((prev) =>
        prev.map((r) =>
          r.repeat === "weekly" ? { ...r, completed: false } : r
        )
      );
      newReset.weekly = String(currentWeek);
      updateRequired = true;
    }
    if (resetData.monthly !== currentMonthStr) {
      setMonthlyStats({ added: 0, completed: 0 });
      setRoutines((prev) =>
        prev.map((r) =>
          r.repeat === "monthly" ? { ...r, completed: false } : r
        )
      );
      newReset.monthly = currentMonthStr;
      updateRequired = true;
    }
    if (updateRequired && user) {
      const updateResetData = async () => {
        try {
          const userRef = doc(db, "users", user.uid);
          await updateDoc(userRef, {
            lastResetDaily: newReset.daily,
            lastResetWeekly: newReset.weekly,
            lastResetMonthly: newReset.monthly,
          });
          setResetData(newReset);
          setCurrentTime(new Date());
        } catch (error) {
          console.error("Reset update error:", error);
        }
      };
      updateResetData();
    }
  }, [resetData, user]);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          let data = docSnap.data();
          setRoutines(data.routines || initialRoutines);
          setWeeklyStats(data.weeklyStats || { added: 0, completed: 0 });
          setMonthlyStats(data.monthlyStats || { added: 0, completed: 0 });
        } else {
          const initialData = {
            routines: initialRoutines,
            weeklyStats: { added: 0, completed: 0 },
            monthlyStats: { added: 0, completed: 0 },
          };
          await setDoc(userRef, initialData);
          setRoutines(initialRoutines);
          setWeeklyStats({ added: 0, completed: 0 });
          setMonthlyStats({ added: 0, completed: 0 });
        }
        isInitialLoad.current = false;
      } catch (error) {
        console.error("Data load error:", error);
      }
    };
    loadData();
  }, [user]);

  useEffect(() => {
    if (!user || isInitialLoad.current) return;
    const saveData = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, { routines, weeklyStats, monthlyStats });
      } catch (error) {
        console.error("Data save error:", error);
      }
    };
    saveData();
  }, [routines, weeklyStats, monthlyStats, user]);

  const filteredRoutines = routines.filter((r) => {
    const categoryMatch =
      filterCategory === "All" || r.category === filterCategory;
    const searchMatch = r.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    let timeMatch = true;
    if (r.date) {
      const nowTurkey = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
      );
      if (
        timeFilter === "Today" ||
        timeFilter === "Yesterday" ||
        timeFilter === "Tomorrow"
      ) {
        const filterDate = new Date(nowTurkey);
        if (timeFilter === "Yesterday")
          filterDate.setDate(filterDate.getDate() - 1);
        if (timeFilter === "Tomorrow")
          filterDate.setDate(filterDate.getDate() + 1);
        const filterDateStr = getTurkeyLocalDateString(filterDate);
        timeMatch = r.date === filterDateStr;
      } else if (timeFilter === "Monthly") {
        const currentYear = nowTurkey.getFullYear();
        const currentMonth = nowTurkey.getMonth();
        const routineDate = new Date(r.date);
        timeMatch =
          routineDate.getFullYear() === currentYear &&
          routineDate.getMonth() === currentMonth;
      }
    }
    return categoryMatch && searchMatch && timeMatch;
  });

  const activeRoutinesForList = filteredRoutines.filter((r) => !r.completed);
  const completedRoutinesForList = filteredRoutines.filter((r) => r.completed);

  const goToPreviousMonth = () => {
    const newDate = new Date(currentYear, currentMonth - 1, 1);
    setCurrentMonth(newDate.getMonth());
    setCurrentYear(newDate.getFullYear());
  };
  const goToNextMonth = () => {
    const newDate = new Date(currentYear, currentMonth + 1, 1);
    setCurrentMonth(newDate.getMonth());
    setCurrentYear(newDate.getFullYear());
  };
  const goToCurrentMonth = () => {
    const today = new Date();
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
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
      createdAt: editingRoutine
        ? editingRoutine.createdAt || new Date().toISOString()
        : new Date().toISOString(),
      repeat: routineData.repeat,
      repeatCount: routineData.repeatCount,
    };
    if (editingRoutine) {
      if (routineData.repeat && routineData.repeat !== "none") {
        const groupId = editingRoutine.groupId || uuidv4();
        const count = Number(routineData.repeatCount) || 1;
        const startDate = new Date(routineData.date);
        let updatedRoutines = routines.filter((r) => r.groupId !== groupId);
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
        const finalRoutines = [...updatedRoutines, ...newGroupRoutines].sort(
          (a, b) => a.time.localeCompare(b.time)
        );
        setRoutines(finalRoutines);
      } else {
        const finalRoutines = routines.map((r) => {
          if (r.id === editingRoutine.id) {
            return {
              ...r,
              ...baseRoutine,
              date: getTurkeyLocalDateString(new Date(routineData.date)),
            };
          }
          return r;
        });
        setRoutines(finalRoutines);
      }
      setEditingRoutine(null);
    } else {
      let newRoutines = [];
      if (routineData.repeat && routineData.repeat !== "none") {
        const groupId = uuidv4();
        const count = Number(routineData.repeatCount) || 1;
        const startDate = new Date(routineData.date);
        for (let i = 0; i < count; i++) {
          let occurrenceDate = new Date(startDate);
          if (routineData.repeat === "daily") {
            occurrenceDate.setDate(startDate.getDate() + i);
          } else if (routineData.repeat === "weekly") {
            occurrenceDate.setDate(startDate.getDate() + i * 7);
          } else if (routineData.repeat === "monthly") {
            occurrenceDate.setMonth(startDate.getMonth() + i);
          }
          newRoutines.push({
            ...baseRoutine,
            id: uuidv4(),
            date: getTurkeyLocalDateString(occurrenceDate),
            groupId,
          });
        }
      } else {
        newRoutines.push({
          ...baseRoutine,
          id: uuidv4(),
          date: getTurkeyLocalDateString(new Date(routineData.date)),
        });
      }
      const updatedRoutines = [...routines, ...newRoutines].sort((a, b) =>
        a.time.localeCompare(b.time)
      );
      setRoutines(updatedRoutines);
      setWeeklyStats((prev) => ({
        ...prev,
        added: prev.added + newRoutines.length,
      }));
      setMonthlyStats((prev) => ({
        ...prev,
        added: prev.added + newRoutines.length,
      }));
    }
  };

  const handleRequestDelete = (routine) => {
    setRoutineToDelete(routine);
    if (routine.repeat && routine.repeat !== "none") {
      setOpenDeleteRepeatingDialog(true);
    } else {
      setOpenDeleteNonRepeatDialog(true);
    }
  };

  const handleConfirmDelete = () => {
    if (routineToDelete) {
      setRoutines((prev) => prev.filter((r) => r.id !== routineToDelete.id));
      setRoutineToDelete(null);
      setOpenDeleteNonRepeatDialog(false);
    }
  };

  const handleConfirmDeleteRepeating = (deleteAll) => {
    if (routineToDelete) {
      if (deleteAll && routineToDelete.groupId) {
        setRoutines((prev) =>
          prev.filter((r) => r.groupId !== routineToDelete.groupId)
        );
      } else {
        setRoutines((prev) => prev.filter((r) => r.id !== routineToDelete.id));
      }
      setRoutineToDelete(null);
      setOpenDeleteRepeatingDialog(false);
    }
  };

  const handleConfirmDeleteAll = () => {
    setRoutines((prev) => prev.filter((r) => !filteredRoutines.includes(r)));
    setOpenDeleteFilteredDialog(false);
  };

  const handleCheckboxChange = (id) => {
    setRoutines((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const updatedCompleted = !r.completed;
          if (updatedCompleted) {
            setWeeklyStats((prev) => ({
              ...prev,
              completed: prev.completed + 1,
            }));
            setMonthlyStats((prev) => ({
              ...prev,
              completed: prev.completed + 1,
            }));
          } else {
            setWeeklyStats((prev) => ({
              ...prev,
              completed: Math.max(prev.completed - 1, 0),
            }));
            setMonthlyStats((prev) => ({
              ...prev,
              completed: Math.max(prev.completed - 1, 0),
            }));
          }
          return { ...r, completed: updatedCompleted };
        }
        return r;
      })
    );
  };

  const handleToggleNotification = (id) => {
    const routine = routines.find((r) => r.id === id);
    if (!routine) return;
    const isEnabled = !routine.notificationEnabled;
    showToast(
      isEnabled ? "Bildirimler açıldı 🔔" : "Bildirimler kapatıldı 🔕",
      isEnabled ? "success" : "error"
    );
    setRoutines(
      routines.map((r) =>
        r.id === id ? { ...r, notificationEnabled: isEnabled } : r
      )
    );
  };

  const handleSelectAll = () => {
    const todayStr = getTurkeyLocalDateString(new Date());
    const count = routines.filter(
      (r) => r.date === todayStr && !r.completed
    ).length;
    if (count > 0) {
      setWeeklyStats((prev) => ({
        ...prev,
        completed: prev.completed + count,
      }));
      setMonthlyStats((prev) => ({
        ...prev,
        completed: prev.completed + count,
      }));
    }
    setRoutines((prev) =>
      prev.map((r) => (r.date === todayStr ? { ...r, completed: true } : r))
    );
  };

  const handleUnselectAll = () => {
    const todayStr = getTurkeyLocalDateString(new Date());
    const count = routines.filter(
      (r) => r.date === todayStr && r.completed
    ).length;
    if (count > 0) {
      setWeeklyStats((prev) => ({
        ...prev,
        completed: Math.max(prev.completed - count, 0),
      }));
      setMonthlyStats((prev) => ({
        ...prev,
        completed: Math.max(prev.completed - count, 0),
      }));
    }
    setRoutines((prev) =>
      prev.map((r) => (r.date === todayStr ? { ...r, completed: false } : r))
    );
  };

  const handleDeleteAll = () => {
    setOpenDeleteFilteredDialog(true);
  };

  const toggleAllNotifications = () => {
    const newState = !notificationsEnabled.all;
    showToast(
      newState ? "Tüm bildirimler açıldı 🔔" : "Tüm bildirimler kapatıldı 🔕",
      newState ? "success" : "error"
    );
    setRoutines(routines.map((r) => ({ ...r, notificationEnabled: newState })));
  };

  const handleEditRoutine = (routine) => {
    setEditingRoutine(routine);
    setModalOpen(true);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #1a2a6c 0%, #2196F3 50%, #3F51B5 100%)",
        p: { xs: 2, md: 4 },
      }}
    >
      <Container maxWidth="lg">
        <RoutineHeader
          onNewRoutine={() => {
            setNewRoutineDate("");
            setEditingRoutine(null);
            setModalOpen(true);
          }}
        />
        <StatsPanel
          routines={routines}
          weeklyStats={weeklyStats}
          monthlyStats={monthlyStats}
        />
        <FilterBar
          filterCategory={filterCategory}
          setFilterCategory={setFilterCategory}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          timeFilter={timeFilter}
          setTimeFilter={setTimeFilter}
        />
        {timeFilter === "Monthly" ? (
          <MonthlyRoutines
            routines={routines}
            currentTime={currentTime}
            onCheck={handleCheckboxChange}
            onEdit={handleEditRoutine}
            onDelete={handleRequestDelete}
            onToggleNotification={handleToggleNotification}
            notificationsEnabled={notificationsEnabled}
            categoryColors={categoryColors}
            timeFilter={timeFilter}
            onDayClick={(date) => {
              setNewRoutineDate(getTurkeyLocalDateString(date));
              setModalOpen(true);
            }}
          />
        ) : (
          <RoutineLists
            activeRoutines={activeRoutinesForList}
            completedRoutines={completedRoutinesForList}
            currentTime={currentTime}
            onCheck={handleCheckboxChange}
            onEdit={handleEditRoutine}
            onDelete={handleRequestDelete}
            onToggleNotification={handleToggleNotification}
            notificationsEnabled={notificationsEnabled}
            categoryColors={categoryColors}
          />
        )}
        <ActionButtons
          onSelectAll={handleSelectAll}
          onUnselectAll={handleUnselectAll}
          onDeleteAll={handleDeleteAll}
        />
      </Container>
      <RoutineModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        routine={editingRoutine}
        initialDate={newRoutineDate}
        onSave={handleSaveRoutine}
      />
      <DeleteNonRepeatDialog
        open={openDeleteNonRepeatDialog}
        onClose={() => setOpenDeleteNonRepeatDialog(false)}
        onDelete={handleConfirmDelete}
      />
      <DeleteRepeatingDialog
        open={openDeleteRepeatingDialog}
        onClose={() => setOpenDeleteRepeatingDialog(false)}
        onDeleteChoice={handleConfirmDeleteRepeating}
      />
      <DeleteFilteredDialog
        open={openDeleteFilteredDialog}
        onClose={() => setOpenDeleteFilteredDialog(false)}
        onDeleteFiltered={handleConfirmDeleteAll}
      />
    </Box>
  );
};

export default DailyRoutine;
