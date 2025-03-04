import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Button,
} from "@mui/material";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../auth/firebaseConfig";

// Bu bileşen, kullanıcıya global bildirim penceresi ayarlarını (notificationWindow) sunar.
// Backend’deki NotificationScheduler.js ve SupplementNotificationScheduler.js, bu pencereyi referans alır.

const NotificationSettingsDialog = ({ open, onClose, user, onSave }) => {
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("22:00");

  useEffect(() => {
    if (open && user && user.uid) {
      const fetchData = async () => {
        try {
          const userRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const data = userDoc.data();
            setStart(data.notificationWindow?.start || "08:00");
            setEnd(data.notificationWindow?.end || "22:00");
            console.log("State'e atanan değerler:", {
              start: data.notificationWindow?.start || "08:00",
              end: data.notificationWindow?.end || "22:00",
            });
          } else {
            setStart("08:00");
            setEnd("22:00");
          }
        } catch (error) {
          console.error(
            "NotificationSettingsDialog - Veri çekme hatası:",
            error
          );
          setStart("08:00");
          setEnd("22:00");
        }
      };

      fetchData();
    }
  }, [open, user?.uid]);

  const handleSave = () => {
    console.log("Kaydedilecek değerler:", { start, end });
    onSave({ start, end });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Global Bildirim Ayarları</DialogTitle>
      <DialogContent>
        <TextField
          label="Başlangıç Saati"
          type="time"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
          sx={{ mt: 2 }}
        />
        <TextField
          label="Bitiş Saati"
          type="time"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>İptal</Button>
        <Button onClick={handleSave}>Kaydet</Button>
      </DialogActions>
    </Dialog>
  );
};

export default NotificationSettingsDialog;
