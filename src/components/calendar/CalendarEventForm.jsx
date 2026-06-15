import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  Box,
  Button,
  Select,
  MenuItem,
  Typography,
} from "@mui/material";

export const CalendarEventForm = ({
  open,
  onClose,
  title,
  event,
  setEvent,
  onSubmit,
  colors,
  handleDateTimeChange,
  openColorPickerCb,
}) => {
  if (!event) return null;

  const handleAllDayChange = (e) => {
    setEvent((prev) => ({
      ...prev,
      allDay: e.target.checked,
      start: e.target.checked ? prev.start.startOf("day") : prev.start,
      end: e.target.checked ? prev.end.endOf("day") : prev.end,
    }));
  };

  const notificationOptions = [
    { value: "none", label: "Yok" },
    { value: "on-time", label: "Tam Zamanında" },
    { value: "15-minutes", label: "15 Dakika Önce" },
    { value: "1-hour", label: "1 Saat Önce" },
    { value: "1-day", label: "1 Gün Önce" },
  ];

  const recurrenceOptions = [
    { value: "daily", label: "Her Gün" },
    { value: "weekly", label: "Her Hafta" },
    { value: "monthly", label: "Her Ay" },
    { value: "yearly", label: "Her Yıl" },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      disableEnforceFocus
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          background: "rgba(33, 150, 243, 0.15)",
          backdropFilter: "blur(12px)",
          borderRadius: "24px",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          boxShadow: "0 8px 32px rgba(33, 150, 243, 0.2)",
          color: "#fff",
          p: 2,
        },
      }}
    >
      <DialogTitle
        sx={{
          fontSize: { xs: "1.1rem", md: "1.25rem" },
          pb: 1,
          color: "white",
          textShadow: "0 2px 4px rgba(0,0,0,0.3)",
        }}
      >
        {title}
      </DialogTitle>
      <DialogContent sx={{ py: 2, "&::-webkit-scrollbar": { width: "6px" } }}>
        <TextField
          label="Etkinlik Başlığı"
          fullWidth
          margin="normal"
          value={event.title || ""}
          onChange={(e) => setEvent((prev) => ({ ...prev, title: e.target.value }))}
          sx={{
            input: { color: "#fff" },
            label: { color: "rgba(255,255,255,0.7)" },
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "rgba(255,255,255,0.3)" },
              "&:hover fieldset": { borderColor: "rgba(255,255,255,0.5)" },
              "&.Mui-focused fieldset": { borderColor: "#2196F3" },
            },
          }}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={event.allDay ?? true}
              onChange={handleAllDayChange}
              sx={{ color: "rgba(255,255,255,0.7)", "&.Mui-checked": { color: "#2196F3" } }}
            />
          }
          label="Tüm Gün"
          sx={{ mt: 1, color: "#fff" }}
        />
        <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2, mt: 2 }}>
          <TextField
            label="Başlangıç"
            type={event.allDay ? "date" : "datetime-local"}
            InputLabelProps={{ shrink: true }}
            value={event.start?.isValid ? event.start.toFormat(event.allDay ? "yyyy-MM-dd" : "yyyy-MM-dd'T'HH:mm") : ""}
            onChange={(e) => handleDateTimeChange(e.target.value, true, title.includes("Düzenle"))}
            fullWidth
            sx={{
              input: { color: "#fff" },
              label: { color: "rgba(255,255,255,0.7)" },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: "rgba(255,255,255,0.3)" },
              },
            }}
          />
          <TextField
            label="Bitiş"
            type={event.allDay ? "date" : "datetime-local"}
            InputLabelProps={{ shrink: true }}
            value={event.end?.isValid ? event.end.toFormat(event.allDay ? "yyyy-MM-dd" : "yyyy-MM-dd'T'HH:mm") : ""}
            onChange={(e) => handleDateTimeChange(e.target.value, false, title.includes("Düzenle"))}
            fullWidth
            sx={{
              input: { color: "#fff" },
              label: { color: "rgba(255,255,255,0.7)" },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: "rgba(255,255,255,0.3)" },
              },
            }}
          />
        </Box>

        <Box sx={{ mt: 3, p: 2, border: "1px solid rgba(255,255,255,0.2)", borderRadius: 2, bgcolor: "rgba(0,0,0,0.1)" }}>
          <Typography variant="subtitle2" sx={{ color: "rgba(255,255,255,0.8)", mb: 1 }}>
            Etkinlik Rengi
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                backgroundColor: event.color,
                border: "2px solid rgba(255,255,255,0.5)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              }}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={openColorPickerCb}
              sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.3)", borderRadius: "20px" }}
            >
              Renk Değiştir
            </Button>
          </Box>
        </Box>

        <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2, mt: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)", mb: 0.5, display: "block" }}>Bildirim</Typography>
            <Select
              value={event.notification || "none"}
              onChange={(e) => setEvent((prev) => ({ ...prev, notification: e.target.value }))}
              fullWidth
              size="small"
              sx={{ color: "#fff", "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.3)" } }}
            >
              {notificationOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
          </Box>
          <Box sx={{ flex: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={event.isRecurring || false}
                  onChange={(e) => setEvent((prev) => ({ ...prev, isRecurring: e.target.checked }))}
                  sx={{ color: "rgba(255,255,255,0.7)", "&.Mui-checked": { color: "#2196F3" } }}
                />
              }
              label="Tekrarla"
              sx={{ mt: 2, color: "#fff" }}
            />
          </Box>
        </Box>

        {event.isRecurring && (
          <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2, mt: 2, p: 2, bgcolor: "rgba(255,255,255,0.05)", borderRadius: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)", mb: 0.5, display: "block" }}>Tekrar Sıklığı</Typography>
              <Select
                value={event.recurrenceType || "daily"}
                onChange={(e) => setEvent((prev) => ({ ...prev, recurrenceType: e.target.value }))}
                fullWidth
                size="small"
                sx={{ color: "#fff", "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.3)" } }}
              >
                {recurrenceOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)", mb: 0.5, display: "block" }}>Bitiş Tarihi</Typography>
              <TextField
                type="date"
                fullWidth
                size="small"
                value={event.recurrenceUntil ? event.recurrenceUntil.toFormat("yyyy-MM-dd") : ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    const dt = require("luxon").DateTime.fromISO(val).endOf("day");
                    setEvent((prev) => ({ ...prev, recurrenceUntil: dt }));
                  }
                }}
                sx={{
                  input: { color: "#fff" },
                  "& .MuiOutlinedInput-root": { "& fieldset": { borderColor: "rgba(255,255,255,0.3)" } },
                }}
              />
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        <Button onClick={onClose} sx={{ color: "#fff", borderRadius: "20px" }}>İptal</Button>
        <Button
          onClick={onSubmit}
          variant="contained"
          sx={{
            borderRadius: "20px",
            background: "linear-gradient(45deg, #2196F3 30%, #3F51B5 90%)",
            "&:hover": { transform: "scale(1.05)" },
          }}
        >
          Kaydet
        </Button>
      </DialogActions>
    </Dialog>
  );
};
