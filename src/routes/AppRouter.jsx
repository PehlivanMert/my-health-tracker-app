import React, { useState, useEffect, Suspense, lazy } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Box, CircularProgress } from "@mui/material";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import HomeIcon from "@mui/icons-material/Home";
import FavoriteIcon from "@mui/icons-material/Favorite";
import DashboardIcon from "@mui/icons-material/Dashboard";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";

// Lazy loaded pages
const DailyRoutine = lazy(() => import("../components/daily-routine/DailyRoutine"));
const WellnessTracker = lazy(() => import("../components/wellnesstracker/WellnessTracker"));
const HealthDashboard = lazy(() => import("../components/health-dashboard/modern/ModernHealthDashboard"));
const Exercises = lazy(() => import("../components/exercises/exercise"));
const CalendarComponent = lazy(() => import("../components/calendar/CalendarComponent"));

// ─── Tab definitions ───
const TABS = [
  { label: "Rutin", icon: HomeIcon },
  { label: "Yaşam", icon: FavoriteIcon },
  { label: "Sağlık", icon: DashboardIcon },
  { label: "AI Egzersiz", icon: FitnessCenterIcon },
  { label: "Takvim", icon: CalendarMonthIcon },
];

// ─── Fallback Loader ───
const FallbackLoader = () => (
  <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
    <CircularProgress
      size={36}
      thickness={4}
      sx={{ color: "#6366f1" }}
    />
  </Box>
);

// ─── Page transition variants ───
const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.18, ease: [0.4, 0, 0.2, 1] } },
};

const AppRouter = ({
  user,
  isPWA,
  exercises,
  setExercises,
  handleExerciseSubmit,
  editingExercise,
  setEditingExercise,
}) => {
  const [activeTab, setActiveTab] = useState(
    () => parseInt(localStorage.getItem("activeTab")) || 0
  );

  useEffect(() => {
    if (window.innerWidth <= 768 && !localStorage.getItem("activeTab")) {
      setActiveTab(0);
      localStorage.setItem("activeTab", "0");
    }
  }, []);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    localStorage.setItem("activeTab", newTab.toString());
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ─── Page content renderer ───
  const renderPage = () => (
    <Suspense fallback={<FallbackLoader />}>
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} variants={pageVariants} initial="initial" animate="animate" exit="exit">
          {activeTab === 0 && <DailyRoutine user={user} />}
          {activeTab === 1 && <WellnessTracker user={user} />}
          {activeTab === 2 && <HealthDashboard user={user} />}
          {activeTab === 3 && (
            <Exercises
              user={user}
              exercises={exercises}
              setExercises={setExercises}
              handleExerciseSubmit={handleExerciseSubmit}
              editingExercise={editingExercise}
              setEditingExercise={setEditingExercise}
            />
          )}
          {activeTab === 4 && <CalendarComponent user={user} />}
        </motion.div>
      </AnimatePresence>
    </Suspense>
  );

  // ──────────────────────────────────────────────
  // PWA MODE — bottom navigation
  // ──────────────────────────────────────────────
  if (isPWA) {
    return (
      <>
        {/* İçerik — alt nav yüksekliği + safe-area için padding */}
        <Box sx={{ pb: "calc(64px + env(safe-area-inset-bottom, 0px))", pt: 2, px: { xs: 1, sm: 2 } }}>
          {renderPage()}
        </Box>

        <BottomNavigation
          showLabels
          value={activeTab}
          onChange={(_, newValue) => handleTabChange(newValue)}
          sx={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            height: "calc(64px + env(safe-area-inset-bottom, 0px))",
            pb: "env(safe-area-inset-bottom, 0px)",
            zIndex: 1300,
            background: "rgba(15, 23, 42, 0.92)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 -4px 24px rgba(0,0,0,0.4)",
            "& .MuiBottomNavigationAction-root": {
              flex: 1,
              minWidth: 0,
              color: "rgba(255,255,255,0.4)",
              fontSize: "0.65rem",
              transition: "all 0.2s",
              "&:hover": { color: "rgba(255,255,255,0.7)" },
              "&.Mui-selected": {
                color: "#818cf8",
                "& .MuiBottomNavigationAction-label": { fontWeight: 700 },
              },
              "& .MuiSvgIcon-root": { fontSize: "1.4rem", mb: "2px" },
              "& .MuiBottomNavigationAction-label": { fontSize: "0.65rem" },
            },
            // Seçili sekme üstüne indicator çizgisi
            "& .Mui-selected::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: "15%",
              right: "15%",
              height: "2px",
              borderRadius: "0 0 2px 2px",
              background: "linear-gradient(90deg, #6366f1, #06b6d4)",
            },
          }}
        >
          {TABS.map(({ label, icon: Icon }) => (
            <BottomNavigationAction
              key={label}
              label={label}
              icon={<Icon />}
              sx={{ position: "relative" }}
            />
          ))}
        </BottomNavigation>
      </>
    );
  }

  // ──────────────────────────────────────────────
  // WEB MODE — top tabs
  // ──────────────────────────────────────────────
  return (
    <>
      {/* Navigation Tabs */}
      <Box
        sx={{
          position: "sticky",
          top: { xs: 56, sm: 64 },
          zIndex: 1100,
          background: "rgba(15, 23, 42, 0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: { xs: "flex-start", md: "center" },
            gap: 0.5,
            px: { xs: 1, sm: 2 },
            overflowX: "auto",
            "&::-webkit-scrollbar": { display: "none" },
            scrollbarWidth: "none",
          }}
        >
          {TABS.map(({ label, icon: Icon }, index) => {
            const isActive = activeTab === index;
            return (
              <Box
                key={label}
                component="button"
                onClick={() => handleTabChange(index)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  px: { xs: 1.5, sm: 2.5 },
                  py: 1.75,
                  border: "none",
                  borderBottom: isActive
                    ? "2px solid #818cf8"
                    : "2px solid transparent",
                  background: "transparent",
                  color: isActive ? "#818cf8" : "rgba(255,255,255,0.45)",
                  fontFamily: "inherit",
                  fontSize: { xs: "0.78rem", sm: "0.875rem" },
                  fontWeight: isActive ? 700 : 500,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  borderRadius: "0",
                  flexShrink: 0,
                  "&:hover": {
                    color: isActive ? "#818cf8" : "rgba(255,255,255,0.75)",
                    background: "rgba(255,255,255,0.04)",
                  },
                }}
              >
                <Icon sx={{ fontSize: "1rem" }} />
                {label}
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Page Content */}
      <Box sx={{ px: { xs: 1, sm: 2 }, py: 3, pb: 6 }}>
        {renderPage()}
      </Box>
    </>
  );
};

export default AppRouter;
