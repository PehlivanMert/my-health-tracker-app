import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip } from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import AddIcon from "@mui/icons-material/Add";
import SortIcon from "@mui/icons-material/Sort";
import AccessAlarmIcon from "@mui/icons-material/AccessAlarm";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ScheduleIcon from "@mui/icons-material/Schedule";
import UndoIcon from "@mui/icons-material/Undo";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LocalPharmacyIcon from "@mui/icons-material/LocalPharmacy";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

import { useWellnessData } from "../../hooks/useWellnessData";
import { useWellnessForm } from "../../hooks/useWellnessForm";
import SupplementCard from "./SupplementCard";
import SupplementDialog from "./SupplementDialog";
import WaterTracker from "./WaterTracker";
import WaterConsumptionChart from "./WaterConsumptionChart";
import SupplementConsumptionChart from "./SupplementConsumptionChart";
import SupplementNotificationSettingsDialog from "./SupplementNotificationSettingsDialog";
import { DateTime } from "luxon";

const TabButton = ({ active, onClick, icon, label, colorClass }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex-1 sm:flex-none justify-center ${
      active
        ? `bg-gradient-to-r ${colorClass} text-white shadow-md`
        : "bg-transparent text-slate-400 hover:bg-white/10 hover:text-white"
    }`}
  >
    {React.cloneElement(icon, { sx: { fontSize: "1.1rem" } })}
    <span>{label}</span>
  </button>
);

// Custom Tailwind Accordion
const AccordionSection = ({ title, icon, count, children, defaultExpanded = false, colorClass = "from-blue-500 to-indigo-600" }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <div className="mb-4 rounded-3xl overflow-hidden shadow-md">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between p-3 bg-gradient-to-r ${colorClass} text-white transition-all hover:brightness-110`}
      >
        <div className="flex items-center gap-2">
          {React.cloneElement(icon, { sx: { fontSize: "1.2rem" } })}
          <span className="font-semibold text-sm">
            {title} ({count})
          </span>
        </div>
        {expanded ? <ExpandLessIcon sx={{ fontSize: "1.2rem" }} /> : <ExpandMoreIcon sx={{ fontSize: "1.2rem" }} />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white/5 border border-white/10 border-t-0 rounded-b-3xl"
          >
            <div className="p-4 sm:p-6">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const WellnessTracker = ({ user }) => {
  if (!user) return <div className="text-center p-8">Lütfen giriş yapın</div>;

  const [activeTab, setActiveTab] = useState(0); // 0: Su Takibi, 1: Takviyeler
  const [sortMode, setSortMode] = useState("notification");

  const {
    supplements,
    supplementConsumptionToday,
    supplementStatsData,
    waterData,
    refreshWaterData,
    handleConsume,
    handleUndoConsume,
    handleDelete,
    handleSaveSupplement,
    handleSaveSupplementNotifications,
    consumingSupplements,
    undoingSupplements,
  } = useWellnessData(user, sortMode);

  const {
    openSupplementDialog,
    supplementForm,
    setSupplementForm,
    editingSupplement,
    notificationDialogOpen,
    setNotificationDialogOpen,
    supplementNotificationDialogOpen,
    setSupplementNotificationDialogOpen,
    waterNotifDialogOpen,
    setWaterNotifDialogOpen,
    handleOpenSupplementDialog,
    handleCloseSupplementDialog,
    handleEditSupplement,
    handleSave,
  } = useWellnessForm(handleSaveSupplement);

  const handleSortToggle = () => {
    if (sortMode === "name") setSortMode("quantity");
    else if (sortMode === "quantity") setSortMode("notification");
    else setSortMode("name");
  };

  // Organize supplements by schedule
  const organizeSupplements = () => {
    const nowDue = [];
    const upcoming = [];
    const later = [];
    const past = [];
    const completed = [];
    const noNotification = [];

    const turkeyNow = DateTime.now().setZone("Europe/Istanbul");
    const currentMinutes = turkeyNow.hour * 60 + turkeyNow.minute;
    const dueWindow = 60;
    const soonWindow = 60;

    const parseSchedule = (schedule = []) =>
      Array.isArray(schedule)
        ? schedule
            .filter((time) => typeof time === "string" && time.includes(":"))
            .map((time) => {
              const [hours, minutes] = time.split(":").map(Number);
              if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
              return hours * 60 + minutes;
            })
            .filter((time) => time !== null)
            .sort((a, b) => a - b)
        : [];

    const expandScheduleForDailyUsage = (times, dailyUsage = 1) => {
      if (!Array.isArray(times) || times.length === 0) return [];
      if (!dailyUsage || dailyUsage <= times.length) return times;
      const expanded = [...times];
      let index = 0;
      while (expanded.length < dailyUsage) {
        expanded.push(times[index % times.length]);
        index += 1;
      }
      return expanded.sort((a, b) => a - b);
    };

    supplements.forEach((supplement) => {
      const parsedTimes = parseSchedule(supplement.notificationSchedule);
      const scheduleMinutes = expandScheduleForDailyUsage(parsedTimes, supplement.dailyUsage || parsedTimes.length || 1);

      if (scheduleMinutes.length === 0) {
        noNotification.push(supplement);
        return;
      }

      const consumedCount = Math.min(supplementConsumptionToday[supplement.name] || 0, scheduleMinutes.length);
      const remainingTimes = scheduleMinutes.slice(consumedCount);

      if (remainingTimes.length === 0) {
        completed.push(supplement);
        return;
      }

      const dueTimes = remainingTimes.filter((time) => time <= currentMinutes);
      if (dueTimes.length > 0) {
        const latestDue = dueTimes[dueTimes.length - 1];
        if (currentMinutes - latestDue <= dueWindow) nowDue.push(supplement);
        else past.push(supplement);
        return;
      }

      const nextTime = remainingTimes[0];
      if (nextTime - currentMinutes <= soonWindow) upcoming.push(supplement);
      else later.push(supplement);
    });

    return { nowDue, upcoming, later, past, completed, noNotification };
  };

  const renderGrid = (list) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {list.map((supp) => {
        const consumedToday = supplementConsumptionToday[supp.name] || 0;
        const remainingToday = Math.max(0, supp.dailyUsage - consumedToday);
        const daysLeft = Math.ceil(supp.quantity / supp.dailyUsage) || 0;
        const progress = Math.min(100, (consumedToday / supp.dailyUsage) * 100);

        return (
          <SupplementCard
            key={supp.id}
            supplement={supp}
            consumedToday={consumedToday}
            remainingToday={remainingToday}
            progress={progress}
            daysLeft={daysLeft}
            onConsume={handleConsume}
            onEdit={handleEditSupplement}
            onDelete={handleDelete}
            onUndo={handleUndoConsume}
            isProcessing={consumingSupplements.has(supp.id)}
            isUndoProcessing={undoingSupplements.has(supp.id)}
          />
        );
      })}
    </div>
  );

  const organized = sortMode === "notification" ? organizeSupplements() : { list: supplements };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-slate-900 text-slate-100 pt-2 sm:p-6 lg:p-8"
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="max-w-7xl mx-auto space-y-4">
        
        {/* Kompakt Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <WaterDropIcon className="text-white text-xl" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Yaşam Takibi</h1>
              <p className="text-xs text-slate-400">Su ve takviye hedefleriniz</p>
            </div>
          </div>

          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 self-stretch sm:self-auto">
            <TabButton
              active={activeTab === 0}
                onClick={() => setActiveTab(0)}
                icon={<WaterDropIcon />}
                label="Su Takibi"
                colorClass="from-cyan-500 to-blue-500"
              />
              <TabButton
                active={activeTab === 1}
                onClick={() => setActiveTab(1)}
                icon={<LocalPharmacyIcon />}
                label="Takviyeler"
                colorClass="from-blue-500 to-indigo-600"
              />
            </div>
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          {activeTab === 0 ? (
            <motion.div
              key="water"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >


              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-3 sm:p-6 shadow-xl">
                  <WaterTracker user={user} onWaterDataChange={refreshWaterData} />
                </div>
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-3 sm:p-6 shadow-xl">
                  <WaterConsumptionChart user={user} />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="supplements"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-white/5 backdrop-blur-xl rounded-xl p-2 sm:p-3 border border-white/10 shadow-lg">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <LocalPharmacyIcon className="text-indigo-400" fontSize="small" />
                    Takviyeler
                  </h2>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Tooltip title="Sıralama Değiştir">
                      <button
                        onClick={handleSortToggle}
                        className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 transition-all flex justify-center items-center"
                      >
                        <SortIcon fontSize="small" />
                      </button>
                    </Tooltip>
                    <button
                      onClick={handleOpenSupplementDialog}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg shadow-sm transition-all text-xs"
                    >
                      <AddIcon fontSize="small" />
                      <span className="font-bold">Yeni</span>
                    </button>
                    <button
                      onClick={() => setSupplementNotificationDialogOpen(true)}
                      className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 transition-all flex justify-center items-center"
                    >
                      <NotificationsIcon fontSize="small" />
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  {supplements.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <p className="text-lg">Henüz takviye eklenmemiş</p>
                      <p className="text-sm mt-1">İlk takviyenizi eklemek için "Yeni Takviye" butonuna tıklayın</p>
                    </div>
                  ) : sortMode === "notification" ? (
                    <div className="space-y-4">
                      {organized.nowDue.length > 0 && (
                        <AccordionSection title="Bekleyen Dozlar" count={organized.nowDue.length} icon={<AccessAlarmIcon />} defaultExpanded colorClass="from-red-500 to-rose-600">
                          {renderGrid(organized.nowDue)}
                        </AccordionSection>
                      )}
                      {organized.upcoming.length > 0 && (
                        <AccordionSection title="Yaklaşan Dozlar" count={organized.upcoming.length} icon={<AccessTimeIcon />} defaultExpanded={organized.nowDue.length === 0} colorClass="from-emerald-500 to-teal-600">
                          {renderGrid(organized.upcoming)}
                        </AccordionSection>
                      )}
                      {organized.later.length > 0 && (
                        <AccordionSection title="Planlanan Dozlar" count={organized.later.length} icon={<ScheduleIcon />} colorClass="from-blue-500 to-indigo-600">
                          {renderGrid(organized.later)}
                        </AccordionSection>
                      )}
                      {organized.past.length > 0 && (
                        <AccordionSection title="Geçmiş Dozlar" count={organized.past.length} icon={<UndoIcon />} colorClass="from-slate-500 to-slate-700">
                          {renderGrid(organized.past)}
                        </AccordionSection>
                      )}
                      {organized.completed.length > 0 && (
                        <AccordionSection title="Tamamlanan Dozlar" count={organized.completed.length} icon={<CheckCircleIcon />} colorClass="from-green-500 to-emerald-600">
                          {renderGrid(organized.completed)}
                        </AccordionSection>
                      )}
                      {organized.noNotification.length > 0 && (
                        <AccordionSection title="Bildirimsiz Takviyeler" count={organized.noNotification.length} icon={<NotificationsOffIcon />} colorClass="from-slate-600 to-slate-800">
                          {renderGrid(organized.noNotification)}
                        </AccordionSection>
                      )}
                    </div>
                  ) : (
                    renderGrid(supplements)
                  )}
                </div>
              </div>

              {/* Chart section for Supplements */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-3 sm:p-6 shadow-xl">
                <SupplementConsumptionChart
                  data={supplementStatsData}
                  supplements={supplements}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Dialogs */}
      <SupplementDialog
        open={openSupplementDialog}
        onClose={handleCloseSupplementDialog}
        onSave={handleSave}
        supplement={editingSupplement}
        supplementForm={supplementForm}
        setSupplementForm={setSupplementForm}
      />
      
      <SupplementNotificationSettingsDialog
        open={supplementNotificationDialogOpen}
        onClose={() => setSupplementNotificationDialogOpen(false)}
        supplements={supplements}
        onSave={handleSaveSupplementNotifications}
        user={user}
      />

    </motion.div>
  );
};

export default WellnessTracker;
