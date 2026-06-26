import React from "react";
import { Add, DeleteSweep } from "@mui/icons-material";

const ActionButtons = ({ onAddClick, onDeleteAllClick, hasFilteredRoutines }) => {
  return (
    <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
      <button
        onClick={onDeleteAllClick}
        disabled={!hasFilteredRoutines}
        className={`flex flex-1 md:flex-none items-center justify-center gap-1.5 px-3 py-2.5 rounded-[12px] transition-all font-semibold text-[0.8rem] border
          ${
            hasFilteredRoutines
              ? "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-300"
              : "bg-white/5 border-white/5 text-white/20 cursor-not-allowed"
          }`}
      >
        <DeleteSweep sx={{ fontSize: 18 }} />
        Tümünü Sil
      </button>

      <button
        onClick={onAddClick}
        className="flex flex-1 md:flex-none items-center justify-center gap-1.5 px-4 py-2.5 rounded-[12px] text-white transition-all font-bold text-[0.8rem] shadow-lg hover:-translate-y-0.5"
        style={{
          background: "linear-gradient(135deg, #6366f1, #06b6d4)",
          boxShadow: "0 4px 14px rgba(99,102,241,0.3)",
        }}
      >
        <Add sx={{ fontSize: 18 }} />
        Yeni Ekle
      </button>
    </div>
  );
};

export default ActionButtons;
