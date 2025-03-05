import React, { useState, useEffect } from "react";
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

// Varsayılan değer vererek waterSettings'in undefined olma riskini azaltıyoruz.
const WaterNotificationSettingsDialog = ({
  open,
  onClose,
  waterSettings = {},
  onSave,
  updateWaterSchedule,
}) => {
  // İlk değerleri waterSettings'ten alıyoruz veya default olarak ayarlıyoruz.
  const [notificationOption, setNotificationOption] = useState(
    waterSettings.waterNotificationOption || "smart"
  );
  const [customInterval, setCustomInterval] = useState(
    waterSettings.customNotificationInterval || 1
  );
  const [activityLevel, setActivityLevel] = useState(
    waterSettings.activityLevel || "orta"
  );

  useEffect(() => {
    // Dışarıdan gelen waterSettings değiştiğinde state'leri güncelliyoruz.
    setNotificationOption(waterSettings.waterNotificationOption || "smart");
    setCustomInterval(waterSettings.customNotificationInterval || 1);
    setActivityLevel(waterSettings.activityLevel || "orta");
  }, [waterSettings]);

  // Debug için
  useEffect(() => {
    console.log("Current notificationOption:", notificationOption);
  }, [notificationOption]);

  const handleSave = async () => {
    const newSettings = {
      waterNotificationOption: notificationOption,
      customNotificationInterval: customInterval,
    };
    if (notificationOption === "smart") {
      newSettings.activityLevel = activityLevel;
    }
    await onSave(newSettings);
    if (updateWaterSchedule) {
      await updateWaterSchedule(newSettings);
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Su Bildirim Ayarları</DialogTitle>
      <DialogContent>
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel id="mode-label">Mod Seçimi</InputLabel>
          <Select
            labelId="mode-label"
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
        {notificationOption === "smart" && (
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="activity-label">Aktiflik Seviyesi</InputLabel>
            <Select
              labelId="activity-label"
              value={activityLevel}
              label="Aktiflik Seviyesi"
              onChange={(e) => setActivityLevel(e.target.value)}
            >
              <MenuItem value="çok_düşük">Çok Düşük</MenuItem>
              <MenuItem value="düşük">Düşük</MenuItem>
              <MenuItem value="orta">Orta</MenuItem>
              <MenuItem value="yüksek">Yüksek</MenuItem>
              <MenuItem value="çok_yüksek">Çok Yüksek</MenuItem>
              <MenuItem value="aşırı">Aşırı</MenuItem>
            </Select>
          </FormControl>
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
