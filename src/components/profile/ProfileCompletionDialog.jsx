import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Typography,
} from "@mui/material";

export const ProfileCompletionDialog = ({
  open,
  profileData,
  handleProfileChange,
  handleProfileSave,
}) => {
  const isProfileComplete =
    profileData.firstName &&
    profileData.lastName &&
    profileData.height &&
    profileData.weight &&
    profileData.birthDate &&
    profileData.gender;

  return (
    <Dialog
      open={open}
      fullWidth
      maxWidth="sm"
      disableEscapeKeyDown
      sx={{
        "& .MuiPaper-root": {
          background: "linear-gradient(145deg, #f0f8ff 0%, #e6f7ff 100%)",
          borderRadius: "20px",
          boxShadow: "0 8px 32px rgba(33, 150, 243, 0.2)",
        },
      }}
    >
      <DialogTitle
        sx={{
          background: "linear-gradient(45deg, #FF9800 30%, #FF5722 90%)",
          color: "white",
          fontWeight: "bold",
          borderRadius: "20px 20px 0 0",
          py: 3,
          textAlign: "center",
        }}
      >
        Profilinizi Tamamlayın
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Typography variant="body1" sx={{ mb: 3, textAlign: "center", color: "#666" }}>
          Size daha iyi hizmet verebilmemiz ve sağlık hesaplamalarınızı doğru yapabilmemiz için 
          lütfen aşağıdaki bilgileri eksiksiz doldurun.
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 3,
            my: 2,
          }}
        >
          <TextField
            label="İsim"
            name="firstName"
            fullWidth
            required
            value={profileData.firstName || ""}
            onChange={handleProfileChange}
            variant="outlined"
            sx={{ background: "rgba(255,255,255,0.9)" }}
          />
          <TextField
            label="Soyisim"
            name="lastName"
            fullWidth
            required
            value={profileData.lastName || ""}
            onChange={handleProfileChange}
            variant="outlined"
            sx={{ background: "rgba(255,255,255,0.9)" }}
          />
          <FormControl fullWidth required sx={{ background: "rgba(255,255,255,0.9)" }}>
            <InputLabel id="completion-gender-label">Cinsiyet</InputLabel>
            <Select
              labelId="completion-gender-label"
              name="gender"
              value={profileData.gender}
              onChange={handleProfileChange}
            >
              <MenuItem value="male">Erkek</MenuItem>
              <MenuItem value="female">Kadın</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Doğum Tarihi"
            name="birthDate"
            type="date"
            fullWidth
            required
            InputLabelProps={{ shrink: true }}
            value={profileData.birthDate || ""}
            onChange={handleProfileChange}
            variant="outlined"
            sx={{ background: "rgba(255,255,255,0.9)" }}
          />
          <TextField
            label="Boy (cm)"
            name="height"
            type="number"
            fullWidth
            required
            value={profileData.height || ""}
            onChange={handleProfileChange}
            variant="outlined"
            sx={{ background: "rgba(255,255,255,0.9)" }}
          />
          <TextField
            label="Kilo (kg)"
            name="weight"
            type="number"
            fullWidth
            required
            value={profileData.weight || ""}
            onChange={handleProfileChange}
            variant="outlined"
            sx={{ background: "rgba(255,255,255,0.9)" }}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3, background: "rgba(255,255,255,0.5)", justifyContent: "center" }}>
        <Button
          onClick={handleProfileSave}
          disabled={!isProfileComplete}
          variant="contained"
          fullWidth
          sx={{
            borderRadius: "20px",
            py: 1.5,
            background: isProfileComplete 
              ? "linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)" 
              : "#ccc",
            color: "white",
            "&:hover": { transform: isProfileComplete ? "scale(1.02)" : "none" },
            transition: "all 0.2s ease",
          }}
        >
          {isProfileComplete ? "Kaydet ve Başla" : "Lütfen Tüm Alanları Doldurun"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
