import React, { useState, useEffect } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";

const EditEventModal = React.memo(
  ({ isOpen, onClose, event, onSave }) => {
    const [localEvent, setLocalEvent] = useState(event);

    // Update local state when event prop changes
    useEffect(() => {
      setLocalEvent(event);
    }, [event]);

    if (!isOpen || !event) return null;

    const handleChange = (field, value) => {
      setLocalEvent((prev) => ({
        ...prev,
        [field]: value,
        extendedProps: {
          ...prev.extendedProps,
          // Eğer field notify ise extendedProps içinde güncelle
          ...(field === "notify" && { notify: value }),
        },
      }));
    };

    const handleSave = () => {
      onSave(localEvent);
      onClose();
    };

    return (
      <Dialog
        open={isOpen}
        onClose={onClose}
        onClick={(e) => e.stopPropagation()}
        sx={{
          "& .MuiDialog-paper": {
            minWidth: "320px",
            maxWidth: "500px",
            width: "100%",
          },
          "& .MuiBackdrop-root": {
            zIndex: -1,
          },
        }}
      >
        <DialogTitle>Etkinliği Düzenle</DialogTitle>
        <DialogContent sx={{ overflow: "visible", p: 2 }}>
          {/* Başlık */}
          <TextField
            id="event-title"
            name="event-title"
            label="Etkinlik Başlığı"
            value={localEvent.title}
            onChange={(e) => handleChange("title", e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />

          {/* Tarih ve Saat Seçimi */}
          <TextField
            id="event-startTime"
            name="event-startTime"
            label="Başlangıç Saati"
            type="time"
            value={localEvent.startTime}
            onChange={(e) => handleChange("startTime", e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            id="event-endTime"
            name="event-endTime"
            label="Bitiş Saati"
            type="time"
            value={localEvent.endTime}
            onChange={(e) => handleChange("endTime", e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
            InputLabelProps={{ shrink: true }}
          />

          {/* Hatırlatma Seçimi */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="event-notify-label">Hatırlatma</InputLabel>
            <Select
              labelId="event-notify-label"
              id="event-notify"
              name="event-notify"
              value={localEvent.notify}
              onChange={(e) => handleChange("notify", e.target.value)}
              label="Hatırlatma"
            >
              <MenuItem value="none">Hatırlatma Yok</MenuItem>
              <MenuItem value="15-minutes">15 Dakika Önce</MenuItem>
              <MenuItem value="1-hour">1 Saat Önce</MenuItem>
              <MenuItem value="1-day">1 Gün Önce</MenuItem>
              <MenuItem value="on-time">Vaktinde</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose}>İptal</Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.isOpen === nextProps.isOpen &&
      prevProps.event?.id === nextProps.event?.id &&
      JSON.stringify(prevProps.event) === JSON.stringify(nextProps.event)
    );
  }
);

export default EditEventModal;
