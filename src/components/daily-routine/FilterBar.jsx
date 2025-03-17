import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  InputAdornment,
  Chip,
  IconButton,
  Tooltip,
  Fade,
  Collapse,
  Typography,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Search,
  FilterList,
  Today,
  CalendarMonth,
  ArrowForward,
  ArrowBack,
  Close,
  ExpandLess,
  ExpandMore,
} from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import { motion } from "framer-motion";

// Ek ikonlar
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
import PaletteIcon from "@mui/icons-material/Palette";
import GroupIcon from "@mui/icons-material/Group";

// Yeni: Bildirim ikonları
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";

// Glassmorphism stil
const GlassInput = styled(TextField)(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    background: "rgba(255, 255, 255, 0.06)",
    backdropFilter: "blur(10px)",
    borderRadius: "12px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
    transition: "all 0.3s ease",
    "&:hover": {
      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
      background: "rgba(255, 255, 255, 0.08)",
      borderColor: "rgba(255, 255, 255, 0.2)",
    },
    "&.Mui-focused": {
      boxShadow: `0 0 0 2px ${theme.palette.primary.main}40`,
      background: "rgba(255, 255, 255, 0.1)",
      borderColor: theme.palette.primary.main,
    },
    "& fieldset": {
      border: "none",
    },
  },
  "& .MuiInputLabel-root": {
    color: "rgba(255, 255, 255, 0.7)",
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: theme.palette.primary.main,
  },
  "& .MuiInputBase-input": {
    color: "rgba(255, 255, 255, 0.9)",
  },
  "& .MuiSelect-icon": {
    color: "rgba(255, 255, 255, 0.5)",
  },
  "& .MuiMenuItem-root": {
    minHeight: "auto",
    padding: "8px 16px",
  },
}));

// Modern zaman filtresi butonu
const FilterButton = styled(Button)(({ theme, active }) => ({
  borderRadius: "8px",
  padding: "4px 8px",
  minWidth: "auto",
  fontWeight: 500,
  letterSpacing: "0.5px",
  fontSize: "0.75rem",
  textTransform: "none",
  borderColor: active ? "transparent" : "rgba(255, 255, 255, 0.2)",
  background: active
    ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
    : "rgba(255, 255, 255, 0.05)",
  backdropFilter: "blur(10px)",
  boxShadow: active ? `0 4px 20px ${theme.palette.primary.main}40` : "none",
  color: active ? "#fff" : "rgba(255, 255, 255, 0.7)",
  "&:hover": {
    borderColor: active ? "transparent" : "rgba(255, 255, 255, 0.3)",
    background: active
      ? `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`
      : "rgba(255, 255, 255, 0.1)",
    boxShadow: active
      ? `0 6px 25px ${theme.palette.primary.main}60`
      : `0 4px 20px rgba(0, 0, 0, 0.1)`,
  },
}));

// Kategoriler
const categories = [
  { value: "All", label: "Tümü", icon: <FilterList fontSize="small" /> },
  { value: "Work", label: "İş", icon: <WorkOutlineIcon fontSize="small" /> },
  {
    value: "Personal",
    label: "Kişisel",
    icon: <PersonIcon fontSize="small" />,
  },
  {
    value: "Exercise",
    label: "Egzersiz",
    icon: <FitnessCenterIcon fontSize="small" />,
  },
  { value: "Study", label: "Çalışma", icon: <SchoolIcon fontSize="small" /> },
  { value: "Other", label: "Diğer", icon: <MoreHorizIcon fontSize="small" /> },
  {
    value: "Travel",
    label: "Seyahat",
    icon: <TravelExploreIcon fontSize="small" />,
  },
  {
    value: "Shopping",
    label: "Alışveriş",
    icon: <ShoppingCartIcon fontSize="small" />,
  },
  {
    value: "Entertainment",
    label: "Eğlence",
    icon: <MovieIcon fontSize="small" />,
  },
  { value: "Food", label: "Yemek", icon: <RestaurantIcon fontSize="small" /> },
  {
    value: "Health",
    label: "Sağlık",
    icon: <LocalHospitalIcon fontSize="small" />,
  },
  {
    value: "Finance",
    label: "Finans",
    icon: <AttachMoneyIcon fontSize="small" />,
  },
  { value: "Hobby", label: "Hobi", icon: <PaletteIcon fontSize="small" /> },
  { value: "Social", label: "Sosyal", icon: <GroupIcon fontSize="small" /> },
];

// Yardımcı: Tarihi dd.MM.yyyy formatında döndürür (sadece gösterim için)
const formatDate = (date) => {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
};

// Türkiye saatini elde eden helper
const getTurkeyTime = (date = new Date()) =>
  new Date(date.toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));

// Önemli: getTurkeyLocalDateString fonksiyonunu tanımlıyoruz.
const getTurkeyLocalDateStringFn = (date = new Date()) => {
  return new Date(
    date.toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
  ).toLocaleDateString("en-CA");
};

const FilterBar = ({
  filterCategory,
  setFilterCategory,
  searchQuery,
  setSearchQuery,
  timeFilter,
  setTimeFilter,
  toggleAllNotifications,
  allNotificationsEnabled,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));

  // Panel görünümü
  const [showFilters, setShowFilters] = useState(!isMobile);
  const [showCategories, setShowCategories] = useState(false);

  // Dinamik tarih hesaplamaları
  const now = getTurkeyTime();
  const today = new Date(now);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const dynamicTimeFilters = [
    {
      value: "Yesterday",
      label: `Dün (${getTurkeyLocalDateStringFn(yesterday)})`,
      icon: <ArrowBack fontSize="small" />,
    },
    {
      value: "Today",
      label: `Bugün (${getTurkeyLocalDateStringFn(today)})`,
      icon: <Today fontSize="small" />,
    },
    {
      value: "Tomorrow",
      label: `Yarın (${getTurkeyLocalDateStringFn(tomorrow)})`,
      icon: <ArrowForward fontSize="small" />,
    },
    {
      value: "Monthly",
      label: "Ay Görünümü",
      icon: <CalendarMonth fontSize="small" />,
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 10 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  };

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        mb: 3,
        width: "100%",
        position: "relative",
      }}
    >
      {/* Arama alanı ve mobil filtre butonu */}
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 2, width: "100%" }}
      >
        <GlassInput
          placeholder="Aramak için yazın..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: "rgba(255,255,255,0.5)" }} />
              </InputAdornment>
            ),
            endAdornment: searchQuery ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => setSearchQuery("")}
                  sx={{ color: "rgba(255,255,255,0.5)" }}
                >
                  <Close fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
          variant="outlined"
          sx={{ flex: 1, "& .MuiOutlinedInput-root": { height: "48px" } }}
        />
        {isMobile && (
          <Button
            component={motion.div}
            whileTap={{ scale: 0.95 }}
            variant="contained"
            onClick={() => setShowFilters(!showFilters)}
            sx={{
              minWidth: "36px",
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              padding: 0,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            }}
          >
            <FilterList fontSize="small" />
          </Button>
        )}
      </Box>

      {(showFilters || !isMobile) && (
        <Box
          component={motion.div}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          sx={{
            display: "flex",
            flexDirection: isTablet ? "column" : "row",
            gap: 2,
            width: "100%",
          }}
        >
          {/* Kategori paneli */}
          <Box sx={{ flex: isTablet ? "initial" : 1 }}>
            <Box
              onClick={() => setShowCategories(!showCategories)}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: `linear-gradient(90deg, ${theme.palette.primary.light}, ${theme.palette.primary.main})`,
                borderRadius: "8px",
                padding: "8px 16px",
                cursor: "pointer",
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{ color: "#fff", fontWeight: "bold" }}
              >
                Kategoriler
              </Typography>
              <IconButton sx={{ color: "#fff" }}>
                {showCategories ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Box>
            <Collapse in={showCategories} timeout="auto" unmountOnExit>
              <Box
                component={motion.div}
                variants={itemVariants}
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1,
                  padding: "8px 0",
                }}
              >
                {categories.map((cat) => (
                  <Tooltip
                    key={cat.value}
                    title={cat.label}
                    placement="top"
                    arrow
                    TransitionComponent={Fade}
                    TransitionProps={{ timeout: 600 }}
                  >
                    <Chip
                      label={!isMobile && cat.label}
                      onClick={() => setFilterCategory(cat.value)}
                      icon={cat.icon}
                      color={
                        filterCategory === cat.value ? "primary" : "default"
                      }
                      variant={
                        filterCategory === cat.value ? "filled" : "outlined"
                      }
                      sx={{
                        borderRadius: "8px",
                        background:
                          filterCategory === cat.value
                            ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
                            : "rgba(255,255,255,0.05)",
                        backdropFilter: "blur(10px)",
                        border: "1px solid",
                        borderColor:
                          filterCategory === cat.value
                            ? "transparent"
                            : "rgba(255,255,255,0.15)",
                        color:
                          filterCategory === cat.value
                            ? "#fff"
                            : "rgba(255,255,255,0.7)",
                        fontWeight: 500,
                        "& .MuiChip-icon": { color: "inherit" },
                        boxShadow:
                          filterCategory === cat.value
                            ? `0 4px 15px ${theme.palette.primary.main}40`
                            : "none",
                        "&:hover": {
                          background:
                            filterCategory === cat.value
                              ? `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`
                              : "rgba(255,255,255,0.1)",
                          boxShadow:
                            filterCategory === cat.value
                              ? `0 6px 20px ${theme.palette.primary.main}60`
                              : `0 4px 15px rgba(0,0,0,0.1)`,
                        },
                        transition: "all 0.3s ease",
                      }}
                    />
                  </Tooltip>
                ))}
              </Box>
            </Collapse>
          </Box>

          {/* Zaman filtreleri ve Bildirim butonu */}
          <Box
            component={motion.div}
            variants={itemVariants}
            sx={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 1,
              justifyContent: isTablet ? "flex-start" : "flex-end",
            }}
          >
            {dynamicTimeFilters.map((tf) => (
              <FilterButton
                key={tf.value}
                startIcon={!isMobile && tf.icon}
                active={timeFilter === tf.value ? 1 : 0}
                onClick={() => setTimeFilter(tf.value)}
                component={motion.button}
                whileTap={{ scale: 0.95 }}
                sx={{
                  minWidth: isMobile ? "40px" : "auto",
                  width: isMobile ? "40px" : "auto",
                  height: isMobile ? "40px" : "auto",
                  padding: isMobile ? 0 : undefined,
                }}
              >
                {isMobile ? tf.icon : tf.label}
              </FilterButton>
            ))}
            <Tooltip title="Tüm Bildirimleri Aç/Kapat">
              <IconButton
                onClick={toggleAllNotifications}
                sx={{ color: "#fff" }}
              >
                {allNotificationsEnabled ? (
                  <NotificationsActiveIcon />
                ) : (
                  <NotificationsOffIcon />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default FilterBar;
