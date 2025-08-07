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
  Button,
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
  primary: "#2196F3",
  secondary: "#3F51B5",
  accent: "#6f42c1",
  success: "#4caf50",
  warning: "#ff9800",
  error: "#f44336",
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

const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    background: 'linear-gradient(135deg, #1a2a6c 0%, #2196F3 50%, #3F51B5 100%)',
    backdropFilter: 'blur(20px)',
    borderRadius: '24px',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
    overflow: 'hidden',
  },
}));

const DialogHeader = styled(Box)(({ theme }) => ({
  background: 'rgba(255, 255, 255, 0.05)',
  padding: theme.spacing(3),
  borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
  backdropFilter: 'blur(10px)',
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    color: '#fff',
    transition: 'all 0.3s ease',
    '& fieldset': {
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#2196F3',
    },
  },
  '& .MuiInputLabel-root': {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  '& .MuiInputBase-input': {
    color: '#fff',
  },
  '& .MuiSelect-icon': {
    color: 'rgba(255, 255, 255, 0.8)',
  },
}));

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

const categoryNames = {
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
};

const categoryIcons = {
  Work: <WorkOutlineIcon />,
  Personal: <PersonIcon />,
  Exercise: <FitnessCenterIcon />,
  Study: <SchoolIcon />,
  Other: <MoreHorizIcon />,
  Travel: <TravelExploreIcon />,
  Shopping: <ShoppingCartIcon />,
  Entertainment: <MovieIcon />,
  Food: <RestaurantIcon />,
  Health: <LocalHospitalIcon />,
  Finance: <AttachMoneyIcon />,
};

const categoryDescriptions = {
  Work: "İş için zaman ayırma",
  Personal: "Kişisel gelişim için zaman ayırma",
  Exercise: "Fiziksel sağlık için zaman ayırma",
  Study: "Akademik gelişim için zaman ayırma",
  Other: "Diğer faaliyetler için zaman ayırma",
  Travel: "Seyahat için zaman ayırma",
  Shopping: "Alışveriş için zaman ayırma",
  Entertainment: "Eğlence için zaman ayırma",
  Food: "Yemek için zaman ayırma",
  Health: "Sağlık için zaman ayırma",
  Finance: "Finans için zaman ayırma",
};

const CategorySelector = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
  gap: theme.spacing(1.5),
  marginTop: theme.spacing(2),
}));

const CategoryOption = styled(Box)(({ theme, selected, color }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: theme.spacing(2),
  borderRadius: '16px',
  background: selected
    ? `linear-gradient(135deg, ${color}15 0%, ${color}25 100%)`
    : 'rgba(255, 255, 255, 0.05)',
  border: `1px solid ${selected ? color : 'rgba(255, 255, 255, 0.1)'}`,
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  backdropFilter: 'blur(10px)',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: `0 8px 20px ${color}30`,
    background: selected
      ? `linear-gradient(135deg, ${color}20 0%, ${color}30 100%)`
      : 'rgba(255, 255, 255, 0.08)',
  },
}));

const CategoryIcon = styled(Box)(({ theme, color }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '48px',
  height: '48px',
  borderRadius: '50%',
  background: `linear-gradient(135deg, ${color}20 0%, ${color}30 100%)`,
  marginBottom: theme.spacing(1.5),
  fontSize: '1.5rem',
  transition: 'all 0.3s ease',
  boxShadow: `0 4px 12px ${color}20`,
}));

const CategoryLabel = styled(Typography)(({ theme, selected, color }) => ({
  color: selected ? color : "#fff",
  fontSize: "0.8rem",
  fontWeight: selected ? 600 : 500,
  textAlign: "center",
  transition: "all 0.3s ease",
}));

const CategoryDescription = styled(Typography)(({ theme }) => ({
  color: "rgba(255,255,255,0.7)",
  fontSize: "0.7rem",
  textAlign: "center",
  marginTop: theme.spacing(0.5),
}));

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

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSave();
  };

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogHeader>
        <Typography variant="h5" sx={{
          color: '#fff',
          fontWeight: 600,
          textAlign: 'center',
          textShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}>
          {routine ? "Rutini Düzenle" : "Yeni Rutin Ekle"}
        </Typography>
      </DialogHeader>
      <DialogContent sx={{ p: 3 }}>
        <form onSubmit={handleFormSubmit}>
          <StyledTextField
            fullWidth
            label="Başlık"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            margin="normal"
            required
          />

          <Typography variant="subtitle2" sx={{
            mt: 3,
            mb: 2,
            color: '#fff',
            fontWeight: 600,
            letterSpacing: '0.5px'
          }}>
            Kategori Seçin
          </Typography>
          <CategorySelector>
            {Object.entries(categoryNames).map(([key, name]) => (
              <CategoryOption
                key={key}
                selected={formData.category === key}
                color={categoryColors[key]}
                onClick={() => setFormData({ ...formData, category: key })}
              >
                <CategoryIcon color={categoryColors[key]}>
                  {categoryIcons[key]}
                </CategoryIcon>
                <CategoryLabel
                  selected={formData.category === key}
                  color={categoryColors[key]}
                >
                  {name}
                </CategoryLabel>
                <CategoryDescription>
                  {categoryDescriptions[key]}
                </CategoryDescription>
              </CategoryOption>
            ))}
          </CategorySelector>

          <Box sx={{ mt: 3, mb: 2 }}>
            <Typography variant="subtitle2" sx={{
              color: '#fff',
              mb: 2,
              fontWeight: 600,
              letterSpacing: '0.5px'
            }}>
              Zaman Ayarları
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <StyledTextField
                fullWidth
                label="Tarih"
                type="date"
                name="date"
                InputLabelProps={{ shrink: true }}
                value={formData.date}
                onChange={handleChange}
                required
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <StyledTextField
                fullWidth
                label="Başlangıç Saati"
                type="time"
                name="time"
                InputLabelProps={{ shrink: true }}
                value={formData.time}
                onChange={handleChange}
              />
              <StyledTextField
                fullWidth
                label="Bitiş Saati"
                type="time"
                name="endTime"
                InputLabelProps={{ shrink: true }}
                value={formData.endTime || ""}
                onChange={handleChange}
                helperText="Opsiyonel"
              />
            </Box>
          </Box>

          <StyledTextField
            select
            fullWidth
            margin="normal"
            label="Tekrarlama"
            name="repeat"
            value={formData.repeat}
            onChange={handleChange}
          >
            <MenuItem value="none">Tekrarlama Yok</MenuItem>
            <MenuItem value="daily">Günlük</MenuItem>
            <MenuItem value="weekly">Haftalık</MenuItem>
            <MenuItem value="monthly">Aylık</MenuItem>
          </StyledTextField>

          {formData.repeat !== "none" && (
            <StyledTextField
              fullWidth
              margin="normal"
              label="Tekrar Sayısı"
              type="number"
              name="repeatCount"
              InputLabelProps={{ shrink: true }}
              value={formData.repeatCount}
              onChange={handleChange}
              inputProps={{ min: 1, max: 30 }}
            />
          )}
        </form>
      </DialogContent>
      <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <Button 
          onClick={onClose}
          sx={{ 
            color: '#fff',
            borderColor: 'rgba(255, 255, 255, 0.3)',
            '&:hover': {
              borderColor: 'rgba(255, 255, 255, 0.5)',
              backgroundColor: 'rgba(255, 255, 255, 0.1)'
            }
          }}
          variant="outlined"
        >
          İptal
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
        >
          {routine ? "Güncelle" : "Ekle"}
        </Button>
      </DialogActions>
    </StyledDialog>
  );
};

export default RoutineModal;
