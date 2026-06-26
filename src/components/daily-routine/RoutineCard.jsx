import React from "react";
import { motion } from "framer-motion";
import { Checkbox, IconButton, Tooltip } from "@mui/material";
import { RadioButtonUnchecked, CheckCircleOutline, Edit, Delete } from "@mui/icons-material";
import { categoryIcons, categoryNames, categoryColors } from "../../hooks/useDailyRoutineForm";
import RoutineCardProgress from "./RoutineCardProgress";

const RoutineCard = ({
  routine,
  currentTime,
  onCheck,
  onEdit,
  onDelete,
}) => {
  const getTurkeyLocalDateString = (date = new Date()) =>
    new Date(date.toLocaleString("en-US", { timeZone: "Europe/Istanbul" })).toLocaleDateString("en-CA");

  const getRoutineCompletedStatus = (r) => {
    if (r.repeat && r.repeat !== "none") {
      const todayStr = getTurkeyLocalDateString(new Date());
      return r.completedDates && r.completedDates.includes(todayStr);
    }
    return r.completed;
  };

  const isCompleted = getRoutineCompletedStatus(routine);

  // Time progress calculation
  const parseTime = (timeStr) => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(":").map(Number);
    const date = new Date(currentTime);
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const startTime = parseTime(routine.time);
  const endTime   = parseTime(routine.endTime);
  const now       = currentTime.getTime();

  let progress = 0;
  if (startTime && endTime) {
    const totalDuration = endTime.getTime() - startTime.getTime();
    if (totalDuration > 0) {
      if (now >= endTime.getTime()) progress = 100;
      else if (now <= startTime.getTime()) progress = 0;
      else progress = ((now - startTime.getTime()) / totalDuration) * 100;
    }
  }

  const categoryColorClass = categoryColors[routine.category] || categoryColors.Default;
  const categoryIcon       = categoryIcons[routine.category] || categoryIcons.Default;
  const categoryName       = categoryNames[routine.category] || categoryNames.Default;

  // Border-left accent rengi category'den türet
  const borderAccent = categoryColorClass
    .replace("bg-", "")
    .replace("-500", "")
    .replace("-400", "");

  // Tailwind safelist dışı dinamik renk — inline style ile
  const borderColorMap = {
    blue:   "#3b82f6",
    indigo: "#6366f1",
    purple: "#a855f7",
    pink:   "#ec4899",
    rose:   "#f43f5e",
    red:    "#ef4444",
    orange: "#f97316",
    amber:  "#f59e0b",
    yellow: "#eab308",
    green:  "#22c55e",
    teal:   "#14b8a6",
    cyan:   "#06b6d4",
    slate:  "#64748b",
  };
  const accentColor = borderColorMap[borderAccent] || "#6366f1";

  return (
    <div
      className={`relative mb-3 rounded-2xl overflow-hidden transition-all duration-200 border-l-[3px] ${
        isCompleted
          ? "opacity-55"
          : "hover:-translate-y-0.5 hover:shadow-lg"
      }`}
      style={{
        background: isCompleted
          ? "rgba(255,255,255,0.03)"
          : "rgba(255,255,255,0.07)",
        backdropFilter: "blur(12px)",
        border: isCompleted
          ? `1px solid rgba(255,255,255,0.06)`
          : `1px solid rgba(255,255,255,0.10)`,
        borderLeftWidth: "3px",
        borderLeftColor: accentColor,
        boxShadow: isCompleted ? "none" : `0 2px 16px rgba(0,0,0,0.2)`,
      }}
    >
      <div className="p-4 md:p-5 flex items-center justify-between gap-4">

        {/* Sol: Checkbox & Info */}
        <div className="flex items-center gap-3 flex-1 overflow-hidden">
          <Checkbox
            checked={isCompleted}
            onChange={() => onCheck(routine.id)}
            icon={<RadioButtonUnchecked sx={{ color: "rgba(255,255,255,0.25)" }} />}
            checkedIcon={<CheckCircleOutline sx={{ color: "#4ade80" }} />}
            sx={{ padding: "4px" }}
          />

          <div className="flex flex-col flex-1 min-w-0">
            <h3
              className={`text-base font-semibold truncate ${
                isCompleted
                  ? "line-through text-white/30"
                  : "text-white/90"
              }`}
            >
              {routine.title}
            </h3>

            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-white/40 font-medium">
                {routine.time}{routine.endTime && ` – ${routine.endTime}`}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white/90 shadow-sm ${categoryColorClass}`}
                style={{ opacity: 0.85 }}
              >
                <span>{categoryIcon}</span>
                {categoryName}
              </span>
              {routine.repeat && routine.repeat !== "none" && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium border"
                  style={{
                    color: `${accentColor}CC`,
                    background: `${accentColor}15`,
                    borderColor: `${accentColor}30`,
                  }}
                >
                  {routine.repeat === "daily" ? "Günlük" : routine.repeat === "weekly" ? "Haftalık" : "Aylık"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Sağ: Progress & Actions */}
        <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
          {!isCompleted && startTime && endTime && (
            <div className="hidden sm:block w-20">
              <RoutineCardProgress progress={progress} />
            </div>
          )}

          <Tooltip title="Düzenle">
            <IconButton
              size="small"
              onClick={() => onEdit(routine)}
              sx={{
                color: "rgba(255,255,255,0.3)",
                transition: "all 0.15s",
                "&:hover": { color: "#818cf8", background: "rgba(99,102,241,0.12)" },
              }}
            >
              <Edit sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Sil">
            <IconButton
              size="small"
              onClick={() => onDelete(routine)}
              sx={{
                color: "rgba(255,255,255,0.3)",
                transition: "all 0.15s",
                "&:hover": { color: "#f87171", background: "rgba(239,68,68,0.12)" },
              }}
            >
              <Delete sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      {/* Mobil: Altta ince ilerleme çubuğu */}
      {!isCompleted && startTime && endTime && (
        <div className="sm:hidden absolute bottom-0 left-0 h-[2px] w-full bg-white/5">
          <div
            className="h-full transition-all duration-1000"
            style={{ width: `${progress}%`, background: accentColor }}
          />
        </div>
      )}
    </div>
  );
};

export default RoutineCard;
