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
import HealthDashboard from "./components/health-dashboard/HealthDashboard";

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

// Styled Components
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

// Avatar API'den dönen avatar URL'lerini simüle eden sabit dizi
const generateAvatars = (count) =>
  Array.from(
    { length: count },
    (_, i) => `https://api.dicebear.com/6.x/adventurer/svg?seed=avatar${i + 1}`
  );

const availableAvatars = generateAvatars(200);

ChartJS.register(ArcElement, Tooltip, Legend, Title);

function App() {
  // Temel state'ler
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
  const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/firebase-messaging-sw.js")
      .then((registration) => {
        console.log("Firebase Messaging SW registered:", registration.scope);
        return getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration,
        });
      })
      .then((token) => {
        // token işlemleri
        console.log("Token alındı:", token);
      })
      .catch((err) => {
        console.error("Service Worker registration or token error:", err);
      });
  }

  // additionalInfo
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
          // Eğer doğum tarihi Firestore Timestamp ise, input formatına çevir
          if (
            data.profile &&
            data.profile.birthDate &&
            data.profile.birthDate.toDate
          ) {
            data.profile.birthDate = format(
              data.profile.birthDate.toDate(),
              "yyyy-MM-dd"
            );
          }
          isInitialLoad.current = false;
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
      } catch (error) {
        console.error("Veri yükleme hatası:", error);
      }
    };
    loadUserData();
  }, [user]);

  // Egzersiz Güncelleme
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
      }, 2000);
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

  // --- Avatar Menüsü & Profil Modal ---
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
          let prof = docSnap.data().profile;
          if (prof.birthDate?.toDate) {
            // Firestore Timestamp kontrolü
            prof.birthDate = format(prof.birthDate.toDate(), "yyyy-MM-dd");
          } else if (prof.birthDate?.includes("T")) {
            // ISO string kontrolü
            prof.birthDate = format(new Date(prof.birthDate), "yyyy-MM-dd");
          }
          setProfileData(prof);
        } else {
          setProfileData({
            username: user.email,
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
      // Hoşgeldin animasyonu: sadece ilk oturum açmada göster (localStorage kontrolü)
      if (!localStorage.getItem("welcomeShown")) {
        setShowWelcome(true);
        localStorage.setItem("welcomeShown", "true");
        setTimeout(() => setShowWelcome(false), 2500);
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
  // Dosya yükleme yerine avatar seçimi için buton ekliyoruz:
  const handleAvatarSelect = (url) => {
    setProfileData((prev) => ({ ...prev, profileImage: url }));
  };
  const handleImageChange = (e) => {
    // Kullanıcının fotoğraf yüklemesine izin vermiyoruz.
  };
  const handleProfileSave = async () => {
    try {
      const userDocRef = doc(db, "users", user.uid);
      const profileToSave = { ...profileData };

      // Doğum tarihini doğru formatta kaydet
      if (profileToSave.birthDate) {
        const [year, month, day] = profileToSave.birthDate.split("-");
        profileToSave.birthDate = new Date(year, month - 1, day);
      }

      await updateDoc(userDocRef, {
        profile: profileToSave,
      });
      toast.success("Profil başarıyla güncellendi");
      setOpenProfileModal(false);
    } catch (error) {
      toast.error("Güncelleme hatası: " + error.message);
    }
  };
  const handleSignOut = () => {
    auth.signOut();
    setUser(null);
    localStorage.removeItem("currentUser");
    localStorage.removeItem("welcomeShown"); // Çıkışta bayrağı temizle
    setAnchorEl(null);
  };

  if (!authChecked) return <div style={{ display: "none" }}></div>;
  if (showWelcome) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          background: "linear-gradient(135deg, #1a2a6c, #2196F3, #3F51B5)",
        }}
      >
        <Lottie
          animationData={welcomeAnimation}
          style={{ width: 300, height: 300 }}
        />
        <Typography variant="h4" sx={{ color: "#fff", mt: 2 }}>
          Hoşgeldin, {profileData.firstName || profileData.username}!
        </Typography>
      </Box>
    );
  }
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
              // Mobilde dikey yer kaplamaması için hep "row" yönünde düzenlendi
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: { xs: 1, sm: 0 },
              py: { xs: 1, sm: 1.5 },
              px: { xs: 2, sm: 4 },
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
                  fontSize: { xs: "0.8rem", sm: "1rem" },
                }}
              >
                {format(currentTime, "dd MMMM yyyy")}
              </Typography>
            </Box>

            <Box
              sx={{
                background: "rgba(255, 255, 255, 0.1)",
                backdropFilter: "blur(8px)",
                borderRadius: 3,
                padding: { xs: "4px 8px", sm: "8px 16px" },
                mr: { xs: "65px" },
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
              sx={{
                cursor: "pointer",
                width: { xs: 30, sm: 40 },
                height: { xs: 30, sm: 40 },
              }}
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

        <Dialog
          open={openProfileModal}
          onClose={handleProfileClose}
          fullWidth
          maxWidth="md"
          sx={{
            "& .MuiPaper-root": {
              background: "linear-gradient(145deg, #f0f8ff 0%, #e6f7ff 100%)",
              borderRadius: "20px",
              boxShadow: "0 8px 32px rgba(33, 150, 243, 0.2)",
            },
          }}
        >
          <DialogTitle
            sx={{
              background: "linear-gradient(45deg, #2196F3 30%, #3F51B5 90%)",
              color: "white",
              fontWeight: "bold",
              borderRadius: "20px 20px 0 0",
              py: 3,
              textAlign: "center",
            }}
          >
            Profil Düzenleme
          </DialogTitle>

          <DialogContent sx={{ pt: 3 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 3,
                my: 2,
              }}
            >
              <TextField
                label="Kullanıcı Adı"
                name="username"
                fullWidth
                value={profileData.username || ""}
                onChange={handleProfileChange}
                variant="outlined"
                sx={{ background: "rgba(255,255,255,0.9)" }}
              />
              <TextField
                label="İsim"
                name="firstName"
                fullWidth
                value={profileData.firstName || ""}
                onChange={handleProfileChange}
                variant="outlined"
                sx={{ background: "rgba(255,255,255,0.9)" }}
              />
              <TextField
                label="Soyisim"
                name="lastName"
                fullWidth
                value={profileData.lastName || ""}
                onChange={handleProfileChange}
                variant="outlined"
                sx={{ background: "rgba(255,255,255,0.9)" }}
              />
              <TextField
                label="Doğum Tarihi"
                name="birthDate"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={profileData.birthDate || ""}
                onChange={handleProfileChange}
                variant="outlined"
                sx={{ background: "rgba(255,255,255,0.9)" }}
              />
              <TextField
                label="Boy (cm)"
                name="height"
                type="number"
                fullWidth
                value={profileData.height || ""}
                onChange={handleProfileChange}
                variant="outlined"
                sx={{ background: "rgba(255,255,255,0.9)" }}
                inputProps={{ min: 0, max: 300 }}
              />
              <TextField
                label="Kilo (kg)"
                name="weight"
                type="number"
                fullWidth
                value={profileData.weight || ""}
                onChange={handleProfileChange}
                variant="outlined"
                sx={{ background: "rgba(255,255,255,0.9)" }}
                inputProps={{ min: 0, max: 500 }}
              />
            </Box>

            <Typography variant="h6" sx={{ mt: 2, mb: 1, color: "#2196F3" }}>
              Avatar Seçimi
            </Typography>

            <Box
              sx={{
                display: "flex",
                gap: 2,
                overflowX: "auto",
                pb: 2,
                "&::-webkit-scrollbar": {
                  height: "6px",
                },
                "&::-webkit-scrollbar-thumb": {
                  background: "#2196F3",
                  borderRadius: "4px",
                },
              }}
            >
              {availableAvatars?.map((url) => (
                <Avatar
                  key={url}
                  src={url}
                  alt="Profil avatarı"
                  sx={{
                    cursor: "pointer",
                    width: 80,
                    height: 80,
                    border:
                      profileData.profileImage === url
                        ? "3px solid #2196F3"
                        : "2px solid #e0e0e0",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "scale(1.1)",
                      boxShadow: "0 4px 15px rgba(33, 150, 243, 0.3)",
                    },
                  }}
                  onClick={() => handleAvatarSelect(url)}
                />
              ))}
            </Box>

            <Button
              onClick={() => handlePasswordReset(user?.email)}
              sx={{
                mt: 2,
                background: "linear-gradient(45deg, #2196F3 30%, #3F51B5 90%)",
                color: "white",
                "&:hover": {
                  transform: "scale(1.02)",
                  boxShadow: "0 3px 10px rgba(33, 150, 243, 0.5)",
                },
              }}
            >
              Şifre Sıfırlama Maili Gönder
            </Button>
          </DialogContent>

          <DialogActions
            sx={{
              px: 3,
              py: 2,
              background: "rgba(255,255,255,0.9)",
              borderRadius: "0 0 20px 20px",
            }}
          >
            <Button
              onClick={handleProfileClose}
              sx={{
                color: "#2196F3",
                border: "2px solid #2196F3",
                "&:hover": { background: "#2196F322" },
              }}
            >
              İptal
            </Button>
            <Button
              onClick={handleProfileSave}
              sx={{
                background: "linear-gradient(45deg, #2196F3 30%, #3F51B5 90%)",
                color: "white",
                ml: 1,
                "&:hover": {
                  boxShadow: "0 3px 10px rgba(33, 150, 243, 0.5)",
                },
              }}
            >
              Değişiklikleri Kaydet
            </Button>
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
            label="Yaşam Kalitesi Paneli"
            sx={{
              background: "#e8f5e9",
              borderRadius: "8px",
              "&:hover": { background: "#c8e6c9" },
            }}
          />
          <Tab
            label="Sağlık Panosu"
            sx={{
              background: "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)",
              borderRadius: "8px",
              "&:hover": { background: "#a5d6a7" },
            }}
          />
          <Tab
            label="Tarifler - Değerler - Hedefler"
            sx={{
              background: "linear-gradient(135deg, #f0f8ff 0%, #e6f7ff 100%)",
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
            label="Takvim"
            sx={{
              background: "#fffde7",
              borderRadius: "8px",
              "&:hover": { background: "#fff9c4" },
            }}
          />
        </Tabs>
        {activeTab === 0 && <DailyRoutine user={user} />}
        {activeTab === 1 && <WellnessTracker user={user} />}
        {activeTab === 2 && <HealthDashboard user={user} />}
        {activeTab === 3 && (
          <ProTips
            additionalInfo={additionalInfo}
            setAdditionalInfo={setAdditionalInfo}
            user={user}
          />
        )}
        {activeTab === 4 && (
          <Exercises
            exercises={exercises}
            setExercises={setExercises}
            handleExerciseSubmit={handleExerciseSubmit}
            editingExercise={editingExercise}
            setEditingExercise={setEditingExercise}
          />
        )}

        {activeTab === 5 && <CalendarComponent user={user} />}

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
