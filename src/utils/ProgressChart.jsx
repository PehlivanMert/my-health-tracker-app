import React, { useMemo } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { PieChart } from "@mui/x-charts/PieChart";

const ProgressChart = ({ completedRoutines, totalRoutines }) => {
  const theme = useTheme();

  const chartData = useMemo(() => {
    const progressPercentage =
      totalRoutines > 0
        ? Math.round((completedRoutines / totalRoutines) * 100)
        : 0;

    return {
      percentage: progressPercentage,
      seriesData: [
        {
          id: "completed",
          value: completedRoutines,
          label: "Tamamlandı",
          color: theme.palette.primary.main,
        },
        {
          id: "remaining",
          value: totalRoutines - completedRoutines,
          label: "Kalan",
          color: theme.palette.error.main,
        },
      ],
    };
  }, [completedRoutines, totalRoutines, theme]);

  return (
    <Box
      sx={{
        mt: 4,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        maxWidth: 300,
        mx: "auto",
        position: "relative",
      }}
    >
      {/* Başlık */}
      <Typography
        variant="h6"
        sx={{
          mb: 2,
          fontWeight: "bold",
          color: theme.palette.text.primary,
        }}
      >
        İlerleme: {chartData.percentage}%
      </Typography>

      {/* Doughnut Chart */}
      <PieChart
        series={[
          {
            data: chartData.seriesData,
            innerRadius: "60%",
            paddingAngle: 2,
            cornerRadius: 4,
            cx: 130,
            cy: 130,
            arcLabel: (item) => `${item.value}`,
          },
        ]}
        width={300}
        height={300}
        slotProps={{
          legend: { hidden: true },
        }}
      />

      {/* Custom Legend */}
      <Box
        sx={{
          display: "flex",
          gap: 3,
          mt: 2,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {chartData.seriesData.map((item) => (
          <Box
            key={item.id}
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            <Box
              sx={{
                width: 16,
                height: 16,
                backgroundColor: item.color,
                borderRadius: "4px",
              }}
            />
            <Typography variant="body2">
              {item.label} ({item.value})
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default ProgressChart;
