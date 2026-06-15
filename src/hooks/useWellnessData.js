import { useState, useEffect, useRef, useCallback } from "react";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  writeBatch,
  runTransaction
} from "firebase/firestore";
import { db } from "../components/auth/firebaseConfig";
import { toast } from "react-toastify";
import { DateTime } from "luxon";
import { saveNextSupplementReminderTime } from "../components/notify/SupplementNotificationScheduler";

export const useWellnessData = (user, sortMode = "notification") => {
  const [supplements, setSupplements] = useState([]);
  const [supplementConsumptionToday, setSupplementConsumptionToday] = useState({});
  const [supplementStatsData, setSupplementStatsData] = useState([]);
  const [waterData, setWaterData] = useState({ history: [] });

  const lastSupplementsState = useRef([]);
  const lastSupplementConsumptionState = useRef({});
  const isDataLoading = useRef(true);
  const isInitialLoad = useRef(true);
  
  const consumingSupplements = useRef(new Set());
  const undoingSupplements = useRef(new Set());

  const getSupplementsRef = () => collection(db, "users", user.uid, "supplements");

  const getNextNotificationTime = useCallback((notificationSchedule) => {
    if (!notificationSchedule || !Array.isArray(notificationSchedule) || notificationSchedule.length === 0) {
      return null;
    }

    const now = DateTime.now().setZone("Europe/Istanbul");
    const currentTimeInMinutes = now.hour * 60 + now.minute;

    const notificationTimes = notificationSchedule
      .filter(time => time && typeof time === 'string')
      .map(time => {
        const [hours, minutes] = time.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) return null;
        return hours * 60 + minutes;
      })
      .filter(time => time !== null)
      .sort((a, b) => a - b);

    if (notificationTimes.length === 0) return null;

    const nextNotification = notificationTimes.find(time => time > currentTimeInMinutes);
    if (nextNotification !== undefined) return nextNotification;

    const lastPastNotification = notificationTimes[notificationTimes.length - 1];
    return lastPastNotification - (24 * 60);
  }, []);

  const sortSupplements = useCallback((supplementsData) => {
    const sorted = [...supplementsData];

    if (sortMode === "name") {
      sorted.sort((a, b) => {
        const nameA = (a.name || "").toLocaleLowerCase("tr-TR");
        const nameB = (b.name || "").toLocaleLowerCase("tr-TR");
        return nameA.localeCompare(nameB, "tr-TR");
      });
    } else if (sortMode === "quantity") {
      sorted.sort((a, b) => (b.quantity || 0) - (a.quantity || 0));
    } else if (sortMode === "notification") {
      sorted.sort((a, b) => {
        const nextTimeA = getNextNotificationTime(a.notificationSchedule);
        const nextTimeB = getNextNotificationTime(b.notificationSchedule);

        if (nextTimeA === null && nextTimeB === null) return 0;
        if (nextTimeA === null) return 1;
        if (nextTimeB === null) return -1;

        if (nextTimeA < 0 && nextTimeB < 0) return nextTimeB - nextTimeA;
        if (nextTimeA < 0) return 1;
        if (nextTimeB < 0) return -1;

        return nextTimeA - nextTimeB;
      });
    }

    return sorted;
  }, [sortMode, getNextNotificationTime]);

  const fetchSupplements = async () => {
    try {
      const querySnapshot = await getDocs(getSupplementsRef());
      const supplementsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      const sortedSupplements = sortSupplements(supplementsData);
      setSupplements(sortedSupplements);
      lastSupplementsState.current = [...sortedSupplements];
      isDataLoading.current = false;
    } catch (error) {
      console.error("Error fetching supplements:", error);
      isDataLoading.current = false;
    }
  };

  const fetchSupplementConsumptionToday = async () => {
    const docRef = doc(db, "users", user.uid, "stats", "supplementConsumption");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
      const consumptionData = data[today] || {};
      setSupplementConsumptionToday(consumptionData);
      lastSupplementConsumptionState.current = { ...consumptionData };
    } else {
      setSupplementConsumptionToday({});
      lastSupplementConsumptionState.current = {};
    }
  };

  const refreshWaterData = async () => {
    try {
      const waterRef = doc(db, "users", user.uid, "water", "current");
      const waterDocSnap = await getDoc(waterRef);
      if (waterDocSnap.exists()) {
        const waterDataFromDB = waterDocSnap.data();
        setWaterData({
          history: waterDataFromDB.history || [],
          nextWaterReminderTime: waterDataFromDB.nextWaterReminderTime || null,
          ...waterDataFromDB
        });
      }
    } catch (error) {
      console.error("Water data fetch error:", error);
    }
  };

  const fetchSupplementConsumptionStats = async () => {
    try {
      const statsRef = doc(db, "users", user.uid, "stats", "supplementConsumption");
      const docSnap = await getDoc(statsRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const sortedDates = Object.keys(data).sort(
          (a, b) => new Date(a + "T00:00:00") - new Date(b + "T00:00:00")
        );
        const allSuppNames = new Set();
        sortedDates.forEach((date) => {
          Object.keys(data[date]).forEach((suppName) => {
            if (suppName !== "total") allSuppNames.add(suppName);
          });
        });
        const chartData = sortedDates.map((date) => {
          const dayStats = data[date];
          const dayData = {
            date: new Date(date + "T00:00:00").toLocaleDateString("tr-TR"),
            fullDate: date,
          };
          allSuppNames.forEach((suppName) => {
            dayData[suppName] = dayStats[suppName] || 0;
          });
          return dayData;
        });
        return chartData;
      }
      return [];
    } catch (error) {
      console.error("Stats data fetch error:", error);
      return [];
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchSupplements();
    fetchSupplementConsumptionToday();
    fetchSupplementConsumptionStats().then(setSupplementStatsData);
    refreshWaterData();
  }, [user]);

  useEffect(() => {
    if (supplements.length > 0) {
      const sorted = sortSupplements(supplements);
      setSupplements(sorted);
      lastSupplementsState.current = [...sorted];
    }
  }, [sortMode, sortSupplements]);

  useEffect(() => {
    if (!user || isInitialLoad.current || isDataLoading.current) return;
    const hasRealChange = JSON.stringify(supplementConsumptionToday) !== JSON.stringify(lastSupplementConsumptionState.current);
    
    if (hasRealChange) {
      const updateSupplementConsumptionInFirestore = async () => {
        try {
          const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
          const statsDocRef = doc(db, "users", user.uid, "stats", "supplementConsumption");
          const statsDocSnap = await getDoc(statsDocRef);
          let updatedStats = statsDocSnap.exists() ? statsDocSnap.data() : {};
          updatedStats[today] = supplementConsumptionToday;
          await setDoc(statsDocRef, updatedStats);
          lastSupplementConsumptionState.current = { ...supplementConsumptionToday };
        } catch (error) {
          console.error("Consumption update error:", error);
        }
      };
      updateSupplementConsumptionInFirestore();
    }
  }, [supplementConsumptionToday, user]);

  const handleConsume = async (id) => {
    if (consumingSupplements.current.has(id)) return;
    const supplement = supplements.find((s) => s.id === id);
    if (!supplement || supplement.quantity <= 0) return;

    consumingSupplements.current.add(id);
    const supplementRef = doc(db, "users", user.uid, "supplements", id);
    const statsDocRef = doc(db, "users", user.uid, "stats", "supplementConsumption");
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });

    try {
      const result = await runTransaction(db, async (transaction) => {
        const supplementDoc = await transaction.get(supplementRef);
        if (!supplementDoc.exists()) throw new Error("Supplement bulunamadı");
        
        const currentSupplement = supplementDoc.data();
        if (currentSupplement.quantity <= 0) throw new Error("Takviye miktarı yetersiz");

        const statsDoc = await transaction.get(statsDocRef);
        const currentStats = statsDoc.exists() ? statsDoc.data() : {};
        const todayStats = currentStats[today] || {};

        const newCount = (todayStats[supplement.name] || 0) + 1;
        const newQuantity = currentSupplement.quantity - 1;

        transaction.update(supplementRef, { quantity: newQuantity });
        
        const updatedStats = {
          ...currentStats,
          [today]: {
            ...todayStats,
            [supplement.name]: newCount,
          },
        };
        transaction.set(statsDocRef, updatedStats);

        return { newQuantity, newCount, supplementName: supplement.name };
      });

      setSupplements(prev => prev.map(s => s.id === id ? { ...s, quantity: result.newQuantity } : s));
      setSupplementConsumptionToday(prev => ({ ...prev, [result.supplementName]: result.newCount }));
      toast.success(`${result.supplementName} tüketildi!`);
    } catch (error) {
      console.error(error);
      if (error.message === "Takviye miktarı yetersiz") toast.warning("Bu takviye tükenmiş!");
      else toast.error("Takviye tüketilirken hata oluştu");
    } finally {
      consumingSupplements.current.delete(id);
    }
  };

  const handleUndoConsume = async (supplement) => {
    if (undoingSupplements.current.has(supplement.id)) return;

    const consumedToday = supplementConsumptionToday[supplement.name] || 0;
    if (consumedToday <= 0) {
      toast.warning("Bu takviye bugün henüz tüketilmemiş!");
      return;
    }

    undoingSupplements.current.add(supplement.id);
    const supplementRef = doc(db, "users", user.uid, "supplements", supplement.id);
    const statsDocRef = doc(db, "users", user.uid, "stats", "supplementConsumption");
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });

    try {
      const result = await runTransaction(db, async (transaction) => {
        const supplementDoc = await transaction.get(supplementRef);
        if (!supplementDoc.exists()) throw new Error("Supplement bulunamadı");

        const statsDoc = await transaction.get(statsDocRef);
        const currentStats = statsDoc.exists() ? statsDoc.data() : {};
        const todayStats = currentStats[today] || {};

        const currentConsumption = todayStats[supplement.name] || 0;
        if (currentConsumption <= 0) throw new Error("Bu takviye bugün henüz tüketilmemiş");

        const newConsumption = currentConsumption - 1;
        const newQuantity = supplement.quantity + 1;

        transaction.update(supplementRef, { quantity: newQuantity });

        const updatedStats = {
          ...currentStats,
          [today]: {
            ...todayStats,
            [supplement.name]: newConsumption,
          },
        };
        
        if (newConsumption === 0) {
          delete updatedStats[today][supplement.name];
          if (Object.keys(updatedStats[today]).length === 0) delete updatedStats[today];
        }
        transaction.set(statsDocRef, updatedStats);

        return { newQuantity, newConsumption, supplementName: supplement.name };
      });

      setSupplements(prev => prev.map(s => s.id === supplement.id ? { ...s, quantity: result.newQuantity } : s));
      setSupplementConsumptionToday(prev => ({ ...prev, [result.supplementName]: result.newConsumption }));
      toast.success(`${result.supplementName} geri alındı!`);
    } catch (error) {
      console.error(error);
      toast.error("Takviye geri alınırken hata oluştu");
    } finally {
      undoingSupplements.current.delete(supplement.id);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(getSupplementsRef(), id));
      await fetchSupplements();
    } catch (error) {
      console.error("Error deleting supplement:", error);
    }
  };

  const handleSaveSupplement = async (editingSupplement, supplementForm) => {
    try {
      if (editingSupplement) {
        await updateDoc(doc(getSupplementsRef(), editingSupplement.id), {
          ...supplementForm,
          lastUpdated: new Date(),
        });
      } else {
        await addDoc(getSupplementsRef(), {
          ...supplementForm,
          createdAt: new Date(),
          lastUpdated: new Date(),
        });
      }
      await fetchSupplements();
    } catch (error) {
      console.error("Error saving supplement:", error);
    }
  };

  const handleSaveSupplementNotifications = async (notifications) => {
    try {
      const batch = writeBatch(db);
      const validNotifications = [];
      
      notifications.forEach(notification => {
        const supplementRef = doc(db, "users", user.uid, "supplements", notification.id);
        const updateData = {};
        
        if (notification.notificationSchedule && Array.isArray(notification.notificationSchedule)) {
          updateData.notificationSchedule = notification.notificationSchedule;
        }
        
        if (Object.keys(updateData).length > 0) {
          batch.update(supplementRef, updateData);
          validNotifications.push(notification);
        }
      });
      
      if (validNotifications.length > 0) {
        await batch.commit();
        for (const notification of validNotifications) {
          const supplementRef = doc(db, "users", user.uid, "supplements", notification.id);
          const supplementDoc = await getDoc(supplementRef);
          if (supplementDoc.exists()) {
            await saveNextSupplementReminderTime(user, {
              ...supplementDoc.data(),
              id: notification.id,
              notificationSchedule: notification.notificationSchedule,
            });
          }
        }
      }
      
      await fetchSupplements();
    } catch (error) {
      console.error("Error saving supplement notifications:", error);
    }
  };

  return {
    supplements,
    supplementConsumptionToday,
    supplementStatsData,
    waterData,
    refreshWaterData,
    handleConsume,
    handleUndoConsume,
    handleDelete,
    handleSaveSupplement,
    handleSaveSupplementNotifications,
    consumingSupplements: consumingSupplements.current,
    undoingSupplements: undoingSupplements.current,
  };
};
