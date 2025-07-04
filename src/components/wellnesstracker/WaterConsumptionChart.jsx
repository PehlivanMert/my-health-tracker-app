import React, { useState } from "react";
import {
  CardContent,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { styled } from "@mui/material/styles";
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
} from "recharts";
import WaterDropIcon from "@mui/icons-material/WaterDrop";

// Bu bileşen, kullanıcının su tüketim verilerini görselleştirir.
// Ek olarak, Firestore'da NotificationScheduler.js tarafından hesaplanan
// nextWaterReminderTime bilgisi varsa, ekranda gösterilebilir.

const GlowingCard = styled("div")(({ glowColor }) => ({
  background: "rgba(255, 255, 255, 0.1)",
  borderRadius: "24px",
  padding: "16px",
  boxShadow: `0 0 20px ${glowColor || "#2196F322"}`,
}));

const WaterConsumptionChart = ({ waterHistory, nextReminder }) => {
  const [timeRange, setTimeRange] = useState("month");
  const [displayType, setDisplayType] = useState("area");
  const now = new Date();
  
  // Su geçmişi verilerini düzgün şekilde filtrele ve işle
  const filteredData = waterHistory
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
  const averageWaterIntake =
    filteredData.length > 0
      ? (
          filteredData.reduce((sum, entry) => sum + entry.intake, 0) /
          filteredData.length
        ).toFixed(1)
      : 0;

  return (
    <GlowingCard glowColor="#3F51B522">
      <CardContent>
        <Typography
          variant="h6"
          sx={{ fontWeight: 700, color: "#fff", mb: 2, textAlign: "center" }}
        >
          Su Tüketimi
        </Typography>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mb: 2,
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel
              id="water-time-range-label"
              sx={{ color: "#fff", fontSize: "0.75rem" }}
            >
              Zaman Aralığı
            </InputLabel>
            <Select
              labelId="water-time-range-label"
              value={timeRange}
              label="Zaman Aralığı"
              onChange={(e) => setTimeRange(e.target.value)}
              size="small"
              sx={{
                color: "#fff",
                fontSize: "0.75rem",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(255,255,255,0.3)",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(255,255,255,0.5)",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#3F51B5",
                },
              }}
            >
              <MenuItem value="year">1 Yıllık</MenuItem>
              <MenuItem value="month">1 Aylık</MenuItem>
              <MenuItem value="week">1 Haftalık</MenuItem>
              <MenuItem value="current">Bu Ay</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel
              id="water-display-type-label"
              sx={{ color: "#fff", fontSize: "0.75rem" }}
            >
              Görüntüleme Tipi
            </InputLabel>
            <Select
              labelId="water-display-type-label"
              value={displayType}
              label="Görüntüleme Tipi"
              onChange={(e) => setDisplayType(e.target.value)}
              size="small"
              sx={{
                color: "#fff",
                fontSize: "0.75rem",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(255,255,255,0.3)",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(255,255,255,0.5)",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#3F51B5",
                },
              }}
            >
              <MenuItem value="area">Alan Grafiği</MenuItem>
              <MenuItem value="bar">Çubuk Grafiği</MenuItem>
            </Select>
          </FormControl>
        </Box>
        {filteredData.length > 0 && (
          <Box sx={{ mb: 2, textAlign: "center" }}>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
              Ortalama günlük su tüketimi:
              <Typography
                component="span"
                variant="body2"
                sx={{
                  ml: 1,
                  color: "rgba(255,255,255,0.7)",
                  fontWeight: "bold",
                }}
              >
                {averageWaterIntake} mL
              </Typography>
            </Typography>
          </Box>
        )}
        {filteredData.length > 0 ? (
          displayType === "area" ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={filteredData}>
                <defs>
                  <linearGradient id="waterColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fff" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3F51B5" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.2)"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#fff", fontSize: 12 }}
                  stroke="rgba(255,255,255,0.5)"
                />
                <YAxis
                  tick={{ fill: "#fff", fontSize: 12 }}
                  stroke="rgba(255,255,255,0.5)"
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "rgba(0,0,0,0.8)",
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="intake"
                  stroke="#3F51B5"
                  fill="url(#waterColor)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={filteredData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.2)"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#fff", fontSize: 12 }}
                  stroke="rgba(255,255,255,0.5)"
                />
                <YAxis
                  tick={{ fill: "#fff", fontSize: 12 }}
                  stroke="rgba(255,255,255,0.5)"
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "rgba(0,0,0,0.8)",
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />
                <Bar dataKey="intake" fill="#3F51B5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )
        ) : (
          <Box
            sx={{
              height: 250,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255,255,255,0.7)",
              textAlign: "center",
              p: 3,
            }}
          >
            <WaterDropIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
              Henüz Su Verisi Yok
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Su tüketiminizi kaydetmeye başladığınızda burada grafikler görünecek
            </Typography>
          </Box>
        )}
        {nextReminder && (
          <Box sx={{ mt: 2, textAlign: "center" }}>
            <Typography variant="body2" sx={{ color: "#fff" }}>
              Sonraki Su Hatırlatma:{" "}
              {new Date(nextReminder).toLocaleTimeString("tr-TR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Typography>
          </Box>
        )}
      </CardContent>
    </GlowingCard>
  );
};

export default WaterConsumptionChart;
