import React, { useState, useEffect } from "react";
import { Box } from "@mui/material";
import Lottie from "lottie-react";
import birthdayAnimation from "../assets/birthday.json";

const BirthdayCelebration = () => {
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    // Set a timeout to show the animation after 5 seconds
    const timer = setTimeout(() => {
      setShowAnimation(true);
    }, 5000); // 5000 milliseconds = 5 seconds

    // Clean up the timer when the component unmounts
    return () => clearTimeout(timer);
  }, []); // Empty dependency array means this effect runs once when component mounts

  // Only render the animation if showAnimation is true
  if (!showAnimation) {
    return null;
  }

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
