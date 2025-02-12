// src/utils/calendarHelpers.js
export const addOneHour = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  date.setHours(date.getHours() + 1);
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
};

export const generateEventId = (baseId) =>
  `${baseId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
