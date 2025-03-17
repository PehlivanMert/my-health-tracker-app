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

const DeleteFilteredDialog = ({ open, onClose, onDeleteFiltered }) => (
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
      Seçili Rutinleri Sil
      <IconButton
        onClick={onClose}
        sx={{ position: "absolute", right: 8, top: 8, color: "#fff" }}
      >
        <CloseIcon />
      </IconButton>
    </DialogTitle>
    <DialogContent>
      <Typography variant="body1">
        Seçili tarih ve kategorideki tüm rutinler silinecek! Emin misiniz?
      </Typography>
    </DialogContent>
    <DialogActions sx={{ justifyContent: "space-between", p: 3 }}>
      <Button
        onClick={onClose}
        variant="outlined"
        sx={{
          background: "#182848",
          color: "#fff",
          border: "none",
          padding: "10px 20px",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        İptal
      </Button>
      <Button
        onClick={onDeleteFiltered}
        variant="contained"
        sx={{
          background: "#4b6cb7",
          color: "#fff",
          border: "none",
          padding: "10px 20px",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        Sil
      </Button>
    </DialogActions>
  </Dialog>
);

export default DeleteFilteredDialog;
