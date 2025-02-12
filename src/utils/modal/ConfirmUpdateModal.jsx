import React, { useState } from "react";
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
} from "@mui/material";

const ConfirmUpdateModal = ({ isOpen, onClose, onConfirm }) => {
  const [updateAll, setUpdateAll] = useState(false);

  const handleConfirm = () => {
    onConfirm(updateAll);
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle>Güncelleme Seçeneği</DialogTitle>
      <DialogContent>
        <p>
          Yalnızca bu etkinliği mi güncellemek istersiniz, yoksa tüm tekrarlı
          etkinlikleri mi?
        </p>
        <FormControl fullWidth>
          <InputLabel id="update-option-label">Güncelleme Seçeneği</InputLabel>
          <Select
            labelId="update-option-label"
            value={updateAll}
            onChange={(e) => setUpdateAll(e.target.value)}
            label="Güncelleme Seçeneği"
          >
            <MenuItem value={false}>Sadece Bu Etkinlik</MenuItem>
            <MenuItem value={true}>Tüm Etkinlikler</MenuItem>
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>İptal</Button>
        <Button onClick={handleConfirm} variant="contained" color="primary">
          Onayla
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmUpdateModal;
