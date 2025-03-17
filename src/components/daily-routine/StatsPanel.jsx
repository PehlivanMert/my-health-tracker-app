// src/components/daily-routine/StatsPanel.jsx
import React from "react";
import { Grid, Box, Typography, useTheme, useMediaQuery } from "@mui/material";
import {
  DoneAll,
  CheckCircleOutline,
  NotificationsActive,
} from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import { motion } from "framer-motion";

// Modern glassmorphism kart bileşeni
const GlowingCard = styled(motion.div)(({ theme, glowcolor }) => ({
  position: "relative",
  background: "rgba(255, 255, 255, 0.05)",
  backdropFilter: "blur(16px)",
  borderRadius: "24px",
  overflow: "hidden",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  boxShadow: `0 10px 30px ${glowcolor}22, inset 0 0 20px rgba(255, 255, 255, 0.05)`,
  padding: theme.spacing(3),
  height: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "4px",
    background: `linear-gradient(90deg, transparent, ${glowcolor}, transparent)`,
    opacity: 0.7,
  },
}));

// Modern neon gradient progress ring
const ProgressRing = styled(Box)(({ theme, progress, color }) => ({
  position: "relative",
  width: "100%",
  height: "100%",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  "&::before": {
    content: '""',
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    padding: "4px",
    background: `conic-gradient(${color} ${progress}%, transparent ${progress}%)`,
    WebkitMask:
      "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
    WebkitMaskComposite: "xor",
    maskComposite: "exclude",
  },
}));

// İç icon container
const IconContainer = styled(Box)(({ theme, color }) => ({
  width: "65%",
  height: "65%",
  borderRadius: "50%",
  background: `linear-gradient(135deg, ${color}bb 0%, ${color}55 100%)`,
  backdropFilter: "blur(5px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: `0 8px 32px ${color}66`,
}));

const StatsPanel = ({ routines, weeklyStats, monthlyStats }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isMedium = useMediaQuery(theme.breakpoints.down("md"));

  // Mobilde kartları yan yana göstermek için grid xs değeri
  const gridXS = isMobile ? 4 : 12;

  // Günlük başarı: non-repeating rutinlerde "completed" alanına göre,
  // tüm rutin sayısı ise routines.length (tekrarlı rutinler her occurrence bağımsız).
  const dailyCompleted = routines.filter(
    (r) => r.repeat === "none" && r.completed
  ).length;
  const dailyTotal = routines.filter((r) => r.repeat === "none").length;

  const statsData = [
    {
      title: "Günlük Başarı",
      value: dailyCompleted,
      total: dailyTotal,
      icon: <DoneAll />,
      color: "#4caf50",
    },
    {
      title: "Haftalık Başarı",
      value: weeklyStats.completed,
      total: weeklyStats.added,
      icon: <CheckCircleOutline />,
      color: "#2196F3",
    },
    {
      title: "Aylık Başarı",
      value: monthlyStats.completed,
      total: monthlyStats.added,
      icon: <NotificationsActive />,
      color: "#9C27B0",
    },
  ];

  // Kart animasyon ayarları
  const cardVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: (i) => ({
      y: 0,
      opacity: 1,
      transition: {
        delay: i * 0.1,
        duration: 0.6,
        ease: [0.6, -0.05, 0.01, 0.99],
      },
    }),
  };

  return (
    <Grid container spacing={isMobile ? 2 : 3} sx={{ mb: 4 }}>
      {statsData.map((stat, index) => {
        const progressPercentage =
          Math.round((stat.total > 0 ? stat.value / stat.total : 0) * 100) || 0;

        return (
          <Grid item xs={gridXS} sm={6} md={4} key={index}>
            <GlowingCard
              glowcolor={stat.color}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              custom={index}
              whileHover={{
                y: -10,
                boxShadow: `0 15px 40px ${stat.color}44, inset 0 0 20px rgba(255, 255, 255, 0.1)`,
              }}
            >
              {isMobile ? (
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      width: "70px",
                      height: "70px",
                      margin: "0 auto",
                      position: "relative",
                    }}
                  >
                    <ProgressRing
                      progress={progressPercentage}
                      color={stat.color}
                    >
                      <IconContainer color={stat.color}>
                        {React.cloneElement(stat.icon, {
                          sx: { fontSize: "1.8rem", color: "white" },
                        })}
                      </IconContainer>
                    </ProgressRing>
                  </Box>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      mt: 2,
                      fontWeight: 600,
                      letterSpacing: "0.5px",
                      fontSize: "0.95rem",
                      background: "linear-gradient(90deg, #ffffff, #ffffffaa)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    {stat.title}
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mt: 1,
                    }}
                  >
                    <Typography
                      variant="h4"
                      component={motion.div}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: index * 0.2 + 0.3, duration: 0.5 }}
                      sx={{
                        fontWeight: 700,
                        background: `linear-gradient(90deg, ${stat.color}, ${stat.color}aa)`,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      {stat.value}
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        color: "rgba(255,255,255,0.6)",
                        ml: 0.5,
                        fontWeight: 300,
                        display: "inline-flex",
                        alignItems: "center",
                      }}
                    >
                      / {stat.total}
                    </Typography>
                  </Box>
                  <Typography
                    variant="caption"
                    component={motion.div}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.6 }}
                    transition={{ delay: index * 0.2 + 0.5 }}
                    sx={{
                      mt: 1,
                      display: "block",
                      color: "rgba(255,255,255,0.6)",
                      fontWeight: 300,
                    }}
                  >
                    {progressPercentage}% tamamlandı
                  </Typography>
                </Box>
              ) : (
                <Box
                  sx={{ display: "flex", alignItems: "center", height: "100%" }}
                >
                  <Box
                    sx={{
                      mr: isMedium ? 2 : 3,
                      position: "relative",
                      width: isMedium ? 80 : 100,
                      height: isMedium ? 80 : 100,
                    }}
                  >
                    <ProgressRing
                      progress={progressPercentage}
                      color={stat.color}
                    >
                      <IconContainer color={stat.color}>
                        {React.cloneElement(stat.icon, {
                          sx: {
                            fontSize: isMedium ? "2rem" : "2.5rem",
                            color: "white",
                          },
                        })}
                      </IconContainer>
                    </ProgressRing>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        fontWeight: 500,
                        fontSize: "0.85rem",
                        color: "rgba(255,255,255,0.75)",
                        mb: 0.5,
                      }}
                    >
                      {stat.title}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "baseline" }}>
                      <Typography
                        variant={isMedium ? "h4" : "h3"}
                        component={motion.div}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: index * 0.2 + 0.3, duration: 0.5 }}
                        sx={{
                          fontWeight: 700,
                          background: `linear-gradient(135deg, ${stat.color} 0%, ${stat.color}aa 100%)`,
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                        }}
                      >
                        {stat.value}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          ml: 1,
                          color: "rgba(255,255,255,0.6)",
                          fontWeight: 300,
                        }}
                      >
                        / {stat.total}
                      </Typography>
                    </Box>
                    <Typography
                      variant="body2"
                      component={motion.div}
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ delay: index * 0.2 + 0.5, duration: 0.8 }}
                      sx={{
                        mt: 1,
                        height: "4px",
                        background: `linear-gradient(90deg, ${stat.color}aa, ${stat.color}22)`,
                        borderRadius: "4px",
                        position: "relative",
                        "&::after": {
                          content: `"${progressPercentage}%"`,
                          position: "absolute",
                          right: 0,
                          top: "-18px",
                          fontSize: "0.75rem",
                          color: "rgba(255,255,255,0.6)",
                          fontWeight: 300,
                        },
                      }}
                    />
                  </Box>
                </Box>
              )}
            </GlowingCard>
          </Grid>
        );
      })}
    </Grid>
  );
};

export default StatsPanel;
