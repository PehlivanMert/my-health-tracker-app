// src/components/daily-routine/DeleteDialog.jsx
import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";

const DeleteDialog = ({ open, onClose, onDeleteAll }) => (
  <Dialog
    open={open}
    onClose={onClose}
    fullWidth
    maxWidth="sm"
    PaperProps={{
      sx: {
        background: "rgba(255,255,255,0.9)",
        backdropFilter: "blur(10px)",
        borderRadius: 4,
        p: 0,
      },
    }}
  >
    <DialogTitle
      sx={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#182848",
        color: "#fff",
      }}
    >
      Tüm Rutinleri Sil
      <IconButton
        onClick={onClose}
        sx={{ position: "absolute", right: 8, top: 8, color: "#fff" }}
      >
        <CloseIcon />
      </IconButton>
    </DialogTitle>
    <DialogContent>
      <Typography variant="body1">
        Tüm rutinler silinecek! Emin misiniz?
      </Typography>
    </DialogContent>
    <DialogActions sx={{ justifyContent: "space-between", p: 3 }}>
      <button
        onClick={onClose}
        style={{
          background: "#182848",
          color: "#fff",
          border: "none",
          padding: "10px 20px",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        İptal
      </button>
      <button
        onClick={onDeleteAll}
        style={{
          background: "#4b6cb7",
          color: "#fff",
          border: "none",
          padding: "10px 20px",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        Sil
      </button>
    </DialogActions>
  </Dialog>
);

export default DeleteDialog;
