import React from "react";
import { Box } from "@mui/material";
import Lottie from "lottie-react";
import birthdayAnimation from "../assets/birthday.json";

const BirthdayCelebration = () => {
  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 1500,
      }}
    >
      <Lottie
        animationData={birthdayAnimation}
        style={{ width: 400, height: 400 }}
      />
    </Box>
  );
};

export default BirthdayCelebration;
