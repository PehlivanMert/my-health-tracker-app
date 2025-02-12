// App.js
import React, { useEffect, useState, useCallback } from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from "chart.js";
import { format } from "date-fns";
import { ToastContainer, toast } from "react-toastify";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
  Tabs,
  Tab,
  Select,
  MenuItem,
} from "@mui/material";
import "react-toastify/dist/ReactToastify.css";
import "tippy.js/dist/tippy.css";
import "./App.css";
import ConfirmModal from "./utils/modal/ConfirmModal";
import UserAuth from "./components/auth/UserAuth";
import {
  getInitialTheme,
  handleThemeChange,
  themes,
} from "./utils/weather-theme-notify/ThemeManager";
import WeatherWidget from "./utils/weather-theme-notify/WeatherWidget";
import { requestNotificationPermission } from "./utils/weather-theme-notify/NotificationManager";
import {
  initialExercises,
  initialSupplements,
  initialRoutines,
  defaultEvents,
  additionalInfo as constantAdditionalInfo,
} from "./utils/constant/ConstantData";
import DailyRoutine from "./components/daily-routine/DailyRoutine";
import Exercises from "./components/exercises/exercise";
import Supplements from "./components/supplements/Supplements";
import ProTips from "./components/pro-tips/ProTips";
import Calendar from "./components/calendar/Calendar";
import { useCalendarEvents } from "./components/calendar/useCalendarEvents";

ChartJS.register(ArcElement, Tooltip, Legend, Title);

function App() {
  // Kullanıcı Yönetimi
  const [user, setUser] = useState(localStorage.getItem("currentUser") || null);
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [isRegister, setIsRegister] = useState(false);

  // Bildirim İzni
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Tema Yönetimi
  const [theme, setTheme] = useState(getInitialTheme);

  // Additional Info
  const [additionalInfo] = useState(() => {
    // Destructure sadece ilk değeri al
    const savedData = localStorage.getItem("additionalInfo");
    return savedData ? JSON.parse(savedData) : constantAdditionalInfo;
  });

  // Sekme Yönetimi
  const [activeTab, setActiveTab] = useState(() => {
    return Number(localStorage.getItem("activeTab")) || 0;
  });
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    localStorage.setItem("activeTab", newTab); // Seçili sekmeyi kaydet
  };

  // Zaman ve Hava Durumu
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Rutinler
  const [routines, setRoutines] = useState([]);
  const [newRoutine, setNewRoutine] = useState({ time: "08:00", title: "" });
  const [editRoutineId, setEditRoutineId] = useState(null);
  const handleSaveRoutine = useCallback(() => {
    let updatedRoutines;
    if (editRoutineId) {
      updatedRoutines = routines.map((routine) =>
        routine.id === editRoutineId
          ? { ...newRoutine, id: editRoutineId, checked: routine.checked }
          : routine
      );
    } else {
      updatedRoutines = [
        ...routines,
        {
          ...newRoutine,
          id: Date.now().toString(),
          checked: false,
        },
      ];
    }

    // Zamanına göre sırala
    updatedRoutines.sort((a, b) => a.time.localeCompare(b.time));

    setRoutines(updatedRoutines);
    setEditRoutineId(null);
    setNewRoutine({ time: "08:00", title: "" });
  }, [routines, editRoutineId, newRoutine]);
  const deleteRoutine = (id) => {
    // İlgili rutini listeden çıkart
    setRoutines(routines.filter((routine) => routine.id !== id));
  };

  // Egzersiz ve Takviyeler
  const [exercises, setExercises] = useState(
    JSON.parse(localStorage.getItem(`${user}-exercises`)) || initialExercises
  );
  const [supplements, setSupplements] = useState(
    JSON.parse(localStorage.getItem(`${user}-supplements`)) ||
      initialSupplements
  );
  const [editingExercise, setEditingExercise] = useState(null);
  const [editingSupplement, setEditingSupplement] = useState(null);

  // DRAG-DROP DÜZELTMELERİ BAŞLANGICI
  const onDragEnd = (result) => {
    if (!result.destination) return;

    // Yeni sıralamayı oluştur
    const items = Array.from(routines);
    const [removed] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, removed);

    localStorage.setItem(`${user}-routines`, JSON.stringify(items));
    setRoutines(items);
  };

  // İlerleme Grafiği
  const totalRoutines = routines.length;
  const completedRoutines = routines.filter((r) => r.checked).length;

  // Service Worker Kaydı (componentDidMount benzeri)
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => console.log("SW registered"))
        .catch((err) => console.log("SW registration failed"));
    }
  }, []);

  const {
    selectedDate,
    setSelectedDate,
    newEvent,
    setNewEvent,
    calendarEvents,
    setCalendarEvents,
    addCalendarEvent,
    handleEventDrop,
    handleEventResize,
    generateRecurringEvents,
    handleUpdateEvent,
    handleConfirmUpdate,
    deletedEvents,
    handleDeleteConfirm,
    deleteEvent,
    handleUndo,
    confirmModalOpen,
    setConfirmModalOpen,
    editingEvent, // Artık hook’tan alıyoruz
    setEditingEvent, // Artık hook’tan alıyoruz
    isEditModalOpen,
    setIsEditModalOpen,
    confirmUpdateModalOpen,
    setConfirmUpdateModalOpen,
  } = useCalendarEvents(user);

  // Exercise ve Supplement Form Gösterme
  const handleExerciseSubmit = useCallback((exercise) => {
    setExercises((prev) => {
      const newExercises = exercise.id
        ? prev.map((e) => (e.id === exercise.id ? exercise : e))
        : [...prev, { ...exercise, id: Date.now().toString() }];
      return newExercises;
    });
    setEditingExercise(null);
  }, []);

  const handleSupplementSubmit = useCallback((supplement) => {
    setSupplements((prev) => {
      const newSupplements = supplement.id
        ? prev.map((s) => (s.id === supplement.id ? supplement : s))
        : [...prev, { ...supplement, id: Date.now().toString() }];
      return newSupplements;
    });
    setEditingSupplement(null);
  }, []);

  // Tema ve Hava Durumu
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("selectedTheme", theme); // Added to persist theme
  }, [theme]);

  // App.js'deki tüm veri yükleme useEffect'lerini tek bir yapıda birleştirin
  // App.js'deki veri yükleme useEffect'ini düzenleyin
  useEffect(() => {
    const loadUserData = () => {
      if (!user) return; // Kullanıcı yoksa işlem yapma

      try {
        const storedRoutines = localStorage.getItem(`${user}-routines`);
        const routinesData = storedRoutines
          ? JSON.parse(storedRoutines)
          : initialRoutines;

        if (!storedRoutines) {
          localStorage.setItem(
            `${user}-routines`,
            JSON.stringify(initialRoutines)
          );
        }

        setRoutines(routinesData);

        // Diğer verileri yükle
        const calendarData =
          JSON.parse(localStorage.getItem(`${user}-calendarEvents`)) || [];
        const exercisesData =
          JSON.parse(localStorage.getItem(`${user}-exercises`)) ||
          initialExercises;
        const supplementsData =
          JSON.parse(localStorage.getItem(`${user}-supplements`)) ||
          initialSupplements;

        setCalendarEvents(calendarData);
        setExercises(exercisesData);
        setSupplements(supplementsData);
      } catch (error) {
        console.error("Veri yükleme hatası:", error);
        toast.error("Veri yüklenirken hata oluştu");
      }
    };

    loadUserData();
  }, [user, setCalendarEvents]); // Eksik bağımlılıkları ekledik

  // useEffect içinde daha güçlü bir veri yükleme mekanizması
  useEffect(() => {
    if (user) {
      const savedEvents =
        JSON.parse(localStorage.getItem(`${user}-calendarEvents`)) || [];

      if (
        savedEvents.length === 0 &&
        !localStorage.getItem(`${user}-hasAddedEvent`)
      ) {
        const recurringEvents = defaultEvents.flatMap((event) =>
          generateRecurringEvents(event)
        );
        savedEvents.push(...recurringEvents);
        localStorage.setItem(
          `${user}-calendarEvents`,
          JSON.stringify(savedEvents)
        );
        localStorage.setItem(`${user}-hasAddedEvent`, "true");
      }

      // Tarihleri Date nesnelerine dönüştür
      const parsedEvents = savedEvents.map((event) => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
        // notify ve repeat değerlerini kontrol et
        notify: typeof event.notify === "string" ? event.notify : "none",
        repeat: typeof event.repeat === "string" ? event.repeat : "none",
      }));
      setCalendarEvents(parsedEvents);
    }
  }, [user, generateRecurringEvents, setCalendarEvents]);

  // Etkinlikler değiştiğinde localStorage'a yaz
  useEffect(() => {
    if (user && routines.length > 0) {
      try {
        localStorage.setItem(`${user}-routines`, JSON.stringify(routines));
      } catch (error) {
        console.error("Rutin kaydetme hatası:", error);
        toast.error("Rutinler kaydedilemedi");
      }
    }
  }, [routines, user]);

  // Diğer verileri kaydetme useEffect'i
  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem(`${user}-exercises`, JSON.stringify(exercises));
        localStorage.setItem(
          `${user}-supplements`,
          JSON.stringify(supplements)
        );
      } catch (error) {
        console.error("Veri kaydetme hatası:", error);
        toast.error("Veriler kaydedilemedi");
      }
    }
  }, [exercises, supplements, user]);

  //sw control
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("Service Worker kaydedildi:", reg))
        .catch((err) => console.error("SW kaydı başarısız:", err));
    }
  }, []);

  //Error handling
  const [errors, setErrors] = useState({ username: false, password: false });

  return !user ? (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Box>
        <UserAuth
          isRegister={isRegister}
          setIsRegister={setIsRegister}
          loginData={loginData}
          setLoginData={setLoginData}
          setUser={setUser}
          errors={errors}
          setErrors={setErrors}
        />
      </Box>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </Container>
  ) : (
    <div className="app-container">
      {confirmModalOpen && (
        <ConfirmModal
          open={confirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          onConfirm={handleDeleteConfirm}
        />
      )}
      <AppBar position="static">
        <Toolbar className="toolbar-container">
          <Box className="time-date-box">
            <Typography variant="h6">
              {format(currentTime, "HH:mm - dd MMMM yyyy")}
            </Typography>
          </Box>
          <Box>
            <WeatherWidget />
          </Box>
          <Button
            color="inherit"
            onClick={() => {
              setUser(null);
              localStorage.removeItem("currentUser");
            }}
          >
            Çıkış Yap
          </Button>
        </Toolbar>
      </AppBar>

      <Tabs
        value={activeTab}
        onChange={(e, newTab) => handleTabChange(newTab)}
        variant="scrollable" // Sekmeler kaydırılabilir hale gelir
        scrollButtons="auto" // Kaydırma butonları otomatik görünür (mobilde dokunarak kaydırabilirsiniz)
        sx={{
          justifyContent: "center", // PC'de ortalama
          "& .MuiTabs-flexContainer": {
            justifyContent: { xs: "flex-start", md: "center" }, // Mobilde sola hizalı, PC'de ortalı
          },
        }}
      >
        <Tab label="Günlük Rutin" />
        <Tab label="Egzersizler" />
        <Tab label="Takviyeler" />
        <Tab label="Pro Öneriler" />
        <Tab label="Takvim" />
      </Tabs>

      {activeTab === 0 && (
        <DailyRoutine
          routines={routines}
          setRoutines={setRoutines} // ✅ Bu satırı ekleyin
          newRoutine={newRoutine}
          setNewRoutine={setNewRoutine}
          handleSaveRoutine={handleSaveRoutine}
          editRoutineId={editRoutineId}
          setEditRoutineId={setEditRoutineId}
          onDragEnd={onDragEnd}
          deleteRoutine={deleteRoutine}
          completedRoutines={completedRoutines}
          totalRoutines={totalRoutines}
        />
      )}

      {activeTab === 1 && (
        <Exercises
          exercises={exercises}
          setExercises={setExercises}
          handleExerciseSubmit={handleExerciseSubmit}
          editingExercise={editingExercise}
          setEditingExercise={setEditingExercise}
        />
      )}

      {activeTab === 2 && (
        <Supplements
          supplements={supplements}
          setSupplements={setSupplements}
          handleSupplementSubmit={handleSupplementSubmit}
          editingSupplement={editingSupplement}
          setEditingSupplement={setEditingSupplement}
        />
      )}

      {activeTab === 3 && <ProTips additionalInfo={additionalInfo} />}

      {activeTab === 4 && (
        <>
          <Calendar
            user={user}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            newEvent={newEvent}
            setNewEvent={setNewEvent}
            calendarEvents={calendarEvents}
            setCalendarEvents={setCalendarEvents}
            addCalendarEvent={addCalendarEvent}
            handleEventDrop={handleEventDrop}
            handleEventResize={handleEventResize}
            deleteEvent={deleteEvent}
            confirmUpdateModalOpen={confirmUpdateModalOpen}
            setConfirmUpdateModalOpen={setConfirmUpdateModalOpen}
            editingEvent={editingEvent}
            setEditingEvent={setEditingEvent}
            isEditModalOpen={isEditModalOpen}
            setIsEditModalOpen={setIsEditModalOpen}
            handleUpdateEvent={handleUpdateEvent}
            handleConfirmUpdate={handleConfirmUpdate}
            deletedEvents={deletedEvents}
            handleUndo={handleUndo}
          />
          {deletedEvents?.length > 0 && (
            <Box
              sx={{
                position: "fixed",
                bottom: 20, // İstediğin mesafeyi belirleyebilirsin
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 1100,
              }}
            >
              <Button
                variant="outlined"
                onClick={handleUndo}
                sx={{
                  backgroundColor: "background.paper",
                  boxShadow: 2,
                }}
              >
                Geri Al ({deletedEvents.length})
              </Button>
            </Box>
          )}
        </>
      )}

      <Box className="footer-container">
        <Typography variant="body2">© 2025 Sağlık Takip Sistemi</Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="body2">Tema:</Typography>
          <Select
            id="theme-select"
            name="theme"
            value={theme}
            onChange={(e) => handleThemeChange(e.target.value, setTheme)}
            size="small"
            sx={{ width: 150 }}
          >
            {themes.map((t) => (
              <MenuItem key={t.value} value={t.value}>
                {t.label}
              </MenuItem>
            ))}
          </Select>
        </Box>
      </Box>
      <ToastContainer position="bottom-right" autoClose={3000} />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
}

export default App;
