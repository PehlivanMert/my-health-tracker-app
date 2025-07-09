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
  background: "linear-gradient(135deg, #4b6cb7 0%, #182848 100%)",
  color: theme.palette.primary.contrastText,
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  "& .MuiTypography-root": {
    fontWeight: 700,
    fontSize: { xs: "1rem", sm: "1.1rem", md: "1.25rem" },
    textShadow: "0px 2px 4px rgba(0, 0, 0, 0.2)",
  },
}));

const StyledDialogContent = styled(DialogContent)(({ theme }) => ({
  padding: { xs: theme.spacing(2), sm: theme.spacing(3) },
  background: alpha("#f8f9fa", 0.95),
  "&::-webkit-scrollbar": {
    width: "8px",
    background: "transparent",
  },
  "&::-webkit-scrollbar-thumb": {
    background: "linear-gradient(to bottom, #4b6cb7, #182848)",
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
  boxShadow: theme.shadows[3],
  fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" },
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    transform: "translateY(-3px) scale(1.02)",
    boxShadow: "0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)",
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
          bgcolor: alpha("#f5f5f5", 0.5),
          background:
            "linear-gradient(rgba(255,255,255,0.8), rgba(245,245,245,0.9))",
          backdropFilter: "blur(10px)",
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
            background: "linear-gradient(135deg, #4b6cb7 0%, #182848 100%)",
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
