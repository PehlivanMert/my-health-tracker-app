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

const DeleteRepeatingDialog = ({ open, onClose, onDeleteChoice }) => {
  return (
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
        Tekrarlı Rutin Sil
        <IconButton
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8, color: "#fff" }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1">
          Bu tekrarlı rutinin tüm tekrarlarını mı silmek istiyorsunuz yoksa
          sadece seçilen occurrence'ı mı?
        </Typography>
      </DialogContent>
      <DialogActions sx={{ justifyContent: "space-between", p: 3 }}>
        <Button
          onClick={() => onDeleteChoice(false)}
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
          Sadece Seçilen
        </Button>
        <Button
          onClick={() => onDeleteChoice(true)}
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
          Tümünü Sil
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteRepeatingDialog;
