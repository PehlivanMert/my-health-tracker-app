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
      <div
        className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl p-3 border border-white/10 shadow-lg"
        style={{ background: "rgba(10,15,30,0.5)", backdropFilter: "blur(16px)" }}
      >
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="p-2 rounded-lg shadow-md" style={{ background: "linear-gradient(135deg, #6366f1, #06b6d4)" }}>
            <Clock className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Günlük Rutinler</h2>
            <p className="text-white/40 font-semibold text-[10px] uppercase tracking-wider mt-0.5">Alışkanlık Takibi</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            onClick={handleOpenTimer}
            variant="outline"
            ref={timerButtonRef}
            className="flex-1 sm:flex-none rounded-lg h-9 px-4 text-xs bg-white/5 hover:bg-white/10 border-white/10 text-white/70 hover:text-white"
          >
            <Timer className="mr-1.5 h-4 w-4 text-cyan-400" />
            Sayaç
          </Button>
          <Button
            onClick={onNewRoutine}
            ref={newRoutineButtonRef}
            className="flex-1 sm:flex-none rounded-lg h-9 px-4 text-xs text-white shadow-md"
            style={{ background: "linear-gradient(135deg, #6366f1, #06b6d4)" }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Yeni
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
