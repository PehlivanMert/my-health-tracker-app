// src/components/daily-routine/RoutineHeader.jsx
import React, { useState } from "react";
import { Box, Typography, Button, Dialog, DialogContent } from "@mui/material";
import { AccessTime, Add, Timer } from "@mui/icons-material";
import AdvancedTimer from "./AdvancedTimer";

const RoutineHeader = ({ onNewRoutine, user }) => {
  // user prop'u eklendi
  const [openTimer, setOpenTimer] = useState(false);

  const handleOpenTimer = () => setOpenTimer(true);
  const handleCloseTimer = () => setOpenTimer(false);

  return (
    <Box>
      <Typography
        variant="h2"
        sx={{
          textAlign: "center",
          color: "#fff",
          fontWeight: 800,
          mb: 6,
          textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
        }}
      >
        <AccessTime sx={{ fontSize: 50, verticalAlign: "middle", mr: 2 }} />
        Günlük Rutinler
      </Typography>
      <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
        <Button
          fullWidth
          onClick={onNewRoutine}
          startIcon={<Add />}
          sx={{ color: "#fff" }}
        >
          Yeni Rutin Ekle
        </Button>
        <Button
          fullWidth
          onClick={handleOpenTimer}
          startIcon={<Timer />}
          sx={{ color: "#fff" }}
        >
          Sayaç
        </Button>
      </Box>
      <Dialog
        open={openTimer}
        onClose={handleCloseTimer}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            backgroundColor: "transparent", // Arka planı şeffaf yapar
            boxShadow: "none", // Gölgeyi kaldırır
            border: "none", // Kenarlığı kaldırır
            overflow: "hidden", // İçeriğin taşmasını engeller
          },
        }}
        BackdropProps={{
          sx: {
            backgroundColor: "rgba(0, 0, 0, 0.5)", // Koyu arka plan, opaklığı artırıldı
            backdropFilter: "blur(15px)", // Blur değeri artırıldı
          },
        }}
      >
        <DialogContent sx={{ p: 0, backgroundColor: "transparent" }}>
          <AdvancedTimer user={user} />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default RoutineHeader;
