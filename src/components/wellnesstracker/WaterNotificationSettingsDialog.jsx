import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  DialogActions,
  Button,
} from "@mui/material";

const WaterNotificationSettingsDialog = ({
  open,
  onClose,
  waterSettings,
  onSave,
}) => {
  const [notificationOption, setNotificationOption] = useState(
    waterSettings.waterNotificationOption || "smart"
  );
  const [customInterval, setCustomInterval] = useState(
    waterSettings.customNotificationInterval || 1
  );

  const handleSave = () => {
    onSave({
      waterNotificationOption: notificationOption,
      customNotificationInterval: customInterval,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Su Bildirim Ayarları</DialogTitle>
      <DialogContent>
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>Mod Seçimi</InputLabel>
          <Select
            value={notificationOption}
            label="Mod Seçimi"
            onChange={(e) => setNotificationOption(e.target.value)}
          >
            <MenuItem value="none">Kapalı</MenuItem>
            <MenuItem value="smart">
              Akıllı (Hava &amp; Geçmiş Veriye Göre)
            </MenuItem>
            <MenuItem value="custom">Özel (Kaç saatte bir)</MenuItem>
          </Select>
        </FormControl>
        {notificationOption === "custom" && (
          <TextField
            label="Bildirim Aralığı (saat)"
            type="number"
            fullWidth
            value={customInterval}
            onChange={(e) => setCustomInterval(Number(e.target.value))}
            InputLabelProps={{ shrink: true }}
            sx={{ mt: 2 }}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>İptal</Button>
        <Button onClick={handleSave}>Kaydet</Button>
      </DialogActions>
    </Dialog>
  );
};

export default WaterNotificationSettingsDialog;
