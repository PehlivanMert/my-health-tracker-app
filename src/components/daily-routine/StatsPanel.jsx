import React from "react";
import { DoneAll, CheckCircleOutline, TrendingUp } from "@mui/icons-material";

const StatsPanel = ({ routines = [], weeklyStats, monthlyStats }) => {
  const getTurkeyLocalDateString = (date = new Date()) =>
    new Date(date.toLocaleString("en-US", { timeZone: "Europe/Istanbul" })).toLocaleDateString("en-CA");

  const todayStr = getTurkeyLocalDateString();

  const getRoutineCompletedStatus = (routine) => {
    if (routine.repeat && routine.repeat !== "none") {
      return routine.completedDates && routine.completedDates.includes(todayStr);
    }
    return routine.completed;
  };

  const completedToday = routines.filter((r) => getRoutineCompletedStatus(r)).length;
  const activeTodayCount = routines.filter((r) => {
    if (r.date && r.date !== todayStr && r.repeat === "none") return false;
    return true;
  }).length;

  const calculateProgress = (completed, total) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const dailyProgress   = calculateProgress(completedToday, activeTodayCount);
  const weeklyProgress  = calculateProgress(weeklyStats.completed, weeklyStats.added);
  const monthlyProgress = calculateProgress(monthlyStats.completed, monthlyStats.added);

  const CARDS = [
    {
      title: "Günlük İlerleme",
      completed: completedToday,
      total: activeTodayCount,
      progress: dailyProgress,
      icon: <CheckCircleOutline sx={{ fontSize: 18, color: "#60a5fa" }} />,
      ringColor: "#60a5fa",
      glowColor: "rgba(96,165,250,0.15)",
      borderHover: "hover:border-blue-500/40",
    },
    {
      title: "Haftalık İlerleme",
      completed: weeklyStats.completed,
      total: weeklyStats.added,
      progress: weeklyProgress,
      icon: <DoneAll sx={{ fontSize: 18, color: "#818cf8" }} />,
      ringColor: "#818cf8",
      glowColor: "rgba(129,140,248,0.15)",
      borderHover: "hover:border-indigo-500/40",
    },
    {
      title: "Aylık İlerleme",
      completed: monthlyStats.completed,
      total: monthlyStats.added,
      progress: monthlyProgress,
      icon: <CheckCircleOutline sx={{ fontSize: 18, color: "#2dd4bf" }} />,
      ringColor: "#2dd4bf",
      glowColor: "rgba(45,212,191,0.15)",
      borderHover: "hover:border-teal-500/40",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {CARDS.map(({ title, completed, total, progress, icon, ringColor, glowColor, borderHover }) => (
        <div
          key={title}
          className={`relative overflow-hidden rounded-3xl p-5 border border-white/10 ${borderHover} transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}
          style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(16px)" }}
        >
          {/* Subtle inner glow on hover */}
          <div
            className="absolute inset-0 rounded-3xl opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{ background: `radial-gradient(ellipse at top right, ${glowColor}, transparent 70%)` }}
          />

          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium mb-2">{title}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">{completed}</span>
                <span className="text-sm text-slate-500 font-medium">/ {total}</span>
              </div>
            </div>

            {/* SVG Progress Ring */}
            <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  strokeWidth="3"
                  stroke="rgba(255,255,255,0.08)"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  strokeWidth="3"
                  strokeDasharray={`${progress}, 100`}
                  strokeLinecap="round"
                  stroke={ringColor}
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  style={{ filter: `drop-shadow(0 0 3px ${ringColor}80)` }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                {icon}
              </div>
            </div>
          </div>

          {/* Progress text */}
          <div className="relative z-10 mt-4 flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <TrendingUp sx={{ fontSize: 14, color: ringColor }} />
            <span style={{ color: ringColor }}>%{progress}</span>
            <span>başarı oranı</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsPanel;
