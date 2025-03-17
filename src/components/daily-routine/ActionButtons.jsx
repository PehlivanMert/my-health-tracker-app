import React from "react";
import Grid from "@mui/material/Grid";
import { Box, Typography, useTheme, useMediaQuery } from "@mui/material";
import {
  DoneAll,
  HighlightOff,
  DeleteSweep,
  CheckCircleOutlined,
  CancelOutlined,
  DeleteOutlined,
} from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import { motion } from "framer-motion";

const NeonButton = styled(motion.button)(({ theme, buttoncolor }) => ({
  background: "rgba(255, 255, 255, 0.03)",
  backdropFilter: "blur(10px)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: "16px",
  padding: "14px 24px",
  cursor: "pointer",
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  overflow: "hidden",
  textTransform: "none",
  fontWeight: 500,
  fontSize: "1rem",
  color: "#fff",
  transition: "all 0.35s cubic-bezier(0.23, 1, 0.32, 1)",
  boxShadow: `0 8px 20px ${buttoncolor}22`,
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `linear-gradient(135deg, ${buttoncolor} 0%, ${buttoncolor}99 100%)`,
    opacity: 0,
    transition: "opacity 0.35s ease",
    zIndex: 0,
  },
  "&::after": {
    content: '""',
    position: "absolute",
    top: "2px",
    left: "2px",
    right: "2px",
    height: "50%",
    background:
      "linear-gradient(to bottom, rgba(255,255,255,0.1), rgba(255,255,255,0))",
    borderRadius: "14px 14px 50% 50%",
    pointerEvents: "none",
    zIndex: 1,
  },
  "&:hover": {
    transform: "translateY(-5px)",
    boxShadow: `0 15px 25px ${buttoncolor}44`,
    "& .button-bg": {
      opacity: 1,
    },
    "&::before": {
      opacity: 1,
    },
  },
  "&:active": {
    transform: "translateY(0)",
    boxShadow: `0 8px 15px ${buttoncolor}33`,
  },
}));

const IconWrapper = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginRight: "14px",
  borderRadius: "50%",
  zIndex: 2,
  background: "rgba(255,255,255,0.15)",
  padding: "8px",
  transition: "all 0.3s ease",
}));

const buttonVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.15,
      duration: 0.5,
      ease: [0.215, 0.61, 0.355, 1],
    },
  }),
};

const ActionButtons = ({ onSelectAll, onUnselectAll, onDeleteAll }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isMedium = useMediaQuery(theme.breakpoints.down("md"));

  const buttons = [
    {
      label: "Tümünü İşaretle",
      onClick: onSelectAll,
      icon: <DoneAll />,
      hoverIcon: <CheckCircleOutlined />,
      color: "#4CAF50",
      description: "Tüm öğeleri tamamlandı olarak işaretler",
    },
    {
      label: "İşaretleri Kaldır",
      onClick: onUnselectAll,
      icon: <HighlightOff />,
      hoverIcon: <CancelOutlined />,
      color: "#2196F3",
      description: "Tüm öğelerden tamamlandı işaretini kaldırır",
    },
    {
      label: "Tümünü Sil",
      onClick: onDeleteAll,
      icon: <DeleteSweep />,
      hoverIcon: <DeleteOutlined />,
      color: "#FF5252",
      description: "Tüm öğeleri kalıcı olarak siler",
    },
  ];

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      sx={{
        mt: 3,
        mb: 2,
        mx: "auto",
        maxWidth: "100%",
        width: "100%",
      }}
    >
      <Grid
        container
        spacing={isMobile ? 2 : 3}
        sx={{
          display: "flex",
          alignItems: "stretch",
        }}
      >
        {buttons.map((button, index) => (
          <Grid item xs={12} sm={isMedium ? 12 : 4} key={index}>
            <NeonButton
              component={motion.button}
              variants={buttonVariants}
              initial="hidden"
              animate="visible"
              custom={index}
              whileHover={{
                scale: 1.03,
                transition: { duration: 0.2 },
              }}
              whileTap={{
                scale: 0.97,
                transition: { duration: 0.1 },
              }}
              buttoncolor={button.color}
              onClick={button.onClick}
            >
              <Box className="button-bg" sx={{ zIndex: 1 }} />
              <IconWrapper
                component={motion.div}
                initial={{ scale: 1 }}
                whileHover={{
                  scale: 1.15,
                  rotate: [0, -10, 10, -5, 0],
                  transition: { duration: 0.4 },
                }}
              >
                {button.icon}
              </IconWrapper>
              <Box sx={{ zIndex: 2 }}>
                <Typography
                  variant="button"
                  component="span"
                  sx={{
                    fontWeight: 600,
                    fontSize: isMobile ? "0.9rem" : "1rem",
                    letterSpacing: "0.5px",
                  }}
                >
                  {button.label}
                </Typography>
                {!isMobile && (
                  <Typography
                    variant="caption"
                    component={motion.div}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 0.7, height: "auto" }}
                    transition={{ delay: 0.5 + index * 0.1, duration: 0.3 }}
                    sx={{
                      display: "block",
                      mt: 0.5,
                      opacity: 0.7,
                      fontSize: "0.75rem",
                      fontWeight: 400,
                    }}
                  >
                    {button.description}
                  </Typography>
                )}
              </Box>
              <Box
                component={motion.div}
                initial={{ opacity: 0, scale: 0 }}
                whileHover={{
                  opacity: [0, 0.5, 0],
                  scale: [0, 1.5, 3],
                  transition: { duration: 1.5, repeat: Infinity },
                }}
                sx={{
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                  background: `radial-gradient(circle, ${button.color}66 0%, transparent 70%)`,
                  zIndex: 0,
                }}
              />
            </NeonButton>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ActionButtons;
