import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, FormControl, RadioGroup, FormControlLabel, Radio } from "@mui/material";

const ModernDeleteDialog = ({
  open,
  onClose,
  routine,
  onConfirm,
  isFiltered = false,
}) => {
  const [deleteOption, setDeleteOption] = React.useState("this");

  if (!routine) return null;

  const isRepeating = routine.repeat && routine.repeat !== "none";

  const handleConfirm = () => {
    onConfirm(deleteOption);
    setDeleteOption("this"); // Reset
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: "24px",
          padding: "16px",
          background: "rgba(255, 255, 255, 0.8)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 700, color: "#1e293b", textAlign: "center" }}>
        Rutini Sil
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <Typography sx={{ color: "#475569", mb: 3, textAlign: "center" }}>
          "{routine.title}" rutinini silmek istediğinize emin misiniz?
        </Typography>

        {isRepeating && !isFiltered && (
          <FormControl component="fieldset" sx={{ width: "100%", mt: 2 }}>
            <RadioGroup value={deleteOption} onChange={(e) => setDeleteOption(e.target.value)}>
              <FormControlLabel
                value="this"
                control={<Radio sx={{ color: "#3b82f6", "&.Mui-checked": { color: "#2563eb" } }} />}
                label="Sadece bugünkü tekrarı sil"
              />
              <FormControlLabel
                value="all"
                control={<Radio sx={{ color: "#ef4444", "&.Mui-checked": { color: "#dc2626" } }} />}
                label="Tüm tekrarları kalıcı olarak sil"
              />
            </RadioGroup>
          </FormControl>
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: "center", pb: 2, gap: 2 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            borderRadius: "12px",
            color: "#64748b",
            borderColor: "#cbd5e1",
            textTransform: "none",
            "&:hover": { backgroundColor: "#f1f5f9", borderColor: "#94a3b8" },
          }}
        >
          İptal
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          sx={{
            borderRadius: "12px",
            backgroundColor: "#ef4444",
            color: "white",
            textTransform: "none",
            "&:hover": { backgroundColor: "#dc2626" },
          }}
        >
          Sil
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ModernDeleteDialog;
