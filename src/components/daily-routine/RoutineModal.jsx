import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Box,
  Typography,
  alpha,
} from "@mui/material";
import { styled } from "@mui/material";
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import PersonIcon from "@mui/icons-material/Person";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import SchoolIcon from "@mui/icons-material/School";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import MovieIcon from "@mui/icons-material/Movie";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";

const colors = {
  primary: "#3a7bd5",
  secondary: "#00d2ff",
  accent: "#6f42c1",
  success: "#38b000",
  warning: "#f9c74f",
  error: "#d62828",
  background: {
    light: "#f8f9fa",
    paper: "rgba(255, 255, 255, 0.95)",
  },
  text: {
    primary: "#212529",
    secondary: "#6c757d",
    light: "#f8f9fa",
  },
};

const StyledAnimatedButton = styled("button")(({ theme, variant }) => {
  const buttonColors = {
    primary: `linear-gradient(45deg, ${colors.primary} 30%, ${colors.secondary} 90%)`,
    success: `linear-gradient(45deg, ${colors.success} 30%, ${alpha(
      colors.success,
      0.8
    )} 90%)`,
    warning: `linear-gradient(45deg, ${colors.warning} 30%, ${alpha(
      colors.warning,
      0.8
    )} 90%)`,
    error: `linear-gradient(45deg, ${colors.error} 30%, ${alpha(
      colors.error,
      0.8
    )} 90%)`,
  };

  return {
    background: buttonColors[variant || "primary"],
    border: 0,
    borderRadius: 25,
    boxShadow: `0 3px 5px 2px ${alpha(colors.primary, 0.3)}`,
    color: colors.text.light,
    padding: "12px 30px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    textTransform: "none",
    fontWeight: 600,
    fontSize: "0.95rem",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: `0 6px 10px 4px ${alpha(colors.primary, 0.2)}`,
    },
  };
});

const CancelButton = styled("button")({
  background: "transparent",
  border: `2px solid ${colors.text.secondary}`,
  borderRadius: 25,
  color: colors.text.secondary,
  padding: "10px 25px",
  cursor: "pointer",
  transition: "all 0.3s ease",
  textTransform: "none",
  fontWeight: 500,
  marginRight: 16,
  "&:hover": {
    background: alpha(colors.text.secondary, 0.1),
  },
});

const StyledTextField = styled(TextField)({
  "& label.Mui-focused": {
    color: colors.primary,
  },
  "& .MuiOutlinedInput-root": {
    "& fieldset": {
      borderColor: alpha(colors.primary, 0.3),
      borderRadius: 12,
    },
    "&:hover fieldset": {
      borderColor: colors.primary,
    },
    "&.Mui-focused fieldset": {
      borderColor: colors.primary,
      borderWidth: 2,
    },
  },
});

const categoryColors = {
  Work: "#00FFFF", // Neon Cyan
  Personal: "#FF00FF", // Neon Magenta
  Exercise: "#39FF14", // Neon Green
  Study: "#FFFF33", // Neon Yellow
  Other: "#FF5F1F", // Neon Orange
  Travel: "#BF00FF", // Neon Purple
  Shopping: "#FF1493", // Neon Pink
  Entertainment: "#FF073A", // Neon Red
  Food: "#FFD700", // Neon Gold
  Health: "#00E5EE", // Neon Turquoise
  Finance: "#CCFF00", // Neon Lime
};

const getTurkeyDateString = () => {
  const options = {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };
  return new Date().toLocaleDateString("en-CA", options);
};

const RoutineModal = ({ open, onClose, routine, initialDate, onSave }) => {
  const [formData, setFormData] = useState({
    title: "",
    date: getTurkeyDateString(),
    time: "",
    endTime: "",
    category: "Other",
    repeat: "none",
    repeatCount: 1,
    icon: "default",
    completed: false,
  });

  useEffect(() => {
    if (routine) {
      setFormData({ ...routine });
    } else {
      setFormData({
        title: "",
        date: initialDate || getTurkeyDateString(),
        time: "",
        endTime: "",
        category: "Other",
        repeat: "none",
        repeatCount: 1,
        icon: "default",
        completed: false,
      });
    }
  }, [routine, initialDate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    if (!formData.title || !formData.time) return;
    onSave(formData);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          background: colors.background.paper,
          backdropFilter: "blur(12px)",
          borderRadius: "24px",
          border: `1px solid ${alpha(colors.primary, 0.15)}`,
          boxShadow: `0 8px 32px 0 ${alpha(colors.primary, 0.2)}`,
          overflow: "hidden",
          maxWidth: 450,
          width: "100%",
        },
      }}
    >
      <Box
        sx={{
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
          padding: "20px 24px",
          color: colors.text.light,
        }}
      >
        <Typography variant="h6" fontWeight={700}>
          {routine ? "Rutini Düzenle" : "Yeni Rutin Ekle"}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
          {routine
            ? "Mevcut rutininizi düzenleyin"
            : "Günlük düzeninize yeni bir rutin ekleyin"}
        </Typography>
      </Box>

      <DialogContent sx={{ padding: 3 }}>
        <StyledTextField
          fullWidth
          margin="dense"
          label="Tarih"
          type="date"
          name="date"
          InputLabelProps={{ shrink: true }}
          value={formData.date}
          onChange={handleChange}
          sx={{ mb: 2 }}
        />

        <Box sx={{ mb: 1, mt: 1 }}>
          <Typography
            variant="subtitle2"
            sx={{ color: colors.text.secondary, mb: 2, fontWeight: 600 }}
          >
            Zaman Ayarları
          </Typography>
          <Box sx={{ display: "flex", gap: 2 }}>
            <StyledTextField
              fullWidth
              margin="dense"
              label="Başlangıç Saati"
              type="time"
              name="time"
              InputLabelProps={{ shrink: true }}
              value={formData.time}
              onChange={handleChange}
              sx={{ mb: 2 }}
            />
            <StyledTextField
              fullWidth
              margin="dense"
              label="Bitiş Saati"
              type="time"
              name="endTime"
              InputLabelProps={{ shrink: true }}
              value={formData.endTime || ""}
              onChange={handleChange}
              sx={{ mb: 2 }}
              helperText="Opsiyonel"
            />
          </Box>
        </Box>

        <StyledTextField
          fullWidth
          margin="dense"
          label="Rutin Açıklaması"
          name="title"
          value={formData.title}
          onChange={handleChange}
          sx={{ mb: 3 }}
        />

        <StyledTextField
          select
          fullWidth
          margin="dense"
          label="Kategori"
          name="category"
          value={formData.category}
          onChange={handleChange}
          sx={{ mb: 2 }}
          SelectProps={{
            renderValue: (selected) => (
              <Box sx={{ display: "flex", alignItems: "center" }}>
                {selected === "Work" && <WorkOutlineIcon sx={{ mr: 1 }} />}
                {selected === "Personal" && <PersonIcon sx={{ mr: 1 }} />}
                {selected === "Exercise" && (
                  <FitnessCenterIcon sx={{ mr: 1 }} />
                )}
                {selected === "Study" && <SchoolIcon sx={{ mr: 1 }} />}
                {selected === "Other" && <MoreHorizIcon sx={{ mr: 1 }} />}
                {selected === "Travel" && <TravelExploreIcon sx={{ mr: 1 }} />}
                {selected === "Shopping" && <ShoppingCartIcon sx={{ mr: 1 }} />}
                {selected === "Entertainment" && <MovieIcon sx={{ mr: 1 }} />}
                {selected === "Food" && <RestaurantIcon sx={{ mr: 1 }} />}
                {selected === "Health" && <LocalHospitalIcon sx={{ mr: 1 }} />}
                {selected === "Finance" && <AttachMoneyIcon sx={{ mr: 1 }} />}
                <Typography>
                  {
                    {
                      Work: "İş",
                      Personal: "Kişisel",
                      Exercise: "Egzersiz",
                      Study: "Çalışma",
                      Other: "Diğer",
                      Travel: "Seyahat",
                      Shopping: "Alışveriş",
                      Entertainment: "Eğlence",
                      Food: "Yemek",
                      Health: "Sağlık",
                      Finance: "Finans",
                    }[selected]
                  }
                </Typography>
              </Box>
            ),
          }}
        >
          <MenuItem value="Work">
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <WorkOutlineIcon sx={{ mr: 1 }} />
              İŞ
            </Box>
          </MenuItem>
          <MenuItem value="Personal">
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <PersonIcon sx={{ mr: 1 }} />
              Kişisel
            </Box>
          </MenuItem>
          <MenuItem value="Exercise">
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <FitnessCenterIcon sx={{ mr: 1 }} />
              Egzersiz
            </Box>
          </MenuItem>
          <MenuItem value="Study">
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <SchoolIcon sx={{ mr: 1 }} />
              Çalışma
            </Box>
          </MenuItem>
          <MenuItem value="Other">
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <MoreHorizIcon sx={{ mr: 1 }} />
              Diğer
            </Box>
          </MenuItem>
          <MenuItem value="Travel">
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <TravelExploreIcon sx={{ mr: 1 }} />
              Seyahat
            </Box>
          </MenuItem>
          <MenuItem value="Shopping">
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <ShoppingCartIcon sx={{ mr: 1 }} />
              Alışveriş
            </Box>
          </MenuItem>
          <MenuItem value="Entertainment">
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <MovieIcon sx={{ mr: 1 }} />
              Eğlence
            </Box>
          </MenuItem>
          <MenuItem value="Food">
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <RestaurantIcon sx={{ mr: 1 }} />
              Yemek
            </Box>
          </MenuItem>
          <MenuItem value="Health">
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <LocalHospitalIcon sx={{ mr: 1 }} />
              Sağlık
            </Box>
          </MenuItem>
          <MenuItem value="Finance">
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <AttachMoneyIcon sx={{ mr: 1 }} />
              Finans
            </Box>
          </MenuItem>
        </StyledTextField>

        <StyledTextField
          select
          fullWidth
          margin="dense"
          label="Tekrarlama"
          name="repeat"
          value={formData.repeat}
          onChange={handleChange}
          sx={{ mb: 2 }}
        >
          <MenuItem value="none">Tekrarlama Yok</MenuItem>
          <MenuItem value="daily">Günlük</MenuItem>
          <MenuItem value="weekly">Haftalık</MenuItem>
          <MenuItem value="monthly">Aylık</MenuItem>
        </StyledTextField>

        {formData.repeat !== "none" && (
          <StyledTextField
            fullWidth
            margin="dense"
            label="Tekrar Sayısı"
            type="number"
            name="repeatCount"
            InputLabelProps={{ shrink: true }}
            value={formData.repeatCount}
            onChange={handleChange}
            sx={{ mb: 2 }}
            inputProps={{ min: 1, max: 30 }}
          />
        )}

        <StyledTextField
          select
          fullWidth
          margin="dense"
          label="İkon Seçimi"
          name="icon"
          value={formData.icon}
          onChange={handleChange}
          sx={{ mb: 2 }}
          SelectProps={{
            renderValue: (selected) => (
              <Box sx={{ display: "flex", alignItems: "center" }}>
                {selected === "default" && <MoreHorizIcon sx={{ mr: 1 }} />}
                {selected === "work" && <WorkOutlineIcon sx={{ mr: 1 }} />}
                {selected === "study" && <SchoolIcon sx={{ mr: 1 }} />}
                {selected === "sport" && <FitnessCenterIcon sx={{ mr: 1 }} />}
                {selected === "relax" && <PersonIcon sx={{ mr: 1 }} />}
                {selected === "travel" && <TravelExploreIcon sx={{ mr: 1 }} />}
                {selected === "shopping" && <ShoppingCartIcon sx={{ mr: 1 }} />}
                {selected === "entertainment" && <MovieIcon sx={{ mr: 1 }} />}
                {selected === "food" && <RestaurantIcon sx={{ mr: 1 }} />}
                {selected === "health" && <LocalHospitalIcon sx={{ mr: 1 }} />}
                {selected === "finance" && <AttachMoneyIcon sx={{ mr: 1 }} />}
                <Typography>
                  {
                    {
                      default: "Varsayılan",
                      work: "İş",
                      study: "Çalışma",
                      sport: "Spor",
                      relax: "Rahatla",
                      travel: "Seyahat",
                      shopping: "Alışveriş",
                      entertainment: "Eğlence",
                      food: "Yemek",
                      health: "Sağlık",
                      finance: "Finans",
                    }[selected]
                  }
                </Typography>
              </Box>
            ),
          }}
        >
          <MenuItem value="default">
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <MoreHorizIcon sx={{ mr: 1 }} />
              Varsayılan
            </Box>
          </MenuItem>
          <MenuItem value="work">
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <WorkOutlineIcon sx={{ mr: 1 }} />
              İş
            </Box>
          </MenuItem>
          <MenuItem value="study">
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <SchoolIcon sx={{ mr: 1 }} />
              Çalışma
            </Box>
          </MenuItem>
          <MenuItem value="sport">
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <FitnessCenterIcon sx={{ mr: 1 }} />
              Spor
            </Box>
          </MenuItem>
          <MenuItem value="relax">
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <PersonIcon sx={{ mr: 1 }} />
              Rahatla
            </Box>
          </MenuItem>
          <MenuItem value="travel">
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <TravelExploreIcon sx={{ mr: 1 }} />
              Seyahat
            </Box>
          </MenuItem>
          <MenuItem value="shopping">
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <ShoppingCartIcon sx={{ mr: 1 }} />
              Alışveriş
            </Box>
          </MenuItem>
          <MenuItem value="entertainment">
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <MovieIcon sx={{ mr: 1 }} />
              Eğlence
            </Box>
          </MenuItem>
          <MenuItem value="food">
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <RestaurantIcon sx={{ mr: 1 }} />
              Yemek
            </Box>
          </MenuItem>
          <MenuItem value="health">
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <LocalHospitalIcon sx={{ mr: 1 }} />
              Sağlık
            </Box>
          </MenuItem>
          <MenuItem value="finance">
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <AttachMoneyIcon sx={{ mr: 1 }} />
              Finans
            </Box>
          </MenuItem>
        </StyledTextField>
      </DialogContent>

      <DialogActions
        sx={{
          padding: "16px 24px",
          borderTop: `1px solid ${alpha(colors.text.secondary, 0.1)}`,
        }}
      >
        <CancelButton onClick={onClose}>İptal</CancelButton>
        <StyledAnimatedButton
          onClick={handleSave}
          variant={routine ? "primary" : "success"}
        >
          {routine ? "Güncelle" : "Kaydet"}
        </StyledAnimatedButton>
      </DialogActions>
    </Dialog>
  );
};

export default RoutineModal;
