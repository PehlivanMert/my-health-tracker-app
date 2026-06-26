import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import RoutineCard from "./RoutineCard";

const RoutineLists = ({
  activeRoutines,
  completedRoutines,
  currentTime = new Date(),
  onCheck,
  onEdit,
  onDelete,
}) => {
  const [showCompleted, setShowCompleted] = useState(false);

  const listVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  };

  return (
    <div className="space-y-8 mt-4">
      {/* Active Routines */}
      <div>
        <h2 className="text-base font-semibold text-white/60 mb-4 uppercase tracking-widest text-center">
          Aktif Rutinler
        </h2>

        <AnimatePresence mode="wait">
          {activeRoutines.length === 0 ? (
            <motion.div
              key="empty-active"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-8"
            >
              <img src="/empty-state.svg" alt="Boş" className="w-32 h-32 opacity-40 mb-4" />
              <p className="text-white/50 italic text-sm font-medium">Planlanmış aktif rutin bulunmamaktadır.</p>
            </motion.div>
          ) : (
            <motion.div
              key="active-list"
              variants={listVariants}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              {activeRoutines.map((routine) => (
                <motion.div key={routine.id} variants={itemVariants} layout>
                  <RoutineCard
                    routine={routine}
                    currentTime={currentTime}
                    onCheck={onCheck}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Completed Routines */}
      <div className="pt-6 border-t border-white/8">
        <button
          onClick={() => setShowCompleted(!showCompleted)}
          className="flex items-center justify-center w-full gap-2 text-white/30 hover:text-white/60 transition-colors duration-200"
        >
          <span className="text-sm font-semibold uppercase tracking-widest">
            Tamamlanan Rutinler ({completedRoutines.length})
          </span>
          {showCompleted ? <ExpandLess sx={{ fontSize: 18 }} /> : <ExpandMore sx={{ fontSize: 18 }} />}
        </button>

        <AnimatePresence>
          {showCompleted && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-4"
            >
              {completedRoutines.length === 0 ? (
                <div className="text-center py-4 text-white/40 italic text-sm">
                  Henüz tamamlanmış rutin yok.
                </div>
              ) : (
                <motion.div
                  variants={listVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-3"
                >
                  {completedRoutines.map((routine) => (
                    <motion.div key={routine.id} variants={itemVariants} layout>
                      <RoutineCard
                        routine={routine}
                        currentTime={currentTime}
                        onCheck={onCheck}
                        onEdit={onEdit}
                        onDelete={onDelete}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RoutineLists;
