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
} from "@mui/material";
import { styled, keyframes } from "@mui/material/styles";
import { motion } from "framer-motion";

import "react-toastify/dist/ReactToastify.css";
import "tippy.js/dist/tippy.css";
import "./App.css";

// Firebase & Cache
import { auth } from "./components/auth/firebaseConfig";
import { signOut, sendEmailVerification } from "firebase/auth";
import { clearFirestoreCache } from "./utils/firestoreUtils";
import { cacheManager, clearPWACache, debugCache } from "./utils/cacheUtils";
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

// ─── Animasyonlar ───
const ripple = keyframes`
  0%   { transform: scale(0.95); opacity: 0.7; }
  50%  { transform: scale(1.05); opacity: 0.4; }
  100% { transform: scale(0.95); opacity: 0.7; }
`;

// ─── Styled Components ───
const GlassContainer = styled(Container)(() => ({
  position: "relative",
  background: "rgba(10, 15, 30, 0.75)",
  backdropFilter: "blur(28px)",
  WebkitBackdropFilter: "blur(28px)",
  borderRadius: "28px",
  overflow: "hidden",
  border: "1px solid rgba(255, 255, 255, 0.10)",
  boxShadow: "0 32px 64px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
  transition: "box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    boxShadow: "0 40px 80px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255,255,255,0.08)",
  },
}));

const PrimaryButton = styled(Button)(() => ({
  background: "linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)",
  border: 0,
  borderRadius: 14,
  boxShadow: "0 4px 20px rgba(99, 102, 241, 0.35)",
  color: "#ffffff",
  padding: "12px 32px",
  fontWeight: 700,
  fontSize: "0.95rem",
  letterSpacing: "0.01em",
  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
  position: "relative",
  overflow: "hidden",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: "0 8px 28px rgba(99, 102, 241, 0.5)",
  },
  "&:active": {
    transform: "translateY(0)",
  },
  "&.Mui-disabled": {
    background: "rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.4)",
    boxShadow: "none",
  },
  "&::after": {
    content: '""',
    position: "absolute",
    top: "-50%",
    left: "-50%",
    width: "200%",
    height: "200%",
    background: "linear-gradient(45deg, transparent, rgba(255,255,255,0.08), transparent)",
    transform: "rotate(45deg)",
    animation: `${ripple} 3s infinite`,
  },
}));

function App() {
  const { user, setUser } = useContext(GlobalStateContext);
  const { isPWA, platform, isMobile, isIOS } = usePlatform();
  const { authChecked, lastEmailSent, setLastEmailSent, remainingTime } = useAuthFlow();
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

  // Onboarding listener (dev only)
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

  if (!authChecked) return <div style={{ display: "none" }} />;

  // ─── Auth Ekranı (giriş yapılmamış) ───
  if (!user) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          position: "relative",
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            background: `url(${background}) no-repeat center center / cover`,
            zIndex: -2,
          },
          "&::after": {
            content: '""',
            position: "absolute",
            inset: 0,
            background: "rgba(10, 15, 30, 0.65)",
            zIndex: -1,
          },
        }}
      >
        <GlassContainer maxWidth="sm" sx={{ mt: 4 }}>
          <Box sx={{ p: { xs: 3, sm: 4 } }}>
            <UserAuth setUser={setUser} />
          </Box>
        </GlassContainer>
        <ToastContainer position="bottom-right" autoClose={3000} theme="dark" />
      </Box>
    );
  }

  // ─── Email Doğrulama Bekleniyor ───
  if (!user.emailVerified) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            background: `url(${background}) no-repeat center center / cover`,
            zIndex: -2,
          },
          "&::after": {
            content: '""',
            position: "absolute",
            inset: 0,
            background: "rgba(10, 15, 30, 0.65)",
            zIndex: -1,
          },
        }}
      >
        <GlassContainer maxWidth="sm" sx={{ mt: 4 }}>
          <Box sx={{ p: { xs: 3, sm: 4 }, textAlign: "center" }}>
            {/* İkon */}
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #6366f1, #06b6d4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 3,
                fontSize: "2rem",
                boxShadow: "0 8px 24px rgba(99,102,241,0.4)",
              }}
            >
              ✉️
            </Box>

            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                background: "linear-gradient(135deg, #6366f1, #06b6d4)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                mb: 1,
              }}
            >
              Email Doğrulama
            </Typography>

            <Typography sx={{ color: "rgba(255,255,255,0.7)", mb: 4, fontSize: "0.95rem" }}>
              Lütfen email adresinize gönderilen doğrulama linkine tıklayın.
            </Typography>

            <PrimaryButton
              onClick={handleResendEmail}
              disabled={remainingTime > 0}
              fullWidth
              sx={{ mb: 2 }}
            >
              {remainingTime > 0
                ? `${remainingTime} saniye sonra tekrar deneyin`
                : "Doğrulama Emailini Gönder"}
            </PrimaryButton>

            <Button
              variant="text"
              onClick={handleSignOut}
              fullWidth
              sx={{
                color: "rgba(255,255,255,0.5)",
                fontSize: "0.85rem",
                "&:hover": { color: "rgba(255,255,255,0.8)" },
              }}
            >
              Çıkış Yap
            </Button>
          </Box>
        </GlassContainer>
        <ToastContainer position="bottom-right" autoClose={3000} theme="dark" />
      </Box>
    );
  }

  // ─── Welcome Animasyonu ───
  if (showWelcome) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ textAlign: "center" }}
        >
          <Lottie animationData={welcomeAnimation} style={{ width: 280, height: 280 }} />
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              background: "linear-gradient(135deg, #6366f1, #06b6d4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              mt: 2,
            }}
          >
            Hoşgeldin, {profileData.firstName || profileData.username}!
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.5)", mt: 1 }}>
            Sağlıklı bir güne hazır mısın?
          </Typography>
        </motion.div>
      </Box>
    );
  }

  // ─── Ana Uygulama ───
  return (
    <>
      {showBirthdayAnimation && <BirthdayCelebration />}

      <Box
        sx={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)",
          backgroundAttachment: "fixed",
        }}
      >
        {/* ── App Bar ── */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            top: 0,
            zIndex: 1200,
            background: "rgba(15, 23, 42, 0.80)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 4px 24px rgba(0, 0, 0, 0.3)",
          }}
        >
          <Toolbar
            sx={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              py: { xs: 1, sm: 1.5 },
              px: { xs: 2, sm: 3 },
              minHeight: { xs: 56, sm: 64 },
            }}
          >
            {/* Sol: Tarih */}
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: "rgba(255, 255, 255, 0.85)",
                  fontSize: { xs: "0.75rem", sm: "0.875rem" },
                  letterSpacing: "0.02em",
                }}
              >
                {format(currentTime, "dd MMMM yyyy", { locale: tr })}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: "rgba(255,255,255,0.45)",
                  fontSize: { xs: "0.65rem", sm: "0.75rem" },
                }}
              >
                {format(currentTime, "EEEE", { locale: tr })}
              </Typography>
            </Box>

            {/* Orta: Hava Durumu */}
            <Box
              sx={{
                background: "rgba(255,255,255,0.08)",
                borderRadius: 2,
                px: { xs: 1, sm: 2 },
                py: 0.75,
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              <WeatherWidget />
            </Box>

            {/* Sağ: Avatar + Menü */}
            <Box sx={{ position: "relative" }}>
              <Avatar
                src={profileData.profileImage || ""}
                onClick={(e) => setAnchorEl(e.currentTarget)}
                sx={{
                  cursor: "pointer",
                  width: { xs: 34, sm: 42 },
                  height: { xs: 34, sm: 42 },
                  border: "2px solid rgba(99,102,241,0.6)",
                  boxShadow: "0 0 0 3px rgba(99,102,241,0.15)",
                  transition: "all 0.2s",
                  "&:hover": {
                    borderColor: "rgba(99,102,241,0.9)",
                    transform: "scale(1.06)",
                  },
                }}
              />
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                PaperProps={{
                  sx: {
                    background: "rgba(15, 23, 42, 0.92)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    borderRadius: "16px",
                    border: "1px solid rgba(255,255,255,0.10)",
                    boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
                    minWidth: 200,
                    mt: 1.5,
                    "& .MuiMenuItem-root": {
                      borderRadius: "10px",
                      mx: 1,
                      my: 0.5,
                      px: 2,
                      py: 1.5,
                      color: "rgba(255,255,255,0.85)",
                      fontSize: "0.9rem",
                      fontWeight: 500,
                      transition: "background 0.15s",
                      "&:hover": {
                        background: "rgba(99,102,241,0.15)",
                        color: "#fff",
                      },
                    },
                  },
                }}
              >
                <MenuItem
                  onClick={() => {
                    setOpenProfileModal(true);
                    setAnchorEl(null);
                  }}
                >
                  👤 &nbsp; Profil
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setOpenNotificationSettings(true);
                    setAnchorEl(null);
                  }}
                >
                  🔔 &nbsp; Bildirim Ayarları
                </MenuItem>
                <MenuItem
                  onClick={handleSignOut}
                  sx={{ color: "rgba(248,113,113,0.85) !important", "&:hover": { background: "rgba(239,68,68,0.12) !important" } }}
                >
                  🚪 &nbsp; Çıkış Yap
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </AppBar>

        {/* ── Profil Dialogları ── */}
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

        {/* ── İçerik / Router ── */}
        <AppRouter
          user={user}
          isPWA={isPWA}
          exercises={exercises}
          setExercises={setExercises}
          handleExerciseSubmit={handleExerciseSubmit}
          editingExercise={editingExercise}
          setEditingExercise={setEditingExercise}
        />

        {/* ── Footer (sadece web modu) ── */}
        {!isPWA && (
          <Box
            component="footer"
            sx={{
              py: 3,
              px: 2,
              textAlign: "center",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(15,23,42,0.6)",
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem" }}
            >
              © {new Date().getFullYear()} StayHealthyWith.me
            </Typography>
          </Box>
        )}

        {/* ── Toast ── */}
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
          theme="dark"
          toastStyle={{
            background: "rgba(15,23,42,0.95)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: "14px",
            color: "#f8fafc",
          }}
        />

        <OnboardingTour
          open={showOnboardingTour}
          onClose={() => setShowOnboardingTour(false)}
          user={user}
          isDevMode={process.env.NODE_ENV === "development"}
        />
      </Box>
    </>
  );
}

export default App;
