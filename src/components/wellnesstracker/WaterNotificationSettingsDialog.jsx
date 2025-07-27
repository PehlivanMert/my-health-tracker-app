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
  IconButton,
  Button,
  Typography,
  Box,
  Backdrop,
  LinearProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { styled, alpha } from "@mui/material/styles";

const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  padding: { xs: theme.spacing(2), sm: theme.spacing(3) },
  background: "linear-gradient(135deg, #1a2a6c 0%, #2196F3 50%, #3F51B5 100%)",
  color: "#ffffff",
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  "& .MuiTypography-root": {
    fontWeight: 700,
    fontSize: { xs: "1rem", sm: "1.1rem", md: "1.25rem" },
    textShadow: "0px 2px 4px rgba(0, 0, 0, 0.3)",
  },
}));

const StyledDialogContent = styled(DialogContent)(({ theme }) => ({
  padding: { xs: theme.spacing(2), sm: theme.spacing(3) },
  background: "linear-gradient(135deg, rgba(26, 42, 108, 0.05) 0%, rgba(33, 150, 243, 0.05) 50%, rgba(63, 81, 181, 0.05) 100%)",
  backdropFilter: "blur(10px)",
  "&::-webkit-scrollbar": {
    width: "8px",
    background: "transparent",
  },
  "&::-webkit-scrollbar-thumb": {
    background: "linear-gradient(to bottom, #2196F3, #3F51B5)",
    borderRadius: "4px",
  },
  "&::-webkit-scrollbar-track": {
    background: alpha(theme.palette.primary.light, 0.1),
    borderRadius: "4px",
  },
}));

const ActionButton = styled(Button)(({ theme }) => ({
  borderRadius: theme.spacing(3),
  padding: { xs: theme.spacing(1, 2.5), sm: theme.spacing(1.2, 3.5) },
  textTransform: "none",
  fontWeight: 600,
  letterSpacing: "0.5px",
  background: "linear-gradient(45deg, #2196F3 30%, #3F51B5 90%)",
  color: "#ffffff",
  boxShadow: "0 4px 12px rgba(33, 150, 243, 0.3)",
  fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" },
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    background: "linear-gradient(45deg, #1976D2 30%, #303F9F 90%)",
    transform: "translateY(-2px)",
    boxShadow: "0 6px 20px rgba(33, 150, 243, 0.4)",
  },
  "&:active": {
    transform: "translateY(0) scale(0.98)",
  },
}));

const WaterNotificationSettingsDialog = ({
  open,
  onClose,
  waterSettings = {},
  onSave,
  updateWaterSchedule,
}) => {
  const [notificationOption, setNotificationOption] = useState(
    waterSettings.waterNotificationOption || "smart"
  );
  const [customInterval, setCustomInterval] = useState(
    waterSettings.customNotificationInterval || 1
  );
  const [activityLevel, setActivityLevel] = useState(
    waterSettings.activityLevel || "orta"
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNotificationOption(waterSettings.waterNotificationOption || "smart");
    setCustomInterval(waterSettings.customNotificationInterval || 1);
    setActivityLevel(waterSettings.activityLevel || "orta");
  }, [waterSettings]);

  const handleSave = async () => {
    setSaving(true);
    const newSettings = {
      waterNotificationOption: notificationOption,
      customNotificationInterval: customInterval,
    };
    if (notificationOption === "smart") {
      newSettings.activityLevel = activityLevel;
    }
    try {
      await onSave(newSettings);
      if (updateWaterSchedule) {
        await updateWaterSchedule(newSettings);
      }
      setSaving(false);
      onClose();
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
      console.error("Kaydetme hatası:", error);
      }
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={!saving ? onClose : undefined}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          maxWidth: { xs: "95vw", sm: "600px" },
          width: { xs: "95vw", sm: "auto" },
          margin: "auto",
          background: alpha("#f8f9fa", 0.95),
          backgroundImage: 'url(\'data:image/svg+xml,%3Csvg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z" fill="%232196f3" fill-opacity="0.05" fill-rule="evenodd"/%3E%3C/svg%3E\')',
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
          borderRadius: "24px",
          overflow: "hidden",
        },
      }}
    >
      <StyledDialogTitle component="div">
        <Typography variant="h6" component="span">
          Su Bildirim Ayarları
        </Typography>
        {!saving && (
          <IconButton
            onClick={onClose}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              color: "#fff",
              background: alpha("#000", 0.2),
              "&:hover": { background: alpha("#000", 0.3) },
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </StyledDialogTitle>
      <StyledDialogContent dividers>
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
      </StyledDialogContent>
      <DialogActions
        sx={{
          justifyContent: "space-between",
          p: { xs: 2, sm: 3 },
          background: "linear-gradient(135deg, rgba(26, 42, 108, 0.1) 0%, rgba(33, 150, 243, 0.1) 50%, rgba(63, 81, 181, 0.1) 100%)",
          backdropFilter: "blur(10px)",
          borderTop: "1px solid rgba(255, 255, 255, 0.2)",
          flexDirection: { xs: "column", sm: "row" },
          gap: { xs: 1, sm: 0 },
        }}
      >
        <ActionButton
          onClick={onClose}
          variant="outlined"
          color="inherit"
          disabled={saving}
          sx={{ borderWidth: 2, "&:hover": { borderWidth: 2 } }}
        >
          İptal
        </ActionButton>
        <ActionButton
          onClick={handleSave}
          variant="contained"
          color="primary"
          disabled={saving}
          sx={{
            background: "linear-gradient(135deg, #2196F3 0%, #3F51B5 100%)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {saving ? (
            <>
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: 4,
                }}
              >
                <LinearProgress sx={{ height: "100%", borderRadius: 0 }} />
              </Box>
              Kaydediliyor...
            </>
          ) : (
            "Kaydet"
          )}
        </ActionButton>
      </DialogActions>
      <Backdrop
        sx={{
          color: "#fff",
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backdropFilter: "blur(3px)",
        }}
        open={saving}
      />
    </Dialog>
  );
};

export default WaterNotificationSettingsDialog;
