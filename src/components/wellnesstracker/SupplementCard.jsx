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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden rounded-xl p-3 backdrop-blur-xl border border-white/10 transition-all duration-300 hover:shadow-lg group flex flex-col sm:flex-row items-center sm:items-stretch gap-3 sm:gap-4 flex-wrap"
      style={{
        background: "rgba(15,23,42,0.6)",
      }}
    >
      {/* Sol kenar renk çizgisi */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ background: `linear-gradient(180deg, ${cardColor}, ${cardColor}80)` }}
      />

      {/* İkon ve İsim (Sol taraf) */}
      <div className="flex items-center gap-3 w-full sm:w-auto sm:flex-1 pl-2">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `linear-gradient(135deg, ${cardColor}20, ${cardColor}40)` }}
        >
          {React.cloneElement(cardIcon, { sx: { color: cardColor, fontSize: "1.2rem" } })}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-bold text-sm sm:text-base truncate">
            {supplement.name}
          </h3>
          <p className="text-[10px] sm:text-xs text-slate-400">
            {daysLeft} gün kaldı • Toplam {supplement.quantity}
          </p>
        </div>
      </div>

      {/* Tüketim Durumu (Orta kısım) */}
      <div className="flex items-center justify-between w-full sm:w-auto gap-4 px-2 sm:px-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
          <div className="flex gap-1">
            {[...Array(supplement.dailyUsage)].map((_, i) => (
              <div 
                key={i} 
                className="w-4 sm:w-5 h-1.5 rounded-full" 
                style={{ background: i < consumedToday ? cardColor : "rgba(255,255,255,0.1)" }}
              />
            ))}
          </div>
          <span className="text-[10px] font-bold text-white/70 whitespace-nowrap hidden sm:inline">
            {consumedToday} / {supplement.dailyUsage} Tüketildi
          </span>
        </div>
      </div>

      {/* Aksiyon Butonları (Sağ Taraf) */}
      <div className="flex items-center justify-between sm:justify-end gap-1 sm:gap-1.5 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t border-white/5 sm:border-0">
        <div className="flex items-center">
          {notificationTimes.length > 0 && (
            <Tooltip title={`${notificationTimes.length} bildirim saati`}>
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); setShowNotifications(!showNotifications); }}
                sx={{ color: "rgba(255,255,255,0.5)", "&:hover": { color: "#fff", background: "rgba(255,255,255,0.1)" } }}
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
              sx={{ 
                color: consumedToday > 0 ? "#3b82f6" : "rgba(255,255,255,0.2)",
                "&:hover": { background: "rgba(59,130,246,0.1)" }
              }}
            >
              <UndoIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Düzenle">
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); onEdit(supplement); }}
              sx={{ color: "rgba(255,255,255,0.5)", "&:hover": { color: "#fff", background: "rgba(255,255,255,0.1)" } }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Sil">
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); onDelete(supplement.id); }}
              sx={{ color: "rgba(239,68,68,0.5)", "&:hover": { color: "#ef4444", background: "rgba(239,68,68,0.1)" } }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </div>

        {/* Ana Aksiyon: Takviye Al */}
        <button
          onClick={(e) => { e.stopPropagation(); onConsume(supplement.id); }}
          disabled={supplement.quantity === 0 || remainingToday === 0 || isProcessing}
          className="ml-1 px-4 py-1.5 rounded-lg text-white text-[11px] font-bold transition-all disabled:opacity-50 shadow-md"
          style={{
            background: supplement.quantity === 0 || remainingToday === 0 || isProcessing
              ? "rgba(255,255,255,0.1)"
              : `linear-gradient(135deg, ${cardColor}, ${cardColor}CC)`,
          }}
        >
          {supplement.quantity === 0 ? "BİTTİ" : remainingToday === 0 ? "TAMAM" : "AL"}
        </button>
      </div>

      {/* Bildirim listesi detaylı */}
      <AnimatePresence>
        {showNotifications && notificationTimes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full basis-full mt-2"
          >
            <div className="flex gap-2 flex-wrap bg-white/5 p-2 rounded-lg ml-2">
               {notificationTimes.map((time, index) => (
                 <span key={index} className="text-[10px] bg-white/10 border border-white/10 px-2 py-0.5 rounded text-white/80 font-medium">
                   {formatTime(time)}
                 </span>
               ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};

export default SupplementCard;
