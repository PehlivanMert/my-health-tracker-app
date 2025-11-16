import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Container,
  Typography,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { styled, keyframes } from "@mui/material/styles";
import NotificationsIcon from "@mui/icons-material/Notifications";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import SortIcon from "@mui/icons-material/Sort";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  writeBatch,
  runTransaction
} from "firebase/firestore";
import { db } from "../auth/firebaseConfig";
import {
  Medication,
  LocalPharmacy,
  Spa,
  FitnessCenter,
  Opacity,
  HealthAndSafety,
  Vaccines,
} from "@mui/icons-material";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SupplementDialog from "./SupplementDialog";
import WaterTracker from "./WaterTracker";
import WaterConsumptionChart from "./WaterConsumptionChart";
import SupplementConsumptionChart from "./SupplementConsumptionChart";
import SupplementNotificationSettingsDialog from "./SupplementNotificationSettingsDialog";
import { saveNextSupplementReminderTime } from "../notify/SupplementNotificationScheduler";
import WaterNotificationSettingsDialog from "./WaterNotificationSettingsDialog";
import UndoIcon from "@mui/icons-material/Undo";
import { toast } from "react-toastify";

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
  100% { transform: translateY(0px); }
`;

const shimmer = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
`;

// Global CSS animasyonu için style tag ekle
const globalStyles = `
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`;

const supplementColors = [
  "#00E676", // Vitamin yeşili
  "#00B0FF", // Mineral mavisi
  "#FF9100", // Protein turuncusu
  "#651FFF", // Omega moru
  "#FF4081", // Özel pembe
  "#00BFA5", // Yeşil-mavi
  "#FFD600", // Altın sarısı
];

const supplementIcons = [
  <LocalPharmacy sx={{ color: "#fff", fontSize: "1.4rem" }} />,
  <Spa sx={{ color: "#fff", fontSize: "1.4rem" }} />,
  <FitnessCenter sx={{ color: "#fff", fontSize: "1.4rem" }} />,
  <Opacity sx={{ color: "#fff", fontSize: "1.4rem" }} />,
  <HealthAndSafety sx={{ color: "#fff", fontSize: "1.4rem" }} />,
  <Vaccines sx={{ color: "#fff", fontSize: "1.4rem" }} />,
];

const getSupplementColor = (name) => {
  if (!name || typeof name !== "string") return "#2196F3"; // Varsayılan renk
  const lowerName = name.toLowerCase();

  // Anahtar kelime kontrolü
  if (lowerName.includes("vitamin")) return "#00E676";
  if (lowerName.includes("mineral")) return "#00B0FF";
  if (lowerName.includes("protein")) return "#FF9100";
  if (lowerName.includes("omega")) return "#651FFF";

  // Hash tabanlı renk
  const hash = name
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return supplementColors[hash % supplementColors.length];
};

const getSupplementIcon = (name) => {
  if (!name || typeof name !== "string")
    return <Medication sx={{ color: "#fff", fontSize: "1.4rem" }} />;
  const lowerName = name.toLowerCase();

  // Anahtar kelime kontrolü
  if (lowerName.includes("vitamin"))
    return <LocalPharmacy sx={{ color: "#fff", fontSize: "1.4rem" }} />;
  if (lowerName.includes("mineral"))
    return <Spa sx={{ color: "#fff", fontSize: "1.4rem" }} />;
  if (lowerName.includes("protein"))
    return <FitnessCenter sx={{ color: "#fff", fontSize: "1.4rem" }} />;
  if (lowerName.includes("omega 3"))
    return <Opacity sx={{ color: "#fff", fontSize: "1.4rem" }} />;

  // Hash tabanlı ikon
  const hash = name
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return supplementIcons[hash % supplementIcons.length];
};

// Modern takviye kartı bileşeni
const ModernSupplementCard = ({ 
  supplement, 
  consumedToday, 
  remainingToday, 
  progress, 
  daysLeft,
  onConsume,
  onEdit,
  onDelete,
  onUndo,
  isProcessing = false,
  isUndoProcessing = false
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationTimes, setNotificationTimes] = useState([]);

  useEffect(() => {
    if (supplement.notificationSchedule && Array.isArray(supplement.notificationSchedule)) {
      // notificationSchedule bir string array'i olabilir
      const times = supplement.notificationSchedule
        .filter(time => time && typeof time === 'string')
        .sort();
      setNotificationTimes(times);
    } else {
      setNotificationTimes([]);
    }
  }, [supplement.notificationSchedule]);

  const formatTime = (timeString) => {
    try {
      const [hours, minutes] = timeString.split(':');
      return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
    } catch {
      return timeString;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Box
        sx={{
          background: "linear-gradient(145deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)",
          borderRadius: "24px",
          p: { xs: 3, sm: 3.5, md: 4 },
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.2)",
          position: "relative",
          overflow: "hidden",
          cursor: "pointer",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "5px",
            background: `linear-gradient(90deg, ${getSupplementColor(supplement.name)}, ${getSupplementColor(supplement.name)}80)`,
            borderRadius: "24px 24px 0 0",
          },
          "&:hover": {
            transform: "translateY(-4px)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
            border: "1px solid rgba(255,255,255,0.3)",
          }
        }}
      >
        {/* Header - İkon ve İsim */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: { xs: 2, sm: 2.5 },
            mb: 2.5,
          }}
        >
          <Box
            sx={{
              width: { xs: 52, sm: 56, md: 60 },
              height: { xs: 52, sm: 56, md: 60 },
              borderRadius: "18px",
              background: `linear-gradient(135deg, ${getSupplementColor(supplement.name)}, ${getSupplementColor(supplement.name)}CC)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 8px 24px ${getSupplementColor(supplement.name)}40`,
              position: "relative",
              flexShrink: 0,
              "&::after": {
                content: '""',
                position: "absolute",
                inset: 0,
                borderRadius: "18px",
                background: "linear-gradient(135deg, rgba(255,255,255,0.2), transparent)",
              }
            }}
          >
            {getSupplementIcon(supplement.name)}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="h6"
              sx={{
                color: "#fff",
                fontWeight: 700,
                fontSize: { xs: "1.2rem", sm: "1.3rem", md: "1.4rem" },
                lineHeight: 1.2,
                mb: 0.5,
                textShadow: "0 2px 4px rgba(0,0,0,0.3)",
                wordBreak: "break-word",
              }}
            >
              {supplement.name}
            </Typography>
           
          </Box>
        </Box>

        {/* Action Buttons - Modern Tasarım */}
        <Box 
          sx={{ 
            display: "flex", 
            gap: 0.8,
            mb: 2.5,
            width: "100%",
          }}
        >
          {notificationTimes.length > 0 && (
            <Tooltip title={`${notificationTimes.length} bildirim saati`}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNotifications(!showNotifications);
                }}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  p: 0.8,
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "rgba(255,255,255,0.9)",
                  backdropFilter: "blur(10px)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:hover": {
                    background: "linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.1))",
                    border: "1px solid rgba(255,255,255,0.3)",
                    transform: "translateY(-1px)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  },
                }}
              >
                <AccessTimeIcon sx={{ fontSize: { xs: "1rem", sm: "1.1rem" } }} />
              </IconButton>
            </Tooltip>
          )}
          
          <Tooltip title="Geri Al">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onUndo(supplement);
              }}
              disabled={!(consumedToday > 0) || isUndoProcessing}
              sx={{
                flex: 1,
                minWidth: 0,
                p: 0.8,
                borderRadius: "8px",
                background: consumedToday > 0 && !isUndoProcessing
                  ? "linear-gradient(135deg, rgba(33,150,243,0.2), rgba(33,150,243,0.1))"
                  : "rgba(255,255,255,0.05)",
                border: consumedToday > 0 && !isUndoProcessing
                  ? "1px solid rgba(33,150,243,0.3)"
                  : "1px solid rgba(255,255,255,0.1)",
                color: consumedToday > 0 && !isUndoProcessing
                  ? "#ffffff" 
                  : "rgba(255,255,255,0.3)",
                backdropFilter: "blur(10px)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": {
                  background: consumedToday > 0 && !isUndoProcessing
                    ? "linear-gradient(135deg, rgba(33,150,243,0.3), rgba(33,150,243,0.15))"
                    : "rgba(255,255,255,0.05)",
                  border: consumedToday > 0 && !isUndoProcessing
                    ? "1px solid rgba(33,150,243,0.4)"
                    : "1px solid rgba(255,255,255,0.1)",
                  transform: consumedToday > 0 && !isUndoProcessing ? "translateY(-1px)" : "none",
                  boxShadow: consumedToday > 0 && !isUndoProcessing ? "0 4px 12px rgba(33,150,243,0.2)" : "none",
                },
                "&:disabled": {
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.3)",
                },
              }}
            >
              <UndoIcon sx={{ fontSize: { xs: "1rem", sm: "1.1rem" } }} />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Düzenle">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(supplement);
              }}
              sx={{
                flex: 1,
                minWidth: 0,
                p: 0.8,
                borderRadius: "8px",
                background: "linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "rgba(255,255,255,0.9)",
                backdropFilter: "blur(10px)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": {
                  background: "linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.1))",
                  border: "1px solid rgba(255,255,255,0.3)",
                  transform: "translateY(-1px)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                },
              }}
            >
              <EditIcon sx={{ fontSize: { xs: "1rem", sm: "1.1rem" } }} />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Sil">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(supplement.id);
              }}
              sx={{
                flex: 1,
                minWidth: 0,
                p: 0.8,
                borderRadius: "8px",
                background: "linear-gradient(135deg, rgba(255,68,68,0.15), rgba(255,68,68,0.05))",
                border: "1px solid rgba(255,68,68,0.2)",
                color: "#ff6b6b",
                backdropFilter: "blur(10px)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": {
                  background: "linear-gradient(135deg, rgba(255,68,68,0.25), rgba(255,68,68,0.1))",
                  border: "1px solid rgba(255,68,68,0.3)",
                  transform: "translateY(-1px)",
                  boxShadow: "0 4px 12px rgba(255,68,68,0.2)",
                },
              }}
            >
              <DeleteIcon sx={{ fontSize: { xs: "1rem", sm: "1.1rem" } }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Notification Times (Expandable) */}
        <AnimatePresence>
          {showNotifications && notificationTimes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Box
                sx={{
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  p: 1.5,
                  mb: 2,
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 1,
                    color: "rgba(255,255,255,0.9)",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                  }}
                >
                  <AccessTimeIcon sx={{ fontSize: "1rem" }} />
                  Bildirim Saatleri
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 0.8,
                  }}
                >
                  {notificationTimes.map((time, index) => (
                    <Box
                      key={index}
                      sx={{
                        background: "rgba(255, 255, 255, 0.1)",
                        color: "#fff",
                        padding: "4px 8px",
                        borderRadius: "8px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        border: "1px solid rgba(255, 255, 255, 0.3)",
                      }}
                    >
                      {formatTime(time)}
                    </Box>
                  ))}
                </Box>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress Bar */}
        <Box sx={{ mb: 3 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 1,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: "rgba(255,255,255,0.8)",
                fontSize: { xs: "0.8rem", sm: "0.9rem" },
                fontWeight: 600,
              }}
            >
              {daysLeft} gün kaldı
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "rgba(255,255,255,0.8)",
                fontSize: { xs: "0.8rem", sm: "0.9rem" },
                fontWeight: 600,
              }}
            >
              {supplement.quantity} adet
            </Typography>
          </Box>
          <Box
            sx={{
              height: { xs: 8, sm: 10 },
              bgcolor: "rgba(255,255,255,0.15)",
              borderRadius: 6,
              overflow: "hidden",
              position: "relative",
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            <Box
              sx={{
                width: `${progress}%`,
                height: "100%",
                background: `linear-gradient(90deg, ${getSupplementColor(supplement.name)}, ${getSupplementColor(supplement.name)}CC)`,
                borderRadius: 6,
                transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                position: "relative",
                boxShadow: `0 2px 8px ${getSupplementColor(supplement.name)}30`,
                "&::after": {
                  content: '""',
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                  animation: "shimmer 2s infinite",
                }
              }}
            />
            <Box
              sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                color: progress > 50 ? "#fff" : "rgba(255,255,255,0.8)",
                fontSize: { xs: "0.75rem", sm: "0.8rem" },
                fontWeight: 700,
                textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                pointerEvents: "none",
              }}
            >
              {Math.round(progress)}%
            </Box>
          </Box>
        </Box>

        {/* Daily Consumption Stats */}
        <Box
          sx={{
            background: "rgba(255,255,255,0.08)",
            borderRadius: "16px",
            p: { xs: 2.5, sm: 3 },
            mb: 3,
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2.5,
            }}
          >
            <Typography
              variant="body1"
              sx={{
                color: "rgba(255,255,255,0.9)",
                fontSize: { xs: "0.9rem", sm: "1rem" },
                fontWeight: 600,
              }}
            >
              Günlük Tüketim
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: getSupplementColor(supplement.name),
                fontSize: { xs: "0.9rem", sm: "1rem" },
                fontWeight: 700,
              }}
            >
              {supplement.dailyUsage} adet
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                flex: 1,
              }}
            >
              <Box
                sx={{
                  width: { xs: 44, sm: 48 },
                  height: { xs: 44, sm: 48 },
                  bgcolor: `linear-gradient(135deg, ${getSupplementColor(supplement.name)}, ${getSupplementColor(supplement.name)}CC)`,
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: { xs: "1rem", sm: "1.1rem" },
                  fontWeight: 700,
                  boxShadow: `0 4px 12px ${getSupplementColor(supplement.name)}40`,
                  flexShrink: 0,
                }}
              >
                {consumedToday}
              </Box>
              <Box>
                <Typography
                  variant="body2"
                  sx={{
                    color: "rgba(255,255,255,0.9)",
                    fontSize: { xs: "0.9rem", sm: "1rem" },
                    fontWeight: 600,
                    lineHeight: 1.2,
                  }}
                >
                  Tüketilen
                </Typography>
              
              </Box>
            </Box>
            
            <Box sx={{ textAlign: "right", flexShrink: 0 }}>
              <Typography
                variant="body2"
                sx={{
                  color: remainingToday > 0 ? getSupplementColor(supplement.name) : "#4caf50",
                  fontSize: { xs: "0.9rem", sm: "1rem" },
                  fontWeight: 700,
                  lineHeight: 1.2,
                }}
              >
                {remainingToday > 0 ? `${remainingToday} kaldı` : "Tamamlandı! 🎉"}
              </Typography>
          
            </Box>
          </Box>
        </Box>

        {/* Action Button */}
        <Box sx={{ textAlign: "center", mt: 1 }}>
          <Button
            variant="contained"
            onClick={(e) => {
              e.stopPropagation();
              onConsume(supplement.id);
            }}
            disabled={supplement.quantity === 0 || remainingToday === 0 || isProcessing}
            sx={{
              background: supplement.quantity === 0 || remainingToday === 0 || isProcessing
                ? "rgba(255,255,255,0.2)" 
                : `linear-gradient(135deg, ${getSupplementColor(supplement.name)}, ${getSupplementColor(supplement.name)}CC)`,
              color: "#fff",
              borderRadius: "20px",
              px: { xs: 3, sm: 4 },
              py: { xs: 1.2, sm: 1.5 },
              fontSize: { xs: "0.8rem", sm: "0.9rem" },
              fontWeight: 700,
              textTransform: "none",
              letterSpacing: "0.5px",
              boxShadow: supplement.quantity === 0 || remainingToday === 0 || isProcessing
                ? "none"
                : `0 6px 20px ${getSupplementColor(supplement.name)}40`,
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              "&:hover": {
                background: supplement.quantity === 0 || remainingToday === 0 || isProcessing
                  ? "rgba(255,255,255,0.2)"
                  : `linear-gradient(135deg, ${getSupplementColor(supplement.name)}CC, ${getSupplementColor(supplement.name)})`,
                transform: "translateY(-2px)",
                boxShadow: supplement.quantity === 0 || remainingToday === 0 || isProcessing
                  ? "none"
                  : `0 8px 25px ${getSupplementColor(supplement.name)}50`,
              },
              "&:disabled": {
                background: "rgba(255,255,255,0.2)",
                color: "rgba(255,255,255,0.5)",
                transform: "none",
                boxShadow: "none",
              },
            }}
          >
            {supplement.quantity === 0 ? "Tükendi" : 
             remainingToday === 0 ? "Hedef Tamamlandı ✨" : 
             isProcessing ? "Takviye alınıyor..." : "Takviyeni Al 💊"}
          </Button>
        </Box>
      </Box>
    </motion.div>
  );
};

const StyledAccordionSummary = styled(AccordionSummary)(({ theme }) => ({
  background: "linear-gradient(45deg, #2196F3 30%, #3F51B5 90%)",
  borderRadius: '24px !important',
  boxShadow: "0 3px 5px 2px rgba(33, 150, 243, 0.13)",
  color: "white",
  padding: { xs: "8px 20px", sm: "10px 25px", md: "12px 35px" },
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  display: 'flex',
  alignItems: 'center',
  gap: 1.5,
  minHeight: 'unset',
  "& .MuiAccordionSummary-content": {
    margin: { xs: "4px 0", sm: "6px 0", md: "8px 0" },
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
  },
}));

const AnimatedButton = styled(Button)(({ theme }) => ({
  background: "linear-gradient(45deg, #2196F3 30%, #3F51B5 90%)",
  border: 0,
  borderRadius: 25,
  boxShadow: "0 3px 5px 2px rgba(33, 150, 243, .3)",
  color: "white",
  padding: { xs: "8px 20px", sm: "10px 25px", md: "12px 35px" },
  fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" },
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  position: "relative",
  overflow: "hidden",
  "&:hover": {
    transform: "scale(1.05)",
    boxShadow: "0 5px 15px 3px rgba(33, 150, 243, .4)",
  },
}));

const CustomAccordion = styled(Accordion)(({ theme }) => ({
  background: 'linear-gradient(45deg, #2196F3 30%, #3F51B5 90%)',
  boxShadow: '0 4px 24px 0 rgba(33,150,243,0.10)',
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(2),
  overflow: 'hidden',
  border: 'none',
  borderRadius: '24px !important',
  transition: 'box-shadow 0.3s',
  '&.Mui-expanded': {
    boxShadow: '0 8px 32px 0 rgba(33,150,243,0.18)',
    border: 'none',
    borderRadius: '24px !important',
  },
}));

const CustomAccordionDetails = styled(AccordionDetails)(({ theme }) => ({
  background: 'transparent',
  margin: theme.spacing(0, 1, 1, 1),
  padding: theme.spacing(2, 2, 2, 2),
  boxShadow: 'none',
  border: 'none',
  borderRadius: 24,
  transition: 'max-height 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s, background 0.3s',
  overflow: 'hidden',
  '&[aria-hidden="true"]': {
    maxHeight: 0,
    opacity: 0,
    padding: 0,
    background: 'transparent',
    borderRadius: 24,
  },
  '&[aria-hidden="false"]': {
    opacity: 1,
    background: 'transparent',
    borderRadius: 24,
  },
}));

const WellnessTracker = ({ user }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));
  
  if (!user) return <div>Lütfen giriş yapın</div>;

  const [supplements, setSupplements] = useState([]);
  const [openSupplementDialog, setOpenSupplementDialog] = useState(false);
  const [supplementForm, setSupplementForm] = useState({
    name: "",
    quantity: 0,
    dailyUsage: 1,
  });
  const [editingSupplement, setEditingSupplement] = useState(null);
  const [waterData, setWaterData] = useState({ history: [] });
  const [supplementConsumptionToday, setSupplementConsumptionToday] = useState(
    {}
  );
  const [supplementStatsData, setSupplementStatsData] = useState([]);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [
    supplementNotificationDialogOpen,
    setSupplementNotificationDialogOpen,
  ] = useState(false);
  const [waterNotifDialogOpen, setWaterNotifDialogOpen] = useState(false);
  const [sortMode, setSortMode] = useState("notification"); // "name", "quantity", "notification"

  // Korumalı veri yönetimi için ref'ler
  const lastSupplementsState = useRef([]);
  const lastSupplementConsumptionState = useRef({});
  const isDataLoading = useRef(true);
  const isInitialLoad = useRef(true);

  const getSupplementsRef = () =>
    collection(db, "users", user.uid, "supplements");

  // Şu anki saatten sonraki en yakın bildirim saatini bul
  const getNextNotificationTime = useCallback((notificationSchedule) => {
    if (!notificationSchedule || !Array.isArray(notificationSchedule) || notificationSchedule.length === 0) {
      return null;
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    // Bildirim saatlerini dakikaya çevir ve sırala
    const notificationTimes = notificationSchedule
      .filter(time => time && typeof time === 'string')
      .map(time => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
      })
      .sort((a, b) => a - b);

    // Şu anki saatten sonraki ilk bildirimi bul
    const nextNotification = notificationTimes.find(time => time > currentTimeInMinutes);
    
    if (nextNotification !== undefined) {
      return nextNotification;
    }

    // Eğer bugün için bildirim kalmadıysa, geçmiş bildirimlerden en sonuncusunu döndür
    // (geçmiş bildirimler, bildirimi olmayanların üzerinde ama gelecek bildirimlerin altında olacak)
    if (notificationTimes.length > 0) {
      return notificationTimes[notificationTimes.length - 1] - (24 * 60); // Dünkü saat olarak işaretle
    }

    return null;
  }, []);

  // Takviyeleri sıralama fonksiyonu
  const sortSupplements = useCallback((supplementsData) => {
    const sorted = [...supplementsData];

    if (sortMode === "name") {
      // İsme göre sırala
      sorted.sort((a, b) => {
        const nameA = (a.name || "").toLocaleLowerCase("tr-TR");
        const nameB = (b.name || "").toLocaleLowerCase("tr-TR");
        return nameA.localeCompare(nameB, "tr-TR");
      });
    } else if (sortMode === "quantity") {
      // Kalan miktara göre sırala (azalan)
      sorted.sort((a, b) => {
        const quantityA = a.quantity || 0;
        const quantityB = b.quantity || 0;
        return quantityB - quantityA;
      });
    } else if (sortMode === "notification") {
      // Bildirim saatine göre sırala
      sorted.sort((a, b) => {
        const nextTimeA = getNextNotificationTime(a.notificationSchedule);
        const nextTimeB = getNextNotificationTime(b.notificationSchedule);

        // Bildirimi olmayanlar en altta
        if (nextTimeA === null && nextTimeB === null) return 0;
        if (nextTimeA === null) return 1;
        if (nextTimeB === null) return -1;

        // Gelecek bildirimler önce, geçmiş bildirimler sonra
        // (negatif değerler geçmiş bildirimleri temsil eder)
        if (nextTimeA < 0 && nextTimeB < 0) {
          // Her ikisi de geçmiş, en son geçen önce
          return nextTimeB - nextTimeA;
        }
        if (nextTimeA < 0) return 1; // A geçmiş, B gelecek -> B önce
        if (nextTimeB < 0) return -1; // B geçmiş, A gelecek -> A önce

        // Her ikisi de gelecek, en yakın önce
        return nextTimeA - nextTimeB;
      });
    }

    return sorted;
  }, [sortMode, getNextNotificationTime]);

  const fetchSupplements = async () => {
    const ref = getSupplementsRef();
    try {
      const querySnapshot = await getDocs(ref);
      const supplementsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      // Sıralama fonksiyonunu kullan
      const sortedSupplements = sortSupplements(supplementsData);
      setSupplements(sortedSupplements);
      lastSupplementsState.current = [...sortedSupplements];
      isDataLoading.current = false;
    } catch (error) {
      console.error("Error fetching supplements:", error);
      isDataLoading.current = false;
    }
  };

  const fetchSupplementConsumptionToday = async () => {
    const docRef = doc(db, "users", user.uid, "stats", "supplementConsumption");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const today = new Date().toLocaleDateString("en-CA", {
        timeZone: "Europe/Istanbul",
      });
      const consumptionData = data[today] || {};
      setSupplementConsumptionToday(consumptionData);
      lastSupplementConsumptionState.current = { ...consumptionData };
    } else {
      setSupplementConsumptionToday({});
      lastSupplementConsumptionState.current = {};
    }
  };

  // Su verilerini yenilemek için fonksiyon
  const refreshWaterData = async () => {
    try {
      // WaterTracker'dan su verilerini yeniden çek
      const waterRef = doc(db, "users", user.uid, "water", "current");
      const waterDocSnap = await getDoc(waterRef);
      if (waterDocSnap.exists()) {
        const waterDataFromDB = waterDocSnap.data();
        setWaterData({
          history: waterDataFromDB.history || [],
          nextWaterReminderTime: waterDataFromDB.nextWaterReminderTime || null,
          ...waterDataFromDB
        });
      }
    } catch (error) {
      console.error("Su verileri yenileme hatası:", error);
    }
  };

  // Takviye istatistik verilerini yenilemek için fonksiyon
  const fetchSupplementConsumptionStats = async () => {
    try {
      const statsRef = doc(db, "users", user.uid, "stats", "supplementConsumption");
      const docSnap = await getDoc(statsRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const sortedDates = Object.keys(data).sort(
          (a, b) => new Date(a + "T00:00:00") - new Date(b + "T00:00:00")
        );
        const allSuppNames = new Set();
        sortedDates.forEach((date) => {
          Object.keys(data[date]).forEach((suppName) => {
            if (suppName !== "total") allSuppNames.add(suppName);
          });
        });
        const chartData = sortedDates.map((date) => {
          const dayStats = data[date];
          const dayData = {
            date: new Date(date + "T00:00:00").toLocaleDateString("tr-TR"),
            fullDate: date,
          };
          allSuppNames.forEach((suppName) => {
            dayData[suppName] = dayStats[suppName] || 0;
          });
          return dayData;
        });
        return chartData;
      }
      return [];
    } catch (error) {
      console.error("Takviye istatistik verileri çekme hatası:", error);
      return [];
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchSupplements();
    fetchSupplementConsumptionToday();
    fetchSupplementConsumptionStats().then(setSupplementStatsData);
  }, [user]);

  // sortMode değiştiğinde takviyeleri yeniden sırala
  useEffect(() => {
    if (supplements.length > 0) {
      const sorted = sortSupplements(supplements);
      setSupplements(sorted);
      lastSupplementsState.current = [...sorted];
    }
  }, [sortMode, sortSupplements]);

  // Takviye tüketim verisi değişikliklerini izle ve korumalı güncelleme yap
  useEffect(() => {
    if (!user || isInitialLoad.current || isDataLoading.current) return;
    
    // Sadece gerçek değişiklik varsa güncelle
    const hasRealChange = JSON.stringify(supplementConsumptionToday) !== JSON.stringify(lastSupplementConsumptionState.current);
    
    if (hasRealChange) {
      const updateSupplementConsumptionInFirestore = async () => {
        try {
          const today = new Date().toLocaleDateString("en-CA", {
            timeZone: "Europe/Istanbul",
          });
          const statsDocRef = doc(db, "users", user.uid, "stats", "supplementConsumption");
          const statsDocSnap = await getDoc(statsDocRef);
          let updatedStats = statsDocSnap.exists() ? statsDocSnap.data() : {};
          updatedStats[today] = supplementConsumptionToday;
          await setDoc(statsDocRef, updatedStats);
          lastSupplementConsumptionState.current = { ...supplementConsumptionToday };
        } catch (error) {
          console.error("Takviye tüketim verisi güncelleme hatası:", error);
        }
      };
      updateSupplementConsumptionInFirestore();
    }
  }, [supplementConsumptionToday, user]);

  // Takviye bildirim sistemini temizleme fonksiyonu
  const cleanupSupplementNotifications = async () => {
    if (!supplements.length || !user) return;

    if (process.env.NODE_ENV === 'development') {
    console.log("Takviye bildirim sistemi temizleniyor...");
    }
    
    try {
      // Batch operations ile optimize edilmiş temizlik
      const batch = writeBatch(db);
      
      supplements.forEach(supp => {
        const suppDocRef = doc(db, "users", user.uid, "supplements", supp.id);
        // Gereksiz alanları temizle
        batch.update(suppDocRef, {
          lastNotificationTriggers: null,
          globalNotificationWindow: null,
          notificationsLastCalculated: null,
          // Sadece gerekli alanları tut
          nextSupplementReminderTime: null, // Yeniden hesaplanacak
        });
      });
      
      await batch.commit();
      
      if (process.env.NODE_ENV === 'development') {
      console.log(`${supplements.length} takviye için bildirim sistemi temizlendi`);
      }
    } catch (error) {
      console.error("Takviye temizleme hatası:", error);
    }
  };

  // Takviye bildirimlerini yeniden hesaplama fonksiyonu
  const recalculateAllSupplementNotifications = async () => {
    if (!supplements.length || !user) return;

    if (process.env.NODE_ENV === 'development') {
    console.log("Tüm takviye bildirimleri yeniden hesaplanıyor...");
    }
    
    for (const supp of supplements) {
      try {
        await saveNextSupplementReminderTime(user, supp);
        if (process.env.NODE_ENV === 'development') {
        console.log(`${supp.name} için bildirim zamanı yeniden hesaplandı`);
        }
      } catch (error) {
        console.error(`${supp.name} hesaplama hatası:`, error);
      }
    }
  };

  useEffect(() => {
    const checkAndUpdateReminders = async () => {
      if (!supplements.length || !user) return;

      // Önce temizlik yap
      await cleanupSupplementNotifications();
      
      // Sonra yeniden hesapla
      await recalculateAllSupplementNotifications();
    };

    checkAndUpdateReminders();
  }, [supplements, user]);

  const handleSaveSupplement = async () => {
    const ref = getSupplementsRef();
    try {
      if (editingSupplement) {
        const supplementRef = doc(ref, editingSupplement.id);
        await updateDoc(supplementRef, {
          ...supplementForm,
          lastUpdated: new Date(),
        });
      } else {
        await addDoc(ref, {
          ...supplementForm,
          createdAt: new Date(),
          lastUpdated: new Date(),
        });
      }
      await fetchSupplements();
      setOpenSupplementDialog(false);
      setEditingSupplement(null);
      setSupplementForm({ name: "", quantity: 0, dailyUsage: 1 });
    } catch (error) {
      console.error("Error saving supplement:", error);
    }
  };

  // Hızlı tıklamalara karşı koruma için ref
  const consumingSupplements = useRef(new Set());

  const handleConsume = async (id) => {
    // Eğer bu takviye zaten işleniyorsa, işlemi engelle
    if (consumingSupplements.current.has(id)) {
      return;
    }

    const supplement = supplements.find((s) => s.id === id);
    if (!supplement || supplement.quantity <= 0) return;

    // İşlem başladığını işaretle
    consumingSupplements.current.add(id);

    const supplementRef = doc(db, "users", user.uid, "supplements", id);
    const statsDocRef = doc(db, "users", user.uid, "stats", "supplementConsumption");
    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "Europe/Istanbul",
    });

    try {
      // Transaction ile atomik işlem
      const result = await runTransaction(db, async (transaction) => {
        // Supplement dokümanını oku
        const supplementDoc = await transaction.get(supplementRef);
        if (!supplementDoc.exists()) {
          throw new Error("Supplement bulunamadı");
        }

        const currentSupplement = supplementDoc.data();
        
        // Miktar kontrolü - eğer 0 veya daha az ise işlemi durdur
        if (currentSupplement.quantity <= 0) {
          throw new Error("Takviye miktarı yetersiz");
        }

        // Stats dokümanını oku
        const statsDoc = await transaction.get(statsDocRef);
        const currentStats = statsDoc.exists() ? statsDoc.data() : {};
        const todayStats = currentStats[today] || {};

        // Yeni tüketim sayısını hesapla
        const newCount = (todayStats[supplement.name] || 0) + 1;
        const newQuantity = currentSupplement.quantity - 1;

        // Supplement miktarını güncelle
        transaction.update(supplementRef, { quantity: newQuantity });

        // Stats'ı güncelle
        const updatedStats = {
          ...currentStats,
          [today]: {
            ...todayStats,
            [supplement.name]: newCount,
          },
        };
        transaction.set(statsDocRef, updatedStats);

        // Transaction sonucunu döndür
        return {
          newQuantity,
          newCount,
          supplementName: supplement.name
        };
      });

      // Transaction başarılı olduktan sonra local state'i güncelle
      setSupplements(prev =>
        prev.map(s =>
          s.id === id ? { ...s, quantity: result.newQuantity } : s
        )
      );

      setSupplementConsumptionToday(prev => ({
        ...prev,
        [result.supplementName]: result.newCount,
      }));

      toast.success(`${result.supplementName} tüketildi!`);
    } catch (error) {
      console.error("Takviye tüketme hatası:", error);
      if (error.message === "Takviye miktarı yetersiz") {
        toast.warning("Bu takviye tükenmiş!");
      } else {
        toast.error("Takviye tüketilirken hata oluştu");
      }
    } finally {
      // İşlem tamamlandığını işaretle
      consumingSupplements.current.delete(id);
    }
  };

  const handleDelete = async (id) => {
    const ref = getSupplementsRef();
    try {
      const supplementRef = doc(ref, id);
      await deleteDoc(supplementRef);
      await fetchSupplements();
    } catch (error) {
      console.error("Error deleting supplement:", error);
    }
  };

  const handleEditSupplement = (supplement) => {
    setEditingSupplement(supplement);
    setSupplementForm({
      name: supplement.name,
      quantity: supplement.quantity,
      dailyUsage: supplement.dailyUsage,
    });
    setOpenSupplementDialog(true);
  };

  const handleSaveSupplementNotifications = async (notifications) => {
    try {
      // notifications artık array formatında geliyor: [{id, notificationSchedule}, ...]
      
      // Batch operations ile optimize edilmiş güncelleme
      const batch = writeBatch(db);
      const validNotifications = [];
      
      notifications.forEach(notification => {
        const supplementRef = doc(db, "users", user.uid, "supplements", notification.id);
        
        // notificationSchedule array'ini kontrol et
        const updateData = {};
        
        if (notification.notificationSchedule && Array.isArray(notification.notificationSchedule)) {
          updateData.notificationSchedule = notification.notificationSchedule;
        }
        
        // Sadece tanımlı değerler varsa güncelle
        if (Object.keys(updateData).length > 0) {
          batch.update(supplementRef, updateData);
          validNotifications.push(notification);
        }
      });
      
      // Batch commit
      if (validNotifications.length > 0) {
        await batch.commit();
        
        // Takviye verilerini al ve nextSupplementReminderTime'ı yeniden hesapla
        for (const notification of validNotifications) {
          const supplementRef = doc(db, "users", user.uid, "supplements", notification.id);
          const supplementDoc = await getDoc(supplementRef);
          if (supplementDoc.exists()) {
            const supplementData = supplementDoc.data();
            
            // nextSupplementReminderTime'ı yeniden hesapla
            await saveNextSupplementReminderTime(user, {
              ...supplementData,
              id: notification.id,
              notificationSchedule: notification.notificationSchedule,
            });
            
            if (process.env.NODE_ENV === 'development') {
            console.log(`${supplementData.name} için bildirim zamanı yeniden hesaplandı`);
            }
          }
        }
      }
      
      // supplements listesini güncelle
      await fetchSupplements();
      setSupplementNotificationDialogOpen(false);
    } catch (error) {
      console.error("Error saving supplement notifications:", error);
    }
  };

  // Geri alma işlemleri için de koruma
  const undoingSupplements = useRef(new Set());

  const handleUndoConsume = async (supplement) => {
    // Eğer bu takviye zaten geri alınıyorsa, işlemi engelle
    if (undoingSupplements.current.has(supplement.id)) {
      return;
    }

    // Eğer bugün hiç tüketilmemişse, geri alınacak bir şey yok
    const consumedToday = supplementConsumptionToday[supplement.name] || 0;
    if (consumedToday <= 0) {
      toast.warning("Bu takviye bugün henüz tüketilmemiş!");
      return;
    }

    // İşlem başladığını işaretle
    undoingSupplements.current.add(supplement.id);

    const supplementRef = doc(db, "users", user.uid, "supplements", supplement.id);
    const statsDocRef = doc(db, "users", user.uid, "stats", "supplementConsumption");
    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "Europe/Istanbul",
    });

    try {
      // Transaction ile atomik işlem
      const result = await runTransaction(db, async (transaction) => {
        // Supplement dokümanını oku
        const supplementDoc = await transaction.get(supplementRef);
        if (!supplementDoc.exists()) {
          throw new Error("Supplement bulunamadı");
        }

        // Stats dokümanını oku
        const statsDoc = await transaction.get(statsDocRef);
        const currentStats = statsDoc.exists() ? statsDoc.data() : {};
        const todayStats = currentStats[today] || {};

        // Geri alınacak tüketim var mı kontrol et
        const currentConsumption = todayStats[supplement.name] || 0;
        if (currentConsumption <= 0) {
          throw new Error("Bu takviye bugün henüz tüketilmemiş");
        }

        // Yeni değerleri hesapla
        const newConsumption = currentConsumption - 1;
        const newQuantity = supplement.quantity + 1;

        // Supplement miktarını güncelle
        transaction.update(supplementRef, { quantity: newQuantity });

        // Stats'ı güncelle
        const updatedStats = {
          ...currentStats,
          [today]: {
            ...todayStats,
            [supplement.name]: newConsumption,
          },
        };
        
        // Eğer tüketim 0 olduysa, o günü tamamen sil
        if (newConsumption === 0) {
          delete updatedStats[today][supplement.name];
          // Eğer o gün hiç veri kalmadıysa, günü de sil
          if (Object.keys(updatedStats[today]).length === 0) {
            delete updatedStats[today];
          }
        }
        
        transaction.set(statsDocRef, updatedStats);

        return {
          newQuantity,
          newConsumption,
          supplementName: supplement.name
        };
      });

      // Transaction başarılı olduktan sonra local state'i güncelle
      setSupplements(prev =>
        prev.map(s =>
          s.id === supplement.id ? { ...s, quantity: result.newQuantity } : s
        )
      );

      setSupplementConsumptionToday(prev => ({
        ...prev,
        [result.supplementName]: result.newConsumption,
      }));

      toast.success(`${result.supplementName} geri alındı!`);
    } catch (error) {
      console.error("Takviye geri alma hatası:", error);
      if (error.message === "Bu takviye bugün henüz tüketilmemiş") {
        toast.warning("Bu takviye bugün henüz tüketilmemiş!");
      } else {
        toast.error("Takviye geri alınırken hata oluştu");
      }
    } finally {
      // İşlem tamamlandığını işaretle
      undoingSupplements.current.delete(supplement.id);
    }
  };

  return (
    <>
      <style>{globalStyles}</style>
      <Box
        sx={{
          minHeight: "100vh",
          background:
            "linear-gradient(135deg, #1a2a6c 0%, #2196F3 50%, #3F51B5 100%)",
          padding: { xs: 1, sm: 2, md: 4 },
        }}
      >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: { xs: 2, sm: 3, md: 4 },
            flexDirection: { xs: "column", sm: "row" },
            gap: { xs: 2, sm: 0 },
          }}
        >
          <Typography
            fontSize={{ xs: "1.5rem", sm: "2rem", md: "3rem" }}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              fontWeight: 700,
              color: "#fff",
              mb: { xs: 2, sm: 3 },
            }}
          >
            <WaterDropIcon
              sx={{
                fontSize: { xs: 24, sm: 30, md: 50 },
                color: "lightblue",
                mr: { xs: 1, sm: 2 },
                verticalAlign: "middle",
              }}
            />
            Takviye & Su Tüketimi
          </Typography>
          {/* Üstteki Takviye Ekle ve Bildirimler butonları kaldırıldı */}
        </Box>

        {/* Su Takibi */}
        <CustomAccordion defaultExpanded={true}>
          <StyledAccordionSummary>
            <WaterDropIcon sx={{ fontSize: { xs: 28, sm: 32, md: 36 }, color: '#fff', mr: 1 }} />
            <Typography variant="h5" sx={{ 
              fontWeight: 700, 
              color: "#fff",
              fontSize: { xs: "1.1rem", sm: "1.3rem", md: "1.5rem" },
            }}>
              Su Tüketimi
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
              {/* Su Bildirim Ayarları butonu kaldırıldı */}
            </Box>
          </StyledAccordionSummary>
          <CustomAccordionDetails>
            <WaterTracker 
              user={user} 
              onWaterDataChange={(data) => setWaterData(data)}
              onOpenWaterNotifDialog={() => setWaterNotifDialogOpen(true)}
            />
          </CustomAccordionDetails>
        </CustomAccordion>

        {/* Takviye Listesi */}
        <CustomAccordion defaultExpanded={false}>
          <StyledAccordionSummary>
            <Medication sx={{ fontSize: { xs: 28, sm: 32, md: 36 }, color: '#fff', mr: 1 }} />
            <Typography variant="h5" sx={{
              fontWeight: 700,
              color: "#fff",
              fontSize: { xs: "1.1rem", sm: "1.3rem", md: "1.5rem" },
              flexGrow: 1,
            }}>
              Takviyelerim
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
              <Tooltip 
                title={
                  sortMode === "name" ? "İsme göre sıralı (İsme göre → Kalan miktara göre → Bildirim saatine göre)" :
                  sortMode === "quantity" ? "Kalan miktara göre sıralı (Kalan miktara göre → Bildirim saatine göre → İsme göre)" :
                  "Bildirim saatine göre sıralı (Bildirim saatine göre → İsme göre → Kalan miktara göre)"
                }
                arrow
              >
                <span
                  onClick={e => { 
                    e.stopPropagation(); 
                    // Sıralama modunu değiştir: name -> quantity -> notification -> name
                    if (sortMode === "name") {
                      setSortMode("quantity");
                    } else if (sortMode === "quantity") {
                      setSortMode("notification");
                    } else {
                      setSortMode("name");
                    }
                  }}
                  onMouseDown={e => e.stopPropagation()}
                  onFocus={e => e.stopPropagation()}
                  style={{ 
                    color: '#fff', 
                    background: sortMode === "name" ? 'rgba(33,150,243,0.32)' : 
                                sortMode === "quantity" ? 'rgba(76,175,80,0.32)' : 
                                'rgba(255,152,0,0.32)', 
                    marginLeft: '4px', 
                    padding: '8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.3s',
                  }}
                  onMouseEnter={(e) => {
                    if (sortMode === "name") {
                      e.target.style.background = 'rgba(33,150,243,0.45)';
                    } else if (sortMode === "quantity") {
                      e.target.style.background = 'rgba(76,175,80,0.45)';
                    } else {
                      e.target.style.background = 'rgba(255,152,0,0.45)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (sortMode === "name") {
                      e.target.style.background = 'rgba(33,150,243,0.32)';
                    } else if (sortMode === "quantity") {
                      e.target.style.background = 'rgba(76,175,80,0.32)';
                    } else {
                      e.target.style.background = 'rgba(255,152,0,0.32)';
                    }
                  }}
                >
                  <SortIcon sx={{ fontSize: { xs: 22, sm: 24, md: 26 } }} />
                </span>
              </Tooltip>
              <span
                onClick={e => { e.stopPropagation(); setOpenSupplementDialog(true); }}
                onMouseDown={e => e.stopPropagation()}
                onFocus={e => e.stopPropagation()}
                style={{ 
                  color: '#fff', 
                  background: 'rgba(33,150,243,0.18)', 
                  marginLeft: '4px', 
                  padding: '8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(33,150,243,0.32)'}
                onMouseLeave={(e) => e.target.style.background = 'rgba(33,150,243,0.18)'}
              >
                <AddIcon sx={{ fontSize: { xs: 22, sm: 24, md: 26 } }} />
              </span>
              <span
                onClick={e => { e.stopPropagation(); setSupplementNotificationDialogOpen(true); }}
                onMouseDown={e => e.stopPropagation()}
                onFocus={e => e.stopPropagation()}
                style={{ 
                  color: '#fff', 
                  background: 'rgba(33,150,243,0.18)', 
                  marginLeft: '4px', 
                  padding: '8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(33,150,243,0.32)'}
                onMouseLeave={(e) => e.target.style.background = 'rgba(33,150,243,0.18)'}
              >
                <NotificationsIcon sx={{ fontSize: { xs: 22, sm: 24, md: 26 } }} />
              </span>
            </Box>
          </StyledAccordionSummary>
          <CustomAccordionDetails>
            {supplements.length === 0 ? (
              <Box
                sx={{
                  textAlign: "center",
                  py: { xs: 4, sm: 6, md: 8 },
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                <Typography variant="h6" sx={{ 
                  mb: 2,
                  fontSize: { xs: "1rem", sm: "1.2rem", md: "1.5rem" },
                }}>
                  Henüz takviye eklenmemiş
                </Typography>
                <Typography variant="body1" sx={{ 
                  fontSize: { xs: "0.85rem", sm: "1rem", md: "1.1rem" },
                }}>
                  İlk takviyenizi eklemek için "Takviye Ekle" butonuna tıklayın
                </Typography>
              </Box>
            ) : sortMode === "notification" ? (
              // Bildirim saatine göre sıralama modunda kategorilere ayır
              (() => {
                const upcoming = [];
                const past = [];
                const noNotification = [];

                supplements.forEach((supplement) => {
                  const nextTime = getNextNotificationTime(supplement.notificationSchedule);
                  if (nextTime === null) {
                    noNotification.push(supplement);
                  } else if (nextTime < 0) {
                    past.push(supplement);
                  } else {
                    upcoming.push(supplement);
                  }
                });

                const renderSupplementCard = (supplement) => {
                  const { name, quantity, dailyUsage } = supplement;
                  const consumedToday = supplementConsumptionToday[name] || 0;
                  const remainingToday = Math.max(0, dailyUsage - consumedToday);
                  const daysLeft = Math.ceil(quantity / dailyUsage);
                  const progress = Math.min(100, (consumedToday / dailyUsage) * 100);

                  return (
                    <Grid item xs={12} sm={6} lg={4} key={supplement.id}>
                      <ModernSupplementCard
                        supplement={supplement}
                        consumedToday={consumedToday}
                        remainingToday={remainingToday}
                        progress={progress}
                        daysLeft={daysLeft}
                        onConsume={handleConsume}
                        onEdit={handleEditSupplement}
                        onDelete={handleDelete}
                        onUndo={handleUndoConsume}
                        isProcessing={consumingSupplements.current.has(supplement.id)}
                        isUndoProcessing={undoingSupplements.current.has(supplement.id)}
                      />
                    </Grid>
                  );
                };

                return (
                  <Box>
                    {/* Zamanı Yaklaşan */}
                    {upcoming.length > 0 && (
                      <CustomAccordion defaultExpanded={true} sx={{ mb: 2 }}>
                        <StyledAccordionSummary>
                          <AccessTimeIcon sx={{ fontSize: { xs: 24, sm: 28, md: 32 }, color: '#4caf50', mr: 1 }} />
                          <Typography variant="h6" sx={{ 
                            fontWeight: 700, 
                            color: "#fff",
                            fontSize: { xs: "1rem", sm: "1.2rem", md: "1.4rem" },
                          }}>
                            Zamanı Yaklaşan ({upcoming.length})
                          </Typography>
                        </StyledAccordionSummary>
                        <CustomAccordionDetails>
                          <Grid container spacing={{ xs: 2, sm: 3, md: 4 }}>
                            {upcoming.map(renderSupplementCard)}
                          </Grid>
                        </CustomAccordionDetails>
                      </CustomAccordion>
                    )}

                    {/* Zamanı Geçen */}
                    {past.length > 0 && (
                      <CustomAccordion defaultExpanded={false} sx={{ mb: 2 }}>
                        <StyledAccordionSummary>
                          <AccessTimeIcon sx={{ fontSize: { xs: 24, sm: 28, md: 32 }, color: '#ff9800', mr: 1 }} />
                          <Typography variant="h6" sx={{ 
                            fontWeight: 700, 
                            color: "#fff",
                            fontSize: { xs: "1rem", sm: "1.2rem", md: "1.4rem" },
                          }}>
                            Zamanı Geçen ({past.length})
                          </Typography>
                        </StyledAccordionSummary>
                        <CustomAccordionDetails>
                          <Grid container spacing={{ xs: 2, sm: 3, md: 4 }}>
                            {past.map(renderSupplementCard)}
                          </Grid>
                        </CustomAccordionDetails>
                      </CustomAccordion>
                    )}

                    {/* Bildirim Ayarlanmamış */}
                    {noNotification.length > 0 && (
                      <CustomAccordion defaultExpanded={false} sx={{ mb: 2 }}>
                        <StyledAccordionSummary>
                          <NotificationsOffIcon sx={{ fontSize: { xs: 24, sm: 28, md: 32 }, color: '#9e9e9e', mr: 1 }} />
                          <Typography variant="h6" sx={{ 
                            fontWeight: 700, 
                            color: "#fff",
                            fontSize: { xs: "1rem", sm: "1.2rem", md: "1.4rem" },
                          }}>
                            Bildirim Ayarlanmamış ({noNotification.length})
                          </Typography>
                        </StyledAccordionSummary>
                        <CustomAccordionDetails>
                          <Grid container spacing={{ xs: 2, sm: 3, md: 4 }}>
                            {noNotification.map(renderSupplementCard)}
                          </Grid>
                        </CustomAccordionDetails>
                      </CustomAccordion>
                    )}
                  </Box>
                );
              })()
            ) : (
              // Diğer sıralama modlarında normal grid
              <Grid container spacing={{ xs: 2, sm: 3, md: 4 }}>
                {supplements.map((supplement) => {
                  const { name, quantity, dailyUsage } = supplement;
                  const consumedToday = supplementConsumptionToday[name] || 0;
                  const remainingToday = Math.max(0, dailyUsage - consumedToday);
                  const daysLeft = Math.ceil(quantity / dailyUsage);
                  const progress = Math.min(100, (consumedToday / dailyUsage) * 100);

                  return (
                    <Grid item xs={12} sm={6} lg={4} key={supplement.id}>
                      <ModernSupplementCard
                        supplement={supplement}
                        consumedToday={consumedToday}
                        remainingToday={remainingToday}
                        progress={progress}
                        daysLeft={daysLeft}
                        onConsume={handleConsume}
                        onEdit={handleEditSupplement}
                        onDelete={handleDelete}
                        onUndo={handleUndoConsume}
                        isProcessing={consumingSupplements.current.has(supplement.id)}
                        isUndoProcessing={undoingSupplements.current.has(supplement.id)}
                      />
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </CustomAccordionDetails>
        </CustomAccordion>
        
        <CustomAccordion defaultExpanded={false} sx={{ borderRadius: 24, overflow: 'hidden' }}>
          <StyledAccordionSummary>
            <EmojiEventsIcon sx={{ fontSize: { xs: 28, sm: 32, md: 36 }, color: '#fff', mr: 1 }} />
            <Typography variant="h5" sx={{ 
              fontWeight: 700, 
              color: "#fff",
              fontSize: { xs: "1.1rem", sm: "1.3rem", md: "1.5rem" },
            }}>
              İstatistikler
            </Typography>
          </StyledAccordionSummary>
          <CustomAccordionDetails sx={{ borderRadius: 24, overflow: 'hidden' }}>
            <Grid container spacing={{ xs: 2, sm: 3, md: 4 }} sx={{ mt: 2, borderRadius: 24, overflow: 'hidden' }}>
              <Grid item xs={12} md={6} sx={{ borderRadius: 24, overflow: 'hidden' }}>
                <Box sx={{ borderRadius: 24, overflow: 'hidden' }}>
                  <WaterConsumptionChart 
                    waterHistory={Array.isArray(waterData.history) ? waterData.history : []} 
                    nextReminder={waterData.nextWaterReminderTime}
                    onRefresh={() => {
                      // Su verilerini yenile
                      refreshWaterData();
                    }}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={6} sx={{ borderRadius: 24, overflow: 'hidden' }}>
                <Box sx={{ borderRadius: 24, overflow: 'hidden' }}>
                  <SupplementConsumptionChart
                    user={user}
                    supplements={supplements}
                    consumptionData={supplementStatsData}
                    onRefresh={async () => {
                      // Takviye verilerini yenile
                      await fetchSupplements();
                      await fetchSupplementConsumptionToday();
                      const statsData = await fetchSupplementConsumptionStats();
                      setSupplementStatsData(statsData);
                    }}
                  />
                </Box>
              </Grid>
            </Grid>
          </CustomAccordionDetails>
        </CustomAccordion>
        <SupplementDialog
          openSupplementDialog={openSupplementDialog}
          onClose={() => {
            setOpenSupplementDialog(false);
            setEditingSupplement(null);
          }}
          editingSupplement={editingSupplement}
          supplementForm={supplementForm}
          setSupplementForm={setSupplementForm}
          setOpenSupplementDialog={setOpenSupplementDialog}
          setEditingSupplement={setEditingSupplement}
          handleSaveSupplement={handleSaveSupplement}
        />
        <SupplementNotificationSettingsDialog
          open={supplementNotificationDialogOpen}
          onClose={() => setSupplementNotificationDialogOpen(false)}
          supplements={supplements}
          onSave={handleSaveSupplementNotifications}
        />
        <WaterNotificationSettingsDialog
          open={waterNotifDialogOpen}
          onClose={() => setWaterNotifDialogOpen(false)}
          waterSettings={waterData}
          onSave={async (newSettings) => {
            setWaterData(prev => ({
              ...prev,
              waterNotificationOption: newSettings.waterNotificationOption,
              customNotificationInterval: newSettings.customNotificationInterval,
              activityLevel: newSettings.activityLevel || prev.activityLevel,
            }));
            const ref = doc(db, "users", user.uid, "water", "current");
            await setDoc(ref, {
              waterNotificationOption: newSettings.waterNotificationOption,
              customNotificationInterval: newSettings.customNotificationInterval,
              activityLevel: newSettings.activityLevel || waterData.activityLevel,
            }, { merge: true });
          }}
        />
      </Container>
      </Box>
    </>
  );
};

export default WellnessTracker;
