import React from "react";
import { Dialog, DialogTitle, DialogContent, Box, Button, Typography } from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";

export const CalendarEventDetails = ({
  open,
  onClose,
  selectedEvent,
  onEdit,
  onDelete,
}) => {
  if (!selectedEvent) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      disableEnforceFocus
      PaperProps={{
        sx: {
          background: "rgba(33, 150, 243, 0.15)",
          backdropFilter: "blur(12px)",
          borderRadius: "24px",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          boxShadow: "0 8px 32px rgba(33, 150, 243, 0.2)",
          color: "#fff",
          p: 2,
          maxWidth: { xs: "95vw", sm: "400px" },
          width: { xs: "95vw", sm: "auto" },
          margin: "auto",
        },
      }}
    >
      <DialogTitle
        sx={{
          fontSize: { xs: "1.1rem", md: "1.25rem" },
          pb: 1,
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        Etkinlik Detayları
      </DialogTitle>
      <DialogContent sx={{ py: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: "1rem", md: "1.25rem" }, color: selectedEvent.color || "#fff" }}>
          {selectedEvent.title}
        </Typography>
        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)", mb: 1 }}>
          <strong>Başlangıç:</strong> {selectedEvent.start?.toFormat("dd.MM.yyyy HH:mm") || "-"}
        </Typography>
        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)", mb: 1 }}>
          <strong>Bitiş:</strong> {selectedEvent.end?.toFormat("dd.MM.yyyy HH:mm") || "-"}
        </Typography>
        
        {selectedEvent.isRecurring && (
          <Box sx={{ mt: 2, p: 1, bgcolor: "rgba(255,255,255,0.1)", borderRadius: 1 }}>
            <Typography variant="caption" sx={{ color: "#2196F3", fontWeight: "bold" }}>
              Tekrarlanan Etkinlik ({selectedEvent.recurrenceType})
            </Typography>
          </Box>
        )}
      </DialogContent>
      <Box
        sx={{
          mt: 1,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          gap: 1,
          borderTop: "1px solid rgba(255,255,255,0.1)",
          pt: 2,
        }}
      >
        <Button
          variant="contained"
          startIcon={<Edit />}
          onClick={onEdit}
          fullWidth
          sx={{
            background: "linear-gradient(45deg, #2196F3 30%, #3F51B5 90%)",
            borderRadius: "20px",
          }}
        >
          Düzenle
        </Button>
        <Button
          color="error"
          variant="outlined"
          startIcon={<Delete />}
          onClick={() => onDelete(selectedEvent.id)}
          fullWidth
          sx={{ borderRadius: "20px" }}
        >
          Sil
        </Button>
      </Box>
    </Dialog>
  );
};
