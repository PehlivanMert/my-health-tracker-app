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

export const ProfileDialog = ({
  open,
  onClose,
  profileData,
  handleProfileChange,
  handleAvatarSelect,
  handleProfileSave,
}) => {
  const generateAvatars = (count) =>
    Array.from(
      { length: count },
      (_, i) => `https://api.dicebear.com/6.x/adventurer/svg?seed=avatar${i + 1}`
    );
  const availableAvatars = generateAvatars(50);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
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
          background: "linear-gradient(45deg, #2196F3 30%, #3F51B5 90%)",
          color: "white",
          fontWeight: "bold",
          borderRadius: "20px 20px 0 0",
          py: 3,
          textAlign: "center",
        }}
      >
        Profil Düzenleme
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 3,
            my: 2,
          }}
        >
          <TextField
            label="Kullanıcı Adı"
            name="username"
            fullWidth
            value={profileData.username || ""}
            onChange={handleProfileChange}
            variant="outlined"
            sx={{ background: "rgba(255,255,255,0.9)" }}
            inputProps={{ readOnly: true }}
          />
          <FormControl fullWidth sx={{ background: "rgba(255,255,255,0.9)" }}>
            <InputLabel id="gender-label">Cinsiyet</InputLabel>
            <Select
              labelId="gender-label"
              name="gender"
              value={profileData.gender}
              onChange={handleProfileChange}
            >
              <MenuItem value="male">Erkek</MenuItem>
              <MenuItem value="female">Kadın</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="İsim"
            name="firstName"
            fullWidth
            value={profileData.firstName || ""}
            onChange={handleProfileChange}
            variant="outlined"
            sx={{ background: "rgba(255,255,255,0.9)" }}
          />
          <TextField
            label="Soyisim"
            name="lastName"
            fullWidth
            value={profileData.lastName || ""}
            onChange={handleProfileChange}
            variant="outlined"
            sx={{ background: "rgba(255,255,255,0.9)" }}
          />
          <TextField
            label="Doğum Tarihi"
            name="birthDate"
            type="date"
            fullWidth
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
            value={profileData.weight || ""}
            onChange={handleProfileChange}
            variant="outlined"
            sx={{ background: "rgba(255,255,255,0.9)" }}
          />
        </Box>
        <Typography variant="h6" sx={{ mt: 3, mb: 2, color: "#3F51B5" }}>
          Avatar Seçimi
        </Typography>
        <Box
          sx={{
            display: "flex",
            overflowX: "auto",
            gap: 2,
            p: 2,
            background: "rgba(255,255,255,0.5)",
            borderRadius: "15px",
            "&::-webkit-scrollbar": { height: "8px" },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "#2196F3",
              borderRadius: "4px",
            },
          }}
        >
          {availableAvatars.map((url, index) => (
            <img
              key={index}
              src={url}
              alt={`Avatar ${index + 1}`}
              onClick={() => handleAvatarSelect(url)}
              style={{
                width: 60,
                height: 60,
                cursor: "pointer",
                borderRadius: "50%",
                border:
                  profileData.profileImage === url
                    ? "3px solid #2196F3"
                    : "2px solid transparent",
                transition: "all 0.2s ease",
                transform:
                  profileData.profileImage === url ? "scale(1.1)" : "scale(1)",
              }}
            />
          ))}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3, background: "rgba(255,255,255,0.5)" }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{ borderRadius: "20px", px: 3 }}
        >
          İptal
        </Button>
        <Button
          onClick={handleProfileSave}
          variant="contained"
          sx={{
            borderRadius: "20px",
            px: 4,
            background: "linear-gradient(45deg, #2196F3 30%, #3F51B5 90%)",
            color: "white",
            "&:hover": { transform: "scale(1.05)" },
            transition: "all 0.2s ease",
          }}
        >
          Kaydet
        </Button>
      </DialogActions>
    </Dialog>
  );
};
