import React, { useState } from "react";
import { Box, Typography, Checkbox } from "@mui/material";
import { RadioButtonUnchecked, CheckCircleOutline } from "@mui/icons-material";
import { styled, useTheme, useMediaQuery } from "@mui/material";
import { motion } from "framer-motion";
import RoutineCardProgress from "./RoutineCardProgress";
import RoutineCardActions from "./RoutineCardActions";
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
import AccessTime from "@mui/icons-material/AccessTime";

const StyledCard = styled(motion.div, {
  shouldForwardProp: (prop) => prop !== "iscompleted" && prop !== "bordercolor",
})(({ theme, bordercolor, iscompleted }) => ({
  background: `linear-gradient(145deg, 
    ${iscompleted === "true" ? "rgba(26,35,126,0.5)" : "rgba(33,150,243,0.85)"},
    ${iscompleted === "true" ? "rgba(21,27,85,0.55)" : "rgba(25,118,210,0.9)"}
  )`,
  backdropFilter: "blur(16px)",
  borderRadius: theme.spacing(2),
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  borderLeft: `5px solid ${bordercolor}`,
  transition: "all 0.5s cubic-bezier(0.2, 0.85, 0.32, 1.275)",
  boxShadow:
    iscompleted === "true"
      ? "0px 4px 20px rgba(0,0,0,0.1)"
      : "0px 10px 30px rgba(0,0,0,0.18)",
  position: "relative",
  overflow: "hidden",
  "&:hover": {
    transform: "translateX(10px) translateY(-5px) scale(1.015)",
    boxShadow: "0px 15px 35px rgba(0,0,0,0.25)",
  },
  "&::after": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: `linear-gradient(125deg, transparent 0%, transparent 60%, ${bordercolor}15 100%)`,
    pointerEvents: "none",
  },
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background:
      iscompleted === "true"
        ? `radial-gradient(circle at 100% 100%, ${bordercolor}05 0%, transparent 50%)`
        : `radial-gradient(circle at 100% 100%, ${bordercolor}15 0%, transparent 60%)`,
    pointerEvents: "none",
  },
  // Mobil ekranlar için responsive ayarlamalar
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(1.5),
    marginBottom: theme.spacing(1.5),
    borderLeft: `3px solid ${bordercolor}`,
  },
}));

const CategoryChip = styled(Box)(({ theme, color }) => ({
  display: "inline-flex",
  alignItems: "center",
  background: `${color}15`,
  color,
  borderRadius: theme.spacing(2),
  padding: `${theme.spacing(0.5)} ${theme.spacing(1.5)}`,
  fontSize: "0.75rem",
  fontWeight: 600,
  marginLeft: theme.spacing(0.5),
  boxShadow: `0 2px 8px ${color}20`,
  border: `1px solid ${color}30`,
  backdropFilter: "blur(8px)",
  transition: "all 0.3s ease",
  "&:hover": {
    background: `${color}25`,
    transform: "translateY(-1px)",
    boxShadow: `0 4px 12px ${color}30`,
  },
}));

const CategoryIcon = styled(Box)(({ theme, color }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "24px",
  height: "24px",
  borderRadius: "50%",
  background: `${color}20`,
  marginRight: theme.spacing(1),
  fontSize: "1rem",
  transition: "all 0.3s ease",
}));

const RoutineCard = ({
  routine,
  currentTime,
  onCheck,
  onEdit,
  onDelete,
  onToggleNotification,
  notificationsEnabled,
  categoryColors,
  filterDate,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));
  const [hovered, setHovered] = useState(false);

  // Mobil için ikon boyutunu ayarlıyoruz
  const iconSize = isMobile ? "1rem" : "1.2rem";

  // routine.completed ile tamamlanma durumu
  const isRoutineCompleted = routine.completed;
  const isCompletedStr = isRoutineCompleted ? "true" : "false";

  // currentTime değerini Türkiye saat dilimine çeviriyoruz:
  const currentTimeInTurkey = new Date(
    currentTime.toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
  );
  const currentMin =
    currentTimeInTurkey.getHours() * 60 + currentTimeInTurkey.getMinutes();

  // Saat string'ini dakikaya çeviren yardımcı fonksiyon
  const getMinutesFromTime = (timeStr) => {
    const [hour, minute] = timeStr.trim().split(":").map(Number);
    return hour * 60 + minute;
  };

  const startMin = getMinutesFromTime(routine.time);
  const endMin = routine.endTime ? getMinutesFromTime(routine.endTime) : null;

  // İlerleme hesaplaması (Türkiye saati üzerinden)
  let progress = 0;
  if (routine.endTime) {
    if (currentMin < startMin) {
      progress = 0;
    } else if (currentMin >= endMin) {
      progress = 100;
    } else {
      progress = ((currentMin - startMin) / (endMin - startMin)) * 100;
    }
  }

  // endTime varsa progress bar her durumda render edilsin
  const showProgressBar = Boolean(routine.endTime);

  const cardColor = categoryColors[routine.category] || categoryColors.Default;
  const isActive = !isRoutineCompleted && progress > 0 && progress < 100;

  // Geri sayım mesajı (Türkiye saati üzerinden hesaplanır)
  const formatTimeCountdown = (targetTimeStr, routineDate, now = new Date()) => {
    const nowInTurkey = new Date(
      now.toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
    );
    const [targetHour, targetMinute] = targetTimeStr
      .trim()
      .split(":")
      .map(Number);
    
    // Rutinin tarihini kullanarak hedef tarihi oluştur
    const routineDateObj = new Date(routineDate);
    const targetDate = new Date(routineDateObj);
    targetDate.setHours(targetHour, targetMinute, 0, 0);
    
    // Eğer hedef tarih geçmişse, bir sonraki güne ayarla
    if (targetDate < nowInTurkey) {
      targetDate.setDate(targetDate.getDate() + 1);
    }
    
    let remainingSeconds = Math.floor((targetDate - nowInTurkey) / 1000);
    remainingSeconds = remainingSeconds > 0 ? remainingSeconds : 0;
    const hours = String(Math.floor(remainingSeconds / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((remainingSeconds % 3600) / 60)).padStart(
      2,
      "0"
    );
    const seconds = String(remainingSeconds % 60).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  const getCountdownMessage = (routine, now = new Date()) => {
    const nowInTurkey = new Date(
      now.toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
    );
    const currentMinTurkey =
      nowInTurkey.getHours() * 60 + nowInTurkey.getMinutes();
    
    // Rutinin tarihini kontrol et
    const routineDate = routine.date ? new Date(routine.date) : new Date();
    const todayStr = nowInTurkey.toLocaleDateString("en-CA");
    const routineDateStr = routineDate.toLocaleDateString("en-CA");
    
    // Eğer rutin bugün değilse, geri sayım gösterme
    if (routineDateStr !== todayStr) {
      return `Tarih: ${routineDateStr}`;
    }
    
    if (!routine.endTime) {
      return currentMinTurkey < getMinutesFromTime(routine.time)
        ? `Başlamaya Kalan: ${formatTimeCountdown(routine.time, routine.date, nowInTurkey)}`
        : "";
    } else {
      const start = getMinutesFromTime(routine.time);
      const end = getMinutesFromTime(routine.endTime);
      if (currentMinTurkey < start) {
        return `Başlamaya Kalan: ${formatTimeCountdown(routine.time, routine.date, nowInTurkey)}`;
      } else if (currentMinTurkey >= start && currentMinTurkey <= end) {
        return `Bitmesine Kalan: ${formatTimeCountdown(
          routine.endTime,
          routine.date,
          nowInTurkey
        )}`;
      } else {
        return !isRoutineCompleted
          ? `Başlamaya Kalan: ${formatTimeCountdown(routine.time, routine.date, nowInTurkey)}`
          : "Süre Doldu";
      }
    }
  };

  const getCategoryIcon = (category) => {
    const iconProps = { sx: { fontSize: iconSize, color: "#fff" } };
    switch (category) {
      case "Work":
        return <WorkOutlineIcon {...iconProps} />;
      case "Personal":
        return <PersonIcon {...iconProps} />;
      case "Exercise":
        return <FitnessCenterIcon {...iconProps} />;
      case "Study":
        return <SchoolIcon {...iconProps} />;
      case "Other":
        return <MoreHorizIcon {...iconProps} />;
      case "Travel":
        return <TravelExploreIcon {...iconProps} />;
      case "Shopping":
        return <ShoppingCartIcon {...iconProps} />;
      case "Entertainment":
        return <MovieIcon {...iconProps} />;
      case "Food":
        return <RestaurantIcon {...iconProps} />;
      case "Health":
        return <LocalHospitalIcon {...iconProps} />;
      case "Finance":
        return <AttachMoneyIcon {...iconProps} />;
      case "Hobby":
        return <PaletteIcon {...iconProps} />;
      case "Social":
        return <GroupIcon {...iconProps} />;
      default:
        return <MoreHorizIcon {...iconProps} />;
    }
  };

  const overlayVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  return (
    <StyledCard
      bordercolor={cardColor}
      iscompleted={isCompletedStr}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15, scale: 0.95 }}
      transition={{
        type: "spring",
        stiffness: 450,
        damping: 25,
        duration: 0.4,
      }}
      // Mobil cihazlarda hover efekti genellikle çalışmadığından, yine de dokunmaya duyarlı bırakıyoruz
      whileHover={{ x: 10, scale: 1.015 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box display="flex" alignItems="center" flex={1}>
          <Checkbox
            checked={isRoutineCompleted}
            onChange={() => onCheck(routine.id)}
            icon={
              <RadioButtonUnchecked
                sx={{
                  color: isActive ? cardColor : "#fff",
                  fontSize: isMobile ? "1.3rem" : "1.5rem",
                  filter: isActive
                    ? `drop-shadow(0 0 5px ${cardColor}80)`
                    : "none",
                  transition: "all 0.4s ease",
                }}
              />
            }
            checkedIcon={
              <CheckCircleOutline
                sx={{
                  color: "#4CAF50",
                  fontSize: isMobile ? "1.3rem" : "1.5rem",
                  filter: "drop-shadow(0 0 3px rgba(76,175,80,0.6))",
                }}
              />
            }
            sx={{
              p: 0,
              "&:hover": { transform: "scale(1.15)" },
              transition: "transform 0.3s ease",
            }}
          />
          <Box ml={1.5}>
            <Typography
              variant="h6"
              sx={{
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 700,
                fontSize: isMobile ? "0.9rem" : isTablet ? "1rem" : "1.1rem",
                color: isRoutineCompleted ? "rgba(255,255,255,0.5)" : "#fff",
                textDecoration: isRoutineCompleted ? "line-through" : "none",
                transition: "all 0.3s ease",
                letterSpacing: "0.02em",
                textShadow: isActive ? `0 0 12px ${cardColor}60` : "none",
              }}
            >
              {routine.title}
            </Typography>
            <Box display="flex" alignItems="center" mt={0.75} flexWrap={isMobile ? 'wrap' : 'nowrap'}>
              <CategoryChip color={cardColor}>
                <CategoryIcon color={cardColor}>
                  {getCategoryIcon(routine.category)}
                </CategoryIcon>
                <span style={{ color: '#fff' }}>{routine.category || "General"}</span>
              </CategoryChip>
              <Typography
                variant="caption"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  ml: 1.5,
                  fontFamily: "'Poppins', sans-serif",
                  color: "#f5f5f5",
                  fontWeight: 500,
                  fontSize: isMobile ? "0.65rem" : "0.75rem",
                  opacity: 0.9,
                  background: "rgba(255,255,255,0.1)",
                  padding: "2px 6px",
                  borderRadius: "6px",
                }}
              >
                {routine.time} {routine.endTime && `- ${routine.endTime}`}
              </Typography>
            </Box>
            {isMobile && getCountdownMessage(routine, currentTime) && (
              <Box mt={1}>
                <Typography
                  variant="caption"
                  sx={{
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                  }}
                >
                  <AccessTime sx={{ fontSize: "1rem", mr: 0.5 }} />
                  {getCountdownMessage(routine, currentTime)}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        {showProgressBar && (
          <RoutineCardProgress progress={progress} cardColor={cardColor} />
        )}

        <RoutineCardActions
          routine={routine}
          isActive={currentMin >= startMin && currentMin <= endMin}
          cardColor={cardColor}
          notificationsEnabled={notificationsEnabled}
          countdownMessage={!isMobile ? getCountdownMessage(routine, currentTime) : undefined}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleNotification={onToggleNotification}
          isMobile={isMobile}
        />
      </Box>
    </StyledCard>
  );
};

export default RoutineCard;
