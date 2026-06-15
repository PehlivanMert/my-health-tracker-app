import React, { useState, useEffect, Suspense, lazy } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Box, Tabs, Tab, CircularProgress } from "@mui/material";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import HomeIcon from "@mui/icons-material/Home";
import FavoriteIcon from "@mui/icons-material/Favorite";
import DashboardIcon from "@mui/icons-material/Dashboard";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";

// Lazy loading the main components
const DailyRoutine = lazy(() => import("../components/daily-routine/DailyRoutine"));
const WellnessTracker = lazy(() => import("../components/wellnesstracker/WellnessTracker"));
const HealthDashboard = lazy(() => import("../components/health-dashboard/modern/ModernHealthDashboard"));
const Exercises = lazy(() => import("../components/exercises/exercise"));
const CalendarComponent = lazy(() => import("../components/calendar/CalendarComponent"));

const FallbackLoader = () => (
  <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
    <CircularProgress size={40} sx={{ color: "#2196F3" }} />
  </Box>
);

const AppRouter = ({ user, isPWA, exercises, setExercises, handleExerciseSubmit, editingExercise, setEditingExercise }) => {
  const [activeTab, setActiveTab] = useState(
    () => parseInt(localStorage.getItem("activeTab")) || 0
  );

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    localStorage.setItem("activeTab", newTab.toString());
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    // Mobil veya standalone kullanımda varsayılan tab'i ayarla
    if (window.innerWidth <= 768 && !localStorage.getItem("activeTab")) {
      setActiveTab(0);
      localStorage.setItem("activeTab", "0");
    }
  }, []);

  return (
    <React.Fragment>
      {isPWA ? (
        // --- PWA MODE: BOTTOM NAVIGATION ---
        <React.Fragment>
          {/* İçerik alanına ekstra alt boşluk eklenerek alt navigasyonun üzerine taşmaması sağlandı */}
          <Box sx={{ pb: 15, mt: 2 }}>
            <Suspense fallback={<FallbackLoader />}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
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
          </Box>

          <BottomNavigation
            showLabels
            value={activeTab}
            onChange={(event, newValue) => handleTabChange(newValue)}
            sx={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              height: "calc(64px + env(safe-area-inset-bottom, 0px))",
              pb: "env(safe-area-inset-bottom, 0px)",
              zIndex: 1300,
              borderTop: "1px solid #ccc",
              background:
                "linear-gradient(90deg, #2196F3 0%, #00BCD4 50%, #3F51B5 100%)",
            }}
          >
            <BottomNavigationAction
              sx={{
                flex: 1,
                minWidth: 0,
                "&.Mui-selected": {
                  backgroundColor: "transparent",
                  borderTop: "3px solid white",
                },
              }}
              label="Rutin"
              icon={<HomeIcon sx={{ color: "white", mt: "-4px" }} />}
            />
            <BottomNavigationAction
              sx={{
                flex: 1,
                minWidth: 0,
                "&.Mui-selected": {
                  backgroundColor: "transparent",
                  borderTop: "3px solid white",
                },
              }}
              label="Yaşam"
              icon={<FavoriteIcon sx={{ color: "white", mt: "-4px" }} />}
            />
            <BottomNavigationAction
              sx={{
                flex: 1,
                minWidth: 0,
                "&.Mui-selected": {
                  backgroundColor: "transparent",
                  borderTop: "3px solid white",
                },
              }}
              label="Sağlık"
              icon={<DashboardIcon sx={{ color: "white", mt: "-4px" }} />}
            />
            <BottomNavigationAction
              sx={{
                flex: 1,
                minWidth: 0,
                "&.Mui-selected": {
                  backgroundColor: "transparent",
                  borderTop: "3px solid white",
                },
              }}
              label="AI Egzersiz"
              icon={<FitnessCenterIcon sx={{ color: "white", mt: "-4px" }} />}
            />
            <BottomNavigationAction
              sx={{
                flex: 1,
                minWidth: 0,
                "&.Mui-selected": {
                  backgroundColor: "transparent",
                  borderTop: "3px solid white",
                },
              }}
              label="Takvim"
              icon={<CalendarMonthIcon sx={{ color: "white", mt: "-4px" }} />}
            />
          </BottomNavigation>
        </React.Fragment>
      ) : (
        // --- PWA dışı: TABS ---
        <React.Fragment>
          <Tabs
            value={activeTab}
            onChange={(event, newTab) => handleTabChange(newTab)}
            variant="scrollable"
            scrollButtons={false}
            sx={{
              height: "60px",
              minHeight: "60px",
              justifyContent: "center",
              background: "rgba(255, 255, 255, 0.05)",
              backdropFilter: "blur(10px)",
              position: "relative",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
              "&::after": {
                content: '""',
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "1px",
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
                fontSize: { xs: "0.8rem", md: "0.95rem" },
                margin: "0 5px",
                minWidth: "auto",
                padding: "10px 20px",
                borderRadius: "8px 8px 0 0",
                transition: "all 0.3s ease",
                color: "rgba(255, 255, 255, 0.7)",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  transform: "translateY(-2px)",
                  color: "#ffffff",
                },
                "&.Mui-selected": {
                  color: "#ffffff",
                  background: "rgba(255, 255, 255, 0.15)",
                  fontWeight: 700,
                },
              },
              "& .MuiTabScrollButton-root": {
                width: 48,
                transition: "all 0.3s ease",
                "&.Mui-disabled": { opacity: 0 },
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
            <Tab icon={<HomeIcon sx={{ fontSize: "1.0rem" }} />} label="Rutin" />
            <Tab icon={<FavoriteIcon sx={{ fontSize: "1.0rem" }} />} label="Yaşam" />
            <Tab icon={<DashboardIcon sx={{ fontSize: "1.0rem" }} />} label="Sağlık" />
            <Tab icon={<FitnessCenterIcon sx={{ fontSize: "1.0rem" }} />} label="AI Egzersiz" />
            <Tab icon={<CalendarMonthIcon sx={{ fontSize: "1.0rem" }} />} label="Takvim" />
          </Tabs>

          <Suspense fallback={<FallbackLoader />}>
            <AnimatePresence mode="wait">
              <Box sx={{ mt: 2, pb: 4 }}>
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
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
              </Box>
            </AnimatePresence>
          </Suspense>
        </React.Fragment>
      )}
    </React.Fragment>
  );
};

export default AppRouter;
