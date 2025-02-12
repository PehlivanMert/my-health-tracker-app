import React, { useState, useEffect } from "react";
import { Box, Typography } from "@mui/material";
import { WiDaySunny, WiCloudy, WiRain } from "react-icons/wi";
import { toast } from "react-toastify";

const WeatherWidget = () => {
  const [weather, setWeather] = useState(null);

  const fetchWeather = async (lat, lon) => {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
      );
      const data = await response.json();
      if (data.current_weather) {
        setWeather({
          temperature: data.current_weather.temperature,
          weathercode: data.current_weather.weathercode,
        });
      }
    } catch (error) {
      toast.error("Hava durumu alınamadı");
    }
  };

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        fetchWeather(position.coords.latitude, position.coords.longitude),
      (error) => toast.warning("Konum izni verilmedi")
    );
  }, []);

  return (
    <Box
      className="weather-box"
      onClick={() => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              window.open(
                `https://weather.com/tr-TR/weather/today/l/${latitude},${longitude}`,
                "_blank"
              );
            },
            (error) => toast.error("Konum erişimi reddedildi")
          );
        }
      }}
      sx={{ cursor: "pointer" }}
    >
      {weather ? (
        <>
          {weather.weathercode < 2 ? (
            <WiDaySunny size={32} />
          ) : weather.weathercode < 4 ? (
            <WiCloudy size={32} />
          ) : (
            <WiRain size={32} />
          )}
          <Typography variant="body2">
            {Math.round(weather.temperature)}°C
          </Typography>
        </>
      ) : (
        <Typography variant="body2">Yükleniyor...</Typography>
      )}
    </Box>
  );
};

export default WeatherWidget;
