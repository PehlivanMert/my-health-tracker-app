import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Box,
  Card,
  Typography,
  Grid,
  TextField,
  IconButton,
  Tooltip,
  useTheme,
  Dialog,
  Button,
} from "@mui/material";
import { styled, keyframes, alpha } from "@mui/material/styles";
import Confetti from "react-confetti";
import Lottie from "lottie-react";
import waterAnimation from "../../assets/waterAnimation.json";
import { db } from "../auth/firebaseConfig";
import { doc, updateDoc, getDoc, setDoc, arrayUnion, arrayRemove, writeBatch } from "firebase/firestore";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import WaterNotificationSettingsDialog from "./WaterNotificationSettingsDialog";
import DrinkHistoryDialog from "./DrinkHistoryDialog";
import styles from "./waterAnimation.module.css";
import {
  saveNextWaterReminderTime,
  scheduleWaterNotifications,
  getDailyAverageWeatherData,
  getMotivationalMessageForTime,
  updateServerSideCalculations,
} from "../notify/NotificationScheduler";
import CheckCircle from "@mui/icons-material/CheckCircle";
import CircularProgress from "@mui/material/CircularProgress";
import InputAdornment from "@mui/material/InputAdornment";
import { SportsBar } from "@mui/icons-material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import useMediaQuery from "@mui/material/useMediaQuery";
import EmojiFoodBeverageIcon from '@mui/icons-material/EmojiFoodBeverage';
import LocalDrinkIcon from '@mui/icons-material/LocalDrink';
import WineBarIcon from '@mui/icons-material/WineBar';
import SportsBarIcon from '@mui/icons-material/SportsBar';
import LocalBarIcon from '@mui/icons-material/LocalBar';
import SvgIcon from '@mui/material/SvgIcon';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import HistoryIcon from '@mui/icons-material/History';

// --- Animasyon ve stil tanımlamaları ---
const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const particleFloat = keyframes`
  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; }
`;

const slideInFromBottom = keyframes`
  0% { 
    transform: translateY(100vh) scale(0.8); 
    opacity: 0; 
  }
  50% { 
    transform: translateY(-20px) scale(1.1); 
    opacity: 1; 
  }
  100% { 
    transform: translateY(0) scale(1); 
    opacity: 1; 
  }
`;

const bounce = keyframes`
  0%, 20%, 53%, 80%, 100% { 
    transform: translate3d(0,0,0); 
  }
  40%, 43% { 
    transform: translate3d(0, -30px, 0); 
  }
  70% { 
    transform: translate3d(0, -15px, 0); 
  }
  90% { 
    transform: translate3d(0, -4px, 0); 
  }
`;

const shimmer = keyframes`
  0% { 
    background-position: -200% center; 
  }
  100% { 
    background-position: 200% center; 
  }
`;

const rotate = keyframes`
  from { 
    transform: rotate(0deg); 
  }
  to { 
    transform: rotate(360deg); 
  }
`;

const ModernAchievementOverlay = styled(Box)(({ theme }) => ({
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "radial-gradient(circle at center, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.95) 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  overflow: "hidden",
  backdropFilter: "blur(10px)",
  animation: `${fadeIn} 0.5s ease-out`,
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `linear-gradient(45deg, 
      ${alpha(theme.palette.primary.main, 0.1)} 0%, 
      ${alpha(theme.palette.secondary.main, 0.1)} 25%,
      ${alpha("#4CAF50", 0.1)} 50%,
      ${alpha(theme.palette.primary.main, 0.1)} 75%,
      ${alpha(theme.palette.secondary.main, 0.1)} 100%
    )`,
    animation: `${particleFloat} 15s linear infinite`,
    pointerEvents: "none",
  },
}));

const ModernAchievementCard = styled(Box)(({ theme }) => ({
  position: "relative",
  background: "rgba(255, 255, 255, 0.1)",
  backdropFilter: "blur(20px)",
  borderRadius: "24px",
  padding: theme.spacing(4),
  border: "1px solid rgba(255, 255, 255, 0.2)",
  boxShadow: "0 25px 50px rgba(0, 0, 0, 0.3)",
  textAlign: "center",
  maxWidth: "90vw",
  width: "400px",
  animation: `${slideInFromBottom} 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)`,
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(3),
    width: "85vw",
    borderRadius: "20px",
  },
  "&::before": {
    content: '""',
    position: "absolute",
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    background: `linear-gradient(45deg, 
      ${theme.palette.primary.main}, 
      ${theme.palette.secondary.main}, 
      #4CAF50, 
      ${theme.palette.primary.main}
    )`,
    borderRadius: "26px",
    zIndex: -1,
    backgroundSize: "400% 400%",
    animation: `${shimmer} 3s ease-in-out infinite`,
    [theme.breakpoints.down("sm")]: {
      borderRadius: "22px",
    },
  },
}));

const ModernNeonText = styled(Typography)(({ theme }) => ({
  textAlign: "center",
  position: "relative",
  fontWeight: 800,
  background: `linear-gradient(45deg, 
    ${theme.palette.primary.main} 0%, 
    ${theme.palette.secondary.main} 25%, 
    #4CAF50 50%, 
    ${theme.palette.primary.main} 75%, 
    ${theme.palette.secondary.main} 100%
  )`,
  backgroundSize: "200% 200%",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
  animation: `${shimmer} 2s ease-in-out infinite, ${bounce} 2s ease-in-out infinite`,
  fontSize: "2.5rem",
  lineHeight: 1.2,
  textShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.5)}`,
  [theme.breakpoints.down("sm")]: {
    fontSize: "2rem",
  },
  [theme.breakpoints.down("xs")]: {
    fontSize: "1.8rem",
  },
}));

const ModernIconContainer = styled(Box)(({ theme }) => ({
  position: "relative",
  width: "120px",
  height: "120px",
  margin: "0 auto 20px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  background: `linear-gradient(45deg, 
    ${theme.palette.primary.main}, 
    ${theme.palette.secondary.main}, 
    #4CAF50
  )`,
  backgroundSize: "200% 200%",
  animation: `${shimmer} 2s ease-in-out infinite, ${rotate} 10s linear infinite`,
  boxShadow: `0 0 30px ${alpha(theme.palette.primary.main, 0.5)}`,
  [theme.breakpoints.down("sm")]: {
    width: "100px",
    height: "100px",
  },
  "&::before": {
    content: '""',
    position: "absolute",
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
    borderRadius: "50%",
    background: `linear-gradient(45deg, 
      ${theme.palette.primary.main}, 
      ${theme.palette.secondary.main}, 
      #4CAF50
    )`,
    backgroundSize: "200% 200%",
    animation: `${shimmer} 2s ease-in-out infinite reverse`,
    zIndex: -1,
    opacity: 0.3,
  },
}));

const ModernParticle = styled(Box)(({ theme, delay, duration, size }) => ({
  position: "absolute",
  width: size || 8,
  height: size || 8,
  background: `radial-gradient(circle, ${theme.palette.primary.main}, transparent)`,
  borderRadius: "50%",
  animation: `${particleFloat} ${duration || 5}s linear infinite`,
  animationDelay: `${delay || 0}s`,
  opacity: 0.7,
  filter: "blur(1px)",
}));

const ModernAchievementAnimation = ({ message, onComplete }) => {
  const theme = useTheme();

  return (
    <ModernAchievementOverlay onClick={onComplete}>
      {/* Enhanced Particle System */}
      {[...Array(30)].map((_, i) => (
        <ModernParticle
          key={i}
          delay={Math.random() * 3}
          duration={5 + Math.random() * 10}
          size={4 + Math.random() * 8}
          sx={{
            top: Math.random() * 100 + "%",
            left: Math.random() * 100 + "%",
          }}
        />
      ))}

      {/* Floating Icons */}
      {["💧", "🚀", "🎉", "🌊", "⭐"].map((icon, i) => (
        <Box
          key={i}
          sx={{
            position: "absolute",
            top: Math.random() * 80 + 10 + "%",
            left: Math.random() * 80 + 10 + "%",
            fontSize: { xs: "2rem", sm: "2.5rem" },
            animation: `${bounce} ${2 + Math.random() * 2}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 2}s`,
            opacity: 0.8,
            filter: "blur(0.5px)",
            pointerEvents: "none",
          }}
        >
          {icon}
        </Box>
      ))}

      <ModernAchievementCard>
        <ModernIconContainer>
          <Box
            component="span"
            sx={{
              fontSize: { xs: "3rem", sm: "4rem" },
              color: "#fff",
              filter: "drop-shadow(0 0 10px rgba(255,255,255,0.5))",
            }}
          >
            🎯
          </Box>
        </ModernIconContainer>

        <ModernNeonText variant="h2">
          {message}
        </ModernNeonText>

        <Typography
          variant="body1"
          sx={{
            color: "rgba(255,255,255,0.8)",
            mt: 2,
            fontSize: { xs: "0.9rem", sm: "1rem" },
            fontWeight: 500,
          }}
        >
          Tebrikler! Hedefinize ulaştınız! 🎊
        </Typography>

        <Box
          sx={{
            mt: 3,
            display: "flex",
            justifyContent: "center",
            gap: 1,
          }}
        >
          {["🏆", "💪", "🌟", "🔥", "✨"].map((emoji, i) => (
            <Box
              key={i}
              sx={{
                fontSize: { xs: "1.5rem", sm: "2rem" },
                animation: `${bounce} ${1.5 + i * 0.2}s ease-in-out infinite`,
                animationDelay: `${i * 0.1}s`,
              }}
            >
              {emoji}
            </Box>
          ))}
        </Box>

        <Typography
          variant="caption"
          sx={{
            display: "block",
            color: "rgba(255,255,255,0.6)",
            mt: 2,
            fontSize: { xs: "0.75rem", sm: "0.8rem" },
          }}
        >
          Kapatmak için tıklayın
        </Typography>
      </ModernAchievementCard>
    </ModernAchievementOverlay>
  );
};

// --- NEW MINIMAL ACHIEVEMENT ANIMATION ---

const fadeInOut = keyframes`
  0% { opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { opacity: 0; }
`;

const MinimalAchievementOverlay = styled(Box)(({ theme }) => ({
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(255,255,255,0.96)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  animation: `${fadeInOut} 2.5s cubic-bezier(0.4,0,0.2,1)`,
  transition: "opacity 0.5s",
}));

const AnimatedCheckmark = () => (
  <svg width="120" height="120" viewBox="0 0 120 120">
    <circle
      cx="60"
      cy="60"
      r="54"
      fill="none"
      stroke="#4CAF50"
      strokeWidth="8"
      opacity="0.15"
    />
    <circle
      cx="60"
      cy="60"
      r="54"
      fill="none"
      stroke="#4CAF50"
      strokeWidth="8"
      strokeDasharray="339.292"
      strokeDashoffset="339.292"
      style={{
        animation: "dash 0.7s cubic-bezier(0.4,0,0.2,1) forwards"
      }}
    />
    <polyline
      points="40,65 55,80 85,45"
      fill="none"
      stroke="#4CAF50"
      strokeWidth="8"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray="60"
      strokeDashoffset="60"
      style={{
        animation: "dash 0.5s 0.5s cubic-bezier(0.4,0,0.2,1) forwards"
      }}
    />
    <style>{`
      @keyframes dash {
        to { stroke-dashoffset: 0; }
      }
    `}</style>
  </svg>
);

const MinimalAchievementAnimation = ({ message, onComplete }) => {
  useEffect(() => {
    const timeout = setTimeout(onComplete, 2500);
    return () => clearTimeout(timeout);
  }, [onComplete]);
  return (
    <MinimalAchievementOverlay onClick={onComplete}>
      <Box sx={{ textAlign: "center" }}>
        <AnimatedCheckmark />
        <Typography
          variant="h4"
          sx={{
            mt: 3,
            color: "#222",
            fontWeight: 700,
            letterSpacing: 0.5,
            fontSize: { xs: "1.3rem", sm: "1.7rem" },
          }}
        >
          {message || "Su Hedefi Tamamlandı!"}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: "#555", mt: 1 }}
        >
          Tebrikler! Günlük su hedefinizi başarıyla tamamladınız.
        </Typography>
      </Box>
    </MinimalAchievementOverlay>
  );
};

// --- NEW IMPACTFUL WATER GOAL ANIMATION ---
const ImpactfulAchievementOverlay = styled(Box)(({ theme }) => ({
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(240,248,255,0.98)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  animation: `${fadeInOut} 2.7s cubic-bezier(0.4,0,0.2,1)`,
  transition: "opacity 0.5s",
  boxShadow: "0 0 0 9999px rgba(33,150,243,0.08)",
}));

const WaterDropSVG = () => (
  <svg width="160" height="180" viewBox="0 0 160 180" style={{ display: 'block', margin: '0 auto' }}>
    <defs>
      <linearGradient id="waterGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#4FC3F7" />
        <stop offset="100%" stopColor="#1976D2" />
      </linearGradient>
      <radialGradient id="rippleGradient" cx="50%" cy="80%" r="60%">
        <stop offset="0%" stopColor="#B3E5FC" stopOpacity="0.7" />
        <stop offset="100%" stopColor="#1976D2" stopOpacity="0.1" />
      </radialGradient>
      <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="8" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    {/* Water drop shape */}
    <path
      d="M80 20 C110 70, 150 110, 80 170 C10 110, 50 70, 80 20 Z"
      fill="url(#waterGradient)"
      filter="url(#glow)"
      style={{
        stroke: '#2196F3',
        strokeWidth: 3,
        animation: 'dropFill 1.2s cubic-bezier(0.4,0,0.2,1) forwards',
        opacity: 0.98
      }}
    />
    {/* Ripple effect */}
    <ellipse
      cx="80"
      cy="155"
      rx="48"
      ry="10"
      fill="url(#rippleGradient)"
      style={{
        opacity: 0.7,
        animation: 'rippleFade 1.2s 0.7s cubic-bezier(0.4,0,0.2,1) forwards'
      }}
    />
    {/* Checkmark overlay */}
    <polyline
      points="60,110 78,135 110,85"
      fill="none"
      stroke="#43EA7F"
      strokeWidth="10"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray="70"
      strokeDashoffset="70"
      style={{
        filter: 'drop-shadow(0 0 12px #43EA7F88)',
        animation: 'dash 0.6s 1.1s cubic-bezier(0.4,0,0.2,1) forwards'
      }}
    />
    <style>{`
      @keyframes dash {
        to { stroke-dashoffset: 0; }
      }
      @keyframes dropFill {
        0% { opacity: 0; transform: scale(0.7) translateY(40px); }
        60% { opacity: 1; transform: scale(1.05) translateY(-8px); }
        100% { opacity: 1; transform: scale(1) translateY(0); }
      }
      @keyframes rippleFade {
        0% { opacity: 0; transform: scaleX(0.7); }
        60% { opacity: 0.7; transform: scaleX(1.1); }
        100% { opacity: 0.7; transform: scaleX(1); }
      }
    `}</style>
  </svg>
);

const ImpactfulAchievementAnimation = ({ message, onComplete }) => {
  useEffect(() => {
    const timeout = setTimeout(onComplete, 2700);
    return () => clearTimeout(timeout);
  }, [onComplete]);
  return (
    <ImpactfulAchievementOverlay onClick={onComplete}>
      <Box sx={{ textAlign: "center" }}>
        <WaterDropSVG />
        <Typography
          variant="h4"
          sx={{
            mt: 3,
            color: "#1976D2",
            fontWeight: 800,
            letterSpacing: 0.5,
            fontSize: { xs: "1.4rem", sm: "2rem" },
            textShadow: "0 2px 12px #B3E5FC"
          }}
        >
          {message || "Su Hedefi Tamamlandı!"}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: "#1976D2", mt: 1, fontWeight: 500 }}
        >
          Tebrikler! Günlük su hedefinizi başarıyla tamamladınız.
        </Typography>
      </Box>
    </ImpactfulAchievementOverlay>
  );
};

const GlowingCard = styled(Card, {
  shouldForwardProp: (prop) => prop !== "glowColor",
})(({ glowColor }) => ({
  position: "relative",
  background: "rgba(255, 255, 255, 0.1)",
  backdropFilter: "blur(10px)",
  borderRadius: "24px",
  overflow: "hidden",
  border: "1px solid rgba(33,150,243,0.2)",
  boxShadow: `0 0 20px ${glowColor || "#2196F322"}`,
  transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    transform: "translateY(-10px) scale(1.02)",
    boxShadow: `0 0 40px ${glowColor || "#2196F344"}`,
  },
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `linear-gradient(135deg, ${alpha(
      glowColor || "#2196F3",
      0.2
    )} 0%, transparent 100%)`,
    opacity: 0,
    transition: "opacity 0.3s ease",
  },
  "&:hover::before": { opacity: 1 },
}));

const WaterContainer = styled(Box)(({ theme }) => ({
  position: "relative",
  width: "100%",
  height: "500px",
  [theme.breakpoints.down("md")]: {
    height: "400px",
  },
  [theme.breakpoints.down("sm")]: {
    height: "300px",
  },
  borderRadius: "30px",
  overflow: "hidden",
  background: "rgba(0, 0, 0, 0.2)",
  boxShadow: "inset 0 0 50px rgba(0, 0, 0, 0.2)",
  "&.goal-achieved": {
    "&::after": {
      content: '""',
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background:
        "radial-gradient(circle at center, rgba(33,150,243,0.4) 0%, transparent 70%)",
      animation: `${pulse} 2s infinite`,
      zIndex: 1,
    },
  },
}));

const getTurkeyTime = () =>
  new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));

// ─── YENİ RESET İŞLEVİ ─────────────────────────────────────────────
// Bu versiyonda, Firestore'dan çekilen en güncel veriyi (currentFirestoreData) kullanıyoruz
// ve arrayUnion ile history dizisine yeni entry ekleyerek, eski kayıtların silinmesini engelliyoruz.
// ─────────────────────────────────────────────────────────────────

// Modern bardak ve şişe ikonları
const TeaCupIcon = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path d="M7 2h10c1.1 0 2 .9 2 2v2c0 .55-.45 1-1 1h-1v9c0 1.1-.9 2-2 2H9c-1.1 0-2-.9-2-2V7H6c-.55 0-1-.45-1-1V4c0-1.1.9-2 2-2z" fill="#1976d2" />
    <path d="M9 7v9h6V7H9z" fill="#fff" opacity="0.2" />
    <circle cx="17" cy="19" r="2" fill="#1976d2" />
  </SvgIcon>
);

const SmallGlassIcon = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path d="M8 3h8c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H8c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2z" fill="#2196f3" />
    <path d="M9 6h6v8H9V6z" fill="#fff" opacity="0.2" />
    <path d="M12 3v2" stroke="#fff" strokeWidth="1" opacity="0.3" />
  </SvgIcon>
);

const MediumGlassIcon = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path d="M7 2h10c1.1 0 2 .9 2 2v14c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2z" fill="#00bcd4" />
    <path d="M8 4h8v12H8V4z" fill="#fff" opacity="0.2" />
    <path d="M12 2v3" stroke="#fff" strokeWidth="1.5" opacity="0.4" />
  </SvgIcon>
);

const MugIcon = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path d="M6 2h10c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2z" fill="#43a047" />
    <path d="M7 4h8v10H7V4z" fill="#fff" opacity="0.2" />
    <path d="M18 8h2v4h-2z" fill="#43a047" />
    <circle cx="19" cy="6" r="1" fill="#fff" opacity="0.6" />
  </SvgIcon>
);

const PetBottleIcon = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path d="M9 2c0-.55.45-1 1-1h4c.55 0 1 .45 1 1v2.5c0 .28.22.5.5.5s.5.22.5.5V7c0 .28-.22.5-.5.5s-.5.22-.5.5V9c0 .55-.45 1-1 1h-2c-.55 0-1-.45-1-1V8c0-.28-.22-.5-.5-.5S9 7.28 9 7V5.5c0-.28.22-.5.5-.5s.5-.22.5-.5V2zm2 0v2h2V2h-2zm-2 7v13c0 1.1.9 2 2 2s2-.9 2-2V9h-4z" fill="#1976d2" />
    <path d="M10 4h4v1h-4z" fill="#fff" opacity="0.3" />
    <path d="M11 10h2v8h-2z" fill="#fff" opacity="0.1" />
  </SvgIcon>
);

const GlassBottleIcon = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path d="M10 2c0-.55.45-1 1-1h2c.55 0 1 .45 1 1v2.5c0 .28.22.5.5.5s.5.22.5.5V7c0 .28-.22.5-.5.5s-.5.22-.5.5V9c0 .55-.45 1-1 1h-2c-.55 0-1-.45-1-1V8c0-.28-.22-.5-.5-.5S10 7.28 10 7V5.5c0-.28.22-.5.5-.5s.5-.22.5-.5V2zm2 0v2h2V2h-2zm-2 7v13c0 1.1.9 2 2 2s2-.9 2-2V9h-4z" fill="#ff9800" />
    <path d="M11 3h2v1h-2z" fill="#fff" opacity="0.4" />
    <path d="M12 10h1v8h-1z" fill="#fff" opacity="0.2" />
    <path d="M10 6h4v1h-4z" fill="#fff" opacity="0.1" />
  </SvgIcon>
);

const STANDARD_GLASS_SIZES = [
  { value: 100, label: "100ml", icon: <TeaCupIcon fontSize="small" sx={{ color: '#1976d2' }} />, desc: 'Çay Bardağı' },
  { value: 200, label: "200ml", icon: <SmallGlassIcon fontSize="small" sx={{ color: '#2196f3' }} />, desc: 'Küçük Su Bardağı' },
  { value: 250, label: "250ml", icon: <MediumGlassIcon fontSize="small" sx={{ color: '#00bcd4' }} />, desc: 'Orta Bardak' },
  { value: 300, label: "300ml", icon: <MugIcon fontSize="small" sx={{ color: '#43a047' }} />, desc: 'Kupa' },
  { value: 500, label: "500ml", icon: <PetBottleIcon fontSize="small" sx={{ color: '#1976d2' }} />, desc: 'Pet Şişe' },
  { value: 700, label: "700ml", icon: <GlassBottleIcon fontSize="small" sx={{ color: '#ff9800' }} />, desc: 'Cam Şişe' },
];

// --- İçecek katkı oranları tablosu ---
const DRINK_WATER_CONTRIBUTION = {
  water: 1,
  herbalTea: 1,
  mineralWater: 1,
  ayran: 0.85, // %80-90 arası, ortalama 0.85
  milk: 0.85,  // %80-90 arası, ortalama 0.85
  juice: 0.6,  // %50-70 arası, ortalama 0.6
  vegetableJuice: 0.7, // %60-80 arası, ortalama 0.7
  compote: 0.7, // %60-80 arası, ortalama 0.7
  blackTea: 0.6, // Siyah çay (kafeinli)
  greenTea: 0.6, // Yeşil çay (kafeinli)
  filterCoffee: 0.55, // Filtre kahve, Türk kahvesi, espresso
  turkishCoffee: 0.55,
  espresso: 0.55,
  milkCoffee: 0.35, // Latte, cappuccino, vb.
  americano: 0.55, // Americano %55 suya sayılır
};
const DRINK_OPTIONS = [
  { value: 'water', label: 'Su', icon: <LocalDrinkIcon sx={{ color: '#21CBF3' }} /> },
  { value: 'herbalTea', label: 'Bitki Çayı (kafeinsiz)', icon: <EmojiFoodBeverageIcon sx={{ color: '#8BC34A' }} /> },
  { value: 'blackTea', label: 'Siyah Çay', icon: <EmojiFoodBeverageIcon sx={{ color: '#795548' }} /> },
  { value: 'greenTea', label: 'Yeşil Çay', icon: <EmojiFoodBeverageIcon sx={{ color: '#388E3C' }} /> },
  { value: 'mineralWater', label: 'Sade Maden Suyu', icon: <SportsBarIcon sx={{ color: '#00BCD4' }} /> },
  { value: 'ayran', label: 'Sade Ayran (az tuzlu)', icon: <SportsBarIcon sx={{ color: '#FFEB3B' }} /> },
  { value: 'milk', label: 'Süt (yarım yağlı)', icon: <LocalBarIcon sx={{ color: '#FFFDE7' }} /> },
  { value: 'juice', label: 'Taze Meyve Suyu', icon: <WineBarIcon sx={{ color: '#FF9800' }} /> },
  { value: 'vegetableJuice', label: 'Sebze Suyu', icon: <WineBarIcon sx={{ color: '#4CAF50' }} /> },
  { value: 'compote', label: 'Şekersiz Komposto Suyu', icon: <WineBarIcon sx={{ color: '#BCAAA4' }} /> },
  { value: 'filterCoffee', label: 'Filtre Kahve', icon: <LocalCafeIcon sx={{ color: '#6D4C41' }} /> },
  { value: 'turkishCoffee', label: 'Türk Kahvesi', icon: <LocalCafeIcon sx={{ color: '#8D6E63' }} /> },
  { value: 'espresso', label: 'Espresso', icon: <LocalCafeIcon sx={{ color: '#3E2723' }} /> },
  { value: 'americano', label: 'Americano', icon: <LocalCafeIcon sx={{ color: '#4E342E' }} /> },
  { value: 'milkCoffee', label: 'Sütlü Kahve (Latte, Cappuccino)', icon: <LocalCafeIcon sx={{ color: '#BCAAA4' }} /> },
];

const WaterTracker = React.memo(({ user, onWaterDataChange }) => {
  const [waterData, setWaterData] = useState({
    waterIntake: 0,
    dailyWaterTarget: 2000,
    glassSize: 250,
    history: [],
    drinkHistory: [],
    yesterdayWaterIntake: 0,
    lastResetDate: null,
    waterNotificationOption: "smart",
    customNotificationInterval: 1,

    nextWaterReminderTime: null,
    nextWaterReminderMessage: null,
    activityLevel: "orta",
  });

  // Local state for input fields to prevent immediate updates
  const [localGlassSize, setLocalGlassSize] = useState("250");
  const [localDailyTarget, setLocalDailyTarget] = useState("2000");

  const [dataFetched, setDataFetched] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [achievement, setAchievement] = useState(null);
  const [nextReminder, setNextReminder] = useState(null);
  const [weatherSuggestion, setWeatherSuggestion] = useState("");
  const [waterNotifDialogOpen, setWaterNotifDialogOpen] = useState(false);
  const [drinkHistoryDialogOpen, setDrinkHistoryDialogOpen] = useState(false);

  // Su ekleme modalı için state
  const [addDrinkOpen, setAddDrinkOpen] = useState(false);
  const [selectedDrink, setSelectedDrink] = useState('herbalTea'); // su dışı varsayılan
  const [drinkAmount, setDrinkAmount] = useState(200);
  const [drinkAdded, setDrinkAdded] = useState(false); // EKLENDİ STATE'İNİ TANIMLA

  // Korumalı veri yönetimi için ref'ler
  const lastWaterDataState = useRef(null);
  const isDataLoading = useRef(true);
  const isInitialLoad = useRef(true);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));

  // For mobile/tablet menu
  const [anchorEl, setAnchorEl] = useState(null);
  const handleMenuOpen = (event) => {
    if (event && event.currentTarget) {
      setAnchorEl(event.currentTarget);
    }
  };
  const handleMenuClose = () => setAnchorEl(null);
  const handleStandardGlassSelect = (size) => {
    setLocalGlassSize(String(size));
    handleWaterSettingChange("glassSize", size);
    handleMenuClose();
  };

  const getWaterDocRef = () => doc(db, "users", user.uid, "water", "current");


  const fetchWaterData = async () => {
    const ref = getWaterDocRef();
    const docSnap = await getDoc(ref);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const newWaterData = {
        waterIntake: data.waterIntake || 0,
        dailyWaterTarget: data.dailyWaterTarget || 2000,
        glassSize: data.glassSize || 250,
        history: data.history
          ? data.history.sort((a, b) => new Date(a.date) - new Date(b.date))
          : [],
        drinkHistory: data.drinkHistory || [],
        yesterdayWaterIntake: data.yesterdayWaterIntake || 0,
        lastResetDate: data.lastResetDate || null,
        lastUpdate: data.lastUpdate || null,
        waterNotificationOption: data.waterNotificationOption || "smart",
        customNotificationInterval: data.customNotificationInterval || 1,

        nextWaterReminderTime: data.nextWaterReminderTime || null,
        nextWaterReminderMessage: data.nextWaterReminderMessage || null,
        activityLevel: data.activityLevel || "orta",
      };
      setWaterData({ ...newWaterData }); // Yeni referans ile state güncelle
      // Update local state for input fields
      setLocalGlassSize(String(newWaterData.glassSize));
      setLocalDailyTarget(String(newWaterData.dailyWaterTarget));
      lastWaterDataState.current = { ...newWaterData };
      setDataFetched(true);
      isDataLoading.current = false;
      // İlk yükleme tamamlandı: artık su kaydetme işlemleri Firestore'a yazılabilir
      setTimeout(() => {
        isInitialLoad.current = false;
      }, 500);

      // Server-side hesaplanmış verileri kontrol et ve güncelle
      if (data.serverSideCalculated === true) {
        console.log("WaterTracker - Server-side hesaplanmış veriler tespit edildi, güncelleniyor...");
        try {
          await updateServerSideCalculations(user);
          // Güncelleme sonrası verileri tekrar çek
          await fetchWaterData();
        } catch (error) {
          console.error("WaterTracker - Server-side güncelleme hatası:", error);
        }
      }

      if (onWaterDataChange) onWaterDataChange(data);
    } else {
      // Doküman yoksa default değerlerle state'i güncelle
      const defaultWaterData = {
        waterIntake: 0,
        dailyWaterTarget: 2000,
        glassSize: 250,
        history: [],
        drinkHistory: [],
        yesterdayWaterIntake: 0,
        lastResetDate: null,
        lastUpdate: new Date().toISOString(),
        waterNotificationOption: "smart",
        customNotificationInterval: 1,
        notificationWindow: { start: "08:00", end: "22:00" },
        nextWaterReminderTime: null,
        nextWaterReminderMessage: null,
        activityLevel: "orta",
      };
      setWaterData(defaultWaterData);
      // Update local state for input fields
      setLocalGlassSize(String(defaultWaterData.glassSize));
      setLocalDailyTarget(String(defaultWaterData.dailyWaterTarget));
      lastWaterDataState.current = { ...defaultWaterData };
      setDataFetched(true);
      isDataLoading.current = false;
      // İlk yükleme tamamlandı (boş doküman durumu)
      setTimeout(() => {
        isInitialLoad.current = false;
      }, 500);
      if (onWaterDataChange) onWaterDataChange(defaultWaterData);
    }
  };

  useEffect(() => {
    if (!user) return;
    // Yeni oturumda flag'leri sıfırla
    isInitialLoad.current = true;
    isDataLoading.current = true;
    fetchWaterData();
    // 5 saniye sonra bir kez daha fetch (kısa polling)
    const timeoutId = setTimeout(() => {
      fetchWaterData();
    }, 5000);
    return () => clearTimeout(timeoutId);
  }, [user]);

  useEffect(() => {
    // Hava durumu önerisini çek
    const fetchWeatherSuggestion = async () => {
      try {
        const weather = await getDailyAverageWeatherData();
        if (weather) {
          const msg = getMotivationalMessageForTime(new Date(), weather);
          setWeatherSuggestion(msg);
        } else {
          setWeatherSuggestion("Hava durumu verisi alınamadı. Yine de bol su içmeyi unutma!");
        }
      } catch (e) {
        setWeatherSuggestion("Hava durumu verisi alınamadı. Yine de bol su içmeyi unutma!");
      }
    };
    fetchWeatherSuggestion();
  }, [user]);

  const handleAddWater = async () => {
    const glassSize = Number(localGlassSize); // HER ZAMAN GÜNCEL LOCAL STATE
    const newIntake = waterData.waterIntake + glassSize;
    const isGoalAchieved =
      newIntake >= waterData.dailyWaterTarget &&
      waterData.waterIntake < waterData.dailyWaterTarget;
    const ref = getWaterDocRef();

    setWaterData(prev => ({
      ...prev,
      waterIntake: newIntake,
      drinkHistory: [
        ...(prev.drinkHistory || []),
        {
          type: 'water',
          amount: glassSize,
          contribution: 1,
          addedWater: glassSize,
          date: new Date().toISOString(),
        },
      ],
    }));

    try {
      // Batch operations ile optimize edilmiş yazma
      const batch = writeBatch(db);

      const drinkHistoryEntry = {
        type: 'water',
        amount: glassSize,
        contribution: 1,
        addedWater: glassSize,
        date: new Date().toISOString(),
      };

      batch.set(ref, {
        waterIntake: newIntake,
        dailyWaterTarget: waterData.dailyWaterTarget,
        glassSize: waterData.glassSize,
        waterNotificationOption: waterData.waterNotificationOption,
        customNotificationInterval: waterData.customNotificationInterval,
        activityLevel: waterData.activityLevel,
        drinkHistory: arrayUnion(drinkHistoryEntry),
        lastUpdate: new Date().toISOString(),
      }, { merge: true });

      await batch.commit();

      const result = await scheduleWaterNotifications(user);
      setNextReminder(result.nextReminder);
    } catch (error) {
      console.error("Error updating water intake:", error);
    }
    if (isGoalAchieved && !achievement) {
      setShowConfetti(true);
      setAchievement("💧🚀 Su Hedefini Aştın! 🎉🌊");
      setTimeout(() => {
        setShowConfetti(false);
        setAchievement(null);
      }, 2700);
    }
  };

  const handleRemoveWater = async () => {
    if (waterData.waterIntake <= 0) {
      return;
    }
    const glassSize = Number(localGlassSize); // HER ZAMAN GÜNCEL LOCAL STATE
    const removedAmount = Math.min(glassSize, waterData.waterIntake);
    const newIntake = waterData.waterIntake - removedAmount;
    const ref = getWaterDocRef();

    setWaterData(prev => ({
      ...prev,
      waterIntake: newIntake,
      drinkHistory: [
        ...(prev.drinkHistory || []),
        {
          type: 'water',
          amount: -removedAmount,
          contribution: 1,
          addedWater: -removedAmount,
          date: new Date().toISOString(),
          action: 'removed',
        },
      ],
    }));

    try {
      await setDoc(
        ref,
        {
          waterIntake: newIntake,
          glassSize: glassSize,
          drinkHistory: arrayUnion({
            type: 'water',
            amount: -removedAmount,
            contribution: 1,
            addedWater: -removedAmount,
            date: new Date().toISOString(),
            action: 'removed',
          }),
        },
        { merge: true }
      );
      setTimeout(fetchWaterData, 300);
      const result = await scheduleWaterNotifications(user);
      setNextReminder(result.nextReminder);
    } catch (error) {
      console.error("Error updating water intake:", error);
    }
  };

  const handleAddDrink = () => {
    setAddDrinkOpen(true);
    setDrinkAmount(200); // modal açıldığında varsayılan 200 ml
  };

  const handleConfirmAddDrink = async () => {
    const amount = Number(drinkAmount);
    if (!amount || amount <= 0) return;
    if (selectedDrink === 'water') return; // su eklenemez

    // HEMEN EKLENDİ DURUMUNU GÖSTER
    setDrinkAdded(true);
    setTimeout(() => setDrinkAdded(false), 1500); // 1.5 sn sonra eski haline dön

    const contribution = DRINK_WATER_CONTRIBUTION[selectedDrink] || 1;
    const addedWater = Math.round(amount * contribution);
    const newIntake = waterData.waterIntake + addedWater;
    const isGoalAchieved =
      newIntake >= waterData.dailyWaterTarget &&
      waterData.waterIntake < waterData.dailyWaterTarget;
    const ref = getWaterDocRef();
    try {
      await setDoc(
        ref,
        {
          waterIntake: newIntake,
          dailyWaterTarget: waterData.dailyWaterTarget,
          glassSize: waterData.glassSize,
          waterNotificationOption: waterData.waterNotificationOption,
          customNotificationInterval: waterData.customNotificationInterval,
          activityLevel: waterData.activityLevel,
          drinkHistory: arrayUnion({
            type: selectedDrink,
            amount,
            contribution,
            addedWater,
            date: new Date().toISOString(),
          }),
        },
        { merge: true }
      );
      setTimeout(fetchWaterData, 300);
      const result = await scheduleWaterNotifications(user);
      setNextReminder(result.nextReminder);
    } catch (error) {
      console.error("Error updating water intake:", error);
    }
    if (isGoalAchieved && !achievement) {
      setShowConfetti(true);
      setAchievement("💧🚀 Su Hedefini Aştın! 🎉🌊");
      setTimeout(() => {
        setShowConfetti(false);
        setAchievement(null);
      }, 2700);
    }
  };

  const handleWaterSettingChange = async (field, value) => {
    const ref = getWaterDocRef();
    try {
      await setDoc(ref, { [field]: value }, { merge: true });
      // Her durumda hedef hesaplama ve fetch sıralı yapılmalı
      const result = await scheduleWaterNotifications(user);
      setNextReminder(result.nextReminder);
      await fetchWaterData(); // Hedef kaydedildikten hemen sonra fetch
    } catch (error) {
      console.error("handleWaterSettingChange error:", error);
    }
  };

  // Debounced handlers for input fields
  const handleGlassSizeChange = (value) => {
    setLocalGlassSize(value);
  };

  const handleGlassSizeBlur = async () => {
    const numValue = Number(localGlassSize);
    if (!isNaN(numValue) && numValue > 0) {
      await handleWaterSettingChange("glassSize", numValue);
    } else {
      // Reset to current value if invalid
      setLocalGlassSize(String(waterData.glassSize));
    }
  };

  const handleDailyTargetChange = (value) => {
    setLocalDailyTarget(value);
  };

  const handleDailyTargetBlur = async () => {
    const numValue = Number(localDailyTarget);
    if (!isNaN(numValue) && numValue > 0) {
      await handleWaterSettingChange("dailyWaterTarget", numValue);
    } else {
      // Reset to current value if invalid
      setLocalDailyTarget(String(waterData.dailyWaterTarget));
    }
  };

  const waterPercentage = useMemo(() => {
    return Math.min((waterData.waterIntake / waterData.dailyWaterTarget) * 100, 100);
  }, [waterData.waterIntake, waterData.dailyWaterTarget]);

  const isGoalAchieved = useMemo(() => {
    return waterData.waterIntake >= waterData.dailyWaterTarget;
  }, [waterData.waterIntake, waterData.dailyWaterTarget]);

  useEffect(() => {
    if (!user?.uid || !dataFetched) return;
    const now = getTurkeyTime();

    if (
      waterData.nextWaterReminderTime &&
      new Date(waterData.nextWaterReminderTime).getTime() >
      now.getTime() + 60000
    ) {
      setNextReminder({
        time: waterData.nextWaterReminderTime,
        message: waterData.nextWaterReminderMessage,
      });
    } else if (waterData.waterNotificationOption !== "none") {
      saveNextWaterReminderTime(user)
        .then((next) => {
          if (process.env.NODE_ENV === 'development') {
            console.log("WaterTracker - nextReminder hesaplandı:", next);
          }
          setNextReminder(next);
        })
        .catch((err) =>
          console.error("WaterTracker - saveNextWaterReminderTime hatası:", err)
        );
    } else {
      setNextReminder(null);
    }
  }, [
    user?.uid,
    waterData.nextWaterReminderTime,
    waterData.waterNotificationOption,
    dataFetched,
    waterData.waterIntake,
    waterData.dailyWaterTarget,
    waterData.customNotificationInterval,
    waterData.activityLevel,
  ]);

  // Su verisi değişikliklerini izle ve korumalı güncelleme yap
  useEffect(() => {
    if (!user || isInitialLoad.current || isDataLoading.current) return;

    // Sadece gerçek değişiklik varsa güncelle
    const hasRealChange = JSON.stringify(waterData) !== JSON.stringify(lastWaterDataState.current);

    if (hasRealChange) {
      const updateWaterDataInFirestore = async () => {
        try {
          const ref = getWaterDocRef();
          await setDoc(ref, waterData, { merge: true });
          lastWaterDataState.current = { ...waterData };
        } catch (error) {
          console.error("Su verisi güncelleme hatası:", error);
        }
      };
      updateWaterDataInFirestore();
    }
  }, [waterData, user]);

  // --- TEST BUTTON FOR ANIMATION (DEV ONLY) ---
  const handleTestAchievement = () => {
    if (achievement) return; // Prevent double trigger
    setShowConfetti(true);
    setAchievement("💧🚀 Su Hedefini Aştın! 🎉🌊");
    setTimeout(() => {
      setShowConfetti(false);
      setAchievement(null);
    }, 2700);
  };

  const handleRemoveDrinkHistory = async (drinkRecord) => {
    const ref = getWaterDocRef();
    const newIntake = Math.max(0, waterData.waterIntake - drinkRecord.addedWater);

    try {
      await setDoc(
        ref,
        {
          waterIntake: newIntake,
          drinkHistory: arrayRemove(drinkRecord), // Geçmiş kaydını sil
        },
        { merge: true }
      );

      // Local state'i güncelle - optimize edilmiş array işlemi
      setWaterData(prev => ({
        ...prev,
        waterIntake: newIntake,
        drinkHistory: prev.drinkHistory.filter(item =>
          !(item.date === drinkRecord.date &&
            item.type === drinkRecord.type &&
            item.amount === drinkRecord.amount)
        ),
      }));

      setTimeout(fetchWaterData, 300);
      const result = await scheduleWaterNotifications(user);
      setNextReminder(result.nextReminder);
    } catch (error) {
      console.error("Error removing drink history:", error);
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 480, mx: 'auto' }}>
      {/* Confetti Achievement */}
      {showConfetti && (
        <Confetti
          recycle={false}
          numberOfPieces={280}
          colors={["#6366f1", "#818cf8", "#06b6d4", "#22d3ee", "#4ade80", "#fff"]}
          drawShape={(ctx) => { ctx.beginPath(); ctx.arc(0, 0, 3, 0, 2 * Math.PI); ctx.fill(); }}
          gravity={0.15}
          style={{ pointerEvents: "none", position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 9998 }}
          onConfettiComplete={() => setShowConfetti(false)}
        />
      )}
      {achievement && (
        <ImpactfulAchievementAnimation
          message={achievement}
          onComplete={() => { setAchievement(null); setShowConfetti(false); }}
        />
      )}

      {/* ── Ana Su Kartı ── */}
      <Box
        sx={{
          borderRadius: '28px',
          p: { xs: 3, sm: 4 },
          background: 'linear-gradient(145deg, #1e3a5f 0%, #0f2944 100%)',
          border: '1px solid rgba(99,102,241,0.25)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Arka plan dekorasyon */}
        <Box sx={{
          position: 'absolute', top: -60, right: -60, width: 200, height: 200,
          borderRadius: '50%', background: 'rgba(6,182,212,0.08)', pointerEvents: 'none',
        }} />
        <Box sx={{
          position: 'absolute', bottom: -40, left: -40, width: 160, height: 160,
          borderRadius: '50%', background: 'rgba(99,102,241,0.08)', pointerEvents: 'none',
        }} />

        {/* Başlık */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>
            💧 Su Tüketimi
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="İçecek Geçmişi">
              <IconButton
                onClick={() => setDrinkHistoryDialogOpen(true)}
                size="small"
                sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: '#06b6d4', background: 'rgba(6,182,212,0.12)' }, borderRadius: '10px', p: 1 }}
              >
                <HistoryIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Su Bildirim Ayarları">
              <IconButton
                onClick={() => setWaterNotifDialogOpen(true)}
                size="small"
                sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: '#818cf8', background: 'rgba(99,102,241,0.12)' }, borderRadius: '10px', p: 1 }}
              >
                {waterData.waterNotificationOption === 'none' ? <NotificationsOffIcon sx={{ fontSize: 20 }} /> : <NotificationsIcon sx={{ fontSize: 20 }} />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Dairesel Progress + Lottie */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Box sx={{ position: 'relative', width: 200, height: 200 }}>
            {/* SVG Dairesel progress */}
            <svg
              width="200" height="200" viewBox="0 0 200 200"
              style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}
            >
              {/* Arka track */}
              <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
              {/* Progress arc */}
              <circle
                cx="100" cy="100" r="88" fill="none"
                stroke="url(#waterGrad)" strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 88}`}
                strokeDashoffset={`${2 * Math.PI * 88 * (1 - waterPercentage / 100)}`}
                style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
              />
              <defs>
                <linearGradient id="waterGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
            </svg>

            {/* Lottie animasyonu — daire içinde */}
            <Box sx={{
              position: 'absolute',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 110, height: 110,
              borderRadius: '50%',
              overflow: 'hidden',
              opacity: Math.max(0.3, waterPercentage / 100),
              transition: 'opacity 0.5s',
            }}>
              <Lottie animationData={waterAnimation} loop className={styles.lottieContainer} />
            </Box>

            {/* Merkez metin */}
            <Box sx={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              width: '100%',
            }}>
              <Typography sx={{
                color: '#fff', fontWeight: 800, fontSize: '1.6rem', lineHeight: 1,
                textShadow: '0 2px 8px rgba(0,0,0,0.5)',
              }}>
                {Math.round(waterPercentage)}%
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.68rem', mt: 0.5 }}>
                {waterData.waterIntake} ml
              </Typography>
            </Box>
          </Box>

          {/* Miktar etiketi */}
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 700, fontSize: '1.1rem' }}>
              {waterData.waterIntake} / {waterData.dailyWaterTarget} ml
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', mt: 0.5 }}>
              {isGoalAchieved
                ? '🎉 Günlük hedefe ulaştın!'
                : `${waterData.dailyWaterTarget - waterData.waterIntake} ml daha iç`}
            </Typography>
          </Box>
        </Box>

        {/* ── Kontrol Butonları ── */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 3 }}>
          {/* Çıkar */}
          <Tooltip title="Su Eksilt">
            <IconButton
              onClick={handleRemoveWater}
              sx={{
                width: 56, height: 56,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#f87171',
                borderRadius: '16px',
                transition: 'all 0.2s',
                '&:hover': { background: 'rgba(248,113,113,0.15)', borderColor: 'rgba(248,113,113,0.35)', transform: 'scale(1.08)' },
                '&:active': { transform: 'scale(0.95)' },
              }}
            >
              <RemoveIcon sx={{ fontSize: 24 }} />
            </IconButton>
          </Tooltip>

          {/* Ana: Su Ekle */}
          <Tooltip title="Su Ekle">
            <IconButton
              onClick={handleAddWater}
              sx={{
                width: 72, height: 72,
                background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                boxShadow: '0 6px 24px rgba(99,102,241,0.4)',
                color: '#fff',
                borderRadius: '22px',
                transition: 'all 0.2s',
                '&:hover': { transform: 'scale(1.08)', boxShadow: '0 8px 32px rgba(99,102,241,0.55)' },
                '&:active': { transform: 'scale(0.95)' },
              }}
            >
              <AddIcon sx={{ fontSize: 30 }} />
            </IconButton>
          </Tooltip>

          {/* İçecek Ekle */}
          <Tooltip title="İçecek Ekle">
            <IconButton
              onClick={handleAddDrink}
              sx={{
                width: 56, height: 56,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#06b6d4',
                borderRadius: '16px',
                transition: 'all 0.2s',
                '&:hover': { background: 'rgba(6,182,212,0.15)', borderColor: 'rgba(6,182,212,0.35)', transform: 'scale(1.08)' },
                '&:active': { transform: 'scale(0.95)' },
              }}
            >
              <EmojiFoodBeverageIcon sx={{ fontSize: 22 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Bardak boyutu hızlı seçimi */}
        <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', mb: 3, flexWrap: 'wrap' }}>
          {STANDARD_GLASS_SIZES.map((glass) => {
            const isSelected = Number(localGlassSize) === glass.value;
            return (
              <Box
                key={glass.value}
                onClick={() => handleStandardGlassSelect(glass.value)}
                sx={{
                  px: 2, py: 1.2,
                  borderRadius: '14px',
                  cursor: 'pointer',
                  border: `1px solid ${isSelected ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.10)'}`,
                  background: isSelected ? 'rgba(99,102,241,0.20)' : 'rgba(255,255,255,0.05)',
                  color: isSelected ? '#818cf8' : 'rgba(255,255,255,0.45)',
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: '0.8rem',
                  transition: 'all 0.18s',
                  userSelect: 'none',
                  textAlign: 'center',
                  minWidth: 60,
                  '&:hover': { background: 'rgba(99,102,241,0.14)', borderColor: 'rgba(99,102,241,0.4)', color: '#818cf8' },
                  '&:active': { transform: 'scale(0.96)' },
                }}
              >
                {glass.icon}
                <Typography sx={{ fontSize: '0.72rem', mt: 0.3, color: 'inherit', fontWeight: 'inherit' }}>
                  {glass.value}ml
                </Typography>
              </Box>
            );
          })}
        </Box>

        {/* Özel bardak boyutu input */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            fullWidth
            label="Özel bardak (ml)"
            type="number"
            value={localGlassSize}
            onChange={(e) => handleGlassSizeChange(e.target.value)}
            onBlur={handleGlassSizeBlur}
            onKeyPress={(e) => { if (e.key === 'Enter') handleGlassSizeBlur(); }}
            size="small"
            variant="outlined"
            InputProps={{
              startAdornment: <InputAdornment position="start"><SportsBar sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 18 }} /></InputAdornment>,
              endAdornment: <InputAdornment position="end"><Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>ml</Typography></InputAdornment>,
              sx: {
                color: '#fff',
                '& input': { color: '#fff', WebkitTextFillColor: '#fff' },
                '& fieldset': { borderColor: 'rgba(255,255,255,0.12)', borderRadius: '12px' },
                '&:hover fieldset': { borderColor: 'rgba(99,102,241,0.4)' },
                '&.Mui-focused fieldset': { borderColor: '#6366f1' },
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '12px',
              },
            }}
            InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.4)', '&.Mui-focused': { color: '#818cf8' } } }}
          />
          <TextField
            fullWidth
            label="Günlük hedef (ml)"
            type="number"
            value={localDailyTarget}
            disabled={waterData.waterNotificationOption === 'smart'}
            onChange={(e) => { if (waterData.waterNotificationOption === 'custom') handleDailyTargetChange(e.target.value); }}
            onBlur={() => { if (waterData.waterNotificationOption === 'custom') handleDailyTargetBlur(); }}
            size="small"
            variant="outlined"
            InputProps={{
              startAdornment: <InputAdornment position="start"><CheckCircle sx={{ color: isGoalAchieved ? '#4ade80' : 'rgba(255,255,255,0.3)', fontSize: 18 }} /></InputAdornment>,
              endAdornment: <InputAdornment position="end"><Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>ml</Typography></InputAdornment>,
              sx: {
                color: '#fff',
                '& input': { color: '#fff', WebkitTextFillColor: '#fff' },
                '& fieldset': { borderColor: 'rgba(255,255,255,0.12)', borderRadius: '12px' },
                '&:hover fieldset': { borderColor: 'rgba(74,222,128,0.4)' },
                '&.Mui-focused fieldset': { borderColor: '#4ade80' },
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '12px',
              },
            }}
            InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.4)', '&.Mui-focused': { color: '#4ade80' } } }}
          />
        </Box>

        {/* Sonraki bildirim + hava durumu satırı */}
        <Box sx={{
          display: 'flex', gap: 1.5, flexWrap: 'wrap',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '16px', p: 2, border: '1px solid rgba(255,255,255,0.07)',
        }}>
          {/* Bildirim */}
          <Box sx={{ flex: 1, minWidth: 140 }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.5 }}>
              Sonraki Bildirim
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600, fontSize: '0.9rem' }}>
              {isGoalAchieved && waterData.waterNotificationOption !== 'none'
                ? '🎯 Hedefe ulaştın!'
                : waterData.waterNotificationOption === 'none'
                  ? '🔕 Kapalı'
                  : nextReminder
                    ? `🔔 ${new Date(nextReminder.time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`
                    : '—'}
            </Typography>
          </Box>
          {/* Hava öneri */}
          {weatherSuggestion && (
            <Box sx={{ flex: 2, minWidth: 160 }}>
              <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.5 }}>
                Öneri
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.8rem', lineHeight: 1.4 }}>
                {weatherSuggestion}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* ── Bildirim Dialogları ── */}
      <WaterNotificationSettingsDialog
        open={waterNotifDialogOpen}
        onClose={() => setWaterNotifDialogOpen(false)}
        waterSettings={waterData}
        onSave={(newSettings) => {
          handleWaterSettingChange('waterNotificationOption', newSettings.waterNotificationOption);
          handleWaterSettingChange('customNotificationInterval', newSettings.customNotificationInterval);
          if (newSettings.activityLevel) handleWaterSettingChange('activityLevel', newSettings.activityLevel);
        }}
      />

      <DrinkHistoryDialog
        open={drinkHistoryDialogOpen}
        onClose={() => setDrinkHistoryDialogOpen(false)}
        drinkHistory={waterData.drinkHistory || []}
        onRemoveDrinkHistory={handleRemoveDrinkHistory}
      />

      {/* ── İçecek Ekle Dialog ── */}
      <Dialog
        open={addDrinkOpen}
        onClose={() => { setAddDrinkOpen(false); setDrinkAmount(200); setDrinkAdded(false); }}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            background: 'rgba(10, 15, 30, 0.96)',
            backdropFilter: 'blur(24px)',
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.10)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
            m: 2,
            maxWidth: { xs: '95vw', sm: 420 },
          }
        }}
      >
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <Box sx={{ p: 1.5, borderRadius: '14px', background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.25)' }}>
              <EmojiFoodBeverageIcon sx={{ fontSize: 24, color: '#06b6d4' }} />
            </Box>
            <Typography sx={{ fontWeight: 800, color: '#fff', fontSize: '1.1rem' }}>İçecek Ekle</Typography>
          </Box>

          <TextField
            select
            label="İçecek Tipi"
            value={selectedDrink}
            onChange={e => setSelectedDrink(e.target.value)}
            fullWidth
            size="small"
            sx={{ mb: 2 }}
            InputProps={{
              sx: {
                color: '#fff',
                '& input': { color: '#fff', WebkitTextFillColor: '#fff' },
                '& fieldset': { borderColor: 'rgba(255,255,255,0.12)', borderRadius: '12px' },
                background: 'rgba(255,255,255,0.05)', borderRadius: '12px',
              }
            }}
            InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.45)' } }}
            SelectProps={{
              MenuProps: {
                PaperProps: {
                  sx: {
                    background: 'rgba(10,15,30,0.98)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.10)',
                  }
                }
              }
            }}
          >
            {DRINK_OPTIONS.filter(opt => opt.value !== 'water').map(opt => (
              <MenuItem key={opt.value} value={opt.value} sx={{ color: '#fff', fontWeight: 600, '&:hover': { background: 'rgba(99,102,241,0.12)' } }}>
                {opt.icon} <span style={{ marginLeft: 8 }}>{opt.label}</span>
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Miktar (ml)"
            type="number"
            value={drinkAmount}
            onChange={e => setDrinkAmount(e.target.value)}
            fullWidth
            size="small"
            sx={{ mb: 2 }}
            InputProps={{
              endAdornment: <InputAdornment position="end"><Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem' }}>ml</Typography></InputAdornment>,
              sx: {
                color: '#fff',
                '& input': { color: '#fff', WebkitTextFillColor: '#fff' },
                '& fieldset': { borderColor: 'rgba(255,255,255,0.12)', borderRadius: '12px' },
                background: 'rgba(255,255,255,0.05)', borderRadius: '12px',
              }
            }}
            InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.45)' } }}
          />

          {selectedDrink && (
            <Box sx={{ mb: 3, p: 2, borderRadius: '12px', background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.15)' }}>
              <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem' }}>
                💧 Bu içecek suya <strong style={{ color: '#06b6d4' }}>%{Math.round((DRINK_WATER_CONTRIBUTION[selectedDrink] || 1) * 100)}</strong> oranında katkı sağlar
                {drinkAmount > 0 && <> &mdash; yaklaşık <strong style={{ color: '#22d3ee' }}>{Math.round(Number(drinkAmount) * (DRINK_WATER_CONTRIBUTION[selectedDrink] || 1))} ml</strong> su</>}
              </Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              onClick={() => { setAddDrinkOpen(false); setDrinkAmount(200); setDrinkAdded(false); }}
              fullWidth
              sx={{
                borderRadius: '14px', py: 1.5, fontWeight: 700,
                color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.10)',
                '&:hover': { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.8)' },
              }}
            >
              İptal
            </Button>
            <Button
              onClick={handleConfirmAddDrink}
              fullWidth
              disabled={drinkAdded}
              sx={{
                borderRadius: '14px', py: 1.5, fontWeight: 700, color: '#fff',
                background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
                '&:hover': { boxShadow: '0 6px 24px rgba(99,102,241,0.5)', transform: 'translateY(-1px)' },
                '&:disabled': { background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.35)', boxShadow: 'none' },
              }}
            >
              {drinkAdded ? '✓ Eklendi' : 'Ekle'}
            </Button>
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
});

export default WaterTracker;

