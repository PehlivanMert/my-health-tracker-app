import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  IconButton,
  Typography,
  Button,
  Alert,
  InputAdornment,
  FormHelperText,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { styled, alpha } from "@mui/material/styles";

// Modern başlık stili
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
    textShadow: "0px 2px 4px rgba(0,0,0,0.2)",
  },
}));

// Modern içerik stili
const StyledDialogContent = styled(DialogContent)(({ theme }) => ({
  padding: { xs: theme.spacing(2), sm: theme.spacing(3) },
  background: alpha("#f8f9fa", 0.95),
}));

// Modern buton stili
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
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Local state for input fields to prevent immediate updates
  const [localQuantity, setLocalQuantity] = useState("");
  const [localDailyUsage, setLocalDailyUsage] = useState("");

  const validateForm = () => {
    const newErrors = {};

    // Takviye adı kontrolü
    if (!supplementForm.name.trim()) {
      newErrors.name = "Takviye adı gereklidir";
    } else if (supplementForm.name.trim().length < 2) {
      newErrors.name = "Takviye adı en az 2 karakter olmalıdır";
    }

    // Miktar kontrolü
    if (supplementForm.quantity <= 0) {
      newErrors.quantity = "Miktar 0'dan büyük olmalıdır";
    } else if (supplementForm.quantity > 10000) {
      newErrors.quantity = "Miktar çok yüksek";
    }

    // Günlük kullanım kontrolü
    if (supplementForm.dailyUsage <= 0) {
      newErrors.dailyUsage = "Günlük kullanım 0'dan büyük olmalıdır";
    } else if (supplementForm.dailyUsage > supplementForm.quantity) {
      newErrors.dailyUsage = "Günlük kullanım toplam miktardan fazla olamaz";
    } else if (supplementForm.dailyUsage > 50) {
      newErrors.dailyUsage = "Günlük kullanım çok yüksek";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await handleSaveSupplement();
      setErrors({});
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
      console.error("Takviye kaydetme hatası:", error);
      }
      setErrors({ submit: "Takviye kaydedilirken bir hata oluştu" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setSupplementForm({ ...supplementForm, [field]: value });
    // Hata mesajını temizle
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  // Initialize local state when dialog opens or supplementForm changes
  useEffect(() => {
    if (openSupplementDialog) {
      setLocalQuantity(String(supplementForm.quantity || ""));
      setLocalDailyUsage(String(supplementForm.dailyUsage || ""));
    }
  }, [openSupplementDialog, supplementForm.quantity, supplementForm.dailyUsage]);

  // Handle quantity input changes
  const handleQuantityChange = (value) => {
    setLocalQuantity(value);
  };

  const handleQuantityBlur = () => {
    const numValue = Number(localQuantity);
    if (!isNaN(numValue) && numValue > 0) {
      handleInputChange("quantity", numValue);
    } else {
      // Reset to current value if invalid
      setLocalQuantity(String(supplementForm.quantity || ""));
    }
  };

  // Handle daily usage input changes
  const handleDailyUsageChange = (value) => {
    setLocalDailyUsage(value);
  };

  const handleDailyUsageBlur = () => {
    const numValue = Number(localDailyUsage);
    if (!isNaN(numValue) && numValue > 0) {
      handleInputChange("dailyUsage", numValue);
    } else {
      // Reset to current value if invalid
      setLocalDailyUsage(String(supplementForm.dailyUsage || ""));
    }
  };

  return (
    <Dialog
      open={openSupplementDialog}
      onClose={() => {
        setOpenSupplementDialog(false);
        setEditingSupplement(null);
        setErrors({});
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
          maxWidth: { xs: "95vw", sm: "600px" },
          width: { xs: "95vw", sm: "auto" },
          margin: "auto",
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
            setErrors({});
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
        {errors.submit && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errors.submit}
          </Alert>
        )}
        
        <TextField
          autoFocus
          margin="dense"
          label="Takviye Adı"
          fullWidth
          value={supplementForm.name}
          onChange={(e) => handleInputChange("name", e.target.value)}
          error={!!errors.name}
          helperText={errors.name}
          placeholder="Örn: Vitamin D3, Omega-3, Protein Tozu"
          sx={{ mb: 2 }}
        />
        
        <TextField
          margin="dense"
          label="Toplam Miktar"
          type="number"
          fullWidth
          value={localQuantity}
          onChange={(e) => handleQuantityChange(e.target.value)}
          onBlur={handleQuantityBlur}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleQuantityBlur();
            }
          }}
          error={!!errors.quantity}
          helperText={errors.quantity || "Toplam adet sayısı"}
          InputProps={{
            endAdornment: <InputAdornment position="end">adet</InputAdornment>,
          }}
          inputProps={{ min: 1, max: 10000 }}
          sx={{ mb: 2 }}
        />
        
        <TextField
          margin="dense"
          label="Günlük Kullanım Miktarı"
          type="number"
          fullWidth
          value={localDailyUsage}
          onChange={(e) => handleDailyUsageChange(e.target.value)}
          onBlur={handleDailyUsageBlur}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleDailyUsageBlur();
            }
          }}
          error={!!errors.dailyUsage}
          helperText={errors.dailyUsage || "Günde kaç adet alacağınız"}
          InputProps={{
            endAdornment: <InputAdornment position="end">adet/gün</InputAdornment>,
          }}
          inputProps={{ min: 1, max: 50 }}
        />
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
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={isSubmitting}
          sx={{
            background: "linear-gradient(135deg, #4b6cb7 0%, #182848 100%)",
            position: "relative",
            overflow: "hidden",
            ml: "auto",
          }}
        >
          {isSubmitting ? "Kaydediliyor..." : (editingSupplement ? "Güncelle" : "Ekle")}
        </ActionButton>
      </DialogActions>
    </Dialog>
  );
};

export default SupplementDialog;
