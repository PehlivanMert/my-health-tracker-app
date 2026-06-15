import { useState, useEffect, useRef } from "react";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../components/auth/firebaseConfig";
import { showToast } from "../utils/weather-theme-notify/NotificationManager";

const getTurkeyLocalDateString = (date = new Date()) =>
  new Date(date.toLocaleString("en-US", { timeZone: "Europe/Istanbul" })).toLocaleDateString("en-CA");

export const useDailyRoutineData = (user) => {
  const [routines, setRoutines] = useState([]);
  const [weeklyStats, setWeeklyStats] = useState({ added: 0, completed: 0 });
  const [monthlyStats, setMonthlyStats] = useState({ added: 0, completed: 0 });
  const [resetData, setResetData] = useState({ daily: "", weekly: "", monthly: "" });
  const [loading, setLoading] = useState(true);

  const isInitialLoad = useRef(true);
  const lastRoutinesState = useRef([]);
  const lastWeeklyStatsState = useRef({ added: 0, completed: 0 });
  const lastMonthlyStatsState = useRef({ added: 0, completed: 0 });

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
    
    const isFirstDayOfWeek = (date) => date.getDay() === 1;
    const isFirstDayOfMonth = (date) => date.getDate() === 1;
    
    const nowTurkey = getTurkeyTime();
    const todayStr = getTurkeyLocalDateString(new Date());
    const currentWeek = getWeekNumber(nowTurkey);
    const currentMonthStr = `${nowTurkey.getFullYear()}-${nowTurkey.getMonth()}`;
    
    if (!resetData.daily || !resetData.weekly || !resetData.monthly) return;
    
    let updateRequired = false;
    const newReset = { ...resetData };
    
    if (resetData.daily !== todayStr) {
      setRoutines((prev) =>
        prev.map((r) => {
          if (r.repeat === "daily") {
            const completedDates = r.completedDates || [];
            const index = completedDates.indexOf(todayStr);
            if (index > -1) completedDates.splice(index, 1);
            return { ...r, completedDates };
          }
          return r;
        })
      );
      newReset.daily = todayStr;
      updateRequired = true;
    }
    
    if (isFirstDayOfWeek(nowTurkey) && resetData.weekly !== String(currentWeek)) {
      setWeeklyStats({ added: 0, completed: 0 });
      setRoutines((prev) =>
        prev.map((r) => r.repeat === "weekly" ? { ...r, completedDates: [] } : r)
      );
      newReset.weekly = String(currentWeek);
      updateRequired = true;
    }
    
    if (isFirstDayOfMonth(nowTurkey) && resetData.monthly !== currentMonthStr) {
      setMonthlyStats({ added: 0, completed: 0 });
      setRoutines((prev) =>
        prev.map((r) => r.repeat === "monthly" ? { ...r, completedDates: [] } : r)
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
        setLoading(true);
        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);
        const todayStr = getTurkeyLocalDateString(new Date());
        
        const getTurkeyTime = (date = new Date()) => new Date(date.toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
        const getWeekNumber = (date) => {
          const d = new Date(date);
          d.setHours(0, 0, 0, 0);
          d.setDate(d.getDate() + 4 - (d.getDay() || 7));
          const yearStart = new Date(d.getFullYear(), 0, 1);
          return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
        };
        const nowTurkey = getTurkeyTime();
        const currentWeek = getWeekNumber(nowTurkey);
        const currentMonthStr = `${nowTurkey.getFullYear()}-${nowTurkey.getMonth()}`;

        if (docSnap.exists()) {
          let data = docSnap.data();
          let routinesData = data.routines || [];
          routinesData = routinesData.map(routine => {
            if (routine.repeat && routine.repeat !== "none" && !routine.completedDates) {
              return { ...routine, completedDates: [] };
            }
            return routine;
          });
          
          setRoutines(routinesData);
          setWeeklyStats(data.weeklyStats || { added: 0, completed: 0 });
          setMonthlyStats(data.monthlyStats || { added: 0, completed: 0 });
          
          lastRoutinesState.current = [...routinesData];
          lastWeeklyStatsState.current = { ...(data.weeklyStats || { added: 0, completed: 0 }) };
          lastMonthlyStatsState.current = { ...(data.monthlyStats || { added: 0, completed: 0 }) };
          
          setResetData({
            daily: data.lastResetDaily || todayStr,
            weekly: data.lastResetWeekly || String(currentWeek),
            monthly: data.lastResetMonthly || currentMonthStr,
          });
        } else {
          const initialData = {
            routines: [],
            weeklyStats: { added: 0, completed: 0 },
            monthlyStats: { added: 0, completed: 0 },
            lastResetDaily: todayStr,
            lastResetWeekly: String(currentWeek),
            lastResetMonthly: currentMonthStr,
          };
          await setDoc(userRef, initialData);
          setRoutines([]);
          setWeeklyStats({ added: 0, completed: 0 });
          setMonthlyStats({ added: 0, completed: 0 });
          setResetData({ daily: todayStr, weekly: String(currentWeek), monthly: currentMonthStr });
        }
      } catch (error) {
        console.error("Data load error:", error);
        showToast("Veriler yüklenirken bir hata oluştu.", "error");
      } finally {
        setLoading(false);
        isInitialLoad.current = false;
      }
    };
    loadData();
  }, [user]);

  // Sync back to Firebase on changes
  useEffect(() => {
    if (!user || isInitialLoad.current || loading) return;
    
    const routinesChanged = JSON.stringify(routines) !== JSON.stringify(lastRoutinesState.current);
    const weeklyStatsChanged = JSON.stringify(weeklyStats) !== JSON.stringify(lastWeeklyStatsState.current);
    const monthlyStatsChanged = JSON.stringify(monthlyStats) !== JSON.stringify(lastMonthlyStatsState.current);
    
    if (routinesChanged || weeklyStatsChanged || monthlyStatsChanged) {
      const saveData = async () => {
        try {
          const userRef = doc(db, "users", user.uid);
          await updateDoc(userRef, {
            routines: routines,
            weeklyStats: weeklyStats,
            monthlyStats: monthlyStats,
          });
          lastRoutinesState.current = [...routines];
          lastWeeklyStatsState.current = { ...weeklyStats };
          lastMonthlyStatsState.current = { ...monthlyStats };
        } catch (error) {
          console.error("Data save error:", error);
        }
      };
      
      const debounceTimer = setTimeout(saveData, 1000);
      return () => clearTimeout(debounceTimer);
    }
  }, [routines, weeklyStats, monthlyStats, user, loading]);

  const addRoutine = (newRoutine) => {
    setRoutines([...routines, newRoutine]);
    setWeeklyStats(prev => ({ ...prev, added: prev.added + 1 }));
    setMonthlyStats(prev => ({ ...prev, added: prev.added + 1 }));
  };

  const updateRoutine = (id, updatedFields) => {
    setRoutines(prev => prev.map(r => r.id === id ? { ...r, ...updatedFields } : r));
  };

  const deleteRoutine = (id) => {
    setRoutines(prev => prev.filter(r => r.id !== id));
  };

  const toggleRoutineCompletion = (id) => {
    setRoutines((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const todayStr = getTurkeyLocalDateString(new Date());

          if (r.repeat && r.repeat !== "none") {
            const completedDates = r.completedDates || [];
            const isCompletedToday = completedDates.includes(todayStr);
            const updatedCompleted = !isCompletedToday;

            if (updatedCompleted) {
              if (!completedDates.includes(todayStr)) completedDates.push(todayStr);
            } else {
              const index = completedDates.indexOf(todayStr);
              if (index > -1) completedDates.splice(index, 1);
            }

            if (updatedCompleted) {
              setWeeklyStats((prev) => ({ ...prev, completed: prev.completed + 1 }));
              setMonthlyStats((prev) => ({ ...prev, completed: prev.completed + 1 }));
            } else {
              setWeeklyStats((prev) => ({ ...prev, completed: Math.max(prev.completed - 1, 0) }));
              setMonthlyStats((prev) => ({ ...prev, completed: Math.max(prev.completed - 1, 0) }));
            }
            return { ...r, completedDates };
          } else {
            const updatedCompleted = !r.completed;
            if (updatedCompleted) {
              setWeeklyStats((prev) => ({ ...prev, completed: prev.completed + 1 }));
              setMonthlyStats((prev) => ({ ...prev, completed: prev.completed + 1 }));
            } else {
              setWeeklyStats((prev) => ({ ...prev, completed: Math.max(prev.completed - 1, 0) }));
              setMonthlyStats((prev) => ({ ...prev, completed: Math.max(prev.completed - 1, 0) }));
            }
            return { ...r, completed: updatedCompleted };
          }
        }
        return r;
      })
    );
  };

  const deleteRoutineGroup = (groupId) => {
    const routinesToDelete = routines.filter((r) => r.groupId === groupId);
    let completedCount = 0;
    routinesToDelete.forEach((r) => {
      if (r.repeat && r.repeat !== "none") {
        if (r.completedDates && r.completedDates.length > 0) completedCount += r.completedDates.length;
      } else {
        if (r.completed) completedCount += 1;
      }
    });

    if (completedCount > 0) {
      setWeeklyStats((prev) => ({ ...prev, completed: Math.max(prev.completed - completedCount, 0) }));
      setMonthlyStats((prev) => ({ ...prev, completed: Math.max(prev.completed - completedCount, 0) }));
    }
    setRoutines((prev) => prev.filter((r) => r.groupId !== groupId));
  };

  const deleteAllFiltered = (filteredRoutines) => {
    if (filteredRoutines.length === 0) return;
    let completedCount = 0;
    filteredRoutines.forEach((r) => {
      if (r.repeat && r.repeat !== "none") {
        if (r.completedDates && r.completedDates.length > 0) completedCount += r.completedDates.length;
      } else {
        if (r.completed) completedCount += 1;
      }
    });

    if (completedCount > 0) {
      setWeeklyStats((prev) => ({ ...prev, completed: Math.max(prev.completed - completedCount, 0) }));
      setMonthlyStats((prev) => ({ ...prev, completed: Math.max(prev.completed - completedCount, 0) }));
    }

    setRoutines((prev) => prev.filter((r) => !filteredRoutines.includes(r)));
  };

  return {
    routines, setRoutines,
    weeklyStats, setWeeklyStats,
    monthlyStats, setMonthlyStats,
    loading,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    deleteRoutineGroup,
    deleteAllFiltered,
    toggleRoutineCompletion
  };
};
