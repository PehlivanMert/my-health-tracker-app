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

import WeatherWidget from "./utils/weather-theme-notify/WeatherWidget";
import { requestNotificationPermission } from "./utils/weather-theme-notify/NotificationManager";
import {
  initialExercises,
  initialSupplements,
  initialRoutines,
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
  const [lastEmailSent, setLastEmailSent] = useState(
    localStorage.getItem("lastEmailSent") || 0
  );
  const [authChecked, setAuthChecked] = useState(false);
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [isRegister, setIsRegister] = useState(false);
  const [errors, setErrors] = useState({ username: false, password: false });
  const [remainingTime, setRemainingTime] = useState(0);

  // Bildirim izni
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // additionalInfo yalnızca ilk oluşturulurken eklenip, sonrasında kullanıcı müdahalesi kapalı

  const [additionalInfo, setAdditionalInfo] = useState(constantAdditionalInfo);

  // -------------------------
  // Sekme Yönetimi
  // -------------------------

  // Sekme state'ini localStorage'dan oku
  const [activeTab, setActiveTab] = useState(() => {
    return parseInt(localStorage.getItem("activeTab")) || 0;
  });

  // handleTabChange fonksiyonunu değiştir
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    localStorage.setItem("activeTab", newTab);
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
          setAdditionalInfo(data.additionalInfo ?? constantAdditionalInfo);

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
            additionalInfo: constantAdditionalInfo,
          };
          await setDoc(userDocRef, initialData);
          setRoutines(initialRoutines);
          setExercises(initialExercises);
          setSupplements(initialSupplements);
          setAdditionalInfo(constantAdditionalInfo);
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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (!firebaseUser.emailVerified) {
          await firebaseUser.reload();
          const updatedUser = auth.currentUser;
          setUser(updatedUser?.emailVerified ? updatedUser : null);
        } else {
          setUser(firebaseUser);
        }
      } else {
        setUser(null);
      }
      setAuthChecked(true); // Sadece bu satır kalsın
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
  // Email Doğrulama: Yeniden Gönderme İşlemi
  // -------------------------

  useEffect(() => {
    const savedTime = localStorage.getItem("lastEmailSent");
    if (savedTime) {
      const remaining = Math.max(0, 60000 - (Date.now() - parseInt(savedTime)));
      setRemainingTime(remaining);

      if (remaining > 0) {
        const timer = setInterval(() => {
          setRemainingTime((prev) => Math.max(0, prev - 1000));
        }, 1000);
        return () => clearInterval(timer);
      }
    }
  }, []);

  const handleResendEmail = async () => {
    try {
      await sendEmailVerification(auth.currentUser);
      const now = Date.now();
      localStorage.setItem("lastEmailSent", now);
      setRemainingTime(60000);
    } catch (error) {
      toast.error("Gönderme hatası: " + error.message);
    }
  };

  if (!authChecked) return <div style={{ display: "none" }}></div>;

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
          <Button onClick={handleResendEmail} disabled={remainingTime > 0}>
            {remainingTime > 0
              ? `${Math.ceil(remainingTime / 1000)} saniye sonra tekrar deneyin`
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
      <AppBar
        position="static"
        sx={{
          background:
            "linear-gradient(90deg, #2196F3 0%, #00BCD4 50%, #3F51B5 100%)",
          boxShadow: "0 4px 20px rgba(33, 150, 243, 0.25)",
          position: "relative",
          overflow: "hidden",
          "&::after": {
            content: '""',
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "3px",
            background: "rgba(255, 255, 255, 0.1)",
          },
          transition: "all 0.3s ease",
          "&:hover": {
            boxShadow: "0 6px 25px rgba(33, 150, 243, 0.35)",
          },
        }}
      >
        <Toolbar
          sx={{
            flexDirection: { xs: "column", sm: "row" },
            alignItems: "center",
            justifyContent: "space-between",
            gap: { xs: 2, sm: 0 },
            py: { xs: 2, sm: 1.5 },
            px: 4,
          }}
        >
          <Box
            sx={{
              transition: "all 0.3s ease",
              "&:hover": {
                transform: "translateX(5px)",
              },
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                letterSpacing: "0.5px",
                color: "rgba(255, 255, 255, 0.95)",
                textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              }}
            >
              {format(currentTime, "HH:mm - dd MMMM yyyy")}
            </Typography>
          </Box>

          <Box
            sx={{
              background: "rgba(255, 255, 255, 0.1)",
              backdropFilter: "blur(8px)",
              borderRadius: 3,
              padding: "8px 16px",
              transition: "all 0.3s ease",
              "&:hover": {
                background: "rgba(255, 255, 255, 0.15)",
                transform: "translateY(-2px)",
              },
            }}
          >
            <WeatherWidget />
          </Box>

          <Button
            variant="contained"
            sx={{
              borderRadius: 3,
              textTransform: "none",
              padding: "8px 24px",
              fontSize: "0.95rem",
              fontWeight: 500,
              background: "rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(8px)",
              boxShadow: "0 3px 12px rgba(0, 0, 0, 0.1)",
              transition: "all 0.3s ease",
              "&:hover": {
                background: "rgba(255, 255, 255, 0.25)",
                boxShadow: "0 5px 15px rgba(0, 0, 0, 0.2)",
                transform: "translateY(-2px)",
              },
            }}
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
        textColor="primary"
        indicatorColor="primary"
        sx={{
          justifyContent: "center",
          background: "linear-gradient(135deg, #f0f8ff 0%, #e6f7ff 100%)",
          position: "relative",
          boxShadow: "0 4px 20px rgba(33, 150, 243, 0.1)",
          "&::after": {
            content: '""',
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "3px",
            background:
              "linear-gradient(90deg, #2196F3 0%, #00BCD4 50%, #3F51B5 100%)",
            opacity: 0.7,
          },
          "& .MuiTabs-flexContainer": {
            justifyContent: { xs: "flex-start", md: "center" },
            gap: 1,
          },
          "& .MuiTabs-indicator": {
            background:
              "linear-gradient(90deg, #2196F3 0%, #00BCD4 50%, #3F51B5 100%)",
            height: 3,
            borderRadius: "3px 3px 0 0",
            boxShadow: "0 -2px 8px rgba(33, 150, 243, 0.2)",
          },
          "& .MuiTab-root": {
            textTransform: "none",
            fontWeight: 600,
            fontSize: { xs: "0.9rem", md: "1rem" },
            margin: "0 5px",
            minWidth: "auto",
            padding: "12px 24px",
            borderRadius: "8px 8px 0 0",
            transition: "all 0.3s ease",
            color: "rgba(0, 0, 0, 0.6)",
            "&:hover": {
              backgroundColor: "rgba(33, 150, 243, 0.08)",
              transform: "translateY(-2px)",
              color: "#2196F3",
            },
            "&.Mui-selected": {
              color: "#2196F3",
              background: "rgba(33, 150, 243, 0.08)",
              fontWeight: 700,
            },
            "&::before": {
              content: '""',
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "3px",
              background: "transparent",
              transition: "all 0.3s ease",
            },
            "&.Mui-selected::before": {
              background:
                "linear-gradient(90deg, #2196F3 0%, #00BCD4 50%, #3F51B5 100%)",
              opacity: 0.5,
            },
          },
          "& .MuiTabScrollButton-root": {
            width: 48,
            transition: "all 0.3s ease",
            "&.Mui-disabled": {
              opacity: 0,
            },
            "&:hover": {
              backgroundColor: "rgba(33, 150, 243, 0.08)",
            },
            "& .MuiSvgIcon-root": {
              fontSize: "1.5rem",
              color: "#2196F3",
            },
          },
        }}
      >
        <Tab
          label="Günlük Rutin"
          sx={{
            background: "#e6f7ff", // Açık mavi tonu
            borderRadius: "8px", // Kenarları yuvarlatma
            "&:hover": {
              background: "#b3e5fc", // Hover efekti
            },
          }}
        />
        <Tab
          label="Egzersizler"
          sx={{
            background: "#fff3e0", // Açık turuncu tonu
            borderRadius: "8px",
            "&:hover": {
              background: "#ffe0b2", // Hover efekti
            },
          }}
        />
        <Tab
          label="Takviyeler"
          sx={{
            background: "#f3e5f5", // Açık mor tonu
            borderRadius: "8px",
            "&:hover": {
              background: "#e1bee7", // Hover efekti
            },
          }}
        />
        <Tab
          label="Pro İpuçları"
          sx={{
            background: "#e8f5e9", // Açık yeşil tonu
            borderRadius: "8px",
            "&:hover": {
              background: "#c8e6c9", // Hover efekti
            },
          }}
        />
        <Tab
          label="Takvim"
          sx={{
            background: "#fffde7", // Açık sarı tonu
            borderRadius: "8px",
            "&:hover": {
              background: "#fff9c4", // Hover efekti
            },
          }}
        />
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
      {activeTab === 3 && (
        <ProTips
          additionalInfo={additionalInfo}
          setAdditionalInfo={setAdditionalInfo}
          user={user}
        />
      )}
      {activeTab === 4 && <CalendarComponent user={user} />}

      <Box
        className="footer-container"
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: "center",
          justifyContent: "space-between",
          p: 1.5,
          background: "linear-gradient(135deg, #f0f8ff 0%, #e6f7ff 100%)",
          borderTop: "1px solid rgba(33, 150, 243, 0.1)",
          position: "relative", // relative yerine fixed
          bottom: 0, // sayfanın altına sabitlemek için
          left: 0, // sola hizalamak için
          width: "100%", // genişlik sayfanın tamamını kaplaması için
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            background:
              "linear-gradient(90deg, #2196F3 0%, #00BCD4 50%, #3F51B5 100%)",
            opacity: 0.5,
          },
          boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.05)",
          gap: { xs: 2, sm: 0 },
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            background: "linear-gradient(45deg, #2196F3 30%, #3F51B5 90%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            transition: "all 0.3s ease",
            "&:hover": {
              transform: "translateX(5px)",
            },
          }}
        >
          © 2025 Sağlık ve Rutin Takip Sistemi
        </Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            background: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(8px)",
            padding: "8px 16px",
            borderRadius: 3,
            transition: "all 0.3s ease",
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: "0 4px 15px rgba(33, 150, 243, 0.1)",
            },
          }}
        ></Box>
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
      />
    </div>
  );
}

export default App;
