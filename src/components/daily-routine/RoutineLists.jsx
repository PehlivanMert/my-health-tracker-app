// src/components/daily-routine/RoutineLists.jsx
import React, { useState } from "react";
import {
  Box,
  Typography,
  Collapse,
  IconButton,
  useTheme,
  useMediaQuery,
  Grid,
} from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { AnimatePresence, motion } from "framer-motion";
import RoutineCard from "./RoutineCard";

// RoutineLists, parent bileşenden gelen activeRoutines ve completedRoutines dizilerini kullanır.
// Yeni veri modelinde her rutin nesnesi "completed" boolean alanıyla belirlenir.
const RoutineLists = ({
  activeRoutines,
  completedRoutines,
  currentTime,
  onCheck,
  onEdit,
  onDelete,
  onToggleNotification,
  notificationsEnabled,
  categoryColors,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [showCompleted, setShowCompleted] = useState(false);

  // Liste animasyon ayarları
  const listVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, when: "beforeChildren" },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 20 },
    },
  };

  return (
    <Box sx={{ padding: isMobile ? 1 : 2 }}>
      {/* Aktif Rutinler */}
      <Typography
        variant="h5"
        component="div"
        sx={{
          color: "#fff",
          mb: 2,
          textAlign: "center",
          fontWeight: 700,
          textShadow: "0 2px 4px rgba(0,0,0,0.2)",
          position: "relative",
          "&:after": {
            content: '""',
            display: "block",
            width: "60px",
            height: "3px",
            backgroundColor: theme.palette.primary.main,
            margin: "8px auto 0",
            borderRadius: "2px",
          },
        }}
      >
        Aktif Rutinler
      </Typography>

      <AnimatePresence mode="wait">
        {activeRoutines.length === 0 ? (
          <motion.div
            key="empty-active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ textAlign: "center", padding: "16px 0" }}
          >
            <Typography
              variant="body1"
              sx={{ color: "rgba(255,255,255,0.7)", fontStyle: "italic" }}
            >
              Aktif rutin bulunmamaktadır
            </Typography>
            <Box sx={{ mt: 2 }}>
              <img
                src="/empty-state.svg"
                alt="Empty State"
                style={{ maxWidth: "20%", height: "auto", minWidth: "100px" }}
              />
            </Box>
          </motion.div>
        ) : (
          <motion.div
            key="active-list"
            variants={listVariants}
            initial="hidden"
            animate="visible"
          >
            {activeRoutines.map((routine) => (
              <motion.div key={routine.id} variants={itemVariants} layout>
                <RoutineCard
                  routine={routine}
                  currentTime={currentTime}
                  onCheck={onCheck}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToggleNotification={onToggleNotification}
                  notificationsEnabled={notificationsEnabled}
                  categoryColors={categoryColors}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tamamlanan Rutinler */}
      <Box
        component={motion.div}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        sx={{ mt: 4, borderTop: "1px solid rgba(255,255,255,0.1)", pt: 3 }}
      >
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          sx={{
            cursor: "pointer",
            mb: 1,
            "&:hover": {
              "& .MuiTypography-root": { color: theme.palette.primary.light },
            },
          }}
          onClick={() => setShowCompleted(!showCompleted)}
          component={motion.div}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Typography
            variant="h5"
            sx={{
              color: "#fff",
              fontWeight: 700,
              mr: 1,
              transition: "color 0.3s ease",
              textShadow: "0 2px 4px rgba(0,0,0,0.2)",
            }}
          >
            Tamamlanan Rutinler
          </Typography>
          <IconButton
            size="small"
            sx={{
              color: "#fff",
              transform: showCompleted ? "rotate(180deg)" : "none",
              transition: "transform 0.3s ease",
            }}
          >
            <ExpandMore fontSize="inherit" />
          </IconButton>
        </Box>

        <Collapse
          in={showCompleted}
          timeout="auto"
          unmountOnExit
          sx={{
            "& .MuiCollapse-wrapperInner": {
              position: "relative",
              "&:before": {
                content: '""',
                position: "absolute",
                top: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: "80%",
                height: "1px",
                backgroundColor: "rgba(255,255,255,0.1)",
              },
            },
          }}
        >
          <AnimatePresence>
            {completedRoutines.length === 0 ? (
              <motion.div
                key="empty-completed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ textAlign: "center", padding: "16px 0" }}
              >
                <Typography
                  variant="body1"
                  sx={{ color: "rgba(255,255,255,0.7)", fontStyle: "italic" }}
                >
                  Tamamlanmış rutin bulunmamaktadır
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <img
                    src="/empty-state.svg"
                    alt="Empty State"
                    style={{
                      maxWidth: "20%",
                      height: "auto",
                      minWidth: "100px",
                    }}
                  />
                </Box>
              </motion.div>
            ) : (
              <motion.div
                key="completed-list"
                variants={listVariants}
                initial="hidden"
                animate="visible"
              >
                {completedRoutines.map((routine) => (
                  <motion.div key={routine.id} variants={itemVariants} layout>
                    <RoutineCard
                      routine={routine}
                      currentTime={currentTime}
                      onCheck={onCheck}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onToggleNotification={onToggleNotification}
                      notificationsEnabled={notificationsEnabled}
                      categoryColors={categoryColors}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </Collapse>
      </Box>
    </Box>
  );
};

export default RoutineLists;
