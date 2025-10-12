import React, { useState, useEffect, useMemo } from "react";
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
  Avatar,
} from "@mui/material";
import { styled, keyframes } from "@mui/material/styles";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
  BarChart,
  Bar,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../auth/firebaseConfig";
import MedicationIcon from "@mui/icons-material/Medication";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import RefreshIcon from "@mui/icons-material/Refresh";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import AnalyticsIcon from "@mui/icons-material/Analytics";

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
    0 8px 32px ${glowColor || "rgba(156, 39, 176, 0.3)"},
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
      0 12px 40px ${glowColor || "rgba(156, 39, 176, 0.4)"},
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
      ${glowColor || "#9C27B0"}, 
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

const SupplementConsumptionChart = ({
  user,
  supplements,
  consumptionData: propConsumptionData,
  onOpenSupplementNotificationSettings,
  onRefresh,
}) => {
  const [consumptionData, setConsumptionData] = useState([]);
  const [timeRange, setTimeRange] = useState("month");
  const [displayType, setDisplayType] = useState("bar");
  const [isLoading, setIsLoading] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const now = new Date();

  const getConsumptionDocRef = () =>
    doc(db, "users", user.uid, "stats", "supplementConsumption");

  const fetchConsumptionData = async () => {
    const ref = getConsumptionDocRef();
    try {
      const docSnap = await getDoc(ref);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const sortedDates = Object.keys(data).sort(
          (a, b) => new Date(a + "T00:00:00") - new Date(b + "T00:00:00")
        );
        const allSuppNames = new Set();
        sortedDates.forEach((date) => {
          Object.keys(data[date]).forEach((suppName) => {
            if (suppName !== "total") allSuppNames.add(suppName);
          });
        });
        const chartData = sortedDates.map((date) => {
          const dayStats = data[date];
          const dayData = {
            date: new Date(date + "T00:00:00").toLocaleDateString("tr-TR"),
            fullDate: date,
          };
          allSuppNames.forEach((suppName) => {
            dayData[suppName] = dayStats[suppName] || 0;
          });
          return dayData;
        });
        setConsumptionData(chartData);
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
      console.error("Error fetching supplement consumption data:", error);
      }
    }
  };

  useEffect(() => {
    if (propConsumptionData && propConsumptionData.length > 0) {
      setConsumptionData(propConsumptionData);
    } else if (user) {
      fetchConsumptionData();
    }
  }, [user, propConsumptionData]);

  const getFilteredData = () => {
    return consumptionData.filter((entry) => {
      const entryDate = new Date(entry.fullDate + "T00:00:00");
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
    }).map((entry) => {
      // Veri temizleme ve doğrulama
      const cleanedEntry = { ...entry };
      Object.keys(cleanedEntry).forEach(key => {
        if (key !== "date" && key !== "fullDate" && key !== "total") {
          // String değerleri number'a çevir
          if (typeof cleanedEntry[key] === 'string') {
            cleanedEntry[key] = parseInt(cleanedEntry[key]) || 0;
          }
          // NaN veya undefined değerleri 0 yap
          if (isNaN(cleanedEntry[key]) || cleanedEntry[key] === undefined) {
            cleanedEntry[key] = 0;
          }
        }
      });
      return cleanedEntry;
    });
  };

  // İstatistikleri hesapla
  const stats = useMemo(() => {
    const filteredData = getFilteredData();
    if (filteredData.length === 0) return null;
    
    const allSupplements = new Set();
    filteredData.forEach(day => {
      Object.keys(day).forEach(key => {
        if (key !== "date" && key !== "total" && key !== "fullDate" && day[key] > 0) {
          allSupplements.add(key);
        }
      });
    });

    const supplementStats = Array.from(allSupplements).map(suppName => {
      const totalConsumption = filteredData.reduce((sum, day) => sum + (day[suppName] || 0), 0);
      const daysWithConsumption = filteredData.filter(day => (day[suppName] || 0) > 0).length;
      const averageConsumption = daysWithConsumption > 0 ? (totalConsumption / daysWithConsumption).toFixed(1) : 0;
      
      return {
        name: suppName,
        total: totalConsumption,
        average: parseFloat(averageConsumption),
        days: daysWithConsumption,
        consistency: (daysWithConsumption / filteredData.length * 100).toFixed(1)
      };
    });

    const totalConsumption = supplementStats.reduce((sum, stat) => sum + stat.total, 0);
    const mostUsed = supplementStats.reduce((max, stat) => stat.total > max.total ? stat : max, supplementStats[0] || { total: 0 });
    const mostConsistent = supplementStats.reduce((max, stat) => parseFloat(stat.consistency) > parseFloat(max.consistency) ? stat : max, supplementStats[0] || { consistency: 0 });

    return {
      totalConsumption,
      supplementCount: supplementStats.length,
      mostUsed,
      mostConsistent,
      supplementStats
    };
  }, [consumptionData, timeRange]);

  const colors = [
    "#4CAF50", "#FF9800", "#F44336", "#2196F3", 
    "#9C27B0", "#00BCD4", "#FFEB3B", "#795548",
    "#E91E63", "#607D8B", "#FF5722", "#8BC34A"
  ];

  const filteredData = getFilteredData();
  const activeSuppNames = supplements ? supplements.map(s => s.name) : [];

  const suppKeys =
    filteredData.length > 0
      ? Array.from(
          new Set(
            filteredData.flatMap((day) =>
              Object.keys(day).filter(
                (key) =>
                  key !== "date" &&
                  key !== "total" &&
                  key !== "fullDate" &&
                  day[key] > 0
              )
            )
          )
        )
      : [];

  const handleRefresh = () => {
    setIsLoading(true);
    // Parent component'ten refresh fonksiyonu varsa onu çağır
    if (onRefresh && typeof onRefresh === 'function') {
      onRefresh();
    } else {
      // Fallback: Veriyi yeniden yükle
      fetchConsumptionData();
    }
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <GlowingCard glowColor="#9C27B022">
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
            <MedicationIcon sx={{ 
              fontSize: { xs: 24, md: 28 }, 
              color: "#9C27B0",
              animation: `${pulseAnimation} 2s ease-in-out infinite`
            }} />
            <Typography
              variant={isMobile ? "h6" : "h5"}
              sx={{ 
                fontWeight: 700, 
                color: "#fff",
                background: "linear-gradient(45deg, #fff, #9C27B0)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
              }}
            >
              Takviye İstatistikleri
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
                <Box sx={{ p: 1, maxWidth: isMobile ? 280 : 320 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, fontSize: isMobile ? "0.8rem" : "0.875rem" }}>
                    💊 Takviye İstatistikleri
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1, fontSize: isMobile ? "0.75rem" : "0.875rem" }}>
                    • <strong>Toplam Kullanım:</strong> Seçilen dönemdeki toplam takviye sayısı
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1, fontSize: isMobile ? "0.75rem" : "0.875rem" }}>
                    • <strong>Takviye Sayısı:</strong> Kullanılan farklı takviye çeşit sayısı
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1, fontSize: isMobile ? "0.75rem" : "0.875rem" }}>
                    • <strong>En Çok Kullanılan:</strong> En fazla tüketilen takviye
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1, fontSize: isMobile ? "0.75rem" : "0.875rem" }}>
                    • <strong>En Tutarlı:</strong> En düzenli kullanılan takviye
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1, fontSize: isMobile ? "0.75rem" : "0.875rem" }}>
                    📊 <strong>Grafik Türleri:</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ ml: 2, mb: 0.5, fontSize: isMobile ? "0.75rem" : "0.875rem" }}>
                    • Çubuk: Günlük kullanım karşılaştırması
                  </Typography>
                  <Typography variant="body2" sx={{ ml: 2, mb: 0.5, fontSize: isMobile ? "0.75rem" : "0.875rem" }}>
                    • Yığılmış: Toplam kullanım görünümü
                  </Typography>
                  <Typography variant="body2" sx={{ ml: 2, fontSize: isMobile ? "0.75rem" : "0.875rem" }}>
                    • Pasta: Takviye dağılım oranları
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
                  Toplam Kullanım
                </Typography>
                <Typography variant="h6" sx={{ color: "#fff", fontWeight: 600, mt: 0.5 }}>
                  {stats.totalConsumption}
                </Typography>
              </StatsCard>
              
              <StatsCard>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)", fontSize: "0.75rem" }}>
                  Takviye Sayısı
                </Typography>
                <Typography variant="h6" sx={{ color: "#4CAF50", fontWeight: 600, mt: 0.5 }}>
                  {stats.supplementCount}
                </Typography>
              </StatsCard>
              
              <StatsCard>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)", fontSize: "0.75rem" }}>
                  En Çok Kullanılan
                </Typography>
                <Typography variant="body2" sx={{ color: "#FF9800", fontWeight: 600, mt: 0.5 }}>
                  {stats.mostUsed?.name || "Yok"}
                </Typography>
              </StatsCard>
              
              <StatsCard>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)", fontSize: "0.75rem" }}>
                  En Tutarlı
                </Typography>
                <Typography variant="body2" sx={{ color: "#2196F3", fontWeight: 600, mt: 0.5 }}>
                  {stats.mostConsistent?.name || "Yok"}
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
                backgroundColor: timeRange === "week" ? "#9C27B0" : "transparent",
                "&:hover": {
                  backgroundColor: timeRange === "week" ? "#7B1FA2" : "rgba(255,255,255,0.1)",
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
                backgroundColor: timeRange === "month" ? "#9C27B0" : "transparent",
                "&:hover": {
                  backgroundColor: timeRange === "month" ? "#7B1FA2" : "rgba(255,255,255,0.1)",
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
                backgroundColor: timeRange === "year" ? "#9C27B0" : "transparent",
                "&:hover": {
                  backgroundColor: timeRange === "year" ? "#7B1FA2" : "rgba(255,255,255,0.1)",
                }
              }}
            />
          </Box>
          
          <Box sx={{ display: "flex", gap: 1 }}>
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
              label="Yığılmış"
              variant={displayType === "stacked" ? "filled" : "outlined"}
              onClick={() => setDisplayType("stacked")}
              sx={{
                color: displayType === "stacked" ? "#fff" : "rgba(255,255,255,0.7)",
                borderColor: "rgba(255,255,255,0.3)",
                backgroundColor: displayType === "stacked" ? "#4CAF50" : "transparent",
                "&:hover": {
                  backgroundColor: displayType === "stacked" ? "#388E3C" : "rgba(255,255,255,0.1)",
                }
              }}
            />
            <Chip
              label="Pasta"
              variant={displayType === "pie" ? "filled" : "outlined"}
              onClick={() => setDisplayType("pie")}
              sx={{
                color: displayType === "pie" ? "#fff" : "rgba(255,255,255,0.7)",
                borderColor: "rgba(255,255,255,0.3)",
                backgroundColor: displayType === "pie" ? "#4CAF50" : "transparent",
                "&:hover": {
                  backgroundColor: displayType === "pie" ? "#388E3C" : "rgba(255,255,255,0.1)",
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
              height: isMobile ? 240 : 320,
              background: "rgba(255,255,255,0.02)",
              borderRadius: "12px",
              p: 1,
              border: "1px solid rgba(255,255,255,0.05)"
            }}>
              <ResponsiveContainer width="100%" height="100%">
                {displayType === "pie" ? (
                  <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                    <Pie
                      data={stats?.supplementStats || []}
                      cx="50%"
                      cy="50%"
                      outerRadius={isMobile ? 50 : 70}
                      innerRadius={isMobile ? 15 : 25}
                      fill="#8884d8"
                      dataKey="total"
                      label={false}
                      labelLine={false}
                    >
                      {(stats?.supplementStats || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <Box sx={{
                              backgroundColor: "rgba(0,0,0,0.9)",
                              border: "none",
                              borderRadius: "8px",
                              color: "#fff",
                              p: 2,
                              boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                              fontSize: isMobile ? "12px" : "14px",
                              minWidth: "120px"
                            }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: "#9C27B0", mb: 1 }}>
                                {data.name}
                              </Typography>
                              <Typography variant="body2" sx={{ color: "#fff" }}>
                                Toplam: {data.total} adet
                              </Typography>
                              <Typography variant="body2" sx={{ color: "#fff" }}>
                                Ortalama: {data.average} adet/gün
                              </Typography>
                              <Typography variant="body2" sx={{ color: "#fff" }}>
                                Tutarlılık: %{data.consistency}
                              </Typography>
                            </Box>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      wrapperStyle={{ 
                        color: "#fff", 
                        fontSize: isMobile ? "9px" : "10px",
                        paddingTop: "5px",
                        maxHeight: isMobile ? "80px" : "100px",
                        overflow: "auto"
                      }}
                      formatter={(value) => (
                        <span style={{ 
                          color: "#fff", 
                          fontSize: isMobile ? "9px" : "10px",
                          display: "inline-block",
                          maxWidth: isMobile ? "80px" : "100px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          marginRight: "8px"
                        }}>
                          {isMobile ? value.slice(0, 6) + (value.length > 6 ? '...' : '') : value}
                        </span>
                      )}
                    />
                  </PieChart>
                ) : (
                  <BarChart
                    data={filteredData}
                    margin={{ 
                      top: 20, 
                      right: isMobile ? 5 : 30, 
                      left: isMobile ? 0 : 20, 
                      bottom: isMobile ? 10 : 20 
                    }}
                  >
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
                      width={isMobile ? 30 : 45}
                    />
                    <RechartsTooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          // Sadece 0'dan büyük değerleri göster
                          const filteredPayload = payload.filter(item => item.value > 0);
                          
                          if (filteredPayload.length === 0) return null;
                          
                          return (
                            <Box sx={{
                              backgroundColor: "rgba(0,0,0,0.9)",
                              border: "none",
                              borderRadius: "8px",
                              color: "#fff",
                              p: 2,
                              boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                              fontSize: isMobile ? "12px" : "14px",
                              minWidth: "150px"
                            }}>
                              <Typography variant="body2" sx={{ 
                                fontWeight: 600, 
                                color: "#9C27B0", 
                                mb: 1,
                                fontSize: isMobile ? "11px" : "13px"
                              }}>
                                {label}
                              </Typography>
                              {filteredPayload.map((entry, index) => (
                                <Typography 
                                  key={index}
                                  variant="body2" 
                                  sx={{ 
                                    color: "#fff",
                                    fontSize: isMobile ? "11px" : "12px",
                                    mb: 0.5
                                  }}
                                >
                                  <Box 
                                    component="span" 
                                    sx={{ 
                                      display: "inline-block",
                                      width: "12px",
                                      height: "12px",
                                      backgroundColor: entry.color,
                                      borderRadius: "2px",
                                      mr: 1,
                                      verticalAlign: "middle"
                                    }}
                                  />
                                  {entry.name}: {entry.value} adet
                                </Typography>
                              ))}
                            </Box>
                          );
                        }
                        return null;
                      }}
                    />
                    {!isMobile && suppKeys.length <= 6 && (
                      <Legend
                        wrapperStyle={{ 
                          color: "#fff", 
                          fontSize: "11px",
                          paddingTop: "10px"
                        }}
                        formatter={(value) => (
                          <span style={{ 
                            color: "#fff", 
                            fontSize: "11px",
                            display: "inline-block",
                            maxWidth: "100px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap"
                          }}>
                            {value}
                          </span>
                        )}
                      />
                    )}
                    {suppKeys.map((key, index) => (
                      <Bar
                        key={key}
                        dataKey={key}
                        fill={colors[index % colors.length]}
                        name={key}
                        radius={[isMobile ? 3 : 6, isMobile ? 3 : 6, 0, 0]}
                        stackId={displayType === "stacked" ? "a" : undefined}
                        animationDuration={1500}
                        animationEasing="ease-out"
                      />
                    ))}
                  </BarChart>
                )}
              </ResponsiveContainer>
            </Box>
          </Fade>
        ) : (
          <Fade in={true} timeout={500}>
            <Box
              sx={{
                height: isMobile ? 250 : 320,
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
              <MedicationIcon 
                sx={{ 
                  fontSize: isMobile ? 40 : 48, 
                  mb: 2, 
                  opacity: 0.6,
                  color: "#9C27B0",
                  animation: `${pulseAnimation} 2s ease-in-out infinite`
                }} 
              />
              <Typography 
                variant={isMobile ? "h6" : "h5"} 
                sx={{ 
                  mb: 1, 
                  fontWeight: 600,
                  background: "linear-gradient(45deg, #fff, #9C27B0)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent"
                }}
              >
                Henüz Takviye Verisi Yok
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  opacity: 0.8,
                  maxWidth: "300px",
                  lineHeight: 1.6
                }}
              >
                Takviyeleri kullanmaya başladığınızda burada detaylı grafikler ve istatistikler görünecek
              </Typography>
            </Box>
          </Fade>
        )}
      </CardContent>
    </GlowingCard>
  );
};

export default SupplementConsumptionChart;
