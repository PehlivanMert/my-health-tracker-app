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
  Work: "#4A90E2", // Modern Mavi
  Personal: "#50E3C2", // Turkuaz
  Exercise: "#5CB85C", // Yeşil
  Study: "#F5A623", // Turuncu
  Health: "#D0021B", // Kırmızı
  Finance: "#9013FE", // Mor
  Social: "#F8E71C", // Sarı
  Hobby: "#7ED321", // Açık Yeşil
  Travel: "#4A90E2", // Mavi
  Shopping: "#BD10E0", // Pembe
  Food: "#F5A623", // Turuncu
  Entertainment: "#50E3C2", // Turkuaz
  Other: "#9B9B9B", // Gri
  Default: "#9B9B9B", // Varsayılan Gri
};

const categoryIcons = {
  Work: "💼",
  Personal: "👤",
  Exercise: "💪",
  Study: "📚",
  Health: "❤️",
  Finance: "💰",
  Social: "👥",
  Hobby: "🎨",
  Travel: "✈️",
  Shopping: "🛍️",
  Food: "🍽️",
  Entertainment: "🎬",
  Other: "📌",
  Default: "📌",
};

const categoryNames = {
  Work: "İş",
  Personal: "Kişisel",
  Exercise: "Egzersiz",
  Study: "Çalışma",
  Health: "Sağlık",
  Finance: "Finans",
  Social: "Sosyal",
  Hobby: "Hobi",
  Travel: "Seyahat",
  Shopping: "Alışveriş",
  Food: "Yemek",
  Entertainment: "Eğlence",
  Other: "Diğer",
  Default: "Diğer",
};

const categoryDescriptions = {
  Work: "İş ve kariyer ile ilgili rutinler",
  Personal: "Kişisel gelişim ve bakım rutinleri",
  Exercise: "Spor ve fitness aktiviteleri",
  Study: "Eğitim ve öğrenme rutinleri",
  Health: "Sağlık ve wellness rutinleri",
  Finance: "Finansal planlama ve yönetim",
  Social: "Sosyal aktiviteler ve ilişkiler",
  Hobby: "Hobiler ve ilgi alanları",
  Travel: "Seyahat ve gezi planları",
  Shopping: "Alışveriş ve market rutinleri",
  Food: "Yemek ve beslenme rutinleri",
  Entertainment: "Eğlence ve boş zaman aktiviteleri",
  Other: "Diğer rutinler",
  Default: "Diğer rutinler",
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

const getFilterDate = (timeFilter) => {
  const nowTurkey = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
  );
  const filterDate = new Date(nowTurkey);

  switch (timeFilter) {
    case "Yesterday":
      filterDate.setDate(filterDate.getDate() - 1);
      break;
    case "Tomorrow":
      filterDate.setDate(filterDate.getDate() + 1);
      break;
    default:
      break;
  }

  return filterDate;
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

  const newRoutineButtonRef = useRef();
  const lastRoutinesState = useRef([]);
  const lastWeeklyStatsState = useRef({ added: 0, completed: 0 });
  const lastMonthlyStatsState = useRef({ added: 0, completed: 0 });
  const isDataLoading = useRef(true);

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
    
    const isFirstDayOfWeek = (date) => {
      // Pazartesi = 1, Pazar = 0
      return date.getDay() === 1;
    };
    
    const isFirstDayOfMonth = (date) => {
      return date.getDate() === 1;
    };
    
    const nowTurkey = getTurkeyTime();
    const todayStr = getTurkeyLocalDateString(new Date());
    if (process.env.NODE_ENV === 'development') {
    console.log("todayStr", todayStr);
    }
                                                                                                                                                                                                                                  
    const currentWeek = getWeekNumber(nowTurkey);
    const currentMonthStr = `${nowTurkey.getFullYear()}-${nowTurkey.getMonth()}`;
    
    if (!resetData.daily || !resetData.weekly || !resetData.monthly) return;
    
    let updateRequired = false;
    const newReset = { ...resetData };
    
    // Günlük sıfırlama - her gün
    if (resetData.daily !== todayStr) {
      console.log("Günlük sıfırlama yapılıyor");
      setRoutines((prev) =>
        prev.map((r) => (r.repeat === "none" ? { ...r, completed: false } : r))
      );
      newReset.daily = todayStr;
      updateRequired = true;
    }
    
    // Haftalık sıfırlama - haftanın ilk günü (Pazartesi)
    if (isFirstDayOfWeek(nowTurkey) && resetData.weekly !== String(currentWeek)) {
      console.log("Haftalık sıfırlama yapılıyor");
      setWeeklyStats({ added: 0, completed: 0 });
      setRoutines((prev) =>
        prev.map((r) =>
          r.repeat === "weekly" ? { ...r, completed: false } : r
        )
      );
      newReset.weekly = String(currentWeek);
      updateRequired = true;
    }
    
    // Aylık sıfırlama - ayın ilk günü
    if (isFirstDayOfMonth(nowTurkey) && resetData.monthly !== currentMonthStr) {
      console.log("Aylık sıfırlama yapılıyor");
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
          // Kullanıcının mevcut rutinleri varsa onları kullan, yoksa boş dizi
          const routinesData = data.routines || [];
          const weeklyStatsData = data.weeklyStats || { added: 0, completed: 0 };
          const monthlyStatsData = data.monthlyStats || { added: 0, completed: 0 };
          
          setRoutines(routinesData);
          setWeeklyStats(weeklyStatsData);
          setMonthlyStats(monthlyStatsData);
          
          // State'leri kaydet
          lastRoutinesState.current = [...routinesData];
          lastWeeklyStatsState.current = { ...weeklyStatsData };
          lastMonthlyStatsState.current = { ...monthlyStatsData };
          
          // Reset data'yı yükle
          const todayStr = getTurkeyLocalDateString(new Date());
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
          const currentWeek = getWeekNumber(nowTurkey);
          const currentMonthStr = `${nowTurkey.getFullYear()}-${nowTurkey.getMonth()}`;
          
          setResetData({
            daily: data.lastResetDaily || todayStr,
            weekly: data.lastResetWeekly || String(currentWeek),
            monthly: data.lastResetMonthly || currentMonthStr,
          });
        } else {
          // Yeni kullanıcı için boş rutin listesi ile başla
          const initialData = {
            routines: [],
            weeklyStats: { added: 0, completed: 0 },
            monthlyStats: { added: 0, completed: 0 },
          };
          await setDoc(userRef, initialData);
          setRoutines([]);
          setWeeklyStats({ added: 0, completed: 0 });
          setMonthlyStats({ added: 0, completed: 0 });
          
          // State'leri kaydet
          lastRoutinesState.current = [];
          lastWeeklyStatsState.current = { added: 0, completed: 0 };
          lastMonthlyStatsState.current = { added: 0, completed: 0 };
          
          // İlk yükleme için reset data'yı ayarla
          const todayStr = getTurkeyLocalDateString(new Date());
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
          const currentWeek = getWeekNumber(nowTurkey);
          const currentMonthStr = `${nowTurkey.getFullYear()}-${nowTurkey.getMonth()}`;
          
          setResetData({
            daily: todayStr,
            weekly: String(currentWeek),
            monthly: currentMonthStr,
          });
        }
        isInitialLoad.current = false;
        isDataLoading.current = false;
      } catch (error) {
        console.error("Data load error:", error);
        showToast("Veriler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.", "error");
        isDataLoading.current = false;
      }
    };
    loadData();
  }, [user]);

  useEffect(() => {
    if (!user || isInitialLoad.current || isDataLoading.current) return;
    
    // Sadece gerçek değişiklik varsa güncelle
    const routinesChanged = JSON.stringify(routines) !== JSON.stringify(lastRoutinesState.current);
    const weeklyStatsChanged = JSON.stringify(weeklyStats) !== JSON.stringify(lastWeeklyStatsState.current);
    const monthlyStatsChanged = JSON.stringify(monthlyStats) !== JSON.stringify(lastMonthlyStatsState.current);
    
    // Boş diziye geçiş kontrolü
    const routinesEmpty = Array.isArray(routines) && routines.length === 0;
    const wasRoutinesEmpty = Array.isArray(lastRoutinesState.current) && lastRoutinesState.current.length === 0;
    
    if ((routinesChanged || weeklyStatsChanged || monthlyStatsChanged) && !(routinesEmpty && !wasRoutinesEmpty)) {
      const saveData = async () => {
        try {
          const userRef = doc(db, "users", user.uid);
          await updateDoc(userRef, { routines, weeklyStats, monthlyStats });
          
          // State'leri güncelle
          lastRoutinesState.current = [...routines];
          lastWeeklyStatsState.current = { ...weeklyStats };
          lastMonthlyStatsState.current = { ...monthlyStats };
        } catch (error) {
          console.error("Data save error:", error);
          showToast("Veriler kaydedilirken bir hata oluştu. Değişiklikleriniz kaydedilemedi.", "error");
        }
      };
      saveData();
    }
  }, [routines, weeklyStats, monthlyStats, user]);

  const filteredRoutines = routines.filter((r) => {
    const categoryMatch =
      filterCategory === "All" || r.category === filterCategory;
    const searchMatch = r.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    let timeMatch = true;
    if (r.date) {
      if (timeFilter === "Today" || timeFilter === "Yesterday" || timeFilter === "Tomorrow") {
        const filterDate = getFilterDate(timeFilter);
        const filterDateStr = getTurkeyLocalDateString(filterDate);
        timeMatch = r.date === filterDateStr;
      } else if (timeFilter === "Monthly") {
        const nowTurkey = new Date(
          new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
        );
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

  // Tamamlanma durumunu doğru hesaplayan yardımcı fonksiyon
  const getRoutineCompletedStatus = (routine) => {
    if (routine.repeat && routine.repeat !== "none") {
      // Tekrarlanan rutinler için bugünün tarihini completedDates'te kontrol et
      const todayStr = getTurkeyLocalDateString(new Date());
      return routine.completedDates && routine.completedDates.includes(todayStr);
    } else {
      // Tekrarlanmayan rutinler için normal completed alanını kullan
      return routine.completed;
    }
  };

  const activeRoutinesForList = filteredRoutines.filter((r) => !getRoutineCompletedStatus(r));
  const completedRoutinesForList = filteredRoutines.filter((r) => getRoutineCompletedStatus(r));

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
    console.log("handleSaveRoutine çağrıldı:", {
      editingRoutine: editingRoutine ? editingRoutine.id : null,
      repeat: routineData.repeat,
      repeatCount: routineData.repeatCount,
      title: routineData.title
    });
    
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
      return; // Editing işlemi tamamlandığında fonksiyondan çık
    }
    
    // Yeni rutin ekleme kısmı (sadece editing değilse çalışır)
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
      if (routineToDelete.completed) {
        setWeeklyStats((prev) => ({
          ...prev,
          completed: Math.max(prev.completed - 1, 0),
        }));
        setMonthlyStats((prev) => ({
          ...prev,
          completed: Math.max(prev.completed - 1, 0),
        }));
      }
      setRoutines((prev) => prev.filter((r) => r.id !== routineToDelete.id));
      setRoutineToDelete(null);
      setOpenDeleteNonRepeatDialog(false);
    }
  };

  const handleConfirmDeleteRepeating = (deleteAll) => {
    if (routineToDelete) {
      if (deleteAll && routineToDelete.groupId) {
        const routinesToDelete = routines.filter(
          (r) => r.groupId === routineToDelete.groupId
        );
        const completedCount = routinesToDelete.filter((r) => r.completed).length;

        if (completedCount > 0) {
          setWeeklyStats((prev) => ({
            ...prev,
            completed: Math.max(prev.completed - completedCount, 0),
          }));
          setMonthlyStats((prev) => ({
            ...prev,
            completed: Math.max(prev.completed - completedCount, 0),
          }));
        }

        setRoutines((prev) =>
          prev.filter((r) => r.groupId !== routineToDelete.groupId)
        );
      } else {
        if (routineToDelete.completed) {
          setWeeklyStats((prev) => ({
            ...prev,
            completed: Math.max(prev.completed - 1, 0),
          }));
          setMonthlyStats((prev) => ({
            ...prev,
            completed: Math.max(prev.completed - 1, 0),
          }));
        }
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
          const todayStr = getTurkeyLocalDateString(new Date());

          // Tekrarlanan rutinler için sadece completedDates array'ini kullan
          if (r.repeat && r.repeat !== "none") {
            const completedDates = r.completedDates || [];
            const isCompletedToday = completedDates.includes(todayStr);
            const updatedCompleted = !isCompletedToday;

            if (updatedCompleted) {
              if (!completedDates.includes(todayStr)) {
                completedDates.push(todayStr);
              }
            } else {
              const index = completedDates.indexOf(todayStr);
              if (index > -1) {
                completedDates.splice(index, 1);
              }
            }

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

            // Tekrarlanan rutinlerde completed alanını kullanma, sadece completedDates
            return { ...r, completedDates };
          } else {
            // Tekrarlanmayan rutinler için normal completed durumu
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
        }
        return r;
      })
    );
  };

  const handleToggleNotification = async (id) => {
    const routine = routines.find((r) => r.id === id);
    if (!routine) return;
    const isEnabled = !routine.notificationEnabled;

    try {
      // Firebase'e kaydet
      const userRef = doc(db, "users", user.uid);
      const updatedRoutines = routines.map((r) =>
        r.id === id ? { ...r, notificationEnabled: isEnabled } : r
      );
      await updateDoc(userRef, { routines: updatedRoutines });

      // State'i güncelle
      setRoutines(updatedRoutines);
      showToast(
        isEnabled ? "Bildirimler açıldı 🔔" : "Bildirimler kapatıldı 🔕",
        isEnabled ? "success" : "error"
      );
    } catch (error) {
      console.error("Bildirim ayarı güncellenirken hata:", error);
      showToast("Bildirim ayarı güncellenirken bir hata oluştu", "error");
    }
  };

  const handleSelectAll = () => {
    const todayStr = getTurkeyLocalDateString(new Date());
    const count = routines.filter(
      (r) => r.date === todayStr && !getRoutineCompletedStatus(r)
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
      prev.map((r) => {
        if (r.date === todayStr) {
          if (r.repeat && r.repeat !== "none") {
            // Tekrarlanan rutinler için completedDates'e bugünü ekle
            const completedDates = r.completedDates || [];
            if (!completedDates.includes(todayStr)) {
              completedDates.push(todayStr);
            }
            return { ...r, completedDates };
          } else {
            // Tekrarlanmayan rutinler için completed'ı true yap
            return { ...r, completed: true };
          }
        }
        return r;
      })
    );
  };

  const handleUnselectAll = () => {
    const todayStr = getTurkeyLocalDateString(new Date());
    const count = routines.filter(
      (r) => r.date === todayStr && getRoutineCompletedStatus(r)
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
      prev.map((r) => {
        if (r.date === todayStr) {
          if (r.repeat && r.repeat !== "none") {
            // Tekrarlanan rutinler için completedDates'ten bugünü çıkar
            const completedDates = r.completedDates || [];
            const index = completedDates.indexOf(todayStr);
            if (index > -1) {
              completedDates.splice(index, 1);
            }
            return { ...r, completedDates };
          } else {
            // Tekrarlanmayan rutinler için completed'ı false yap
            return { ...r, completed: false };
          }
        }
        return r;
      })
    );
  };

  const handleDeleteAll = () => {
    setOpenDeleteFilteredDialog(true);
  };

  // Tüm bildirimler aktif mi? Sadece bugünkü ve gelecekteki rutinler kontrol edilir
  const today = new Date();
  const todayStr = getTurkeyLocalDateString(today);
  // Sadece tamamlanmamış rutinler hesaba katılıyor
  const todayAndFutureActiveRoutines = routines.filter(r => r.date >= todayStr && !r.completed);
  const allNotificationsEnabled = todayAndFutureActiveRoutines.length > 0 && todayAndFutureActiveRoutines.every(r => r.notificationEnabled);

  const toggleAllNotifications = () => {
    const allEnabled =
      routines.length > 0 && routines.every((r) => r.notificationEnabled);
    const newState = !allEnabled;
    showToast(
      newState ? "Bildirimler açıldı 🔔" : "Bildirimler kapatıldı 🔕",
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
          user={user}
          onNewRoutine={() => {
            setNewRoutineDate("");
            setEditingRoutine(null);
            setModalOpen(true);
          }}
          newRoutineButtonRef={newRoutineButtonRef}
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
          toggleAllNotifications={toggleAllNotifications}
          allNotificationsEnabled={allNotificationsEnabled}
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
              setEditingRoutine(null);
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
        onClose={() => {
          setModalOpen(false);
          setTimeout(() => {
            newRoutineButtonRef.current?.focus();
          }, 0);
        }}
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
