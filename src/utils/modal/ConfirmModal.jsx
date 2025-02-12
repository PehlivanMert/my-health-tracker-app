import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import React from "react";

const ConfirmModal = ({ open, onClose, onConfirm }) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>Tekrarlayan Etkinlik</DialogTitle>
    <DialogContent>
      <Typography>Bu etkinlik bir serinin parçası:</Typography>
      <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end", gap: 2 }}>
        <Button onClick={() => onConfirm(false)} variant="outlined">
          Sadece Bunu Sil
        </Button>
        <Button
          onClick={() => onConfirm(true)}
          variant="contained"
          color="error"
        >
          Tümünü Sil
        </Button>
      </Box>
    </DialogContent>
  </Dialog>
);

export default ConfirmModal;
