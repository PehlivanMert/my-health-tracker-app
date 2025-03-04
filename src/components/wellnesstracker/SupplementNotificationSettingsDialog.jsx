import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Box,
  TextField,
  DialogActions,
  Button,
} from "@mui/material";

// Bu bileşen, SupplementNotificationScheduler.js’deki hesaplama mantığına uygun şekilde
// takviyeler için bildirim zamanlarını ayarlamanızı sağlar.
// Ayarlar kaydedildikten sonra, opsiyonel updateSupplementSchedule callback’i ile
// her takviye için backend’deki saveNextSupplementReminderTime fonksiyonu çağrılabilir.

const SupplementNotificationSettingsDialog = ({
  open,
  onClose,
  supplements,
  onSave,
  // İsteğe bağlı: Takviye bildirim zamanlarını güncellemek için callback
  updateSupplementSchedule,
}) => {
  const [localSupps, setLocalSupps] = useState([]);

  useEffect(() => {
    if (open) {
      setLocalSupps(
        supplements.map((supp) => ({
          id: supp.id,
          name: supp.name,
          notificationSchedule: supp.notificationSchedule
            ? supp.notificationSchedule.join(", ")
            : "",
          estimatedRemainingDays:
            supp.quantity && supp.dailyUsage
              ? (supp.quantity / supp.dailyUsage).toFixed(1)
              : "N/A",
        }))
      );
    }
  }, [open, supplements]);

  const handleChange = (id, field, value) => {
    setLocalSupps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleSave = async () => {
    const updatedSupps = localSupps.map((s) => ({
      id: s.id,
      notificationSchedule: s.notificationSchedule
        ? s.notificationSchedule.split(",").map((time) => time.trim())
        : [],
    }));
    await onSave(updatedSupps);

    // Her takviye için backend’deki hatırlatma zamanını güncelleme çağrısı (örneğin saveNextSupplementReminderTime)
    if (updateSupplementSchedule) {
      updatedSupps.forEach(async (supp) => {
        await updateSupplementSchedule(supp);
      });
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Takviye Bildirim Ayarları</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2, color: "#555" }}>
          Lütfen, takviyeleriniz için bildirim gönderilmesini istediğiniz
          saatleri virgülle ayırarak giriniz (örn: "08:00, 14:00"). Eğer
          planlanmış zaman eklemezseniz, sistem kalan miktar ve günlük kullanım
          miktarınıza göre otomatik olarak hatırlatma yapar.
        </Typography>
        {localSupps.map((supp) => (
          <Box
            key={supp.id}
            sx={{ mb: 2, borderBottom: "1px solid rgba(0,0,0,0.1)", pb: 1 }}
          >
            <Typography variant="subtitle1">{supp.name}</Typography>
            <TextField
              label="Planlanmış Bildirim Zamanları"
              fullWidth
              value={supp.notificationSchedule}
              onChange={(e) =>
                handleChange(supp.id, "notificationSchedule", e.target.value)
              }
              helperText="Örn: 08:00, 14:00"
              sx={{ mb: 1 }}
            />
            <Typography variant="caption" sx={{ color: "#555" }}>
              Otomatik hesaplama (takviyeniz ne kadar gün kalacak):{" "}
              {supp.estimatedRemainingDays} gün
            </Typography>
          </Box>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>İptal</Button>
        <Button onClick={handleSave}>Kaydet</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SupplementNotificationSettingsDialog;
