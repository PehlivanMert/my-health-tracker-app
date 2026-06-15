import React from "react";
import { motion } from "framer-motion";
import { Checkbox, IconButton, Tooltip } from "@mui/material";
import { RadioButtonUnchecked, CheckCircleOutline, Edit, Delete, NotificationsNone, NotificationsActive } from "@mui/icons-material";
import { categoryIcons, categoryNames, categoryColors } from "../../hooks/useDailyRoutineForm";
import RoutineCardProgress from "./RoutineCardProgress";

const RoutineCard = ({
  routine,
  currentTime,
  onCheck,
  onEdit,
  onDelete,
  onToggleNotification,
}) => {
  const getTurkeyLocalDateString = (date = new Date()) =>
    new Date(date.toLocaleString("en-US", { timeZone: "Europe/Istanbul" })).toLocaleDateString("en-CA");

  const getRoutineCompletedStatus = (routine) => {
    if (routine.repeat && routine.repeat !== "none") {
      const todayStr = getTurkeyLocalDateString(new Date());
      return routine.completedDates && routine.completedDates.includes(todayStr);
    }
    return routine.completed;
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
  const endTime = parseTime(routine.endTime);
  const now = currentTime.getTime();

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
  const categoryIcon = categoryIcons[routine.category] || categoryIcons.Default;
  const categoryName = categoryNames[routine.category] || categoryNames.Default;

  // Derive border color from class name string (basic approximation for UI)
  const borderColor = categoryColorClass.replace("bg-", "border-").replace("-500", "-400").replace("-400", "-300");

  return (
    <div className={`relative mb-4 rounded-2xl overflow-hidden transition-all duration-300 border-l-4 ${borderColor} ${isCompleted ? 'bg-indigo-900/40 opacity-70' : 'bg-white/60 dark:bg-slate-800/60 backdrop-blur-md shadow-md hover:-translate-y-1 hover:shadow-lg'}`}>
      <div className="p-4 md:p-5 flex items-center justify-between gap-4">
        
        {/* Left Side: Checkbox & Info */}
        <div className="flex items-center gap-3 flex-1 overflow-hidden">
          <Checkbox
            checked={isCompleted}
            onChange={() => onCheck(routine.id)}
            icon={<RadioButtonUnchecked className="text-slate-400" />}
            checkedIcon={<CheckCircleOutline className="text-green-500" />}
            sx={{ padding: "4px" }}
          />
          
          <div className="flex flex-col flex-1 min-w-0">
            <h3 className={`text-base md:text-lg font-semibold truncate ${isCompleted ? 'line-through text-slate-500' : 'text-slate-800 dark:text-white'}`}>
              {routine.title}
            </h3>
            
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs md:text-sm text-slate-500 font-medium">
                {routine.time} {routine.endTime && `- ${routine.endTime}`}
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white shadow-sm ${categoryColorClass}`}>
                <span>{categoryIcon}</span>
                {categoryName}
              </span>
              {routine.repeat && routine.repeat !== "none" && (
                <span className="text-xs text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                  {routine.repeat === "daily" ? "Günlük" : routine.repeat === "weekly" ? "Haftalık" : "Aylık"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Progress & Actions */}
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          {!isCompleted && startTime && endTime && (
            <div className="hidden sm:block w-24">
              <RoutineCardProgress progress={progress} />
            </div>
          )}

          <div className="flex items-center">
            <Tooltip title="Düzenle">
              <IconButton size="small" onClick={() => onEdit(routine)} className="text-slate-400 hover:text-blue-500 transition-colors">
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Sil">
              <IconButton size="small" onClick={() => onDelete(routine)} className="text-slate-400 hover:text-red-500 transition-colors">
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
          </div>
        </div>

      </div>
      
      {/* Mobile Progress Bar (Bottom Edge) */}
      {!isCompleted && startTime && endTime && (
        <div className="sm:hidden absolute bottom-0 left-0 h-1 bg-slate-200 dark:bg-slate-700 w-full">
          <div className={`h-full ${categoryColorClass}`} style={{ width: `${progress}%`, transition: 'width 1s linear' }}></div>
        </div>
      )}
    </div>
  );
};

export default RoutineCard;
