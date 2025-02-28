import { openDB } from "idb";

export const notificationDB = async () => {
  return openDB("scheduled-notifications", 1, {
    upgrade(db) {
      db.createObjectStore("notifications", { keyPath: "id" });
    },
  });
};
