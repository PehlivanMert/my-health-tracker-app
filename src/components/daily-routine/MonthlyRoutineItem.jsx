import React, { useState } from "react";
import { Box, Typography, Checkbox, IconButton, Tooltip } from "@mui/material";
import {
  RadioButtonUnchecked,
  CheckCircleOutline,
  DeleteForever,
  EventNote,
  NotificationsActive,
  NotificationsOff,
} from "@mui/icons-material";
import { motion } from "framer-motion";
// İlgili ikonlar:
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import PersonIcon from "@mui/icons-material/Person";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import SchoolIcon from "@mui/icons-material/School";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import MovieIcon from "@mui/icons-material/Movie";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import PaletteIcon from "@mui/icons-material/Palette";
import GroupIcon from "@mui/icons-material/Group";

const getTurkeyLocalDateString = (date = new Date()) => {
  return new Date(
    date.toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
  ).toLocaleDateString("en-CA");
};

const MonthlyRoutineItem = ({
  routine,
  currentTime,
  onCheck,
  onEdit,
  onDelete,
  onToggleNotification,
  notificationsEnabled,
  categoryColors,
  gridView,
}) => {
  const [hovered, setHovered] = useState(false);

  const getMinutesFromTime = (timeStr) => {
    const [hour, minute] = timeStr.split(":").map(Number);
    return hour * 60 + minute;
  };

  const formatTimeCountdown = (targetTimeStr, now = new Date()) => {
    const [targetHour, targetMinute] = targetTimeStr.split(":").map(Number);
    const targetDate = new Date(now);
    targetDate.setHours(targetHour, targetMinute, 0, 0);
    if (targetDate < now) targetDate.setDate(targetDate.getDate() + 1);
    let remainingSeconds = Math.floor((targetDate - now) / 1000);
    remainingSeconds = remainingSeconds > 0 ? remainingSeconds : 0;
    const hours = String(Math.floor(remainingSeconds / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((remainingSeconds % 3600) / 60)).padStart(
      2,
      "0"
    );
    const seconds = String(remainingSeconds % 60).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  const isRoutineCompleted = routine.completed;

  const getCountdownMessage = () => {
    const currentMin = currentTime.getHours() * 60 + currentTime.getMinutes();
    if (!routine.endTime) {
      return currentMin < getMinutesFromTime(routine.time)
        ? `Başlamaya Kalan: ${formatTimeCountdown(routine.time, currentTime)}`
        : "";
    } else {
      const startMin = getMinutesFromTime(routine.time);
      const endMin = getMinutesFromTime(routine.endTime);
      if (currentMin < startMin) {
        return `Başlamaya Kalan: ${formatTimeCountdown(
          routine.time,
          currentTime
        )}`;
      } else if (currentMin >= startMin && currentMin < endMin) {
        return `Bitmesine Kalan: ${formatTimeCountdown(
          routine.endTime,
          currentTime
        )}`;
      } else {
        return !isRoutineCompleted
          ? `Başlamaya Kalan: ${formatTimeCountdown(routine.time, currentTime)}`
          : "Süre Doldu";
      }
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case "Work":
        return <WorkOutlineIcon sx={{ fontSize: "1.2rem", color: "#fff" }} />;
      case "Personal":
        return <PersonIcon sx={{ fontSize: "1.2rem", color: "#fff" }} />;
      case "Exercise":
        return <FitnessCenterIcon sx={{ fontSize: "1.2rem", color: "#fff" }} />;
      case "Study":
        return <SchoolIcon sx={{ fontSize: "1.2rem", color: "#fff" }} />;
      case "Other":
        return <MoreHorizIcon sx={{ fontSize: "1.2rem", color: "#fff" }} />;
      case "Travel":
        return <TravelExploreIcon sx={{ fontSize: "1.2rem", color: "#fff" }} />;
      case "Shopping":
        return <ShoppingCartIcon sx={{ fontSize: "1.2rem", color: "#fff" }} />;
      case "Entertainment":
        return <MovieIcon sx={{ fontSize: "1.2rem", color: "#fff" }} />;
      case "Food":
        return <RestaurantIcon sx={{ fontSize: "1.2rem", color: "#fff" }} />;
      case "Health":
        return <LocalHospitalIcon sx={{ fontSize: "1.2rem", color: "#fff" }} />;
      case "Finance":
        return <AttachMoneyIcon sx={{ fontSize: "1.2rem", color: "#fff" }} />;
      case "Hobby":
        return <PaletteIcon sx={{ fontSize: "1.2rem", color: "#fff" }} />;
      case "Social":
        return <GroupIcon sx={{ fontSize: "1.2rem", color: "#fff" }} />;
      default:
        return <MoreHorizIcon sx={{ fontSize: "1.2rem", color: "#fff" }} />;
    }
  };

  // Overlay animasyonunda y ekseni kaymasını kaldırdık
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } },
  };

  return (
    <motion.div
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      style={{ position: "relative" }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          padding: "10px",
          backgroundColor: gridView ? "transparent" : "rgba(255,255,255,0.1)",
          borderRadius: "12px",
          boxShadow: gridView ? "none" : "0px 4px 20px rgba(0,0,0,0.1)",
        }}
      >
        <Checkbox
          checked={isRoutineCompleted}
          onChange={() => onCheck(routine.id)}
          icon={<RadioButtonUnchecked sx={{ color: "#fff" }} />}
          checkedIcon={<CheckCircleOutline sx={{ color: "#4CAF50" }} />}
          sx={{ mr: 1 }}
        />
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 600,
              color: isRoutineCompleted ? "rgba(255,255,255,0.65)" : "#fff",
              textDecoration: isRoutineCompleted ? "line-through" : "none",
            }}
          >
            {routine.title}
          </Typography>
          <Typography variant="caption" sx={{ color: "#f5f5f5" }}>
            {routine.time} {routine.endTime && `- ${routine.endTime}`} •{" "}
            {getCountdownMessage()}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Tooltip title="Düzenle">
            <IconButton
              onClick={() => onEdit(routine)}
              size="small"
              sx={{ color: "#9C27B0" }}
            >
              <EventNote fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Bildirim">
            <IconButton
              onClick={() => onToggleNotification(routine.id)}
              size="small"
              sx={{
                color: notificationsEnabled[routine.id] ? "#FFA726" : "#fff",
              }}
            >
              {notificationsEnabled[routine.id] ? (
                <NotificationsActive fontSize="small" />
              ) : (
                <NotificationsOff fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
          <Tooltip title="Sil">
            <IconButton
              onClick={() => onDelete(routine.id)}
              size="small"
              sx={{ color: "#FF5252" }}
            >
              <DeleteForever fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      <motion.div
        variants={overlayVariants}
        initial="hidden"
        animate={hovered ? "visible" : "hidden"}
        style={{
          position: "absolute",
          bottom: 10,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 2,
        }}
      >
        <Box
          sx={{
            backgroundColor:
              categoryColors[routine.category] || categoryColors.Default,
            width: 40,
            height: 40,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0px 4px 10px ${
              (categoryColors[routine.category] || categoryColors.Default) +
              "80"
            }`,
          }}
        >
          {getCategoryIcon(routine.category)}
        </Box>
      </motion.div>
    </motion.div>
  );
};

export default MonthlyRoutineItem;
