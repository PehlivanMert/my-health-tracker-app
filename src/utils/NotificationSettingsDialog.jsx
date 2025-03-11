import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  IconButton,
  Button,
  Typography,
  Box,
  Backdrop,
  LinearProgress,
} from "@mui/material";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../components/auth/firebaseConfig";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import { styled, alpha } from "@mui/material/styles";

const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  padding: theme.spacing(3),
  background: "linear-gradient(135deg, #4b6cb7 0%, #182848 100%)",
  color: theme.palette.primary.contrastText,
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  "& .MuiTypography-root": {
    fontWeight: 700,
    fontSize: "1.25rem",
    textShadow: "0px 2px 4px rgba(0, 0, 0, 0.2)",
  },
}));

const StyledDialogContent = styled(DialogContent)(({ theme }) => ({
  padding: theme.spacing(3),
  background: alpha("#f8f9fa", 0.95),
  "&::-webkit-scrollbar": {
    width: "8px",
    background: "transparent",
  },
  "&::-webkit-scrollbar-thumb": {
    background: "linear-gradient(to bottom, #4b6cb7, #182848)",
    borderRadius: "4px",
  },
  "&::-webkit-scrollbar-track": {
    background: alpha(theme.palette.primary.light, 0.1),
    borderRadius: "4px",
  },
}));

const ActionButton = styled(Button)(({ theme }) => ({
  borderRadius: theme.spacing(3),
  padding: theme.spacing(1.2, 3.5),
  textTransform: "none",
  fontWeight: 600,
  letterSpacing: "0.5px",
  boxShadow: theme.shadows[3],
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    transform: "translateY(-3px) scale(1.02)",
    boxShadow: "0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)",
  },
  "&:active": {
    transform: "translateY(0) scale(0.98)",
  },
}));

const NotificationSettingsDialog = ({ open, onClose, user, onSave }) => {
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("22:00");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && user && user.uid) {
      const fetchData = async () => {
        try {
          const userRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const data = userDoc.data();
            setStart(data.notificationWindow?.start || "08:00");
            setEnd(data.notificationWindow?.end || "22:00");
          } else {
            setStart("08:00");
            setEnd("22:00");
          }
        } catch (error) {
          console.error(
            "NotificationSettingsDialog - Veri çekme hatası:",
            error
          );
          setStart("08:00");
          setEnd("22:00");
        }
      };

      fetchData();
    }
  }, [open, user?.uid]);

  const handleSave = async () => {
    if (!user || !user.uid) {
      console.error("NotificationSettingsDialog - User tanımlı değil!");
      return;
    }
    setSaving(true);
    console.log("handleSave tetiklendi:", { start, end });
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        notificationWindow: { start, end },
      });
      console.log("updateDoc başarılı, notificationWindow güncellendi:", {
        start,
        end,
      });
      // Eğer parent'tan onSave callback'i sağlanmışsa, onu çağırıyoruz.
      if (onSave) {
        await onSave({ start, end });
        console.log("onSave callback çağrıldı.");
      }
      setSaving(false);
      onClose();
    } catch (error) {
      console.error("Kaydetme hatası:", error);
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={!saving ? onClose : undefined}
      fullWidth
      maxWidth="sm"
    >
      <StyledDialogTitle component="div">
        <Typography variant="h6" component="span">
          Bildirim Aralığı
        </Typography>
        {!saving && (
          <IconButton
            onClick={onClose}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              color: "#fff",
              background: alpha("#000", 0.2),
              "&:hover": { background: alpha("#000", 0.3) },
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </StyledDialogTitle>
      <StyledDialogContent dividers>
        <Typography variant="body2" sx={{ color: "#555", mb: 2 }}>
          Bildirim aralığınızı ayarlayın. Seçtiğiniz aralık dışında bildirim
          gönderilmeyecektir.
        </Typography>
        <TextField
          label="Başlangıç Saati"
          type="time"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
          sx={{ mt: 2 }}
        />
        <TextField
          label="Bitiş Saati"
          type="time"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
          sx={{ mt: 2 }}
        />
      </StyledDialogContent>

      <DialogActions
        sx={{
          justifyContent: "space-between",
          p: 3,
          bgcolor: alpha("#f5f5f5", 0.5),
          background:
            "linear-gradient(rgba(255,255,255,0.8), rgba(245,245,245,0.9))",
          backdropFilter: "blur(10px)",
        }}
      >
        <ActionButton
          onClick={onClose}
          variant="outlined"
          color="inherit"
          disabled={saving}
          sx={{ borderWidth: 2, "&:hover": { borderWidth: 2 } }}
        >
          İptal
        </ActionButton>
        <ActionButton
          onClick={handleSave}
          variant="contained"
          color="primary"
          disabled={saving}
          startIcon={saving ? null : <SaveIcon />}
          sx={{
            background: "linear-gradient(135deg, #4b6cb7 0%, #182848 100%)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {saving ? (
            <>
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: 4,
                }}
              >
                <LinearProgress sx={{ height: "100%", borderRadius: 0 }} />
              </Box>
              Kaydediliyor...
            </>
          ) : (
            "Kaydet"
          )}
        </ActionButton>
      </DialogActions>
      <Backdrop
        sx={{
          color: "#fff",
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backdropFilter: "blur(3px)",
        }}
        open={saving}
      />
    </Dialog>
  );
};

export default NotificationSettingsDialog;
