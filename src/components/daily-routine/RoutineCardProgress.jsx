import React from "react";
import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

const ProgressBarContainer = styled(Box)(({ theme }) => ({
  width: "100%",
  height: 4, // Daha ince bir çizgi şeklinde
  backgroundColor: "rgba(255, 255, 255, 0.15)", // Şeffaf beyaz arka plan
  borderRadius: 2,
  overflow: "hidden",
  position: "absolute",
  bottom: 0, // Kartın altına sabitlenecek
  left: 0,
  right: 0,
  [theme.breakpoints.down("sm")]: {
    height: 3, // Mobil cihazlarda daha ince gösterim
  },
}));

const ProgressFiller = styled(Box)(({ progress, color }) => ({
  height: "100%",
  width: `${progress}%`,
  background: `linear-gradient(90deg, ${color} 0%, ${color}dd 100%)`, // Daha parlak ve şık geçişli renk
  transition: "width 0.5s ease-in-out",
}));

const RoutineCardProgress = ({ progress, cardColor }) => {
  return (
    <ProgressBarContainer>
      <ProgressFiller progress={progress} color={cardColor} />
    </ProgressBarContainer>
  );
};

export default RoutineCardProgress;
