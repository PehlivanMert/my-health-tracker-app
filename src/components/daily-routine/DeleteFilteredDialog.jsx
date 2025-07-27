import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { alpha } from "@mui/material/styles";
import { styled } from "@mui/material/styles";

const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  background: "linear-gradient(135deg, #1a2a6c 0%, #2196F3 50%, #3F51B5 100%)",
  color: "#ffffff",
  textAlign: "center",
  fontWeight: 600,
  textShadow: "0 2px 4px rgba(0,0,0,0.3)",
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px 24px",
  "& .MuiIconButton-root": {
    position: "absolute",
    right: 8,
    top: 8,
    color: "#ffffff",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    backdropFilter: "blur(10px)",
    transition: "all 0.3s ease",
    "&:hover": {
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      transform: "scale(1.05)",
      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    },
  },
}));

const StyledDialogContent = styled(DialogContent)(({ theme }) => ({
  background: "linear-gradient(135deg, rgba(248, 249, 250, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)",
  backdropFilter: "blur(20px)",
  padding: "24px",
  "& .MuiTypography-root": {
    color: "#2c3e50",
    fontSize: "16px",
    lineHeight: 1.6,
    textAlign: "center",
  },
  "&::-webkit-scrollbar": {
    width: "8px",
  },
  "&::-webkit-scrollbar-track": {
    background: "rgba(0, 0, 0, 0.1)",
    borderRadius: "4px",
  },
  "&::-webkit-scrollbar-thumb": {
    background: "linear-gradient(135deg, #2196F3, #3F51B5)",
    borderRadius: "4px",
  },
}));

const ActionButton = styled(Button)(({ theme, variant }) => ({
  background: variant === "delete" 
    ? "linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)"
    : "linear-gradient(135deg, #2196F3 0%, #3F51B5 100%)",
  color: "#ffffff",
  fontWeight: 600,
  padding: "12px 24px",
  borderRadius: "12px",
  border: "none",
  boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
  transition: "all 0.3s ease",
  textTransform: "none",
  fontSize: "14px",
  "&:hover": {
    background: variant === "delete"
      ? "linear-gradient(135deg, #c0392b 0%, #a93226 100%)"
      : "linear-gradient(135deg, #1976d2 0%, #303f9f 100%)",
    transform: "translateY(-2px)",
    boxShadow: "0 6px 20px rgba(0, 0, 0, 0.3)",
  },
}));

const DeleteFilteredDialog = ({ open, onClose, onDeleteFiltered }) => (
  <Dialog
    open={open}
    onClose={onClose}
    fullWidth
    maxWidth="sm"
    PaperProps={{
      sx: {
        background: alpha("#f8f9fa", 0.95),
        backgroundImage: 'url(\'data:image/svg+xml,%3Csvg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z" fill="%232196f3" fill-opacity="0.05" fill-rule="evenodd"/%3E%3C/svg%3E\')',
        backdropFilter: "blur(20px)",
        borderRadius: "24px",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
        overflow: "hidden",
      },
    }}
  >
    <StyledDialogTitle>
      Seçili Rutinleri Sil
      <IconButton onClick={onClose}>
        <CloseIcon />
      </IconButton>
    </StyledDialogTitle>
    <StyledDialogContent>
      <Typography variant="body1">
        Seçili tarih ve kategorideki tüm rutinler silinecek! Emin misiniz?
      </Typography>
    </StyledDialogContent>
    <DialogActions sx={{ 
      justifyContent: "space-between", 
      padding: "20px 24px",
      background: "linear-gradient(135deg, rgba(248, 249, 250, 0.8) 0%, rgba(255, 255, 255, 0.6) 100%)",
      borderTop: "1px solid rgba(255, 255, 255, 0.2)",
      backdropFilter: "blur(10px)",
    }}>
      <ActionButton onClick={onClose}>
        İptal
      </ActionButton>
      <ActionButton variant="delete" onClick={onDeleteFiltered}>
        Sil
      </ActionButton>
    </DialogActions>
  </Dialog>
);

export default DeleteFilteredDialog;
