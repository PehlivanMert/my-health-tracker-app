import React, { useState, useEffect, useContext } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { ToastContainer, toast } from "react-toastify";
import Lottie from "lottie-react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Container,
  Paper,
} from "@mui/material";
import { styled, keyframes } from "@mui/material/styles";
import { motion } from "framer-motion";
import { FaEnvelope } from "react-icons/fa";

import "react-toastify/dist/ReactToastify.css";
import "tippy.js/dist/tippy.css";
import "./App.css";

// Firebase & Cache
import { auth } from "./components/auth/firebaseConfig";
import { signOut, sendEmailVerification } from "firebase/auth";
import {
  clearFirestoreCache,
} from "./utils/firestoreUtils";
import {
  cacheManager,
  clearPWACache,
  debugCache,
} from "./utils/cacheUtils";
import { requestNotificationPermissionAndSaveToken } from "./utils/notificationService";

// Context & Hooks
import { GlobalStateContext } from "./components/context/GlobalStateContext";
import { usePlatform } from "./hooks/usePlatform";
import { useAuthFlow } from "./hooks/useAuthFlow";
import { useProfile } from "./hooks/useProfile";
import { useExercises } from "./hooks/useExercises";

// Components
import UserAuth from "./components/auth/UserAuth";
import AppRouter from "./routes/AppRouter";
import WeatherWidget from "./utils/weather-theme-notify/WeatherWidget";
import NotificationSettingsDialog from "./utils/NotificationSettingsDialog";
import OnboardingTour from "./components/onboarding/OnboardingTour";
import BirthdayCelebration from "./utils/BirthdayCelebration.jsx";
import { ProfileDialog } from "./components/profile/ProfileDialog";
import { ProfileCompletionDialog } from "./components/profile/ProfileCompletionDialog";

// Assets
import background from "./assets/background.jpg";
import welcomeAnimation from "./assets/welcomeAnimation.json";

// Animasyonlar & Styled Components
const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
  100% { transform: translateY(0px); }
`;
const ripple = keyframes`
  0% { transform: scale(0.95); opacity: 0.7; }
  50% { transform: scale(1.05); opacity: 0.4; }
  100% { transform: scale(0.95); opacity: 0.7; }
`;
const GlowingContainer = styled(Container, {
  shouldForwardProp: (prop) => prop !== "glowColor",
})(({ theme, glowColor }) => ({
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

function App() {
  const { user, setUser } = useContext(GlobalStateContext);
  const { isPWA, platform, isMobile, isIOS } = usePlatform();
  const { authChecked, lastEmailSent, setLastEmailSent, remainingTime } =
    useAuthFlow();
  const {
    profileData,
    setProfileData,
    openProfileModal,
    setOpenProfileModal,
    openProfileCompletionModal,
    setOpenProfileCompletionModal,
    showBirthdayAnimation,
    handleProfileUpdate,
  } = useProfile(user);
  const {
    exercises,
    setExercises,
    editingExercise,
    setEditingExercise,
    handleExerciseSubmit,
  } = useExercises(user);

  const [openNotificationSettings, setOpenNotificationSettings] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showOnboardingTour, setShowOnboardingTour] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Zamanlayıcı
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Welcome Screen Logic
  useEffect(() => {
    if (user && user.emailVerified) {
      const welcomeAlreadyShown = localStorage.getItem("welcomeShown");
      if (!welcomeAlreadyShown) {
        setShowWelcome(true);
        localStorage.setItem("welcomeShown", "true");
        setTimeout(() => setShowWelcome(false), 3000);
      }
    }
  }, [user]);

  // Bildirim İzni
  useEffect(() => {
    if (user) {
      requestNotificationPermissionAndSaveToken(user);
    }
  }, [user]);

  // Onboarding listener
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      const handler = () => setShowOnboardingTour(true);
      window.addEventListener("openOnboardingTour", handler);
      return () => window.removeEventListener("openOnboardingTour", handler);
    }
  }, []);

  const handleResendEmail = async () => {
    try {
      await sendEmailVerification(auth.currentUser);
      const now = Date.now();
      localStorage.setItem("lastEmailSent", now);
      setLastEmailSent(now);
      toast.success("Doğrulama e-postası tekrar gönderildi.");
    } catch (error) {
      toast.error("Gönderme hatası: " + error.message);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
      localStorage.removeItem("activeTab");

      await clearFirestoreCache();
      cacheManager.clear();
      await clearPWACache();
      debugCache();

      if (process.env.NODE_ENV === "development") {
        console.log("✅ Başarıyla çıkış yapıldı ve cache temizlendi.");
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Çıkış hatası:", error);
      }
    }
  };

  const handleAvatarSelect = (url) => {
    setProfileData((prev) => ({ ...prev, profileImage: url }));
  };

  if (!authChecked) return <div style={{ display: "none" }}></div>;

  return (
    <>
      {showBirthdayAnimation && <BirthdayCelebration />}
      
      {!user ? (
        <Box
          sx={{
            minHeight: "100vh",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: `url(${background}) no-repeat center center`,
              backgroundSize: "cover",
              zIndex: -1,
            },
          }}
        >
          <GlowingContainer maxWidth="sm" sx={{ mt: 4 }} glowColor="#2196F3">
            <Box
              sx={{
                p: 4,
                backdropFilter: "blur(10px)",
                borderRadius: "24px",
                background: "rgba(255, 255, 255, 0.1)",
              }}
            >
              <UserAuth setUser={setUser} />
            </Box>
            <ToastContainer />
          </GlowingContainer>
        </Box>
      ) : !user.emailVerified ? (
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `url(${background}) no-repeat center center`,
            backgroundSize: "cover",
          }}
        >
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
              <Box sx={{ textAlign: "center" }}>
                <Box
                  component="h5"
                  sx={{
                    background:
                      "linear-gradient(45deg, #2196F3 30%, #3F51B5 90%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Email Doğrulama
                </Box>
                <Box component="p" sx={{ mb: 3, color: "rgba(255, 255, 255, 0.9)" }}>
                  Lütfen email adresinize gönderilen doğrulama linkine tıklayın.
                </Box>
                <AnimatedButton
                  onClick={handleResendEmail}
                  disabled={remainingTime > 0}
                >
                  {remainingTime > 0
                    ? `${remainingTime} saniye sonra tekrar deneyin`
                    : "Doğrulama Emailini Gönder"}
                </AnimatedButton>
              </Box>
              <AnimatedButton
                sx={{ mt: 2 }}
                variant="outlined"
                onClick={handleSignOut}
              >
                Çıkış Yap
              </AnimatedButton>
            </Paper>
            <ToastContainer />
          </GlowingContainer>
        </Box>
      ) : showWelcome ? (
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            background: `url(${background}) no-repeat center center`,
            backgroundSize: "cover",
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
              }}
            >
              <Toolbar
                sx={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: { xs: 1, sm: 0 },
                  py: { xs: 1, sm: 1.5 },
                  px: { xs: 2, sm: 4 },
                }}
              >
                <Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: "rgba(255, 255, 255, 0.95)",
                      fontSize: { xs: "0.8rem", sm: "1rem" },
                    }}
                  >
                    {format(currentTime, "dd MMMM yyyy", { locale: tr })}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    background: "rgba(255, 255, 255, 0.1)",
                    backdropFilter: "blur(8px)",
                    borderRadius: 3,
                    padding: { xs: "4px 8px", sm: "8px 16px" },
                  }}
                >
                  <WeatherWidget />
                </Box>

                <Box sx={{ position: "relative" }}>
                  <Avatar
                    src={profileData.profileImage || ""}
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    sx={{
                      cursor: "pointer",
                      width: { xs: 30, sm: 40 },
                      height: { xs: 30, sm: 40 },
                    }}
                  />
                  {anchorEl && (
                    <Menu
                      anchorEl={anchorEl}
                      open={Boolean(anchorEl)}
                      onClose={() => setAnchorEl(null)}
                      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                      transformOrigin={{ vertical: "top", horizontal: "right" }}
                      PaperProps={{
                        sx: {
                          background:
                            "linear-gradient(135deg, #2196F3 0%, #3F51B5 100%)",
                          borderRadius: 2,
                          boxShadow: "0 8px 32px rgba(33,150,243,0.3)",
                          minWidth: 200,
                          mt: 1,
                        },
                      }}
                    >
                      <MenuItem
                        onClick={() => {
                          setOpenProfileModal(true);
                          setAnchorEl(null);
                        }}
                        sx={{ color: "#fff", py: 1.5 }}
                      >
                        Profil
                      </MenuItem>
                      <MenuItem
                        onClick={() => {
                          setOpenNotificationSettings(true);
                          setAnchorEl(null);
                        }}
                        sx={{ color: "#fff", py: 1.5 }}
                      >
                        Bildirim Ayarları
                      </MenuItem>
                      <MenuItem
                        onClick={handleSignOut}
                        sx={{ color: "#fff", py: 1.5 }}
                      >
                        Çıkış Yap
                      </MenuItem>
                    </Menu>
                  )}
                </Box>
              </Toolbar>
            </AppBar>

            <ProfileDialog
              open={openProfileModal}
              onClose={() => setOpenProfileModal(false)}
              profileData={profileData}
              handleProfileChange={(e) => {
                const { name, value } = e.target;
                setProfileData((prev) => ({ ...prev, [name]: value }));
              }}
              handleAvatarSelect={handleAvatarSelect}
              handleProfileSave={() => handleProfileUpdate(profileData)}
            />

            <ProfileCompletionDialog
              open={openProfileCompletionModal}
              profileData={profileData}
              handleProfileChange={(e) => {
                const { name, value } = e.target;
                setProfileData((prev) => ({ ...prev, [name]: value }));
              }}
              handleProfileSave={() => {
                handleProfileUpdate(profileData);
                setShowOnboardingTour(true);
              }}
            />

            <AppRouter
              user={user}
              isPWA={isPWA}
              exercises={exercises}
              setExercises={setExercises}
              handleExerciseSubmit={handleExerciseSubmit}
              editingExercise={editingExercise}
              setEditingExercise={setEditingExercise}
            />

            {!isPWA && (
              <Box
                component="footer"
                sx={{
                  position: "relative",
                  background:
                    "linear-gradient(135deg, #1a2a6c 0%, #2196F3 50%, #3F51B5 100%)",
                  py: 3,
                  px: 2,
                }}
              >
                <Container maxWidth="lg">
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ color: "rgba(255,255,255,0.7)" }}
                    >
                      © {new Date().getFullYear()} StayHealthyWith.me
                    </Typography>
                  </Box>
                </Container>
              </Box>
            )}

            <ToastContainer
              position="bottom-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
            />

            <OnboardingTour
              open={showOnboardingTour}
              onClose={() => setShowOnboardingTour(false)}
              user={user}
              isDevMode={process.env.NODE_ENV === "development"}
            />
          </div>
        </Box>
      )}
    </>
  );
}

export default App;
