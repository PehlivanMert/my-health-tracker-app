// src/components/daily-routine/AdvancedTimer.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  CircularProgress,
  IconButton,
  Snackbar,
  Alert,
  Switch,
  FormControlLabel,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Divider,
  Slider,
  Grid,
  Badge,
  Chip,
  Paper,
} from "@mui/material";
import { ThemeProvider, createTheme, alpha } from "@mui/material/styles";
import {
  PlayArrow,
  Pause,
  Refresh,
  Settings,
  Done,
  VolumeUp,
  VolumeOff,
  DarkMode,
  LightMode,
  Notifications,
  NotificationsOff,
  History,
  Close,
  Save,
  SkipNext,
  Timer,
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import { db } from "../auth/firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { NOTIFICATION_SOUNDS } from "../../utils/notificationSound";

// Zamanlayıcı modları ve sabitleri
const TIMER_MODES = {
  POMODORO: "Pomodoro",
  FLOWTIME: "Flowtime",
  CUSTOM: "Custom",
  FIFTY_TWO_SEVENTEEN: "52/17",
  NINETY_THIRTY: "90/30",
};

const STORAGE_KEYS = {
  SETTINGS: "advanced_timer_settings",
  HISTORY: "advanced_timer_history",
  THEME: "advanced_timer_theme",
};

const PRESET_SETTINGS = {
  CLASSIC_POMODORO: {
    name: "Klasik Pomodoro",
    mode: TIMER_MODES.POMODORO,
    workDuration: 25 * 60,
    breakDuration: 5 * 60,
    longBreakDuration: 15 * 60,
    sessionsBeforeLongBreak: 4,
  },
  FIFTY_TWO_SEVENTEEN: {
    name: "52/17 Metodu",
    mode: TIMER_MODES.FIFTY_TWO_SEVENTEEN,
    workDuration: 52 * 60,
    breakDuration: 17 * 60,
  },
  NINETY_THIRTY: {
    name: "90/30 Bloklama",
    mode: TIMER_MODES.NINETY_THIRTY,
    workDuration: 90 * 60,
    breakDuration: 30 * 60,
  },
  ULTRA_FOCUS: {
    name: "Ultra Odaklanma",
    mode: TIMER_MODES.POMODORO,
    workDuration: 45 * 60,
    breakDuration: 15 * 60,
    longBreakDuration: 30 * 60,
    sessionsBeforeLongBreak: 3,
  },
  QUICK_SESSIONS: {
    name: "Hızlı Oturumlar",
    mode: TIMER_MODES.POMODORO,
    workDuration: 15 * 60,
    breakDuration: 3 * 60,
    longBreakDuration: 10 * 60,
    sessionsBeforeLongBreak: 6,
  },
  DEEP_WORK: {
    name: "Derin Çalışma",
    mode: TIMER_MODES.POMODORO,
    workDuration: 60 * 60,
    breakDuration: 10 * 60,
    longBreakDuration: 20 * 60,
    sessionsBeforeLongBreak: 2,
  },
  FLOWTIME_DEFAULT: {
    name: "Flowtime (Varsayılan)",
    mode: TIMER_MODES.FLOWTIME,
    workDuration: 0, // Flowtime'da çalışma süresi dinamik
    breakDuration: 10 * 60,
  },
  CUSTOM_25_10: {
    name: "Özel 25/10",
    mode: TIMER_MODES.CUSTOM,
    workDuration: 25 * 60,
    breakDuration: 10 * 60,
    longBreakDuration: 20 * 60,
    sessionsBeforeLongBreak: 4,
  },
  CUSTOM_30_5: {
    name: "Özel 30/5",
    mode: TIMER_MODES.CUSTOM,
    workDuration: 30 * 60,
    breakDuration: 5 * 60,
    longBreakDuration: 15 * 60,
    sessionsBeforeLongBreak: 4,
  },
};

const AdvancedTimer = ({ user }) => {
  // REFERANSLAR ve STATE tanımlamaları
  const userId = user ? user.uid : null;
  const timerRef = useRef(null);
  const audioRef = useRef(new Audio());
  const windowFocusRef = useRef(true);
  const notificationPermissionRef = useRef("default");
  const confettiRef = useRef(null);
  const debounceTimeoutRef = useRef(null);

  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
    return savedTheme
      ? JSON.parse(savedTheme)
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [mode, setMode] = useState(TIMER_MODES.POMODORO);
  const [workDuration, setWorkDuration] = useState(25 * 60);
  const [breakDuration, setBreakDuration] = useState(5 * 60);
  const [longBreakDuration, setLongBreakDuration] = useState(15 * 60);
  const [sessionsBeforeLongBreak, setSessionsBeforeLongBreak] = useState(4);
  const [timer, setTimer] = useState(workDuration);
  const [initialTimer, setInitialTimer] = useState(workDuration);
  const [isWorking, setIsWorking] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [isLongBreak, setIsLongBreak] = useState(false);
  const [targetTime, setTargetTime] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [autoStartBreaks, setAutoStartBreaks] = useState(true);
  const [autoStartPomodoros, setAutoStartPomodoros] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentSound, setCurrentSound] = useState(NOTIFICATION_SOUNDS.BELL);
  const [selectedPreset, setSelectedPreset] = useState("CLASSIC_POMODORO");
  const [history, setHistory] = useState(() => {
    const savedHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);
    return savedHistory ? JSON.parse(savedHistory) : [];
  });

  // MUI tema tanımlaması
  const theme = createTheme({
    palette: {
      mode: darkMode ? "dark" : "light",
      primary: { main: "#1976d2" },
      secondary: { main: "#dc004e" },
      success: { main: "#4caf50" },
      background: {
        default: darkMode ? "#121212" : "#f5f5f5",
        paper: darkMode ? "#1e1e1e" : "#ffffff",
      },
    },
    typography: {
      fontFamily: "'Roboto', 'Helvetica', 'Arial', sans-serif",
      h4: { fontWeight: 600 },
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            transition: "all 0.3s ease",
            boxShadow: darkMode
              ? "0 8px 32px rgba(0, 0, 0, 0.5)"
              : "0 8px 32px rgba(0, 0, 0, 0.1)",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            textTransform: "none",
            fontWeight: 600,
            padding: "8px 16px",
          },
        },
      },
    },
  });

  // Firestore'a kaydetme yardımcı fonksiyonu (merge ile güncelleme)
  const saveToFirestore = async (settings) => {
    if (!user || !user.uid) {
      console.warn("Kullanıcı bilgisi yok, Firestore kaydı atlanıyor.");
      return;
    }
    try {
      await setDoc(
        doc(db, "users", user.uid, "advancedTimer", "state"),
        settings,
        { merge: true }
      );
    } catch (error) {
      console.error("Firestore kaydetme hatası:", error);
    }
  };

  // STATE'i hem localStorage'a hem de Firestore'a debounce ile kaydetme
  const saveState = useCallback(() => {
    const settings = {
      mode,
      workDuration,
      breakDuration,
      longBreakDuration,
      sessionsBeforeLongBreak,
      autoStartBreaks,
      autoStartPomodoros,
      notificationsEnabled,
      soundEnabled,
      currentSound: currentSound.name,
      isRunning,
      isWorking,
      completedSessions,
      isLongBreak,
      selectedPreset,
      targetTime,
      history,
      darkMode,
    };
    if (!isRunning) {
      settings.remainingTime = timer;
    }
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(darkMode));
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));

    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => {
      saveToFirestore(settings);
    }, 2000);
  }, [
    mode,
    workDuration,
    breakDuration,
    longBreakDuration,
    sessionsBeforeLongBreak,
    autoStartBreaks,
    autoStartPomodoros,
    notificationsEnabled,
    soundEnabled,
    currentSound,
    isRunning,
    isWorking,
    completedSessions,
    isLongBreak,
    darkMode,
    history,
    darkMode,
  ]);

  useEffect(() => {
    saveState();
  }, [
    mode,
    workDuration,
    breakDuration,
    longBreakDuration,
    sessionsBeforeLongBreak,
    autoStartBreaks,
    autoStartPomodoros,
    notificationsEnabled,
    soundEnabled,
    currentSound,
    isRunning,
    isWorking,
    completedSessions,
    isLongBreak,
    selectedPreset,
    targetTime,
    history,
    darkMode,
    saveState,
  ]);

  // Sayfa kapanmadan önce son durumu Firestore'a anında kaydet
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        const settings = {
          mode,
          workDuration,
          breakDuration,
          longBreakDuration,
          sessionsBeforeLongBreak,
          autoStartBreaks,
          autoStartPomodoros,
          notificationsEnabled,
          soundEnabled,
          currentSound: currentSound.name,
          isRunning,
          isWorking,
          completedSessions,
          isLongBreak,
          selectedPreset,
          targetTime,
          history,
          darkMode,
        };
        if (!isRunning) {
          settings.remainingTime = timer;
        }
        saveToFirestore(settings);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [
    mode,
    workDuration,
    breakDuration,
    longBreakDuration,
    sessionsBeforeLongBreak,
    autoStartBreaks,
    autoStartPomodoros,
    notificationsEnabled,
    soundEnabled,
    currentSound,
    isRunning,
    isWorking,
    completedSessions,
    isLongBreak,
    selectedPreset,
    targetTime,
    history,
    darkMode,
    timer,
  ]);

  // Firestore'dan state'i tek seferlik okuma
  useEffect(() => {
    if (!user || !user.uid) return;
    const loadStateFromFirestore = async () => {
      try {
        const docRef = doc(db, "users", user.uid, "advancedTimer", "state");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const settings = docSnap.data();
          setMode(settings.mode || TIMER_MODES.POMODORO);
          setWorkDuration(settings.workDuration || 25 * 60);
          setBreakDuration(settings.breakDuration || 5 * 60);
          setLongBreakDuration(settings.longBreakDuration || 15 * 60);
          setSessionsBeforeLongBreak(settings.sessionsBeforeLongBreak || 4);
          setAutoStartBreaks(
            settings.autoStartBreaks !== undefined
              ? settings.autoStartBreaks
              : true
          );
          setAutoStartPomodoros(settings.autoStartPomodoros || false);
          setNotificationsEnabled(
            settings.notificationsEnabled !== undefined
              ? settings.notificationsEnabled
              : true
          );
          setSoundEnabled(
            settings.soundEnabled !== undefined ? settings.soundEnabled : true
          );
          const savedSound = settings.currentSound || "Bell";
          const foundSound = Object.values(NOTIFICATION_SOUNDS).find(
            (sound) => sound.name === savedSound
          );
          setCurrentSound(foundSound || NOTIFICATION_SOUNDS.BELL);
          setSelectedPreset(settings.selectedPreset || "CLASSIC_POMODORO");
          setHistory(settings.history || []);
          setDarkMode(
            settings.darkMode !== undefined ? settings.darkMode : darkMode
          );
          if (settings.isRunning && settings.targetTime) {
            const remaining = Math.round(
              (settings.targetTime - Date.now()) / 1000
            );
            setTimer(remaining > 0 ? remaining : 0);
            setTargetTime(settings.targetTime);
            setIsRunning(true);
            setIsWorking(
              settings.isWorking !== undefined ? settings.isWorking : true
            );
            setCompletedSessions(settings.completedSessions || 0);
            setIsLongBreak(settings.isLongBreak || false);
          } else if (settings.remainingTime !== undefined) {
            setTimer(settings.remainingTime);
            setTargetTime(null);
            setIsRunning(false);
          } else {
            resetTimer();
          }
        } else {
          const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
          if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            setMode(settings.mode || TIMER_MODES.POMODORO);
            setWorkDuration(settings.workDuration || 25 * 60);
            setBreakDuration(settings.breakDuration || 5 * 60);
            setLongBreakDuration(settings.longBreakDuration || 15 * 60);
            setSessionsBeforeLongBreak(settings.sessionsBeforeLongBreak || 4);
            setAutoStartBreaks(
              settings.autoStartBreaks !== undefined
                ? settings.autoStartBreaks
                : true
            );
            setAutoStartPomodoros(settings.autoStartPomodoros || false);
            setNotificationsEnabled(
              settings.notificationsEnabled !== undefined
                ? settings.notificationsEnabled
                : true
            );
            setSoundEnabled(
              settings.soundEnabled !== undefined ? settings.soundEnabled : true
            );
            const savedSound = settings.currentSound || "Bell";
            const foundSound = Object.values(NOTIFICATION_SOUNDS).find(
              (sound) => sound.name === savedSound
            );
            setCurrentSound(foundSound || NOTIFICATION_SOUNDS.BELL);
            setSelectedPreset(settings.selectedPreset || "CLASSIC_POMODORO");
            setHistory(settings.history || []);
            setDarkMode(
              settings.darkMode !== undefined ? settings.darkMode : darkMode
            );
            if (settings.isRunning && settings.targetTime) {
              const remaining = Math.round(
                (settings.targetTime - Date.now()) / 1000
              );
              setTimer(remaining > 0 ? remaining : 0);
              setTargetTime(settings.targetTime);
              setIsRunning(true);
              setIsWorking(
                settings.isWorking !== undefined ? settings.isWorking : true
              );
              setCompletedSessions(settings.completedSessions || 0);
              setIsLongBreak(settings.isLongBreak || false);
            } else if (settings.remainingTime !== undefined) {
              setTimer(settings.remainingTime);
              setTargetTime(null);
              setIsRunning(false);
            } else {
              resetTimer();
            }
          }
        }
      } catch (error) {
        console.error("Firestore okuma hatası:", error);
      }
    };

    loadStateFromFirestore();
  }, [user]);

  // Bildirim izinleri ve sayfa görünürlüğü
  useEffect(() => {
    const checkNotificationPermission = async () => {
      if ("Notification" in window) {
        const permission = await Notification.requestPermission();
        notificationPermissionRef.current = permission;
      }
    };
    checkNotificationPermission();
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      windowFocusRef.current = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // TIMER'ı sıfırlama fonksiyonu
  const resetTimer = useCallback(() => {
    clearInterval(timerRef.current);
    setIsRunning(false);
    setIsWorking(true);
    setIsLongBreak(false);
    setTargetTime(null);
    switch (mode) {
      case TIMER_MODES.FLOWTIME:
        setTimer(0);
        setInitialTimer(0);
        break;
      default:
        setTimer(workDuration);
        setInitialTimer(workDuration);
        break;
    }
  }, [mode, workDuration]);

  // Preset uygulama fonksiyonu
  const applyPreset = (presetKey) => {
    const preset = PRESET_SETTINGS[presetKey];
    if (preset) {
      setMode(preset.mode);
      setWorkDuration(preset.workDuration);
      setBreakDuration(preset.breakDuration);
      if (preset.longBreakDuration)
        setLongBreakDuration(preset.longBreakDuration);
      if (preset.sessionsBeforeLongBreak)
        setSessionsBeforeLongBreak(preset.sessionsBeforeLongBreak);
      setSelectedPreset(presetKey);
      resetTimer();
    }
  };

  // Bildirim gönderme fonksiyonu
  const sendNotification = useCallback(
    (title, options = {}) => {
      if (!notificationsEnabled) return;
      if (notificationPermissionRef.current === "granted") {
        const notification = new Notification(title, {
          icon: "https://img.icons8.com/color/96/000000/alarm-clock--v1.png",
          ...options,
        });
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      }
      if (soundEnabled && currentSound.url) {
        audioRef.current.src = currentSound.url;
        audioRef.current
          .play()
          .catch((e) => console.error("Ses çalma hatası:", e));
      }
      setSnackbar({
        open: true,
        message: title,
        severity: options.severity || "info",
      });
    },
    [notificationsEnabled, soundEnabled, currentSound]
  );

  // Çalışma/mola fazı geçiş fonksiyonu
  const handlePhaseSwitch = useCallback(
    (currentTimer = timer) => {
      let nextPhase = {};
      const currentDate = new Date();
      if (isWorking) {
        // Geçen süreyi hesaplamak için currentTimer kullanılıyor
        const elapsed =
          mode === TIMER_MODES.FLOWTIME
            ? currentTimer
            : workDuration - currentTimer;
        const sessionRecord = {
          date: currentDate.toISOString(),
          duration: elapsed,
          mode: mode,
          type: "work",
        };
        setHistory((prev) => [...prev, sessionRecord]);
        setCompletedSessions((prev) => prev + 1);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
        const shouldTakeLongBreak =
          (mode === TIMER_MODES.POMODORO || mode === TIMER_MODES.CUSTOM) &&
          (completedSessions + 1) % sessionsBeforeLongBreak === 0;
        if (shouldTakeLongBreak) {
          nextPhase = {
            isWorking: false,
            isLongBreak: true,
            timer: longBreakDuration,
            initialTimer: longBreakDuration,
          };
          sendNotification("Uzun mola zamanı!", {
            body: `Tebrikler! ${sessionsBeforeLongBreak} pomodoro tamamladınız.`,
            severity: "success",
          });
        } else {
          nextPhase = {
            isWorking: false,
            isLongBreak: false,
            timer: breakDuration,
            initialTimer: breakDuration,
          };
          sendNotification("Mola zamanı!", {
            body: "Çalışma süreniz tamamlandı. Şimdi dinlenme zamanı.",
            severity: "success",
          });
        }
        if (!windowFocusRef.current) {
          sendNotification("Mola zamanı!", {
            body: "Çalışma süreniz tamamlandı. Şimdi dinlenme zamanı.",
          });
        }
        nextPhase.isRunning = autoStartBreaks ? true : false;
      } else {
        // Mola modunda; harcanan süreyi hesaplamak için currentTimer kullanıyoruz
        const plannedDuration = isLongBreak ? longBreakDuration : breakDuration;
        const elapsed = plannedDuration - currentTimer;
        const sessionRecord = {
          date: currentDate.toISOString(),
          duration: elapsed,
          mode: mode,
          type: isLongBreak ? "longBreak" : "break",
        };
        setHistory((prev) => [...prev, sessionRecord]);
        nextPhase = {
          isWorking: true,
          isLongBreak: false,
          timer: workDuration,
          initialTimer: workDuration,
        };
        sendNotification("Çalışma zamanı!", {
          body: "Mola süreniz tamamlandı. Şimdi çalışma zamanı.",
          severity: "info",
        });
        if (!windowFocusRef.current) {
          sendNotification("Çalışma zamanı!", {
            body: "Mola süreniz tamamlandı. Şimdi çalışma zamanı.",
          });
        }
        nextPhase.isRunning = autoStartPomodoros ? true : false;
      }

      setIsWorking(nextPhase.isWorking);
      setIsLongBreak(nextPhase.isLongBreak);
      setTimer(nextPhase.timer);
      setInitialTimer(nextPhase.initialTimer);
      setIsRunning(nextPhase.isRunning);
      if (nextPhase.isRunning) {
        setTargetTime(Date.now() + nextPhase.timer * 1000);
      } else {
        setTargetTime(null);
      }
    },
    [
      isWorking,
      mode,
      workDuration,
      breakDuration,
      longBreakDuration,
      sessionsBeforeLongBreak,
      autoStartBreaks,
      autoStartPomodoros,
      isLongBreak,
      completedSessions,
      sendNotification,
      timer, // gerekliyse eklenebilir
    ]
  );

  // TIMER mantığı: targetTime varsa onun üzerinden, yoksa Flowtime mantığı
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        if (targetTime) {
          const remaining = Math.round((targetTime - Date.now()) / 1000);
          if (remaining <= 0) {
            clearInterval(timerRef.current);
            // Doğal bitişte currentTimer değeri 0 olarak geçiliyor
            handlePhaseSwitch(0);
          } else {
            setTimer(remaining);
          }
        } else {
          setTimer((prev) => {
            if (mode === TIMER_MODES.FLOWTIME && isWorking) {
              // Flowtime çalışma sırasında süre ileri gitmeli
              return prev + 1;
            } else if (
              mode === TIMER_MODES.POMODORO ||
              mode === TIMER_MODES.CUSTOM ||
              mode === TIMER_MODES.FIFTY_TWO_SEVENTEEN ||
              mode === TIMER_MODES.NINETY_THIRTY ||
              (mode === TIMER_MODES.FLOWTIME && !isWorking)
            ) {
              // Diğer modlarda ve Flowtime mola sırasında süre geri gitmeli
              if (prev > 0) {
                return prev - 1;
              } else {
                clearInterval(timerRef.current);
                handlePhaseSwitch(0);
                return 0;
              }
            }
            return prev;
          });
        }
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [isRunning, targetTime, mode, isWorking, handlePhaseSwitch]);

  // Başlat/Durdur buton işlevi
  const handleStartPause = () => {
    if (isRunning) {
      clearInterval(timerRef.current);
      setIsRunning(false);
      setTargetTime(null);
      sendNotification(
        isWorking ? "Çalışma duraklatıldı" : "Mola duraklatıldı",
        {
          severity: "warning",
        }
      );
    } else {
      // Flowtime çalışma sırasında targetTime olmamalı
      if (mode === TIMER_MODES.FLOWTIME && isWorking) {
        setTargetTime(null);
      } else {
        setTargetTime(Date.now() + timer * 1000);
      }
      setIsRunning(true);
      sendNotification(isWorking ? "Çalışma başlatıldı" : "Mola başlatıldı", {
        severity: "info",
      });
    }
  };

  // Flowtime modunda çalışma bitirme
  const handleFinishWorkFlowtime = () => {
    if (mode === TIMER_MODES.FLOWTIME && isWorking) {
      handlePhaseSwitch();
    }
  };

  // Geçmişi temizleme
  const clearHistory = () => {
    setHistory([]);
    setSnackbar({ open: true, message: "Geçmiş temizlendi", severity: "info" });
  };

  // Atla butonu
  const handleSkip = () => {
    handlePhaseSwitch(timer);
  };

  // Saniyeyi MM:SS formatına çevirme
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s
        .toString()
        .padStart(2, "0")}`;
    }
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Günlük toplam çalışma süresi hesaplama
  const calculateDailyTotal = () => {
    const today = new Date().toISOString().split("T")[0];
    const todayHistory = history.filter(
      (entry) => entry.date.split("T")[0] === today && entry.type === "work"
    );
    const totalSeconds = todayHistory.reduce(
      (sum, entry) => sum + entry.duration,
      0
    );
    return formatTime(totalSeconds);
  };

  // UI render kısmı
  return (
    <ThemeProvider theme={theme}>
      <AnimatePresence>
        {showConfetti && (
          <Confetti
            width={window.innerWidth}
            height={window.innerHeight}
            recycle={false}
            numberOfPieces={500}
            gravity={0.2}
            ref={confettiRef}
          />
        )}
      </AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box
          sx={{
            p: 3,
            maxWidth: 450,
            mx: "auto",
            mt: 4,
            bgcolor: theme.palette.background.paper, // EKLENDİ
            color: theme.palette.text.primary, // EKLENDİ
          }}
        >
          {/* Header */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h5" fontWeight="bold">
              {isWorking
                ? "Çalışma Zamanı"
                : isLongBreak
                ? "Uzun Mola"
                : "Mola Zamanı"}
            </Typography>
            <Box>
              <Tooltip title="Geçmiş">
                <IconButton
                  onClick={() => setShowHistory(true)}
                  size="small"
                  sx={{ mr: 1 }}
                >
                  <Badge badgeContent={history.length} color="primary">
                    <History />
                  </Badge>
                </IconButton>
              </Tooltip>
              <Tooltip title="Ayarlar">
                <IconButton onClick={() => setShowSettings(true)} size="small">
                  <Settings />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          {/* Mode Bilgisi */}
          <Box sx={{ mb: 3, display: "flex", justifyContent: "center" }}>
            <Chip
              label={mode}
              color={isWorking ? "primary" : "secondary"}
              variant="outlined"
              icon={<Timer fontSize="small" />}
            />
            {mode === TIMER_MODES.POMODORO && (
              <Chip
                label={`${
                  completedSessions % sessionsBeforeLongBreak ||
                  sessionsBeforeLongBreak
                }/${sessionsBeforeLongBreak}`}
                color="info"
                variant="outlined"
                sx={{ ml: 1 }}
              />
            )}
          </Box>
          {/* Günlük Toplam Çalışma Süresi */}
          <Typography
            variant="caption"
            color="text.secondary"
            align="center"
            sx={{ display: "block", mb: 2 }}
          >
            Bugün Toplam: {calculateDailyTotal()}
          </Typography>
          {/* Timer Görseli */}
          <Box
            sx={{
              position: "relative",
              display: "flex",
              justifyContent: "center",
              mb: 3,
            }}
          >
            <Box sx={{ position: "relative", width: 200, height: 200 }}>
              <CircularProgress
                variant="determinate"
                value={100}
                size={200}
                thickness={4}
                sx={{ position: "absolute", color: theme.palette.divider }}
              />
              <CircularProgress
                variant={
                  mode === TIMER_MODES.FLOWTIME && isWorking
                    ? "indeterminate"
                    : "determinate"
                }
                value={
                  mode === TIMER_MODES.FLOWTIME && isWorking
                    ? 100
                    : (timer / initialTimer) * 100
                }
                size={200}
                thickness={4}
                sx={{
                  position: "absolute",
                  color: isWorking
                    ? theme.palette.primary.main
                    : isLongBreak
                    ? theme.palette.success.main
                    : theme.palette.secondary.main,
                  animation: "none",
                }}
              />
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  bottom: 0,
                  right: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                }}
              >
                <motion.div
                  key={timer}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Typography variant="h3" fontWeight="bold">
                    {formatTime(timer)}
                  </Typography>
                </motion.div>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1, fontWeight: "medium" }}
                >
                  {isWorking
                    ? "Odaklanın"
                    : isLongBreak
                    ? "Uzun molada rahatlayın"
                    : "Kısa mola"}
                </Typography>
              </Box>
            </Box>
          </Box>
          {/* Kontrol Butonları */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: 2,
              mb: 2,
            }}
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="contained"
                color={isRunning ? "warning" : "primary"}
                onClick={handleStartPause}
                startIcon={isRunning ? <Pause /> : <PlayArrow />}
                sx={{
                  minWidth: 120,
                  boxShadow: isRunning ? "none" : theme.shadows[3],
                  background: isRunning
                    ? theme.palette.warning.main
                    : theme.palette.primary.main,
                }}
              >
                {isRunning ? "Duraklat" : "Başlat"}
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outlined"
                onClick={handleSkip}
                startIcon={<SkipNext />}
                disabled={mode === TIMER_MODES.FLOWTIME && isWorking}
              >
                Atla
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outlined"
                color="error"
                onClick={resetTimer}
                startIcon={<Refresh />}
              >
                Sıfırla
              </Button>
            </motion.div>
            {mode === TIMER_MODES.FLOWTIME && isWorking && (
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleFinishWorkFlowtime}
                  startIcon={<Done />}
                >
                  Çalışmayı Bitir
                </Button>
              </motion.div>
            )}
          </Box>
          {/* Tema/Ses/Bildirim Düğmeleri */}
          <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
            <Tooltip title={darkMode ? "Açık Tema" : "Koyu Tema"}>
              <IconButton
                onClick={() => setDarkMode(!darkMode)}
                color="inherit"
                size="small"
              >
                {darkMode ? (
                  <LightMode fontSize="small" />
                ) : (
                  <DarkMode fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
            <Tooltip title={soundEnabled ? "Sesi Kapat" : "Sesi Aç"}>
              <IconButton
                onClick={() => setSoundEnabled(!soundEnabled)}
                color="inherit"
                size="small"
              >
                {soundEnabled ? (
                  <VolumeUp fontSize="small" />
                ) : (
                  <VolumeOff fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
            <Tooltip
              title={
                notificationsEnabled ? "Bildirimleri Kapat" : "Bildirimleri Aç"
              }
            >
              <IconButton
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                color="inherit"
                size="small"
              >
                {notificationsEnabled ? (
                  <Notifications fontSize="small" />
                ) : (
                  <NotificationsOff fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        {/* Ayarlar Dialog */}
        <Dialog
          open={showSettings}
          onClose={() => setShowSettings(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              Zamanlayıcı Ayarları
              <IconButton onClick={() => setShowSettings(false)}>
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Tabs
              value={settingsTab}
              onChange={(_, newValue) => setSettingsTab(newValue)}
              indicatorColor="primary"
              textColor="primary"
              variant="fullWidth"
              sx={{ mb: 2 }}
            >
              <Tab label="Genel" />
              <Tab label="Süre" />
              <Tab label="Bildirimler" />
            </Tabs>
            {settingsTab === 0 && (
              <Box>
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel id="mode-select-label">
                    Zamanlayıcı Modu
                  </InputLabel>
                  <Select
                    labelId="mode-select-label"
                    id="mode-select"
                    value={mode}
                    label="Zamanlayıcı Modu"
                    onChange={(e) => setMode(e.target.value)}
                  >
                    <MenuItem value={TIMER_MODES.POMODORO}>🍅 Pomodoro</MenuItem>
                    <MenuItem value={TIMER_MODES.FLOWTIME}>🌊 Flowtime</MenuItem>
                    <MenuItem value={TIMER_MODES.CUSTOM}>⚙️ Özel</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel id="preset-select-label">
                    Hazır Ayarlar
                  </InputLabel>
                  <Select
                    labelId="preset-select-label"
                    id="preset-select"
                    value={selectedPreset}
                    label="Hazır Ayarlar"
                    onChange={(e) => applyPreset(e.target.value)}
                  >
                    {mode === TIMER_MODES.POMODORO && (
                      <>
                        <MenuItem value="CLASSIC_POMODORO">
                          🍅 Klasik Pomodoro (25/5)
                        </MenuItem>
                        <MenuItem value="ULTRA_FOCUS">
                          🔥 Ultra Odaklanma (45/15)
                        </MenuItem>
                        <MenuItem value="QUICK_SESSIONS">
                          ⚡ Hızlı Oturumlar (15/3)
                        </MenuItem>
                        <MenuItem value="DEEP_WORK">
                          🧠 Derin Çalışma (60/10)
                        </MenuItem>
                      </>
                    )}
                    {mode === TIMER_MODES.FLOWTIME && (
                      <MenuItem value="FLOWTIME_DEFAULT">
                        🌊 Flowtime (Dinamik)
                      </MenuItem>
                    )}
                    {mode === TIMER_MODES.CUSTOM && (
                      <>
                        <MenuItem value="CUSTOM_25_10">
                          ⚙️ Özel 25/10
                        </MenuItem>
                        <MenuItem value="CUSTOM_30_5">
                          ⚙️ Özel 30/5
                        </MenuItem>
                      </>
                    )}
                    {/* Özel modlar - her zaman görünür */}
                    <MenuItem value="FIFTY_TWO_SEVENTEEN">
                      ⏱️ 52/17 Metodu
                    </MenuItem>
                    <MenuItem value="NINETY_THIRTY">
                      🎯 90/30 Bloklama
                    </MenuItem>
                  </Select>
                </FormControl>
                <Divider sx={{ my: 2 }} />
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoStartBreaks}
                      onChange={(e) => setAutoStartBreaks(e.target.checked)}
                    />
                  }
                  label="Molaları otomatik başlat"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoStartPomodoros}
                      onChange={(e) => setAutoStartPomodoros(e.target.checked)}
                    />
                  }
                  label="Çalışma fazlarını otomatik başlat"
                />
              </Box>
            )}
            {settingsTab === 1 && (
              <Box>
                {/* Pomodoro ve Custom modları için süre ayarları */}
                {(mode === TIMER_MODES.POMODORO ||
                  mode === TIMER_MODES.CUSTOM) && (
                  <>
                    <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                      Pomodoro Ayarları
                    </Typography>
                    
                    <Typography id="work-duration-slider" gutterBottom>
                      Çalışma Süresi: {Math.floor(workDuration / 60)} dakika
                    </Typography>
                    <Slider
                      value={Math.floor(workDuration / 60)}
                      onChange={(_, value) => setWorkDuration(value * 60)}
                      aria-labelledby="work-duration-slider"
                      min={5}
                      max={120}
                      marks={[
                        { value: 15, label: "15" },
                        { value: 25, label: "25" },
                        { value: 45, label: "45" },
                        { value: 60, label: "60" },
                        { value: 90, label: "90" },
                      ]}
                      sx={{ mb: 4 }}
                    />
                    
                    <Typography id="break-duration-slider" gutterBottom>
                      Kısa Mola Süresi: {Math.floor(breakDuration / 60)} dakika
                    </Typography>
                    <Slider
                      value={Math.floor(breakDuration / 60)}
                      onChange={(_, value) => setBreakDuration(value * 60)}
                      aria-labelledby="break-duration-slider"
                      min={1}
                      max={30}
                      marks={[
                        { value: 3, label: "3" },
                        { value: 5, label: "5" },
                        { value: 10, label: "10" },
                        { value: 15, label: "15" },
                      ]}
                      sx={{ mb: 4 }}
                    />
                    
                    <Typography id="long-break-duration-slider" gutterBottom>
                      Uzun Mola Süresi: {Math.floor(longBreakDuration / 60)} dakika
                    </Typography>
                    <Slider
                      value={Math.floor(longBreakDuration / 60)}
                      onChange={(_, value) => setLongBreakDuration(value * 60)}
                      aria-labelledby="long-break-duration-slider"
                      min={10}
                      max={60}
                      marks={[
                        { value: 15, label: "15" },
                        { value: 20, label: "20" },
                        { value: 30, label: "30" },
                        { value: 45, label: "45" },
                      ]}
                      sx={{ mb: 4 }}
                    />
                    
                    <Typography id="sessions-before-long-break-slider" gutterBottom>
                      Uzun Mola Öncesi Oturum Sayısı: {sessionsBeforeLongBreak}
                    </Typography>
                    <Slider
                      value={sessionsBeforeLongBreak}
                      onChange={(_, value) => setSessionsBeforeLongBreak(value)}
                      aria-labelledby="sessions-before-long-break-slider"
                      min={2}
                      max={8}
                      marks={[
                        { value: 2, label: "2" },
                        { value: 3, label: "3" },
                        { value: 4, label: "4" },
                        { value: 6, label: "6" },
                      ]}
                      step={1}
                    />
                  </>
                )}
                
                {/* 52/17 Metodu için özel ayarlar */}
                {mode === TIMER_MODES.FIFTY_TWO_SEVENTEEN && (
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                      52/17 Metodu Ayarları
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      52 dakika çalışma, 17 dakika mola. Bu metod uzun odaklanma süreleri için tasarlanmıştır.
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 3 }}>
                      <Chip 
                        label={`Çalışma: ${Math.floor(workDuration / 60)} dk`} 
                        color="primary" 
                        variant="outlined" 
                      />
                      <Chip 
                        label={`Mola: ${Math.floor(breakDuration / 60)} dk`} 
                        color="secondary" 
                        variant="outlined" 
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                      ⚠️ Bu mod için süreler sabit olarak ayarlanmıştır.
                    </Typography>
                  </Box>
                )}
                
                {/* 90/30 Bloklama için özel ayarlar */}
                {mode === TIMER_MODES.NINETY_THIRTY && (
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                      90/30 Bloklama Ayarları
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      90 dakika çalışma, 30 dakika mola. Derin çalışma için ideal.
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 3 }}>
                      <Chip 
                        label={`Çalışma: ${Math.floor(workDuration / 60)} dk`} 
                        color="primary" 
                        variant="outlined" 
                      />
                      <Chip 
                        label={`Mola: ${Math.floor(breakDuration / 60)} dk`} 
                        color="secondary" 
                        variant="outlined" 
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                      ⚠️ Bu mod için süreler sabit olarak ayarlanmıştır.
                    </Typography>
                  </Box>
                )}
                
                {/* Flowtime modu için mola ayarı */}
                {mode === TIMER_MODES.FLOWTIME && (
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                      Flowtime Ayarları
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Flowtime modunda çalışma süresi, çalışmayı bitirdiğinizde belirlenir. 
                      Mola süresini aşağıdan ayarlayabilirsiniz:
                    </Typography>
                    <Typography id="flowtime-break-duration-slider" gutterBottom>
                      Mola Süresi: {Math.floor(breakDuration / 60)} dakika
                    </Typography>
                    <Slider
                      value={Math.floor(breakDuration / 60)}
                      onChange={(_, value) => setBreakDuration(value * 60)}
                      aria-labelledby="flowtime-break-duration-slider"
                      min={1}
                      max={30}
                      marks={[
                        { value: 5, label: "5" },
                        { value: 10, label: "10" },
                        { value: 15, label: "15" },
                        { value: 20, label: "20" },
                      ]}
                    />
                  </Box>
                )}
              </Box>
            )}
            {settingsTab === 2 && (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                  Bildirim Ayarları
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationsEnabled}
                      onChange={(e) =>
                        setNotificationsEnabled(e.target.checked)
                      }
                    />
                  }
                  label="Masaüstü Bildirimleri"
                  sx={{ mb: 2, display: "block" }}
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={soundEnabled}
                      onChange={(e) => setSoundEnabled(e.target.checked)}
                    />
                  }
                  label="Sesli Bildirimler"
                  sx={{ mb: 3, display: "block" }}
                />
                
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel id="sound-select-label">Bildirim Sesi</InputLabel>
                  <Select
                    labelId="sound-select-label"
                    id="sound-select"
                    value={currentSound.name}
                    label="Bildirim Sesi"
                    onChange={(e) => {
                      const selectedSound = Object.values(
                        NOTIFICATION_SOUNDS
                      ).find((sound) => sound.name === e.target.value);
                      setCurrentSound(
                        selectedSound || NOTIFICATION_SOUNDS.BELL
                      );
                    }}
                    disabled={!soundEnabled}
                  >
                    {Object.values(NOTIFICATION_SOUNDS).map((sound) => (
                      <MenuItem key={sound.name} value={sound.name}>
                        🔊 {sound.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<VolumeUp />}
                    onClick={() => {
                      if (soundEnabled && currentSound.url) {
                        audioRef.current.src = currentSound.url;
                        audioRef.current
                          .play()
                          .catch((e) => console.error("Ses çalma hatası:", e));
                      }
                    }}
                    disabled={!soundEnabled || !currentSound.url}
                  >
                    Sesi Test Et
                  </Button>
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
                  💡 İpucu: Bildirimler için tarayıcınızın bildirim iznini vermeniz gerekebilir.
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowSettings(false)} color="primary">
              Kapat
            </Button>
            <Button
              onClick={() => {
                resetTimer();
                setShowSettings(false);
              }}
              color="primary"
              variant="contained"
              startIcon={<Save />}
            >
              Kaydet
            </Button>
          </DialogActions>
        </Dialog>
        {/* Geçmiş Dialog */}
        <Dialog
          open={showHistory}
          onClose={() => setShowHistory(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              Çalışma Geçmişi
              <IconButton onClick={() => setShowHistory(false)}>
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            {history.length === 0 ? (
              <Typography
                variant="body1"
                color="text.secondary"
                align="center"
                sx={{ py: 4 }}
              >
                Henüz geçmiş kaydı bulunmamaktadır.
              </Typography>
            ) : (
              <>
                <Box sx={{ mb: 3 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Paper sx={{ p: 2, textAlign: "center" }} elevation={2}>
                        <Typography variant="h6" gutterBottom>
                          Bugün
                        </Typography>
                        <Typography variant="h4" color="primary">
                          {calculateDailyTotal()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Toplam Çalışma Süresi
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Paper sx={{ p: 2, textAlign: "center" }} elevation={2}>
                        <Typography variant="h6" gutterBottom>
                          Toplam
                        </Typography>
                        <Typography variant="h4" color="primary">
                          {formatTime(
                            history.reduce(
                              (sum, entry) =>
                                entry.type === "work"
                                  ? sum + entry.duration
                                  : sum,
                              0
                            )
                          )}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Tüm Zamanlar
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Paper sx={{ p: 2, textAlign: "center" }} elevation={2}>
                        <Typography variant="h6" gutterBottom>
                          Oturumlar
                        </Typography>
                        <Typography variant="h4" color="info.main">
                          {
                            history.filter((entry) => entry.type === "work")
                              .length
                          }
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Tamamlanan Çalışma
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
                <Paper sx={{ overflowX: "auto" }} elevation={1}>
                  <Box sx={{ minWidth: 500 }}>
                    <Box
                      sx={{
                        display: "flex",
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        bgcolor: theme.palette.background.default,
                        py: 1.5,
                        px: 2,
                        fontWeight: "bold",
                      }}
                    >
                      <Box sx={{ flex: 2 }}>Tarih</Box>
                      <Box sx={{ flex: 1 }}>Tür</Box>
                      <Box sx={{ flex: 1 }}>Mod</Box>
                      <Box sx={{ flex: 1, textAlign: "right" }}>Süre</Box>
                    </Box>
                    <Box sx={{ maxHeight: 400, overflow: "auto" }}>
                      {[...history].reverse().map((entry, index) => (
                        <Box
                          key={index}
                          sx={{
                            display: "flex",
                            borderBottom: `1px solid ${theme.palette.divider}`,
                            py: 1.5,
                            px: 2,
                            bgcolor:
                              entry.type === "work"
                                ? alpha(theme.palette.primary.light, 0.05)
                                : entry.type === "longBreak"
                                ? alpha(theme.palette.success.light, 0.05)
                                : alpha(theme.palette.secondary.light, 0.05),
                            "&:hover": { bgcolor: theme.palette.action.hover },
                          }}
                        >
                          <Box sx={{ flex: 2 }}>
                            {new Date(entry.date).toLocaleString()}
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Chip
                              size="small"
                              label={
                                entry.type === "work"
                                  ? "Çalışma"
                                  : entry.type === "longBreak"
                                  ? "Uzun Mola"
                                  : "Mola"
                              }
                              color={
                                entry.type === "work"
                                  ? "primary"
                                  : entry.type === "longBreak"
                                  ? "success"
                                  : "secondary"
                              }
                              variant="outlined"
                            />
                          </Box>
                          <Box sx={{ flex: 1 }}>{entry.mode}</Box>
                          <Box sx={{ flex: 1, textAlign: "right" }}>
                            {formatTime(entry.duration)}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Paper>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              onClick={clearHistory}
              color="error"
              variant="outlined"
              disabled={history.length === 0}
            >
              Geçmişi Temizle
            </Button>
            <Button onClick={() => setShowHistory(false)} color="primary">
              Kapat
            </Button>
          </DialogActions>
        </Dialog>
        {/* Bildirim Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </motion.div>
    </ThemeProvider>
  );
};

export default AdvancedTimer;
