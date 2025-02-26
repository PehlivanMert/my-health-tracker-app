import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  requestNotificationPermission,
  setupForegroundNotifications,
} from "../../components/auth/firebaseMessaging";

function NotificationManager() {
  const { currentUser } = useAuth();
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    const initNotifications = async () => {
      const token = await requestNotificationPermission();
      setHasPermission(!!token);
      if (token) {
        setupForegroundNotifications();
      }
    };
    initNotifications();
  }, []);

  useEffect(() => {
    if (currentUser && hasPermission) {
      requestNotificationPermission();
    }
  }, [currentUser, hasPermission]);

  return null;
}

export default NotificationManager;
