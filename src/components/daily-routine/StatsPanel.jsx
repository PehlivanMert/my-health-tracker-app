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

  const completedToday = routines.filter(r => getRoutineCompletedStatus(r)).length;
  const activeTodayCount = routines.filter(r => {
    if (r.date && r.date !== todayStr && r.repeat === "none") return false;
    return true;
  }).length;

  const calculateProgress = (completed, total) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const dailyProgress = calculateProgress(completedToday, activeTodayCount);
  const weeklyProgress = calculateProgress(weeklyStats.completed, weeklyStats.added);
  const monthlyProgress = calculateProgress(monthlyStats.completed, monthlyStats.added);

  const StatCard = ({ title, completed, total, progress, icon, colorClass, gradientClass }) => (
    <div className={`relative overflow-hidden rounded-3xl p-6 ${gradientClass} backdrop-blur-xl border border-white/20 dark:border-slate-700/50 shadow-lg hover:-translate-y-1 hover:shadow-xl transition-all duration-300`}>
      {/* Decorative background circle */}
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${colorClass} opacity-20 blur-xl`}></div>
      
      <div className="relative z-10 flex items-center justify-between">
        <div>
          <h3 className="text-slate-600 dark:text-slate-300 font-medium text-sm md:text-base mb-1">{title}</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-800 dark:text-white">{completed}</span>
            <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">/ {total}</span>
          </div>
        </div>
        
        {/* Progress Ring */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-slate-200 dark:text-slate-700/50"
              strokeWidth="3"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className={colorClass.replace('bg-', 'text-')}
              strokeWidth="3"
              strokeDasharray={`${progress}, 100`}
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            {icon}
          </div>
        </div>
      </div>
      
      <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
        <TrendingUp fontSize="inherit" className={colorClass.replace('bg-', 'text-')} />
        <span>%{progress} başarı oranı</span>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
      <StatCard 
        title="Günlük İlerleme" 
        completed={completedToday} 
        total={activeTodayCount} 
        progress={dailyProgress} 
        icon={<CheckCircleOutline className="text-blue-500" fontSize="small" />}
        colorClass="bg-blue-500"
        gradientClass="bg-gradient-to-br from-blue-50/80 to-blue-100/50 dark:from-blue-900/20 dark:to-slate-900/40"
      />
      <StatCard 
        title="Haftalık İlerleme" 
        completed={weeklyStats.completed} 
        total={weeklyStats.added} 
        progress={weeklyProgress} 
        icon={<DoneAll className="text-indigo-500" fontSize="small" />}
        colorClass="bg-indigo-500"
        gradientClass="bg-gradient-to-br from-indigo-50/80 to-indigo-100/50 dark:from-indigo-900/20 dark:to-slate-900/40"
      />
      <StatCard 
        title="Aylık İlerleme" 
        completed={monthlyStats.completed} 
        total={monthlyStats.added} 
        progress={monthlyProgress} 
        icon={<CheckCircleOutline className="text-teal-500" fontSize="small" />}
        colorClass="bg-teal-500"
        gradientClass="bg-gradient-to-br from-teal-50/80 to-teal-100/50 dark:from-teal-900/20 dark:to-slate-900/40"
      />
    </div>
  );
};

export default StatsPanel;
