import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  IconButton,
  Typography,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { styled, alpha } from "@mui/material/styles";

// Modern başlık stili
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
    textShadow: "0px 2px 4px rgba(0,0,0,0.2)",
  },
}));

// Modern içerik stili
const StyledDialogContent = styled(DialogContent)(({ theme }) => ({
  padding: theme.spacing(3),
  background: alpha("#f8f9fa", 0.95),
}));

// Modern buton stili
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

// Güncellenmiş Supplement Dialog bileşeni
const SupplementDialog = ({
  openSupplementDialog,
  onClose,
  editingSupplement,
  supplementForm,
  setSupplementForm,
  setOpenSupplementDialog,
  setEditingSupplement,
  handleSaveSupplement,
}) => {
  return (
    <Dialog
      open={openSupplementDialog}
      onClose={() => {
        setOpenSupplementDialog(false);
        setEditingSupplement(null);
      }}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          background: alpha("#f8f9fa", 0.95),
          backdropFilter: "blur(10px)",
          borderRadius: 4,
          boxShadow:
            "0 50px 100px rgba(0,0,0,0.25), 0 30px 60px rgba(0,0,0,0.22)",
          padding: 0,
        },
      }}
    >
      <StyledDialogTitle component="div">
        <Typography variant="h6" component="span">
          {editingSupplement ? "Takviye Düzenle" : "Yeni Takviye Ekle"}
        </Typography>
        <IconButton
          onClick={() => {
            setOpenSupplementDialog(false);
            setEditingSupplement(null);
          }}
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
      </StyledDialogTitle>
      <StyledDialogContent dividers>
        <TextField
          autoFocus
          margin="dense"
          label="Takviye Adı"
          fullWidth
          value={supplementForm.name}
          onChange={(e) =>
            setSupplementForm({ ...supplementForm, name: e.target.value })
          }
          sx={{ mb: 2 }}
        />
        <TextField
          margin="dense"
          label="Miktar"
          type="number"
          fullWidth
          value={supplementForm.quantity}
          onChange={(e) =>
            setSupplementForm({
              ...supplementForm,
              quantity: Number(e.target.value),
            })
          }
          sx={{ mb: 2 }}
        />
        <TextField
          margin="dense"
          label="Günlük Kullanım Miktarı"
          type="number"
          fullWidth
          value={supplementForm.dailyUsage}
          onChange={(e) =>
            setSupplementForm({
              ...supplementForm,
              dailyUsage: Number(e.target.value),
            })
          }
        />
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
          onClick={handleSaveSupplement}
          variant="contained"
          color="primary"
          sx={{
            background: "linear-gradient(135deg, #4b6cb7 0%, #182848 100%)",
            position: "relative",
            overflow: "hidden",
            ml: "auto", // Bu satır butonu sağa iter
          }}
        >
          {editingSupplement ? "Güncelle" : "Ekle"}
        </ActionButton>
      </DialogActions>
    </Dialog>
  );
};

export default SupplementDialog;
