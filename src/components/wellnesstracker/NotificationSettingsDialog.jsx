import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Button,
} from "@mui/material";

const NotificationSettingsDialog = ({ open, onClose, user, onSave }) => {
  const [start, setStart] = useState(user.notificationWindow?.start || "08:00");
  const [end, setEnd] = useState(user.notificationWindow?.end || "22:00");

  const handleSave = () => {
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
