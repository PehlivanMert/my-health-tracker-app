import React, { useEffect, useState, useCallback, useRef } from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from "chart.js";
import { styled, keyframes, alpha } from "@mui/material/styles";
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
  Avatar,
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
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
import ProTips from "./components/pro-tips/ProTips";
import CalendarComponent from "./components/calendar/CalendarComponent";
import WellnessTracker from "./components/wellnesstracker/WellnessTracker";
import { auth, db } from "./components/auth/firebaseConfig";
import { onAuthStateChanged, sendEmailVerification } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { handlePasswordReset } from "./components/auth/AuthHandlers";
import Lottie from "lottie-react";
import welcomeAnimation from "./assets/welcomeAnimation.json";

// Animasyonlar
const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
  100% { transform: translateY(0px); }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const ripple = keyframes`
  0% { transform: scale(0.95); opacity: 0.7; }
  50% { transform: scale(1.05); opacity: 0.4; }
  100% { transform: scale(0.95); opacity: 0.7; }
`;

// Styled Components (tasarım diline uygun)
const GlowingContainer = styled(Container)(({ theme, glowColor }) => ({
  position: "relative",
  background: "rgba(33, 150, 243, 0.1)",
  backdropFilter: "blur(10px)",
  borderRadius: "24px",
  overflow: "hidden",
  border: "1px solid rgba(33, 150, 243, 0.2)",
  boxShadow: `0 0 20px ${glowColor || "#2196F322"}`,
  transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    boxShadow: `0 0 40px ${glowColor || "#2196F344"}`,
  },
}));

const AnimatedButton = styled(Button)(({ theme }) => ({
  background: "linear-gradient(45deg, #2196F3 30%, #3F51B5 90%)",
  border: 0,
  borderRadius: 25,
  boxShadow: "0 3px 5px 2px rgba(33, 150, 243, .3)",
  color: "white",
  padding: "12px 35px",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  position: "relative",
  overflow: "hidden",
  "&:hover": {
    transform: "scale(1.05)",
    boxShadow: "0 5px 15px 3px rgba(33, 150, 243, .4)",
  },
  "&::after": {
    content: '""',
    position: "absolute",
    top: "-50%",
    left: "-50%",
    width: "200%",
    height: "200%",
    background:
      "linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent)",
    transform: "rotate(45deg)",
    animation: `${ripple} 2s infinite`,
  },
}));

const FloatingElement = styled(Box)(({ delay = 0 }) => ({
  animation: `${float} 3s ease-in-out infinite`,
  animationDelay: `${delay}s`,
}));

ChartJS.register(ArcElement, Tooltip, Legend, Title);

function App() {
  // Yüklenme, geçiş ve tema durumları
  const [isLoading, setIsLoading] = useState(true);
  const [transition, setTransition] = useState(false);
  const [activeGlow, setActiveGlow] = useState("#2196F3");

  // Kullanıcı, oturum ve genel state’ler
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

  // additionalInfo (ilk oluşturulurken ekleniyor)
  const [additionalInfo, setAdditionalInfo] = useState({
    ...constantAdditionalInfo,
    recipes: Array.isArray(constantAdditionalInfo.recipes)
      ? constantAdditionalInfo.recipes
      : Object.values(constantAdditionalInfo.recipes),
  });

  // Sekme Yönetimi
  const [activeTab, setActiveTab] = useState(
    () => parseInt(localStorage.getItem("activeTab")) || 0
  );
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    localStorage.setItem("activeTab", newTab);
  };

  // Zaman & Hava Durumu
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Egzersiz
  const [exercises, setExercises] = useState(initialExercises);
  const [editingExercise, setEditingExercise] = useState(null);
  const handleExerciseSubmit = useCallback((exercise) => {
    setExercises((prev) =>
      exercise.id
        ? prev.map((e) => (e.id === exercise.id ? exercise : e))
        : [...prev, { ...exercise, id: Date.now().toString() }]
    );
    setEditingExercise(null);
  }, []);

  // Service Worker Kaydı
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => console.log("SW registered"))
        .catch((err) => console.log("SW registration failed", err));
    }
  }, []);

  // Firestore’dan Kullanıcı Verilerini Yükleme
  const isInitialLoad = useRef(true);
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;
      try {
        const userDocRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userDocRef, { source: "server" });
        if (docSnap.exists()) {
          const data = docSnap.data();
          const loadedAdditionalInfo =
            data.additionalInfo ?? constantAdditionalInfo;
          setExercises(data.exercises ?? initialExercises);
          setAdditionalInfo({
            ...loadedAdditionalInfo,
            recipes: Array.isArray(loadedAdditionalInfo.recipes)
              ? loadedAdditionalInfo.recipes
              : Object.values(loadedAdditionalInfo.recipes),
          });
          let updatedData = {};
          if (data.additionalInfo === undefined) {
            updatedData.additionalInfo = constantAdditionalInfo;
          }
          if (Object.keys(updatedData).length > 0) {
            await updateDoc(userDocRef, updatedData);
          }
        } else {
          const initialData = {
            exercises: initialExercises,
            additionalInfo: constantAdditionalInfo,
          };
          await setDoc(userDocRef, initialData);
          setExercises(initialExercises);
          setAdditionalInfo({
            ...constantAdditionalInfo,
            recipes: Array.isArray(constantAdditionalInfo.recipes)
              ? constantAdditionalInfo.recipes
              : Object.values(constantAdditionalInfo.recipes),
          });
        }
        isInitialLoad.current = false;
      } catch (error) {
        console.error("Veri yükleme hatası:", error);
      }
    };
    loadUserData();
  }, [user]);

  // Egzersiz ve Takviyeler Güncelleme (Firestore’a yazma)
  useEffect(() => {
    if (!user || isInitialLoad.current) return;
    const updateExercisesInFirestore = async () => {
      try {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, { exercises });
      } catch (error) {
        console.error("Veri kaydetme hatası:", error);
      }
    };
    updateExercisesInFirestore();
  }, [exercises, user]);

  // Firebase Auth: Kullanıcı Oturumunu İzleme
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
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  // Email Doğrulama Kontrolü
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

  // --- Yeni: Avatar Menüsü & Profil Modal ---
  const [anchorEl, setAnchorEl] = useState(null);
  const [openProfileModal, setOpenProfileModal] = useState(false);
  const [profileData, setProfileData] = useState({
    username: "",
    firstName: "",
    lastName: "",
    profileImage: "",
    height: "",
    weight: "",
    birthDate: "",
  });
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        const userDocRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists() && docSnap.data().profile) {
          setProfileData(docSnap.data().profile);
        } else {
          setProfileData({
            username: user.email, // default olarak email yerine kullanıcı adını set edebilirsiniz
            firstName: "",
            lastName: "",
            profileImage: "",
            height: "",
            weight: "",
            birthDate: "",
          });
        }
      };
      fetchProfile();
      // Hoşgeldin animasyonu: sadece localStorage'de "welcomeShown" bayrağı yoksa göster
      if (!localStorage.getItem("welcomeShown")) {
        setShowWelcome(true);
        localStorage.setItem("welcomeShown", "true");
        setTimeout(() => setShowWelcome(false), 3000);
      }
    }
  }, [user]);

  const handleAvatarClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  const handleProfileOpen = () => {
    setOpenProfileModal(true);
    setAnchorEl(null);
  };
  const handleProfileClose = () => {
    setOpenProfileModal(false);
  };
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData((prev) => ({ ...prev, profileImage: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };
  const handleProfileSave = async () => {
    try {
      const userDocRef = doc(db, "users", user.uid);
      const cleanProfile = JSON.parse(JSON.stringify(profileData));
      await updateDoc(userDocRef, { profile: cleanProfile });
      toast.success("Profil güncellendi");
      setOpenProfileModal(false);
    } catch (error) {
      toast.error("Profil güncellenemedi: " + error.message);
    }
  };
  const handleSignOut = () => {
    auth.signOut();
    setUser(null);
    localStorage.removeItem("currentUser");
    localStorage.removeItem("welcomeShown"); // Çıkış yapınca bayrağı sil
    setAnchorEl(null);
  };

  if (!authChecked) return <div style={{ display: "none" }}></div>;
  return !user ? (
    <GlowingContainer maxWidth="sm" sx={{ mt: 4 }} glowColor={activeGlow}>
      <Box
        sx={{
          p: 4,
          backdropFilter: "blur(10px)",
          borderRadius: "24px",
          background: "rgba(255, 255, 255, 0.1)",
        }}
      >
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
    </GlowingContainer>
  ) : !user.emailVerified ? (
    <GlowingContainer maxWidth="sm" sx={{ mt: 4 }} glowColor="#00BCD4">
      <Paper
        sx={{
          p: 4,
          textAlign: "center",
          background: "rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(10px)",
          borderRadius: "24px",
          border: "1px solid rgba(33, 150, 243, 0.2)",
        }}
      >
        <FloatingElement
          sx={{ mb: 3, p: 2, border: "1px solid rgba(33, 150, 243, 0.3)" }}
        >
          <Typography
            variant="h5"
            gutterBottom
            sx={{
              background: "linear-gradient(45deg, #2196F3 30%, #3F51B5 90%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Email Doğrulama
          </Typography>
          <Typography
            variant="body1"
            sx={{ mb: 3, color: "rgba(255, 255, 255, 0.9)" }}
          >
            Lütfen email adresinize gönderilen doğrulama linkine tıklayın.
          </Typography>
          <AnimatedButton
            onClick={handleResendEmail}
            disabled={remainingTime > 0}
          >
            {remainingTime > 0
              ? `${Math.ceil(remainingTime / 1000)} saniye sonra tekrar deneyin`
              : "Doğrulama Emailini Gönder"}
          </AnimatedButton>
        </FloatingElement>
        <AnimatedButton
          variant="outlined"
          onClick={() => {
            auth.signOut();
            setUser(null);
          }}
          fullWidth
        >
          Çıkış Yap
        </AnimatedButton>
      </Paper>
      <ToastContainer />
    </GlowingContainer>
  ) : (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #1a2a6c 0%, #2196F3 50%, #3F51B5 100%)",
        transition: "background 0.5s ease",
      }}
    >
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
                "&:hover": { transform: "translateX(5px)" },
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

            <Avatar
              src={profileData.profileImage || ""}
              onClick={handleAvatarClick}
              sx={{ cursor: "pointer", width: 40, height: 40 }}
            />
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={handleProfileOpen}>Profil</MenuItem>
              <MenuItem onClick={handleSignOut}>Çıkış Yap</MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        {showWelcome && (
          <Box
            sx={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              zIndex: 1300,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
            }}
          >
            <Lottie
              animationData={welcomeAnimation}
              style={{ width: 300, height: 300 }}
            />
            <Typography variant="h4" sx={{ color: "#fff", mt: 2 }}>
              Hoşgeldin, {profileData.username}!
            </Typography>
          </Box>
        )}

        <Dialog
          open={openProfileModal}
          onClose={handleProfileClose}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Profil Düzenle</DialogTitle>
          <DialogContent>
            <TextField
              margin="dense"
              label="Kullanıcı Adı"
              name="username"
              fullWidth
              value={profileData.username}
              onChange={handleProfileChange}
            />
            <TextField
              margin="dense"
              label="İsim"
              name="firstName"
              fullWidth
              value={profileData.firstName}
              onChange={handleProfileChange}
            />
            <TextField
              margin="dense"
              label="Soyisim"
              name="lastName"
              fullWidth
              value={profileData.lastName}
              onChange={handleProfileChange}
            />
            <TextField
              margin="dense"
              label="Boy"
              name="height"
              fullWidth
              value={profileData.height}
              onChange={handleProfileChange}
            />
            <TextField
              margin="dense"
              label="Kilo"
              name="weight"
              fullWidth
              value={profileData.weight}
              onChange={handleProfileChange}
            />
            <TextField
              margin="dense"
              label="Doğum Tarihi"
              name="birthDate"
              type="date"
              fullWidth
              value={profileData.birthDate}
              onChange={handleProfileChange}
              InputLabelProps={{ shrink: true }}
            />
            <Button variant="outlined" component="label" sx={{ mt: 2 }}>
              Profil Resmi Yükle
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleImageChange}
              />
            </Button>
            <Button
              variant="text"
              onClick={() => handlePasswordReset(user.email)}
              sx={{ mt: 2 }}
            >
              Şifre Değiştir
            </Button>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleProfileClose}>İptal</Button>
            <Button onClick={handleProfileSave}>Kaydet</Button>
          </DialogActions>
        </Dialog>

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
              "&.Mui-disabled": { opacity: 0 },
              "&:hover": { backgroundColor: "rgba(33, 150, 243, 0.08)" },
              "& .MuiSvgIcon-root": { fontSize: "1.5rem", color: "#2196F3" },
            },
          }}
        >
          <Tab
            label="Günlük Rutin"
            sx={{
              background: "#e6f7ff",
              borderRadius: "8px",
              "&:hover": { background: "#b3e5fc" },
            }}
          />
          <Tab
            label="Fitness Takip Paneli"
            sx={{
              background: "#fff3e0",
              borderRadius: "8px",
              "&:hover": { background: "#ffe0b2" },
            }}
          />
          <Tab
            label="Yaşam Kalitesi Paneli"
            sx={{
              background: "#e8f5e9",
              borderRadius: "8px",
              "&:hover": { background: "#c8e6c9" },
            }}
          />
          <Tab
            label="Takvim"
            sx={{
              background: "#fffde7",
              borderRadius: "8px",
              "&:hover": { background: "#fff9c4" },
            }}
          />
          <Tab
            label="Sağlıklı Yaşam Önerileri"
            sx={{
              background: "linear-gradient(135deg, #f0f8ff 0%, #e6f7ff 100%)",
              borderRadius: "8px",
              "&:hover": { background: "#b3e5fc" },
            }}
          />
        </Tabs>
        {activeTab === 0 && <DailyRoutine user={user} />}
        {activeTab === 1 && (
          <Exercises
            exercises={exercises}
            setExercises={setExercises}
            handleExerciseSubmit={handleExerciseSubmit}
            editingExercise={editingExercise}
            setEditingExercise={setEditingExercise}
          />
        )}
        {activeTab === 2 && <WellnessTracker user={user} />}
        {activeTab === 3 && <CalendarComponent user={user} />}
        {activeTab === 4 && (
          <ProTips
            additionalInfo={additionalInfo}
            setAdditionalInfo={setAdditionalInfo}
            user={user}
          />
        )}

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
            position: "relative",
            bottom: 0,
            left: 0,
            width: "100%",
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
              "&:hover": { transform: "translateX(5px)" },
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
    </Box>
  );
}

export default App;
