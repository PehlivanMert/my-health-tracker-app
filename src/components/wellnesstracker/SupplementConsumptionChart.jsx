import React, { useState, useEffect } from "react";
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
  Legend,
  BarChart,
  Bar,
  Tooltip as RechartsTooltip,
} from "recharts";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../auth/firebaseConfig";

const GlowingCard = styled("div")(({ glowColor }) => ({
  background: "rgba(255, 255, 255, 0.1)",
  borderRadius: "24px",
  padding: "16px",
  boxShadow: `0 0 20px ${glowColor || "#2196F322"}`,
}));

const SupplementConsumptionChart = ({
  user,
  supplements,
  onOpenSupplementNotificationSettings,
}) => {
  const [consumptionData, setConsumptionData] = useState([]);
  const [timeRange, setTimeRange] = useState("month");
  const [displayType, setDisplayType] = useState("bar");
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
    if (user) fetchConsumptionData();
  }, [user]);

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
    });
  };

  const colors = [
    "#4CAF50",
    "#FF9800",
    "#F44336",
    "#2196F3",
    "#9C27B0",
    "#00BCD4",
    "#FFEB3B",
    "#795548",
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

  return (
    <GlowingCard glowColor="#3F51B522">
      <CardContent>
        <Box sx={{ textAlign: "center", width: "100%" }}>
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, color: "#fff", mb: 2 }}
          >
            Takviye İstatistikleri
          </Typography>
        </Box>
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
              id="supp-time-range-label"
              sx={{ color: "#fff", fontSize: "0.75rem" }}
            >
              Zaman Aralığı
            </InputLabel>
            <Select
              labelId="supp-time-range-label"
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
              id="display-type-label"
              sx={{ color: "#fff", fontSize: "0.75rem" }}
            >
              Görüntüleme Tipi
            </InputLabel>
            <Select
              labelId="display-type-label"
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
              <MenuItem value="bar">Gruplanmış</MenuItem>
              <MenuItem value="stacked">Yığılmış</MenuItem>
            </Select>
          </FormControl>
        </Box>
        {filteredData.length > 0 ? (
          <ResponsiveContainer width="100%" height={285}>
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
              {suppKeys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={colors[index % colors.length]}
                  name={key}
                  radius={[4, 4, 0, 0]}
                  stackId={displayType === "stacked" ? "a" : undefined}
                  animationDuration={1500}
                  animationEasing="ease-out"
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
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
            <Typography variant="body1" color="#fff" align="center">
              Henüz takviye kullanım verisi bulunmamaktadır
            </Typography>
            <Typography
              variant="body2"
              color="rgba(255,255,255,0.7)"
              mt={1}
              textAlign="center"
            >
              Takviyeleri kullanmaya başladığınızda istatistikleriniz
              görünecektir
            </Typography>
          </Box>
        )}
      </CardContent>
    </GlowingCard>
  );
};

export default SupplementConsumptionChart;
