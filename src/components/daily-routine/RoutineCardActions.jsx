import React from "react";
import { Box, Typography, IconButton, Tooltip, Fade } from "@mui/material";
import { styled } from "@mui/material";
import {
  DeleteForever,
  NotificationsActive,
  NotificationsOff,
  AccessTime,
  Edit,
} from "@mui/icons-material";

const ActionButton = styled(IconButton)(({ theme, color }) => ({
  color: color || "#fff",
  padding: theme.spacing(1),
  background: "rgba(255,255,255,0.08)",
  marginLeft: theme.spacing(1),
  borderRadius: theme.spacing(1.5),
  transition: "all 0.3s ease",
  border: "1px solid rgba(255,255,255,0.1)",
  backdropFilter: "blur(5px)",
  "&:hover": {
    background: "rgba(255,255,255,0.15)",
    transform: "scale(1.12)",
    boxShadow: `0 0 15px ${color}50`,
  },
  "&:active": {
    transform: "scale(0.95)",
  },
}));

const CountdownDisplay = styled(Box)(({ theme, isActive, color }) => ({
  display: "flex",
  alignItems: "center",
  fontFamily: "'Poppins', sans-serif",
  color: isActive ? color : "#fff",
  fontWeight: 600,
  padding: "4px 12px",
  borderRadius: "12px",
  background: isActive ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.08)",
  boxShadow: isActive ? `0 0 15px ${color}30` : "0 0 10px rgba(0,0,0,0.2)",
  border: isActive ? `1px solid ${color}30` : "1px solid rgba(255,255,255,0.1)",
  transition: "all 0.3s ease",
}));

const RoutineCardActions = ({
  routine,
  isActive,
  cardColor,
  notificationsEnabled,
  countdownMessage,
  onEdit,
  onDelete,
  onToggleNotification,
  isMobile,
}) => {
  const tooltipStyles = {
    tooltip: {
      backgroundColor: "rgba(35,35,45,0.95)",
      color: "#fff",
      fontWeight: 500,
      fontSize: "0.8rem",
      padding: "8px 12px",
      borderRadius: "8px",
      boxShadow: "0 5px 15px rgba(0,0,0,0.3)",
      border: "1px solid rgba(255,255,255,0.1)",
    },
    arrow: {
      color: "rgba(35,35,45,0.95)",
    },
  };

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      mt={2.5}
      sx={{
        opacity: routine.checked ? 0.7 : 1,
        transition: "opacity 0.3s ease",
      }}
    >
      {countdownMessage && (
        <CountdownDisplay isActive={isActive} color={cardColor}>
          <AccessTime
            sx={{
              fontSize: isMobile ? "0.9rem" : "1rem",
              mr: 1,
              opacity: 0.9,
              color: isActive ? cardColor : "inherit",
            }}
          />
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              fontSize: isMobile ? "0.75rem" : "0.85rem",
              letterSpacing: "0.01em",
            }}
          >
            {countdownMessage}
          </Typography>
        </CountdownDisplay>
      )}

      <Box display="flex" alignItems="center">
        <Tooltip
          title="Edit"
          arrow
          TransitionComponent={Fade}
          TransitionProps={{ timeout: 600 }}
          componentsProps={{
            tooltip: { sx: tooltipStyles.tooltip },
            arrow: { sx: tooltipStyles.arrow },
          }}
        >
          <ActionButton
            onClick={() => onEdit(routine)}
            size="small"
            color="#9C27B0"
          >
            <Edit
              fontSize="small"
              sx={{
                filter: "drop-shadow(0 0 2px rgba(156,39,176,0.5))",
              }}
            />
          </ActionButton>
        </Tooltip>

        <Tooltip
          title={
            notificationsEnabled[routine.id]
              ? "Turn Off Notifications"
              : "Turn On Notifications"
          }
          arrow
          TransitionComponent={Fade}
          TransitionProps={{ timeout: 600 }}
          componentsProps={{
            tooltip: { sx: tooltipStyles.tooltip },
            arrow: { sx: tooltipStyles.arrow },
          }}
        >
          <ActionButton
            onClick={() => onToggleNotification(routine.id)}
            size="small"
            color={notificationsEnabled[routine.id] ? "#FFA726" : "#bdbdbd"}
          >
            {notificationsEnabled[routine.id] ? (
              <NotificationsActive
                fontSize="small"
                sx={{
                  filter: "drop-shadow(0 0 3px rgba(255,167,38,0.6))",
                }}
              />
            ) : (
              <NotificationsOff fontSize="small" />
            )}
          </ActionButton>
        </Tooltip>

        <Tooltip
          title="Delete"
          arrow
          TransitionComponent={Fade}
          TransitionProps={{ timeout: 600 }}
          componentsProps={{
            tooltip: { sx: tooltipStyles.tooltip },
            arrow: { sx: tooltipStyles.arrow },
          }}
        >
          <ActionButton
            onClick={() => onDelete(routine)}
            size="small"
            color="#FF5252"
            sx={{
              "&:hover": {
                background: "rgba(255,82,82,0.15)",
              },
            }}
          >
            <DeleteForever
              fontSize="small"
              sx={{
                filter: "drop-shadow(0 0 3px rgba(255,82,82,0.5))",
              }}
            />
          </ActionButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default RoutineCardActions;
