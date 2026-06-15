import React, { useState, useMemo } from "react";
import {
  CardContent,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip as MuiTooltip,
  Fade,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { styled, keyframes } from "@mui/material/styles";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
} from "recharts";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import RefreshIcon from "@mui/icons-material/Refresh";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

// Bu bileşen, kullanıcının su tüketim verilerini görselleştirir.
// Ek olarak, Firestore'da NotificationScheduler.js tarafından hesaplanan
// nextWaterReminderTime bilgisi varsa, ekranda gösterilebilir.

// Animasyonlar
const pulseAnimation = keyframes`
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
`;

const shimmerAnimation = keyframes`
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
`;

const GlowingCard = styled("div")(({ theme, glowColor }) => ({
  background: `linear-gradient(135deg, 
    rgba(255, 255, 255, 0.15) 0%, 
    rgba(255, 255, 255, 0.05) 100%)`,
  borderRadius: "20px",
  padding: "20px",
  boxShadow: `
    0 8px 32px ${glowColor || "rgba(33, 150, 243, 0.3)"},
    0 2px 8px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.2)
  `,
  backdropFilter: "blur(10px)",
  border: `1px solid rgba(255, 255, 255, 0.1)`,
  position: "relative",
  overflow: "hidden",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: `
      0 12px 40px ${glowColor || "rgba(33, 150, 243, 0.4)"},
      0 4px 12px rgba(0, 0, 0, 0.15)
    `,
  },
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "2px",
    background: `linear-gradient(90deg, 
      transparent, 
      ${glowColor || "#2196F3"}, 
      transparent)`,
    animation: `${shimmerAnimation} 3s ease-in-out infinite`,
  },
}));

const StatsCard = styled(Box)(({ theme }) => ({
  background: "rgba(255, 255, 255, 0.08)",
  borderRadius: "12px",
  padding: "12px 16px",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  transition: "all 0.2s ease",
  "&:hover": {
    background: "rgba(255, 255, 255, 0.12)",
    transform: "scale(1.02)",
  },
}));

const WaterConsumptionChart = ({ waterHistory = [], nextReminder, onRefresh }) => {
  const [timeRange, setTimeRange] = useState("month");
  const [displayType, setDisplayType] = useState("area");
  const [isLoading, setIsLoading] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const now = new Date();
  
  // Su geçmişi verilerini düzgün şekilde filtrele ve işle
  const filteredData = (waterHistory || [])
    .filter((entry) => {
      // Tarih formatını kontrol et ve düzelt
      let entryDate;
      if (typeof entry.date === 'string') {
        // Eğer tarih string ise, ISO formatına çevir
        if (entry.date.includes('T')) {
          entryDate = new Date(entry.date);
        } else {
          // YYYY-MM-DD formatında ise
          entryDate = new Date(entry.date + 'T00:00:00');
        }
      } else {
        entryDate = new Date(entry.date);
      }

      if (timeRange === "year") {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        return entryDate >= oneYearAgo;
      } else if (timeRange === "month") {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        return entryDate >= oneMonthAgo;
      } else if (timeRange === "week") {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return entryDate >= oneWeekAgo;
      } else if (timeRange === "current") {
        return (
          entryDate.getMonth() === now.getMonth() &&
          entryDate.getFullYear() === now.getFullYear()
        );
      }
      return true;
    })
    .map((entry) => {
      // Tarih formatını düzelt
      let entryDate;
      if (typeof entry.date === 'string') {
        if (entry.date.includes('T')) {
          entryDate = new Date(entry.date);
        } else {
          entryDate = new Date(entry.date + 'T00:00:00');
        }
      } else {
        entryDate = new Date(entry.date);
      }
      
      return {
        ...entry,
        date: entryDate.toLocaleDateString("tr-TR"),
        intake: entry.intake || 0
      };
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date)); // Tarihe göre sırala
  // İstatistikleri hesapla
  const stats = useMemo(() => {
    if (filteredData.length === 0) return null;
    
    const totalIntake = filteredData.reduce((sum, entry) => sum + entry.intake, 0);
    const averageIntake = (totalIntake / filteredData.length).toFixed(1);
    const maxIntake = Math.max(...filteredData.map(entry => entry.intake));
    const minIntake = Math.min(...filteredData.map(entry => entry.intake));
    
    // Akıllı trend hesaplama - Time range'e göre dinamik
    let trendComparisonDays = 7; // Varsayılan
    
    // Time range'e göre karşılaştırma gün sayısını belirle
    switch (timeRange) {
      case "week":
        // Haftalık görünüm: Son 3 gün vs önceki 3 gün
        trendComparisonDays = 3;
        break;
      case "month":
        // Aylık görünüm: Son 7 gün vs önceki 7 gün
        trendComparisonDays = 7;
        break;
      case "year":
        // Yıllık görünüm: Son 30 gün vs önceki 30 gün
        trendComparisonDays = 30;
        break;
      case "current":
        // Mevcut ay: Son 7 gün vs önceki 7 gün
        trendComparisonDays = 7;
        break;
      default:
        trendComparisonDays = 7;
    }
    
    // Eğer yeterli veri yoksa trend hesaplanamaz
    const minRequiredDays = trendComparisonDays * 2; // Hem recent hem previous için yeterli veri olmalı
    
    let trend = 0;
    let canCalculateTrend = false;
    
    if (filteredData.length >= minRequiredDays) {
      // Son N gün
      const recentDays = filteredData.slice(-trendComparisonDays);
      // Önceki N gün (N gün öncesinden 2N gün öncesine kadar)
      const previousDays = filteredData.slice(-trendComparisonDays * 2, -trendComparisonDays);
      
      const recentAvg = recentDays.length > 0 
        ? recentDays.reduce((sum, entry) => sum + entry.intake, 0) / recentDays.length 
        : 0;
      const previousAvg = previousDays.length > 0 
        ? previousDays.reduce((sum, entry) => sum + entry.intake, 0) / previousDays.length 
        : 0;
      
      // Trend hesapla (sadece önceki dönem 0'dan büyükse)
      if (previousAvg > 0 && recentDays.length > 0 && previousDays.length > 0) {
        trend = ((recentAvg - previousAvg) / previousAvg) * 100;
        canCalculateTrend = true;
      }
    } else if (filteredData.length >= trendComparisonDays) {
      // Yeterli veri yoksa ama en az N gün varsa, ilk yarı vs ikinci yarı karşılaştırması yap
      const midPoint = Math.floor(filteredData.length / 2);
      const recentDays = filteredData.slice(midPoint);
      const previousDays = filteredData.slice(0, midPoint);
      
      const recentAvg = recentDays.length > 0 
        ? recentDays.reduce((sum, entry) => sum + entry.intake, 0) / recentDays.length 
        : 0;
      const previousAvg = previousDays.length > 0 
        ? previousDays.reduce((sum, entry) => sum + entry.intake, 0) / previousDays.length 
        : 0;
      
      if (previousAvg > 0 && recentDays.length > 0 && previousDays.length > 0) {
        trend = ((recentAvg - previousAvg) / previousAvg) * 100;
        canCalculateTrend = true;
      }
    }
    
    return {
      average: averageIntake,
      total: totalIntake,
      max: maxIntake,
      min: minIntake,
      trend: canCalculateTrend ? trend.toFixed(1) : "0.0",
      isTrendUp: trend > 0,
      canCalculateTrend
    };
  }, [filteredData, timeRange]);

  const handleRefresh = () => {
    setIsLoading(true);
    // Parent component'ten refresh fonksiyonu varsa onu çağır
    if (onRefresh && typeof onRefresh === 'function') {
      onRefresh();
    } else {
      // Fallback: Sayfayı yenile
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <GlowingCard glowColor="#2196F322">
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        {/* Header */}
        <Box sx={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          mb: 3,
          flexWrap: "wrap",
          gap: 1
        }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <WaterDropIcon sx={{ 
              fontSize: { xs: 24, md: 28 }, 
              color: "#00BCD4",
              animation: `${pulseAnimation} 2s ease-in-out infinite`
            }} />
            <Typography
              variant={isMobile ? "h6" : "h5"}
              sx={{ 
                fontWeight: 700, 
                color: "#fff",
                background: "linear-gradient(45deg, #fff, #00BCD4)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
              }}
            >
              Su Tüketimi
            </Typography>
          </Box>
          
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <MuiTooltip title="Verileri Yenile">
              <IconButton 
                size="small" 
                onClick={handleRefresh}
                disabled={isLoading}
                sx={{ 
                  color: "#fff",
                  "&:hover": { background: "rgba(255,255,255,0.1)" }
                }}
              >
                <RefreshIcon sx={{ 
                  fontSize: 20,
                  animation: isLoading ? "spin 1s linear infinite" : "none",
                  "@keyframes spin": {
                    "0%": { transform: "rotate(0deg)" },
                    "100%": { transform: "rotate(360deg)" }
                  }
                }} />
              </IconButton>
            </MuiTooltip>
            
            <MuiTooltip 
              title={
                <Box sx={{ p: 1, maxWidth: isMobile ? 250 : 300 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, fontSize: isMobile ? "0.8rem" : "0.875rem" }}>
                    💧 Su Tüketimi İstatistikleri
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1, fontSize: isMobile ? "0.75rem" : "0.875rem" }}>
                    • <strong>Ortalama:</strong> Seçilen dönemdeki günlük ortalama su tüketimi
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1, fontSize: isMobile ? "0.75rem" : "0.875rem" }}>
                    • <strong>Toplam:</strong> Dönem boyunca toplam tüketilen su miktarı
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1, fontSize: isMobile ? "0.75rem" : "0.875rem" }}>
                    • <strong>En Yüksek:</strong> Tek günde tüketilen en fazla su miktarı
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1, fontSize: isMobile ? "0.75rem" : "0.875rem" }}>
                    • <strong>Trend:</strong> {
                      timeRange === "week" 
                        ? "Son 3 gün vs önceki 3 gün karşılaştırması" 
                        : timeRange === "year"
                        ? "Son 30 gün vs önceki 30 gün karşılaştırması"
                        : "Son 7 gün vs önceki 7 gün karşılaştırması"
                    }
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: isMobile ? "0.75rem" : "0.875rem" }}>
                    📊 Grafik türlerini değiştirerek verilerinizi farklı açılardan inceleyebilirsiniz.
                  </Typography>
                </Box>
              }
              placement={isMobile ? "top" : "left"}
              arrow
              PopperProps={{
                modifiers: [
                  {
                    name: 'preventOverflow',
                    enabled: true,
                    options: {
                      boundary: 'viewport',
                    },
                  },
                  {
                    name: 'flip',
                    enabled: true,
                  },
                ],
              }}
            >
              <IconButton 
                size="small"
                sx={{ color: "#fff" }}
              >
                <InfoOutlinedIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </MuiTooltip>
          </Box>
        </Box>

        {/* İstatistik Kartları */}
        {stats && (
          <Fade in={true} timeout={500}>
            <Box sx={{ 
              display: "grid", 
              gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
              gap: 2, 
              mb: 3 
            }}>
              <StatsCard>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)", fontSize: "0.75rem" }}>
                  Ortalama
                </Typography>
                <Typography variant="h6" sx={{ color: "#fff", fontWeight: 600, mt: 0.5 }}>
                  {stats.average} mL
                </Typography>
              </StatsCard>
              
              <StatsCard>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)", fontSize: "0.75rem" }}>
                  Toplam
                </Typography>
                <Typography variant="h6" sx={{ color: "#fff", fontWeight: 600, mt: 0.5 }}>
                  {stats.total} mL
                </Typography>
              </StatsCard>
              
              <StatsCard>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)", fontSize: "0.75rem" }}>
                  En Yüksek
                </Typography>
                <Typography variant="h6" sx={{ color: "#4CAF50", fontWeight: 600, mt: 0.5 }}>
                  {stats.max} mL
                </Typography>
              </StatsCard>
              
              <StatsCard>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)", fontSize: "0.75rem" }}>
                    Trend
                  </Typography>
                  {stats.canCalculateTrend ? (
                    stats.isTrendUp ? (
                      <TrendingUpIcon sx={{ fontSize: 16, color: "#4CAF50" }} />
                    ) : (
                      <TrendingDownIcon sx={{ fontSize: 16, color: "#f44336" }} />
                    )
                  ) : (
                    <InfoOutlinedIcon sx={{ fontSize: 16, color: "rgba(255,255,255,0.5)" }} />
                  )}
                </Box>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    color: stats.canCalculateTrend 
                      ? (stats.isTrendUp ? "#4CAF50" : "#f44336")
                      : "rgba(255,255,255,0.5)", 
                    fontWeight: 600,
                    fontSize: stats.canCalculateTrend ? undefined : "0.875rem"
                  }}
                >
                  {stats.canCalculateTrend ? `%${stats.trend}` : "Yetersiz Veri"}
                </Typography>
              </StatsCard>
            </Box>
          </Fade>
        )}
        {/* Kontroller */}
        <Box sx={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          mb: 3,
          flexWrap: "wrap",
          gap: 2,
        }}>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Chip
              label="1 Haftalık"
              variant={timeRange === "week" ? "filled" : "outlined"}
              onClick={() => setTimeRange("week")}
              sx={{
                color: timeRange === "week" ? "#fff" : "rgba(255,255,255,0.7)",
                borderColor: "rgba(255,255,255,0.3)",
                backgroundColor: timeRange === "week" ? "#00BCD4" : "transparent",
                "&:hover": {
                  backgroundColor: timeRange === "week" ? "#00ACC1" : "rgba(255,255,255,0.1)",
                }
              }}
            />
            <Chip
              label="1 Aylık"
              variant={timeRange === "month" ? "filled" : "outlined"}
              onClick={() => setTimeRange("month")}
              sx={{
                color: timeRange === "month" ? "#fff" : "rgba(255,255,255,0.7)",
                borderColor: "rgba(255,255,255,0.3)",
                backgroundColor: timeRange === "month" ? "#00BCD4" : "transparent",
                "&:hover": {
                  backgroundColor: timeRange === "month" ? "#00ACC1" : "rgba(255,255,255,0.1)",
                }
              }}
            />
            <Chip
              label="1 Yıllık"
              variant={timeRange === "year" ? "filled" : "outlined"}
              onClick={() => setTimeRange("year")}
              sx={{
                color: timeRange === "year" ? "#fff" : "rgba(255,255,255,0.7)",
                borderColor: "rgba(255,255,255,0.3)",
                backgroundColor: timeRange === "year" ? "#00BCD4" : "transparent",
                "&:hover": {
                  backgroundColor: timeRange === "year" ? "#00ACC1" : "rgba(255,255,255,0.1)",
                }
              }}
            />
          </Box>
          
          <Box sx={{ display: "flex", gap: 1 }}>
            <Chip
              label="Alan"
              variant={displayType === "area" ? "filled" : "outlined"}
              onClick={() => setDisplayType("area")}
              sx={{
                color: displayType === "area" ? "#fff" : "rgba(255,255,255,0.7)",
                borderColor: "rgba(255,255,255,0.3)",
                backgroundColor: displayType === "area" ? "#4CAF50" : "transparent",
                "&:hover": {
                  backgroundColor: displayType === "area" ? "#388E3C" : "rgba(255,255,255,0.1)",
                }
              }}
            />
            <Chip
              label="Çubuk"
              variant={displayType === "bar" ? "filled" : "outlined"}
              onClick={() => setDisplayType("bar")}
              sx={{
                color: displayType === "bar" ? "#fff" : "rgba(255,255,255,0.7)",
                borderColor: "rgba(255,255,255,0.3)",
                backgroundColor: displayType === "bar" ? "#4CAF50" : "transparent",
                "&:hover": {
                  backgroundColor: displayType === "bar" ? "#388E3C" : "rgba(255,255,255,0.1)",
                }
              }}
            />
            <Chip
              label="Çizgi"
              variant={displayType === "line" ? "filled" : "outlined"}
              onClick={() => setDisplayType("line")}
              sx={{
                color: displayType === "line" ? "#fff" : "rgba(255,255,255,0.7)",
                borderColor: "rgba(255,255,255,0.3)",
                backgroundColor: displayType === "line" ? "#4CAF50" : "transparent",
                "&:hover": {
                  backgroundColor: displayType === "line" ? "#388E3C" : "rgba(255,255,255,0.1)",
                }
              }}
            />
          </Box>
        </Box>
        {/* Grafik */}
        {filteredData.length > 0 ? (
          <Fade in={true} timeout={800}>
            <Box sx={{ 
              width: "100%", 
              height: isMobile ? 220 : 300,
              background: "rgba(255,255,255,0.02)",
              borderRadius: "12px",
              p: 1,
              border: "1px solid rgba(255,255,255,0.05)"
            }}>
              <ResponsiveContainer width="100%" height="100%">
                {displayType === "area" ? (
                  <AreaChart data={filteredData} margin={{ 
                    top: 20, 
                    right: isMobile ? 5 : 30, 
                    left: isMobile ? 0 : 20, 
                    bottom: isMobile ? 10 : 20 
                  }}>
                    <defs>
                      <linearGradient id="waterGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00BCD4" stopOpacity={0.9} />
                        <stop offset="30%" stopColor="#26C6DA" stopOpacity={0.7} />
                        <stop offset="70%" stopColor="#4DD0E1" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#80DEEA" stopOpacity={0.2} />
                      </linearGradient>
                      <linearGradient id="waterStroke" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#00BCD4" />
                        <stop offset="50%" stopColor="#26C6DA" />
                        <stop offset="100%" stopColor="#4DD0E1" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="2 2"
                      stroke="rgba(255,255,255,0.1)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#fff", fontSize: isMobile ? 9 : 11 }}
                      stroke="rgba(255,255,255,0.3)"
                      axisLine={false}
                      tickLine={false}
                      interval={isMobile ? "preserveStartEnd" : 0}
                    />
                    <YAxis
                      tick={{ fill: "#fff", fontSize: isMobile ? 9 : 11 }}
                      stroke="rgba(255,255,255,0.3)"
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => isMobile ? `${value}` : `${value}mL`}
                      width={isMobile ? 30 : 45}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "rgba(0,0,0,0.9)",
                        border: "none",
                        borderRadius: "8px",
                        color: "#fff",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                        fontSize: isMobile ? "12px" : "14px",
                      }}
                      labelStyle={{ color: "#00BCD4", fontWeight: 600, fontSize: isMobile ? "11px" : "13px" }}
                      formatter={(value, name) => [`${value} mL`, "Su Tüketimi"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="intake"
                      stroke="url(#waterStroke)"
                      fill="url(#waterGradient)"
                      strokeWidth={isMobile ? 2 : 3}
                      dot={isMobile ? false : { fill: "#fff", stroke: "#00BCD4", strokeWidth: 2, r: 3 }}
                      activeDot={{ r: isMobile ? 4 : 6, stroke: "#fff", strokeWidth: 2, fill: "#00BCD4" }}
                    />
                  </AreaChart>
                ) : displayType === "bar" ? (
                  <BarChart data={filteredData} margin={{ 
                    top: 20, 
                    right: isMobile ? 5 : 30, 
                    left: isMobile ? 0 : 20, 
                    bottom: isMobile ? 10 : 20 
                  }}>
                    <defs>
                      <linearGradient id="waterBarGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00BCD4" stopOpacity={0.9} />
                        <stop offset="50%" stopColor="#26C6DA" stopOpacity={0.7} />
                        <stop offset="100%" stopColor="#4DD0E1" stopOpacity={0.6} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="2 2"
                      stroke="rgba(255,255,255,0.1)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#fff", fontSize: isMobile ? 9 : 11 }}
                      stroke="rgba(255,255,255,0.3)"
                      axisLine={false}
                      tickLine={false}
                      interval={isMobile ? "preserveStartEnd" : 0}
                    />
                    <YAxis
                      tick={{ fill: "#fff", fontSize: isMobile ? 9 : 11 }}
                      stroke="rgba(255,255,255,0.3)"
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => isMobile ? `${value}` : `${value}mL`}
                      width={isMobile ? 30 : 45}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "rgba(0,0,0,0.9)",
                        border: "none",
                        borderRadius: "8px",
                        color: "#fff",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                        fontSize: isMobile ? "12px" : "14px",
                      }}
                      labelStyle={{ color: "#00BCD4", fontWeight: 600, fontSize: isMobile ? "11px" : "13px" }}
                      formatter={(value, name) => [`${value} mL`, "Su Tüketimi"]}
                    />
                    <Bar 
                      dataKey="intake" 
                      fill="url(#waterBarGradient)"
                      radius={[isMobile ? 3 : 6, isMobile ? 3 : 6, 0, 0]}
                      stroke="#00BCD4"
                      strokeWidth={1}
                    />
                  </BarChart>
                ) : (
                  <LineChart data={filteredData} margin={{ 
                    top: 20, 
                    right: isMobile ? 5 : 30, 
                    left: isMobile ? 0 : 20, 
                    bottom: isMobile ? 10 : 20 
                  }}>
                    <defs>
                      <linearGradient id="waterLineStroke" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#00BCD4" />
                        <stop offset="50%" stopColor="#26C6DA" />
                        <stop offset="100%" stopColor="#4DD0E1" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="2 2"
                      stroke="rgba(255,255,255,0.1)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#fff", fontSize: isMobile ? 9 : 11 }}
                      stroke="rgba(255,255,255,0.3)"
                      axisLine={false}
                      tickLine={false}
                      interval={isMobile ? "preserveStartEnd" : 0}
                    />
                    <YAxis
                      tick={{ fill: "#fff", fontSize: isMobile ? 9 : 11 }}
                      stroke="rgba(255,255,255,0.3)"
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => isMobile ? `${value}` : `${value}mL`}
                      width={isMobile ? 30 : 45}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "rgba(0,0,0,0.9)",
                        border: "none",
                        borderRadius: "8px",
                        color: "#fff",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                        fontSize: isMobile ? "12px" : "14px",
                      }}
                      labelStyle={{ color: "#00BCD4", fontWeight: 600, fontSize: isMobile ? "11px" : "13px" }}
                      formatter={(value, name) => [`${value} mL`, "Su Tüketimi"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="intake"
                      stroke="url(#waterLineStroke)"
                      strokeWidth={isMobile ? 2 : 3}
                      dot={isMobile ? false : { fill: "#fff", stroke: "#00BCD4", strokeWidth: 2, r: 3 }}
                      activeDot={{ r: isMobile ? 4 : 6, stroke: "#fff", strokeWidth: 2, fill: "#00BCD4" }}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </Box>
          </Fade>
        ) : (
          <Fade in={true} timeout={500}>
            <Box
              sx={{
                height: isMobile ? 200 : 280,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(255,255,255,0.7)",
                textAlign: "center",
                p: 3,
                background: "rgba(255,255,255,0.05)",
                borderRadius: "16px",
                border: "2px dashed rgba(255,255,255,0.2)",
              }}
            >
              <WaterDropIcon 
                sx={{ 
                  fontSize: isMobile ? 40 : 48, 
                  mb: 2, 
                  opacity: 0.6,
                  animation: `${pulseAnimation} 2s ease-in-out infinite`
                }} 
              />
              <Typography 
                variant={isMobile ? "h6" : "h5"} 
                sx={{ 
                  mb: 1, 
                  fontWeight: 600,
                  background: "linear-gradient(45deg, #fff, #00BCD4)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent"
                }}
              >
                Henüz Su Verisi Yok
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  opacity: 0.8,
                  maxWidth: "300px",
                  lineHeight: 1.6
                }}
              >
                Su tüketiminizi kaydetmeye başladığınızda burada detaylı grafikler ve istatistikler görünecek
              </Typography>
            </Box>
          </Fade>
        )}

        {/* Hatırlatma Bilgisi */}
        {nextReminder && (
          <Fade in={true} timeout={1000}>
            <Box sx={{ 
              mt: 3, 
              p: 2,
              background: "rgba(0, 188, 212, 0.1)",
              borderRadius: "12px",
              border: "1px solid rgba(0, 188, 212, 0.3)",
              textAlign: "center"
            }}>
              <Typography variant="body2" sx={{ color: "#fff", fontWeight: 500 }}>
                💧 Sonraki Su Hatırlatma:{" "}
                <Typography 
                  component="span" 
                  sx={{ 
                    color: "#26C6DA", 
                    fontWeight: 600,
                    fontSize: "1.1em"
                  }}
                >
                  {new Date(nextReminder).toLocaleTimeString("tr-TR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Typography>
              </Typography>
            </Box>
          </Fade>
        )}
      </CardContent>
    </GlowingCard>
  );
};

export default WaterConsumptionChart;
