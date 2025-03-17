// src/components/daily-routine/RoutineHeader.jsx
import React from "react";
import { Box, Typography, Button } from "@mui/material";
import { AccessTime, Add } from "@mui/icons-material";

const RoutineHeader = ({ onNewRoutine }) => (
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
    <Button
      fullWidth
      onClick={onNewRoutine}
      startIcon={<Add />}
      sx={{ mb: 3, color: "#fff" }}
    >
      Yeni Rutin Ekle
    </Button>
  </Box>
);

export default RoutineHeader;
