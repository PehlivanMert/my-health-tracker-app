import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip, IconButton } from "@mui/material";
import {
  LocalPharmacy,
  Spa,
  FitnessCenter,
  Opacity,
  HealthAndSafety,
  Vaccines,
  Medication,
} from "@mui/icons-material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import UndoIcon from "@mui/icons-material/Undo";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

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
  if (!name || typeof name !== "string") return "#2196F3";
  const lowerName = name.toLowerCase();

  if (lowerName.includes("vitamin")) return "#00E676";
  if (lowerName.includes("mineral")) return "#00B0FF";
  if (lowerName.includes("protein")) return "#FF9100";
  if (lowerName.includes("omega")) return "#651FFF";

  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return supplementColors[hash % supplementColors.length];
};

const getSupplementIcon = (name) => {
  if (!name || typeof name !== "string") return <Medication sx={{ color: "#fff", fontSize: "1.4rem" }} />;
  const lowerName = name.toLowerCase();

  if (lowerName.includes("vitamin")) return <LocalPharmacy sx={{ color: "#fff", fontSize: "1.4rem" }} />;
  if (lowerName.includes("mineral")) return <Spa sx={{ color: "#fff", fontSize: "1.4rem" }} />;
  if (lowerName.includes("protein")) return <FitnessCenter sx={{ color: "#fff", fontSize: "1.4rem" }} />;
  if (lowerName.includes("omega 3")) return <Opacity sx={{ color: "#fff", fontSize: "1.4rem" }} />;

  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return supplementIcons[hash % supplementIcons.length];
};

const SupplementCard = ({
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
  isUndoProcessing = false,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationTimes, setNotificationTimes] = useState([]);

  useEffect(() => {
    if (supplement.notificationSchedule && Array.isArray(supplement.notificationSchedule)) {
      const times = supplement.notificationSchedule
        .filter((time) => time && typeof time === "string")
        .sort();
      setNotificationTimes(times);
    } else {
      setNotificationTimes([]);
    }
  }, [supplement.notificationSchedule]);

  const formatTime = (timeString) => {
    try {
      const [hours, minutes] = timeString.split(":");
      return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
    } catch {
      return timeString;
    }
  };

  const cardColor = getSupplementColor(supplement.name);
  const cardIcon = getSupplementIcon(supplement.name);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="relative overflow-hidden rounded-3xl p-4 sm:p-5 md:p-6 backdrop-blur-xl border border-white/20 transition-all duration-300 hover:shadow-2xl group"
      style={{
        background: "linear-gradient(145deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)",
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl"
        style={{ background: `linear-gradient(90deg, ${cardColor}, ${cardColor}80)` }}
      />

      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4 mb-4">
        <div
          className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center shadow-lg relative shrink-0"
          style={{ background: `linear-gradient(135deg, ${cardColor}, ${cardColor}CC)`, boxShadow: `0 8px 24px ${cardColor}40` }}
        >
          {cardIcon}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-bold text-lg sm:text-xl md:text-2xl leading-tight truncate drop-shadow-md">
            {supplement.name}
          </h3>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mb-4 w-full">
        {notificationTimes.length > 0 && (
          <Tooltip title={`${notificationTimes.length} bildirim saati`}>
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); setShowNotifications(!showNotifications); }}
              className="flex-1 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white/90 transition-all"
            >
              <AccessTimeIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}

        <Tooltip title="Geri Al">
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); onUndo(supplement); }}
            disabled={!(consumedToday > 0) || isUndoProcessing}
            className="flex-1 rounded-xl border transition-all"
            style={{
              background: consumedToday > 0 && !isUndoProcessing ? "rgba(33,150,243,0.2)" : "rgba(255,255,255,0.05)",
              borderColor: consumedToday > 0 && !isUndoProcessing ? "rgba(33,150,243,0.3)" : "rgba(255,255,255,0.1)",
              color: consumedToday > 0 && !isUndoProcessing ? "#fff" : "rgba(255,255,255,0.3)",
            }}
          >
            <UndoIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Düzenle">
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); onEdit(supplement); }}
            className="flex-1 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white/90 transition-all"
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Sil">
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); onDelete(supplement.id); }}
            className="flex-1 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 transition-all"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </div>

      {/* Notification Times (Expandable) */}
      <AnimatePresence>
        {showNotifications && notificationTimes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="bg-white/10 rounded-xl p-3 mb-4 border border-white/10">
              <div className="flex items-center gap-2 text-white/90 text-xs font-semibold mb-2">
                <AccessTimeIcon fontSize="inherit" /> Bildirim Saatleri
              </div>
              <div className="flex flex-wrap gap-2">
                {notificationTimes.map((time, index) => (
                  <span key={index} className="bg-white/10 text-white px-2 py-1 rounded-lg text-xs font-semibold border border-white/30">
                    {formatTime(time)}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-white/80 text-xs sm:text-sm font-semibold">{daysLeft} gün kaldı</span>
          <span className="text-white/80 text-xs sm:text-sm font-semibold">{supplement.quantity} adet</span>
        </div>
        <div className="h-2.5 sm:h-3 bg-white/10 rounded-full overflow-hidden relative shadow-inner">
          <div
            className="h-full rounded-full transition-all duration-700 relative"
            style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${cardColor}, ${cardColor}CC)`, boxShadow: `0 2px 8px ${cardColor}30` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-full animate-[shimmer_2s_infinite]" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[10px] font-bold text-white drop-shadow-md">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>

      {/* Daily Consumption Stats */}
      <div className="bg-white/5 rounded-2xl p-4 mb-4 border border-white/10">
        <div className="flex justify-between items-center mb-3">
          <span className="text-white/90 text-sm font-semibold">Günlük Tüketim</span>
          <span className="font-bold text-sm" style={{ color: cardColor }}>{supplement.dailyUsage} adet</span>
        </div>

        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-white text-base sm:text-lg font-bold shadow-lg"
              style={{ background: `linear-gradient(135deg, ${cardColor}, ${cardColor}CC)` }}
            >
              {consumedToday}
            </div>
            <span className="text-white/90 text-sm font-semibold">Tüketilen</span>
          </div>
          <div className="text-right">
            <span
              className="text-sm font-bold"
              style={{ color: remainingToday > 0 ? cardColor : "#4caf50" }}
            >
              {remainingToday > 0 ? `${remainingToday} kaldı` : "Tamamlandı! 🎉"}
            </span>
          </div>
        </div>
      </div>

      {/* Consume Action Button */}
      <div className="text-center">
        <button
          onClick={(e) => { e.stopPropagation(); onConsume(supplement.id); }}
          disabled={supplement.quantity === 0 || remainingToday === 0 || isProcessing}
          className="w-full py-2.5 sm:py-3 rounded-full text-white text-sm sm:text-base font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 shadow-lg"
          style={{
            background: supplement.quantity === 0 || remainingToday === 0 || isProcessing
              ? "rgba(255,255,255,0.2)"
              : `linear-gradient(135deg, ${cardColor}, ${cardColor}CC)`,
            boxShadow: supplement.quantity === 0 || remainingToday === 0 || isProcessing
              ? "none"
              : `0 6px 20px ${cardColor}40`,
          }}
        >
          {supplement.quantity === 0 ? "Tükendi" :
            remainingToday === 0 ? "Hedef Tamamlandı ✨" :
              isProcessing ? "Takviye alınıyor..." : "Takviyeni Al 💊"}
        </button>
      </div>

    </motion.div>
  );
};

export default SupplementCard;
