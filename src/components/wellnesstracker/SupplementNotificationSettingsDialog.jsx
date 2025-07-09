import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Chip,
  Typography,
  Paper,
  Stack,
  IconButton,
  Divider,
  Avatar,
  Zoom,
  Tooltip,
  LinearProgress,
  Backdrop,
  Fade,
  Container,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AddIcon from "@mui/icons-material/Add";
import MedicationIcon from "@mui/icons-material/Medication";
import CloseIcon from "@mui/icons-material/Close";
import AlarmIcon from "@mui/icons-material/Alarm";
import SaveIcon from "@mui/icons-material/Save";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import WatchLaterIcon from "@mui/icons-material/WatchLater";
import { styled, alpha } from "@mui/material/styles";

// Modern kart tasarımı
const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.spacing(3),
  background: `linear-gradient(145deg, ${alpha(
    theme.palette.background.paper,
    0.8
  )}, ${alpha(theme.palette.background.paper, 0.95)})`,
  backdropFilter: "blur(8px)",
  boxShadow:
    "rgba(17, 17, 26, 0.1) 0px 8px 24px, rgba(17, 17, 26, 0.05) 0px 16px 56px, rgba(17, 17, 26, 0.05) 0px 24px 80px",
  marginBottom: theme.spacing(3),
  position: "relative",
  overflow: "hidden",
  transition: "all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
  "&:hover": {
    transform: "translateY(-6px)",
    boxShadow:
      "rgba(50, 50, 93, 0.25) 0px 50px 100px -20px, rgba(0, 0, 0, 0.3) 0px 30px 60px -30px",
  },
  "&:after": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "6px",
    background: "linear-gradient(90deg, #4caf50, #2196f3, #f44336, #ff9800)",
    backgroundSize: "300% 300%",
    animation: "gradient 4s ease infinite",
  },
  "@keyframes gradient": {
    "0%": {
      backgroundPosition: "0% 50%",
    },
    "50%": {
      backgroundPosition: "100% 50%",
    },
    "100%": {
      backgroundPosition: "0% 50%",
    },
  },
}));

// Modern başlık stil
const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  padding: theme.spacing(3),
  background: "linear-gradient(135deg, #4b6cb7 0%, #182848 100%)",
  color: theme.palette.primary.contrastText,
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  "& .MuiTypography-root": {
    fontWeight: 700,
    fontSize: "1.25rem",
    textShadow: "0px 2px 4px rgba(0, 0, 0, 0.2)",
  },
}));

// Şık scroll tasarımı
const StyledDialogContent = styled(DialogContent)(({ theme }) => ({
  padding: theme.spacing(3),
  "&::-webkit-scrollbar": {
    width: "8px",
    background: "transparent",
  },
  "&::-webkit-scrollbar-thumb": {
    background: "linear-gradient(to bottom, #4b6cb7, #182848)",
    borderRadius: "4px",
    transition: "all 0.3s ease",
  },
  "&::-webkit-scrollbar-thumb:hover": {
    background: "#4b6cb7",
  },
  "&::-webkit-scrollbar-track": {
    background: alpha(theme.palette.primary.light, 0.1),
    borderRadius: "4px",
  },
  scrollBehavior: "smooth",
  overscrollBehavior: "contain",
  maxHeight: "60vh",
}));

// Modern saat giriş komponenti
const TimeInputWrapper = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  background: alpha(theme.palette.primary.light, 0.08),
  backdropFilter: "blur(4px)",
  borderRadius: theme.spacing(2.5),
  padding: theme.spacing(1, 1.5),
  marginTop: theme.spacing(2),
  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
  transition: "all 0.3s ease",
  "&:hover": {
    background: alpha(theme.palette.primary.light, 0.12),
    boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
  },
  "&:focus-within": {
    background: alpha(theme.palette.primary.light, 0.15),
    boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.3)}`,
  },
}));

// Modern butonlar
const ActionButton = styled(Button)(({ theme }) => ({
  borderRadius: theme.spacing(3),
  padding: theme.spacing(1.2, 3.5),
  textTransform: "none",
  fontWeight: 600,
  letterSpacing: "0.5px",
  boxShadow: theme.shadows[3],
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    transform: "translateY(-3px) scale(1.02)",
    boxShadow: "0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)",
  },
  "&:active": {
    transform: "translateY(0) scale(0.98)",
  },
}));

// Animasyonlu chip
const AnimatedChip = styled(Chip)(({ theme }) => ({
  borderRadius: theme.spacing(4),
  padding: theme.spacing(0.5),
  height: "auto",
  "& .MuiChip-label": {
    padding: theme.spacing(0.5, 1),
  },
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    transform: "translateY(-3px) scale(1.05)",
    boxShadow: "0 6px 12px rgba(0,0,0,0.15)",
  },
  "&:active": {
    transform: "translateY(0) scale(0.95)",
  },
}));

// Özel avatar
const StyledAvatar = styled(Avatar)(({ theme, color }) => ({
  background: `linear-gradient(135deg, ${color} 0%, ${alpha(color, 0.7)} 100%)`,
  boxShadow: `0 4px 10px ${alpha(color, 0.4)}`,
  marginRight: theme.spacing(1.5),
  transition: "all 0.3s ease",
  "&:hover": {
    transform: "rotate(10deg)",
  },
}));

// İlerleme çubuğu
const StyledProgress = styled(LinearProgress)(({ theme, value }) => ({
  height: 8,
  borderRadius: 4,
  width: "100%",
  marginTop: theme.spacing(1),
  background: alpha(theme.palette.grey[300], 0.5),
  "& .MuiLinearProgress-bar": {
    background:
      value < 30
        ? "linear-gradient(90deg, #ff9800, #f44336)"
        : value < 70
        ? "linear-gradient(90deg, #4caf50, #8bc34a)"
        : "linear-gradient(90deg, #2196f3, #4caf50)",
    transition: "transform 1s cubic-bezier(0.65, 0, 0.35, 1)",
  },
}));

// Modern ve sezgisel Takviye Bildirim Ayarları diyalog bileşeni
const SupplementNotificationSettingsDialog = ({
  open,
  onClose,
  supplements,
  onSave,
  updateSupplementSchedule,
}) => {
  const [localSupps, setLocalSupps] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setLocalSupps(
        supplements.map((supp) => ({
          id: supp.id,
          name: supp.name,
          notificationSchedule: supp.notificationSchedule || [],
          quantity: supp.quantity || 0,
          dailyUsage: supp.dailyUsage || 0,
          estimatedRemainingDays:
            supp.quantity && supp.dailyUsage
              ? (supp.quantity / supp.dailyUsage).toFixed(1)
              : "N/A",
          newTime: "",
        }))
      );
    }
  }, [open, supplements]);

  const handleTimeChange = (id, value) => {
    setLocalSupps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, newTime: value } : s))
    );
  };

  const handleAddTime = (id) => {
    setLocalSupps((prev) =>
      prev.map((s) => {
        if (s.id === id && s.newTime) {
          if (s.notificationSchedule.includes(s.newTime)) return s; // Aynı saat eklenmesin
          const updatedSchedule = [...s.notificationSchedule, s.newTime].sort();
          return { ...s, notificationSchedule: updatedSchedule, newTime: "" };
        }
        return s;
      })
    );
  };

  const handleDeleteTime = (id, timeToDelete) => {
    setLocalSupps((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const updatedSchedule = s.notificationSchedule.filter(
            (time) => time !== timeToDelete
          );
          return { ...s, notificationSchedule: updatedSchedule };
        }
        return s;
      })
    );
  };

  const handleKeyPress = (e, id) => {
    if (e.key === "Enter") {
      const supp = localSupps.find((s) => s.id === id);
      if (supp && supp.newTime) {
        handleAddTime(id);
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const updatedSupps = localSupps.map((s) => ({
      id: s.id,
      notificationSchedule: s.notificationSchedule,
    }));

    try {
      await onSave(updatedSupps);
      if (updateSupplementSchedule) {
        for (const supp of updatedSupps) {
          await updateSupplementSchedule(supp);
        }
      }
      // Başarılı animasyon için kısa bekleyiş
      setTimeout(() => {
        setSaving(false);
        onClose();
      }, 800);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Kaydetme hatası:", error);
      }
      setSaving(false);
    }
  };

  // Rastgele bir renk seçmek için yardımcı fonksiyon
  const getColorForSupplement = (name) => {
    const colors = [
      "#4caf50",
      "#2196f3",
      "#f44336",
      "#ff9800",
      "#9c27b0",
      "#009688",
      "#3f51b5",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Kalan gün miktarına göre yüzde hesabı
  const calculateRemaining = (days) => {
    if (days === "N/A") return 0;
    const daysNum = parseFloat(days);
    if (daysNum > 30) return 100;
    return Math.round((daysNum / 30) * 100);
  };

  return (
    <Dialog
      open={open}
      onClose={!saving ? onClose : undefined}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: 4,
          boxShadow:
            "0 50px 100px rgba(0,0,0,0.25), 0 30px 60px rgba(0,0,0,0.22)",
          overflow: "hidden",
          background: alpha("#f8f9fa", 0.95),
          backgroundImage:
            'url(\'data:image/svg+xml,%3Csvg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z" fill="%232196f3" fill-opacity="0.05" fill-rule="evenodd"/%3E%3C/svg%3E\')',
        },
      }}
      TransitionComponent={Zoom}
      TransitionProps={{
        timeout: 500,
      }}
    >
      {/* Şu satırda component="div" ekleyerek DialogTitle’nın h2 olarak render edilmesini engelliyoruz */}
      <StyledDialogTitle component="div">
        <NotificationsActiveIcon
          sx={{
            mr: 1.5,
            fontSize: 28,
            animation: "pulse 2s infinite",
            "@keyframes pulse": {
              "0%": { opacity: 0.7, transform: "scale(1)" },
              "50%": { opacity: 1, transform: "scale(1.1)" },
              "100%": { opacity: 0.7, transform: "scale(1)" },
            },
          }}
        />
        <Typography variant="h6" component="span">
          Takviye Bildirim Ayarları
        </Typography>
        {!saving && (
          <IconButton
            onClick={onClose}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              // "white" yerine "#fff" kullanarak renk formatını düzeltelim
              color: "#fff",
              background: alpha("#000", 0.2),
              "&:hover": {
                background: alpha("#000", 0.3),
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </StyledDialogTitle>

      <StyledDialogContent dividers>
        <Box
          sx={{
            mb: 4,
            display: "flex",
            alignItems: "center",
            px: 1,
            py: 1.5,
            borderRadius: 2,
            background: alpha("#f5f5f5", 0.7),
          }}
        >
          <HealthAndSafetyIcon color="primary" sx={{ mr: 1.5, fontSize: 24 }} />
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              fontWeight: 500,
              lineHeight: 1.5,
            }}
          >
            Her bir takviye için hatırlatıcı saatleri ekleyerek bildirimlerinizi
            düzenleyebilirsiniz. Bildirimlerin kaydedildikten sonra aktif
            olacağını unutmayın.
          </Typography>
        </Box>

        <Container
          maxWidth="md"
          disableGutters
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 2,
          }}
        >
          {localSupps.map((supp, index) => {
            const color = getColorForSupplement(supp.name);
            const remainingPercentage = calculateRemaining(
              supp.estimatedRemainingDays
            );

            return (
              <Fade
                key={supp.id}
                in={true}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <StyledPaper>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
                    <StyledAvatar color={color}>
                      <MedicationIcon />
                    </StyledAvatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography
                        variant="h6"
                        sx={{ fontWeight: 700, letterSpacing: "0.5px" }}
                      >
                        {supp.name}
                      </Typography>

                      {supp.estimatedRemainingDays !== "N/A" && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            mt: 0.5,
                          }}
                        >
                          <Tooltip
                            title={`Kalan tahmini gün: ${supp.estimatedRemainingDays}`}
                            arrow
                            placement="top"
                          >
                            <Box sx={{ width: "100%" }}>
                              <Typography
                                variant="caption"
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  color: "text.secondary",
                                }}
                              >
                                <CalendarTodayIcon
                                  sx={{ fontSize: 14, mr: 0.5 }}
                                />
                                {remainingPercentage < 30
                                  ? `${supp.estimatedRemainingDays} gün kaldı (Kritik)`
                                  : `${supp.estimatedRemainingDays} gün kaldı`}
                              </Typography>
                              <StyledProgress
                                variant="determinate"
                                value={remainingPercentage}
                              />
                            </Box>
                          </Tooltip>
                        </Box>
                      )}
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2, opacity: 0.6 }} />

                  <TimeInputWrapper>
                    <TextField
                      type="time"
                      value={supp.newTime}
                      onChange={(e) =>
                        handleTimeChange(supp.id, e.target.value)
                      }
                      onKeyPress={(e) => handleKeyPress(e, supp.id)}
                      variant="standard"
                      placeholder="Saat seçin..."
                      InputProps={{
                        disableUnderline: true,
                        startAdornment: (
                          <WatchLaterIcon sx={{ mr: 1.5, color: color }} />
                        ),
                      }}
                      sx={{ flex: 1 }}
                    />
                    <Tooltip title="Bildirim Saati Ekle" arrow placement="top">
                      <span>
                        <IconButton
                          onClick={() => handleAddTime(supp.id)}
                          disabled={!supp.newTime}
                          size="small"
                          sx={{
                            ml: 1,
                            bgcolor: color,
                            // "white" yerine "#fff" kullanıldı
                            color: "#fff",
                            "&:hover": {
                              bgcolor: alpha(color, 0.85),
                              transform: "rotate(90deg)",
                            },
                            "&.Mui-disabled": {
                              bgcolor: alpha(color, 0.3),
                              color: alpha("#fff", 0.5),
                            },
                            transition: "all 0.3s ease",
                          }}
                        >
                          <AddIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TimeInputWrapper>

                  <Box
                    sx={{
                      mt: 3,
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 1,
                      minHeight: supp.notificationSchedule.length
                        ? "40px"
                        : "auto",
                    }}
                  >
                    {supp.notificationSchedule.length > 0 ? (
                      supp.notificationSchedule.map((time, index) => (
                        <AnimatedChip
                          key={index}
                          label={time}
                          icon={
                            <AccessTimeIcon sx={{ color: alpha(color, 0.7) }} />
                          }
                          onDelete={() => handleDeleteTime(supp.id, time)}
                          sx={{
                            border: `1px solid ${alpha(color, 0.3)}`,
                            background: alpha(color, 0.08),
                            color: alpha(color, 0.9),
                            fontWeight: 500,
                            "& .MuiChip-deleteIcon": {
                              color: alpha(color, 0.7),
                              "&:hover": {
                                color: color,
                              },
                            },
                          }}
                        />
                      ))
                    ) : (
                      <Typography
                        variant="body2"
                        sx={{
                          color: "text.secondary",
                          fontStyle: "italic",
                          display: "flex",
                          alignItems: "center",
                          opacity: 0.6,
                        }}
                      >
                        <AlarmIcon sx={{ fontSize: 16, mr: 0.5 }} />
                        Henüz bildirim saati eklenmemiş
                      </Typography>
                    )}
                  </Box>
                </StyledPaper>
              </Fade>
            );
          })}
        </Container>
      </StyledDialogContent>

      <DialogActions
        sx={{
          justifyContent: "space-between",
          p: 3,
          bgcolor: alpha("#f5f5f5", 0.5),
          background:
            "linear-gradient(rgba(255,255,255,0.8), rgba(245,245,245,0.9))",
          backdropFilter: "blur(10px)",
        }}
      >
        <ActionButton
          onClick={onClose}
          variant="outlined"
          color="inherit"
          startIcon={<CloseIcon />}
          disabled={saving}
          sx={{
            borderWidth: 2,
            "&:hover": {
              borderWidth: 2,
            },
          }}
        >
          İptal
        </ActionButton>
        <ActionButton
          onClick={handleSave}
          variant="contained"
          color="primary"
          startIcon={saving ? null : <SaveIcon />}
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
                <LinearProgress
                  sx={{
                    height: "100%",
                    borderRadius: 0,
                  }}
                />
              </Box>
              Kaydediliyor...
            </>
          ) : (
            "Bildirimleri Kaydet"
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

export default SupplementNotificationSettingsDialog;
