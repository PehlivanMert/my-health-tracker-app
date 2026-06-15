import React from "react";
import { Dialog, DialogTitle, DialogContent, Chip, useTheme, useMediaQuery } from "@mui/material";

export const CalendarColorPicker = ({
  container,
  open,
  onClose,
  onColorSelect,
  colors,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Dialog
      container={container}
      open={open}
      onClose={onClose}
      disableEnforceFocus
      PaperProps={{
        sx: {
          zIndex: 99999,
          background: "rgba(33, 150, 243, 0.15)",
          backdropFilter: "blur(12px)",
          borderRadius: "24px",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          boxShadow: "0 8px 32px rgba(33, 150, 243, 0.2)",
          color: "#fff",
          p: 2,
          maxWidth: { xs: "95vw", sm: 400 },
          width: { xs: "95vw", sm: "auto" },
          maxHeight: { xs: "80vh", sm: "70vh" },
          margin: "auto",
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        },
      }}
      sx={{
        "& .MuiDialog-paper": {
          margin: 0,
        },
      }}
    >
      <DialogTitle
        sx={{
          fontSize: { xs: "1rem", md: "1.25rem" },
          flexShrink: 0,
          pb: 1,
          color: "white",
          textShadow: "0 2px 4px rgba(0,0,0,0.3)",
        }}
      >
        Renk Seç
      </DialogTitle>
      <DialogContent
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: { xs: 1, sm: 2 },
          maxWidth: { xs: "90vw", sm: 400 },
          maxHeight: { xs: "60vh", sm: 300 },
          overflowY: "auto",
          overflowX: "hidden",
          flex: 1,
          "&::-webkit-scrollbar": {
            width: "6px",
          },
          "&::-webkit-scrollbar-track": {
            background: "rgba(255,255,255,0.1)",
            borderRadius: "3px",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "rgba(255,255,255,0.3)",
            borderRadius: "3px",
            "&:hover": {
              background: "rgba(255,255,255,0.5)",
            },
          },
        }}
      >
        {Object.entries(colors).map(([name, color]) => (
          <Chip
            key={name}
            label={name}
            sx={{
              bgcolor: color,
              color: "#fff",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: { xs: "0.7rem", md: "0.75rem" },
              height: { xs: "2rem", md: "2.5rem" },
              minWidth: { xs: "calc(50% - 4px)", sm: "auto" },
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              border: "1px solid rgba(255,255,255,0.2)",
              "&:hover": {
                opacity: 0.9,
                transform: "scale(1.05)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              },
            }}
            onClick={() => {
              onColorSelect(color);
              onClose();
            }}
          />
        ))}
      </DialogContent>
    </Dialog>
  );
};
