import React from "react";
import { Search } from "@mui/icons-material";
import { categoryNames, categoryColors } from "../../hooks/useDailyRoutineForm";

const FilterBar = ({
  filterCategory,
  setFilterCategory,
  searchQuery,
  setSearchQuery,
  timeFilter,
  setTimeFilter,
}) => {
  return (
    <div className="flex flex-col md:flex-row items-center w-full gap-4">
      {/* Search Bar */}
      <div className="relative w-full md:w-1/3">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="text-slate-400" fontSize="small" />
        </div>
        <input
          type="text"
          className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 text-sm transition-all"
          placeholder="Rutin ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Category Filter */}
      <div className="w-full md:w-1/3 overflow-x-auto no-scrollbar flex items-center gap-2">
        <select
          className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 text-sm transition-all cursor-pointer"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="All">Tüm Kategoriler</option>
          {Object.entries(categoryNames).map(([key, name]) => (
            <option key={key} value={key}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* Time Filter Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-full md:w-1/3 justify-between">
        {["Yesterday", "Today", "Tomorrow"].map((filter) => {
          const isActive = timeFilter === filter;
          const labels = {
            Yesterday: "Dün",
            Today: "Bugün",
            Tomorrow: "Yarın",
          };
          return (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`flex-1 py-1.5 px-3 text-sm font-medium rounded-xl transition-all ${
                isActive
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {labels[filter]}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FilterBar;
