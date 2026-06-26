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
        className="flex flex-col md:flex-row items-center justify-between gap-6 rounded-3xl p-6 md:p-8 border border-white/10 shadow-xl"
        style={{ background: "rgba(255,255,255,0.07)", backdropFilter: "blur(16px)" }}
      >
        <div className="flex items-center gap-4">
          <div className="p-4 rounded-2xl shadow-lg" style={{ background: "linear-gradient(135deg, #6366f1, #06b6d4)" }}>
            <Clock className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Günlük Rutinler
            </h2>
            <p className="text-white/40 font-medium mt-1 text-sm">
              Alışkanlıklarınızı takip edin ve hedeflerinize ulaşın.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button
            onClick={handleOpenTimer}
            variant="outline"
            ref={timerButtonRef}
            className="flex-1 md:flex-none rounded-xl h-11 px-5 shadow-sm bg-white/8 hover:bg-white/14 transition-all border-white/10 text-white/70 hover:text-white"
          >
            <Timer className="mr-2 h-4 w-4 text-cyan-400" />
            Sayaç
          </Button>
          <Button
            onClick={onNewRoutine}
            ref={newRoutineButtonRef}
            className="flex-1 md:flex-none rounded-xl h-11 px-5 text-white shadow-md transition-all"
            style={{ background: "linear-gradient(135deg, #6366f1, #06b6d4)", boxShadow: "0 4px 16px rgba(99,102,241,0.35)" }}
          >
            <Plus className="mr-2 h-4 w-4" />
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
