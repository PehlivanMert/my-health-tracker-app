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

const GlowingCard = styled("div")(({ glowColor }) => ({
  background: "rgba(255, 255, 255, 0.1)",
  borderRadius: "24px",
  padding: "16px",
  boxShadow: `0 0 20px ${glowColor || "#2196F322"}`,
}));

const WaterConsumptionChart = ({ waterHistory }) => {
  const [timeRange, setTimeRange] = useState("month");
  const [displayType, setDisplayType] = useState("area");
  const now = new Date();
  const filteredData = waterHistory
    .filter((entry) => {
      const entryDate = new Date(entry.date + "T00:00:00");
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
    .map((entry) => ({
      ...entry,
      date: new Date(entry.date + "T00:00:00").toLocaleDateString("tr-TR"),
    }));
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
                    backgroundColor: "rgba(0, 10, 50, 0.8)",
                    border: "none",
                    borderRadius: "10px",
                    color: "#fff",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="intake"
                  stroke="#5c6bc0"
                  fillOpacity={1}
                  fill="url(#waterColor)"
                  strokeWidth={3}
                  name="Su Tüketimi (mL)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={filteredData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
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
                    backgroundColor: "rgba(0, 10, 50, 0.8)",
                    border: "none",
                    borderRadius: "10px",
                    color: "#fff",
                  }}
                />
                <Legend
                  wrapperStyle={{ color: "#fff" }}
                  formatter={(value) => (
                    <span style={{ color: "#fff" }}>{value}</span>
                  )}
                />
                <Bar
                  dataKey="intake"
                  fill="#3F51B5"
                  name="Su Tüketimi (mL)"
                  radius={[4, 4, 0, 0]}
                  animationDuration={1500}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          )
        ) : (
          <Box
            sx={{
              height: 250,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              bgcolor: "rgba(255,255,255,0.1)",
              borderRadius: 2,
              p: 2,
            }}
          >
            <WaterDropIcon
              sx={{ fontSize: 60, color: "rgba(255,255,255,0.7)", mb: 2 }}
            />
            <Typography variant="body1" color="#fff" align="center">
              Henüz su tüketim verisi bulunmamaktadır
            </Typography>
            <Typography
              variant="body2"
              color="rgba(255,255,255,0.7)"
              mt={1}
              textAlign="center"
            >
              Su tüketimlerinizi girdiğinizde istatistikleriniz burada
              görünecektir
            </Typography>
          </Box>
        )}
      </CardContent>
    </GlowingCard>
  );
};

export default WaterConsumptionChart;
