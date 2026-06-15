import React from "react";
import { Add, DeleteSweep } from "@mui/icons-material";

const ActionButtons = ({ onAddClick, onDeleteAllClick, hasFilteredRoutines }) => {
  return (
    <div className="flex items-center gap-2 w-full md:w-auto">
      <button
        onClick={onDeleteAllClick}
        disabled={!hasFilteredRoutines}
        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-2xl transition-all font-medium text-sm w-full md:w-auto
          ${
            hasFilteredRoutines
              ? "bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/40"
              : "bg-slate-50 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
          }`}
      >
        <DeleteSweep fontSize="small" />
        Tümünü Sil
      </button>

      <button
        onClick={onAddClick}
        className="flex items-center justify-center gap-2 px-4 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white transition-all font-medium text-sm shadow-md hover:shadow-lg w-full md:w-auto"
      >
        <Add fontSize="small" />
        Yeni Ekle
      </button>
    </div>
  );
};

export default ActionButtons;
