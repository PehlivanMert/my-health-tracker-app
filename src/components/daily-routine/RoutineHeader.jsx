// src/components/daily-routine/RoutineHeader.jsx
import React, { useState, useRef } from "react";
import { Dialog, DialogContent } from "@mui/material";
import { Clock, Plus, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import AdvancedTimer from "./AdvancedTimer";

const RoutineHeader = ({ onNewRoutine, user, newRoutineButtonRef }) => {
  // user prop'u eklendi
  const [openTimer, setOpenTimer] = useState(false);
  const timerButtonRef = useRef(); // Sayaç butonu için ref

  const handleOpenTimer = () => setOpenTimer(true);
  const handleCloseTimer = () => {
    setOpenTimer(false);
    setTimeout(() => {
      timerButtonRef.current?.focus(); // Dialog kapanınca focus'u Sayaç butonuna ver
    }, 0);
  };

  return (
    <div className="mb-8 relative z-10">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white/10 dark:bg-slate-900/40 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-white/20 dark:border-slate-800/50 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
            <Clock className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 dark:text-white tracking-tight">
              Günlük Rutinler
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
              Alışkanlıklarınızı takip edin ve hedeflerinize ulaşın.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button
            onClick={handleOpenTimer}
            variant="outline"
            ref={timerButtonRef}
            className="flex-1 md:flex-none rounded-xl h-12 px-6 shadow-sm bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700 transition-all border-slate-200 dark:border-slate-700"
          >
            <Timer className="mr-2 h-5 w-5 text-indigo-500" />
            Sayaç
          </Button>
          <Button
            onClick={onNewRoutine}
            ref={newRoutineButtonRef}
            className="flex-1 md:flex-none rounded-xl h-12 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md shadow-indigo-500/25 transition-all"
          >
            <Plus className="mr-2 h-5 w-5" />
            Yeni Ekle
          </Button>
        </div>
      </div>
      <Dialog
        open={openTimer}
        onClose={handleCloseTimer}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            backgroundColor: "transparent", // Arka planı şeffaf yapar
            boxShadow: "none", // Gölgeyi kaldırır
            border: "none", // Kenarlığı kaldırır
            overflow: "hidden", // İçeriğin taşmasını engeller
          },
        }}
        BackdropProps={{
          sx: {
            backgroundColor: "rgba(0, 0, 0, 0.5)", // Koyu arka plan, opaklığı artırıldı
            backdropFilter: "blur(15px)", // Blur değeri artırıldı
          },
        }}
      >
        <DialogContent sx={{ p: 0, backgroundColor: "transparent" }}>
          <AdvancedTimer user={user} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoutineHeader;
