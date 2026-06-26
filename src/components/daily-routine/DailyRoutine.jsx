import React, { useState, useEffect } from "react";
import { useDailyRoutineData } from "../../hooks/useDailyRoutineData";
import { useDailyRoutineForm } from "../../hooks/useDailyRoutineForm";
import { motion } from "framer-motion";
import StatsPanel from "./StatsPanel";
import FilterBar from "./FilterBar";
import ActionButtons from "./ActionButtons";
import RoutineModal from "./RoutineModal";
import RoutineLists from "./RoutineLists";
import RoutineHeader from "./RoutineHeader";
import ModernDeleteDialog from "./ModernDeleteDialog";
import { toast } from "react-toastify";

const DailyRoutine = ({ user }) => {
  const {
    routines,
    weeklyStats,
    monthlyStats,
    loading,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    deleteRoutineGroup,
    deleteAllFiltered,
    toggleRoutineCompletion,
  } = useDailyRoutineData(user);

  const [filterCategory, setFilterCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState("Today");
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const {
    modalOpen,
    editingRoutine,
    newRoutineDate,
    setNewRoutineDate,
    handleOpenModal,
    handleCloseModal,
    handleSaveRoutine,
    handleEditRoutine,
  } = useDailyRoutineForm(addRoutine, updateRoutine, timeFilter);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [routineToDelete, setRoutineToDelete] = useState(null);
  const [isFilteredDelete, setIsFilteredDelete] = useState(false);

  const getTurkeyLocalDateString = (date = new Date()) =>
    new Date(date.toLocaleString("en-US", { timeZone: "Europe/Istanbul" })).toLocaleDateString("en-CA");

  const getFilterDate = (tFilter) => {
    const filterDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
    if (tFilter === "Yesterday") filterDate.setDate(filterDate.getDate() - 1);
    else if (tFilter === "Tomorrow") filterDate.setDate(filterDate.getDate() + 1);
    return filterDate;
  };

  const filteredRoutines = routines.filter((r) => {
    const categoryMatch = filterCategory === "All" || r.category === filterCategory;
    const searchMatch = r.title.toLowerCase().includes(searchQuery.toLowerCase());
    let timeMatch = true;
    if (r.date && (timeFilter === "Today" || timeFilter === "Yesterday" || timeFilter === "Tomorrow")) {
      timeMatch = r.date === getTurkeyLocalDateString(getFilterDate(timeFilter));
    }
    return categoryMatch && searchMatch && timeMatch;
  }).sort((a, b) => a.time.localeCompare(b.time));

  const getRoutineCompletedStatus = (routine) => {
    if (routine.repeat && routine.repeat !== "none") {
      const todayStr = getTurkeyLocalDateString(new Date());
      return routine.completedDates && routine.completedDates.includes(todayStr);
    }
    return routine.completed;
  };

  const activeRoutines = filteredRoutines.filter((r) => !getRoutineCompletedStatus(r));
  const completedRoutines = filteredRoutines.filter((r) => getRoutineCompletedStatus(r));

  const handleRequestDelete = (routine) => {
    setRoutineToDelete(routine);
    setIsFilteredDelete(false);
    setDeleteDialogOpen(true);
  };

  const handleRequestDeleteAll = () => {
    setRoutineToDelete(null);
    setIsFilteredDelete(true);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = (option) => {
    if (isFilteredDelete) {
      deleteAllFiltered(filteredRoutines);
      toast.success("Tüm filtrelenmiş rutinler silindi!");
    } else if (routineToDelete) {
      if (option === "all" && routineToDelete.groupId) {
        deleteRoutineGroup(routineToDelete.groupId);
        toast.success("Tüm tekrarlar silindi!");
      } else {
        deleteRoutine(routineToDelete.id);
        toast.success("Rutin silindi!");
      }
    }
    setDeleteDialogOpen(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh] bg-transparent">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-5xl mx-auto space-y-6 px-2 py-4"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <RoutineHeader onNewRoutine={handleOpenModal} user={user} />
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants}>
        <StatsPanel routines={routines} weeklyStats={weeklyStats} monthlyStats={monthlyStats} />
      </motion.div>

      {/* Filters and Actions */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col md:flex-row gap-4 justify-between items-center rounded-3xl p-5 border border-white/10 shadow-lg"
        style={{ background: "rgba(10,15,30,0.5)", backdropFilter: "blur(20px)" }}
      >
        <FilterBar
          filterCategory={filterCategory}
          setFilterCategory={setFilterCategory}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          timeFilter={timeFilter}
          setTimeFilter={setTimeFilter}
        />
        <ActionButtons
          onAddClick={handleOpenModal}
          onDeleteAllClick={handleRequestDeleteAll}
          hasFilteredRoutines={filteredRoutines.length > 0}
        />
      </motion.div>

      {/* Routine Lists */}
      <motion.div variants={itemVariants}>
        <RoutineLists
          activeRoutines={activeRoutines}
          completedRoutines={completedRoutines}
          currentTime={currentTime}
          onCheck={toggleRoutineCompletion}
          onEdit={handleEditRoutine}
          onDelete={handleRequestDelete}
          onToggleNotification={() => { }}
        />
      </motion.div>

      <RoutineModal
        open={modalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveRoutine}
        editingRoutine={editingRoutine}
        selectedDate={newRoutineDate}
        setSelectedDate={setNewRoutineDate}
      />

      <ModernDeleteDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        routine={routineToDelete || { title: isFilteredDelete ? "Tüm Filtrelenenler" : "" }}
        onConfirm={handleConfirmDelete}
        isFiltered={isFilteredDelete}
      />
    </motion.div>
  );
};

export default DailyRoutine;
