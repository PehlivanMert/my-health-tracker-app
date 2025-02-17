// App.js
import React, { useEffect, useState, useCallback, useRef } from "react";
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
  Paper,
} from "@mui/material";
import "react-toastify/dist/ReactToastify.css";
import "tippy.js/dist/tippy.css";
import "./App.css";
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
  // Takvim etkinlikleri artık alt koleksiyonda olduğundan,
  // user dokümanında saklanmasına gerek yok
  additionalInfo as constantAdditionalInfo,
} from "./utils/constant/ConstantData";
import DailyRoutine from "./components/daily-routine/DailyRoutine";
import Exercises from "./components/exercises/exercise";
import Supplements from "./components/supplements/Supplements";
import ProTips from "./components/pro-tips/ProTips";
import CalendarComponent from "./components/calendar/CalendarComponent";
import { auth, db } from "./components/auth/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { sendEmailVerification } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

ChartJS.register(ArcElement, Tooltip, Legend, Title);

function App() {
  // -------------------------
  // Kullanıcı, Oturum & Genel State'ler
  // -------------------------
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [count, setCount] = useState(0); // Email count

  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [isRegister, setIsRegister] = useState(false);
  const [errors, setErrors] = useState({ username: false, password: false });

  // Bildirim izni
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Tema ve Additional Info
  // additionalInfo yalnızca ilk oluşturulurken eklenip, sonrasında kullanıcı müdahalesi kapalı
  const [theme, setTheme] = useState(getInitialTheme);
  const [additionalInfo, setAdditionalInfo] = useState(constantAdditionalInfo);

  // -------------------------
  // Sekme Yönetimi
  // -------------------------
  const [activeTab, setActiveTab] = useState(0);
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    if (user) {
      const userDocRef = doc(db, "users", user.uid);
      updateDoc(userDocRef, { activeTab: newTab }).catch((error) =>
        console.error("Active tab güncelleme hatası:", error)
      );
    }
  };

  // -------------------------
  // Zaman & Hava Durumu
  // -------------------------
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // -------------------------
  // Rutinler (Daily Routine)
  // -------------------------
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
        { ...newRoutine, id: Date.now().toString(), checked: false },
      ];
    }
    updatedRoutines.sort((a, b) => a.time.localeCompare(b.time));
    setRoutines(updatedRoutines);
    setEditRoutineId(null);
    setNewRoutine({ time: "08:00", title: "" });
  }, [routines, editRoutineId, newRoutine]);

  const deleteRoutine = (id) => {
    setRoutines(routines.filter((routine) => routine.id !== id));
  };

  // -------------------------
  // Egzersiz ve Takviyeler
  // -------------------------
  const [exercises, setExercises] = useState(initialExercises);
  const [supplements, setSupplements] = useState(initialSupplements);
  const [editingExercise, setEditingExercise] = useState(null);
  const [editingSupplement, setEditingSupplement] = useState(null);

  const handleExerciseSubmit = useCallback((exercise) => {
    setExercises((prev) =>
      exercise.id
        ? prev.map((e) => (e.id === exercise.id ? exercise : e))
        : [...prev, { ...exercise, id: Date.now().toString() }]
    );
    setEditingExercise(null);
  }, []);

  const handleSupplementSubmit = useCallback((supplement) => {
    setSupplements((prev) =>
      supplement.id
        ? prev.map((s) => (s.id === supplement.id ? supplement : s))
        : [...prev, { ...supplement, id: Date.now().toString() }]
    );
    setEditingSupplement(null);
  }, []);

  const totalRoutines = routines.length;
  const completedRoutines = routines.filter((r) => r.checked).length;

  // -------------------------
  // Service Worker Kaydı
  // -------------------------
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => console.log("SW registered"))
        .catch((err) => console.log("SW registration failed", err));
    }
  }, []);

  // -------------------------
  // Calendar (Takvim) İşlemleri
  // -------------------------

  // -------------------------
  // Tema Güncellemesi
  // -------------------------
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (user) {
      const userDocRef = doc(db, "users", user.uid);
      updateDoc(userDocRef, { theme }).catch((error) =>
        console.error("Tema güncelleme hatası:", error)
      );
    }
  }, [theme, user]);

  // -------------------------
  // Firestore’dan Kullanıcı Verilerini Yükleme
  // (Additional Info: Sadece ilk oluşturma sırasında eklenir, sonrasında güncellenmez)
  // -------------------------

  const isInitialLoad = useRef(true); // İlk yükleme kontrolü

  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;

      try {
        const userDocRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userDocRef, { source: "server" });

        if (docSnap.exists()) {
          const data = docSnap.data();

          setRoutines(data.routines ?? initialRoutines);
          setExercises(data.exercises ?? initialExercises);
          setSupplements(data.supplements ?? initialSupplements);
          setActiveTab(data.activeTab ?? 0);
          setAdditionalInfo(data.additionalInfo ?? constantAdditionalInfo);
          setTheme(data.theme ?? getInitialTheme());
          setCount(data.emailCount ?? 0);

          let updatedData = {};
          if (data.additionalInfo === undefined) {
            updatedData.additionalInfo = constantAdditionalInfo;
          }
          if (Object.keys(updatedData).length > 0) {
            await updateDoc(userDocRef, updatedData);
          }
        } else {
          const initialData = {
            routines: initialRoutines,
            exercises: initialExercises,
            supplements: initialSupplements,
            activeTab: 0,
            additionalInfo: constantAdditionalInfo,
            theme: getInitialTheme(),
            emailCount: 0,
          };
          await setDoc(userDocRef, initialData);
          setRoutines(initialRoutines);
          setExercises(initialExercises);
          setSupplements(initialSupplements);
          setActiveTab(0);
          setAdditionalInfo(constantAdditionalInfo);
          setTheme(getInitialTheme());
          setCount(0);
        }

        isInitialLoad.current = false; // İlk yükleme tamamlandı
      } catch (error) {
        console.error("Veri yükleme hatası:", error);
      }
    };

    loadUserData();
  }, [user]);

  // -------------------------
  // Rutinler Güncelleme (Firestore’a yazma)
  // -------------------------
  useEffect(() => {
    if (!user || isInitialLoad.current) return; // İlk yüklemede çalışmasın

    const updateRoutinesInFirestore = async () => {
      try {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, { routines });
      } catch (error) {
        console.error("Rutin kaydetme hatası:", error);
      }
    };

    updateRoutinesInFirestore();
  }, [routines, user]);

  // -------------------------
  // Egzersiz ve Takviyeler Güncelleme (Firestore’a yazma)
  // -------------------------
  useEffect(() => {
    if (!user || isInitialLoad.current) return; // İlk yüklemede çalışmasın

    const updateExercisesSupplementsInFirestore = async () => {
      try {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, { exercises, supplements });
      } catch (error) {
        console.error("Veri kaydetme hatası:", error);
      }
    };

    updateExercisesSupplementsInFirestore();
  }, [exercises, supplements, user]);

  // -------------------------
  // Firebase Auth: Kullanıcı Oturumunu İzleme
  // -------------------------
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser ? firebaseUser : null);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // -------------------------
  // Email Doğrulama Kontrolü
  // -------------------------
  useEffect(() => {
    if (user && !user.emailVerified) {
      const interval = setInterval(async () => {
        try {
          await user.reload();
          const updatedUser = auth.currentUser;
          if (updatedUser?.emailVerified) {
            setUser(updatedUser);
          }
        } catch (error) {
          console.error("Yenileme hatası:", error);
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // -------------------------
  // Countdown Timer (Email Count)
  // -------------------------
  useEffect(() => {
    if (count > 0) {
      const timer = setInterval(() => {
        setCount((prevCount) => {
          const newCount = prevCount - 1;
          if (user) {
            const userDocRef = doc(db, "users", user.uid);
            updateDoc(userDocRef, { emailCount: newCount }).catch((error) =>
              console.error("Email count güncelleme hatası:", error)
            );
          }
          return newCount <= 0 ? 0 : newCount;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [count, user]);

  // -------------------------
  // Email Doğrulama: Yeniden Gönderme İşlemi
  // -------------------------
  const handleResendEmail = async () => {
    try {
      await sendEmailVerification(user);
      console.log("Email gönderildi, sayaç başlatılıyor");
      setCount(60);
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        updateDoc(userDocRef, { emailCount: 60 }).catch((error) =>
          console.error("Email count güncelleme hatası:", error)
        );
      }
    } catch (error) {
      console.error("Email gönderme hatası:", error);
      setCount(0);
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        updateDoc(userDocRef, { emailCount: 0 }).catch((error) =>
          console.error("Email count güncelleme hatası:", error)
        );
      }
    }
  };

  // -------------------------
  // Yükleme Durumu: "Loading..." ekranı
  // -------------------------
  if (isLoading) {
    return (
      <Typography variant="h5" align="center" sx={{ mt: 4 }}>
        Loading...
      </Typography>
    );
  }

  // -------------------------
  // Render: Kullanıcı oturumu, email doğrulama, ana ekran
  // -------------------------
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
      <ToastContainer />
    </Container>
  ) : !user.emailVerified ? (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Paper sx={{ p: 4, textAlign: "center" }}>
        <Box sx={{ mb: 3, p: 2, border: "1px solid #ccc" }}>
          <Typography variant="h5" gutterBottom>
            Email Doğrulama
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Lütfen email adresinize gönderilen doğrulama linkine tıklayın.
          </Typography>
          <Button onClick={handleResendEmail} disabled={count > 0}>
            {count > 0
              ? `Yeniden Gönder (${count})`
              : "Doğrulama Emailini Gönder"}
          </Button>
          <Typography variant="body2" sx={{ mt: 2 }}>
            Email almadıysanız lütfen spam kutunuzu kontrol edin. Email
            gelmediyse, lütfen 1 dakika bekleyin ve tekrar deneyin.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          onClick={() => {
            auth.signOut();
            setUser(null);
          }}
          fullWidth
        >
          Çıkış Yap
        </Button>
      </Paper>
      <ToastContainer />
    </Container>
  ) : (
    <div className="app-container">
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
              auth.signOut();
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
        onChange={(event, newTab) => handleTabChange(newTab)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          justifyContent: "center",
          "& .MuiTabs-flexContainer": {
            justifyContent: { xs: "flex-start", md: "center" },
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
          setRoutines={setRoutines}
          newRoutine={newRoutine}
          setNewRoutine={setNewRoutine}
          handleSaveRoutine={handleSaveRoutine}
          editRoutineId={editRoutineId}
          setEditRoutineId={setEditRoutineId}
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
      {activeTab === 4 && <CalendarComponent user={user} />}

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
      {/* İhtiyaca göre ToastContainer'lardan bir tanesini kullanabilirsiniz */}
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
