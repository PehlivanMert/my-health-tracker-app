import React from "react";
import { Search } from "@mui/icons-material";
import { categoryNames } from "../../hooks/useDailyRoutineForm";

const FilterBar = ({
  filterCategory,
  setFilterCategory,
  searchQuery,
  setSearchQuery,
  timeFilter,
  setTimeFilter,
}) => {
  const inputBase =
    "w-full rounded-[14px] px-10 py-2.5 text-[0.85rem] font-medium text-white/90 placeholder-white/40 " +
    "border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 " +
    "focus:border-indigo-500/40 transition-all duration-300";

  return (
    <div className="flex flex-col md:flex-row items-center w-full gap-3">
      {/* Search */}
      <div className="relative w-full md:w-[35%] group">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors group-focus-within:text-indigo-400 text-white/30">
          <Search sx={{ fontSize: 20 }} />
        </div>
        <input
          type="text"
          className={inputBase}
          placeholder="Rutin ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ background: "rgba(255,255,255,0.06)", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.1)" }}
        />
      </div>

      {/* Category Select */}
      <div className="w-full md:w-[30%]">
        <select
          className={inputBase.replace("px-10", "px-4")}
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{ background: "rgba(15,23,42,0.95)", appearance: "none", backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", backgroundSize: "16px" }}
        >
          <option value="All">Tüm Kategoriler</option>
          {Object.entries(categoryNames).map(([key, name]) => (
            <option key={key} value={key}>{name}</option>
          ))}
        </select>
      </div>

      {/* Time Filter Tabs */}
      <div
        className="flex p-1 rounded-[14px] w-full md:w-[35%] border border-white/10"
        style={{ background: "rgba(255,255,255,0.04)" }}
      >
        {[
          { key: "Yesterday", label: "Dün" },
          { key: "Today", label: "Bugün" },
          { key: "Tomorrow", label: "Yarın" },
        ].map(({ key, label }) => {
          const isActive = timeFilter === key;
          return (
            <button
              key={key}
              onClick={() => setTimeFilter(key)}
              className={`flex-1 py-1.5 px-2 text-[0.75rem] font-bold rounded-[10px] transition-all duration-300 ${isActive
                  ? "bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-md shadow-indigo-500/20"
                  : "text-white/40 hover:text-white/80 hover:bg-white/5"
                }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FilterBar;
