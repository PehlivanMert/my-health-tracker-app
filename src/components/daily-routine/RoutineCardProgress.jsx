import React from "react";

const RoutineCardProgress = ({ progress, className = "" }) => {
  return (
    <div className={`w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 ${className}`}>
      <div
        className="bg-blue-500 h-2 rounded-full transition-all duration-500"
        style={{ width: `${progress}%` }}
      ></div>
    </div>
  );
};

export default RoutineCardProgress;
