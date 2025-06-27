import React, { useState, useEffect } from "react";
import { Box, Typography, useMediaQuery, useTheme } from "@mui/material";
import { WiDaySunny, WiCloudy, WiRain, WiStrongWind } from "react-icons/wi";
import { LocationOn, Opacity, Air } from "@mui/icons-material";
import { toast } from "react-toastify";

const WeatherWidget = () => {
  const [weather, setWeather] = useState(null);
  const [cityName, setCityName] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Koordinatlardan şehir ismini al
  const getCityFromCoordinates = async (lat, lon) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&accept-language=tr`
      );
      const data = await response.json();
      
      if (data && data.address) {
        // Şehir ismini öncelik sırasına göre al
        const city = data.address.city || 
                     data.address.town || 
                     data.address.village || 
                     data.address.county ||
                     data.address.state ||
                     data.address.country ||
                     "Bilinmeyen Konum";
        
        return city;
      }
      return "Bilinmeyen Konum";
    } catch (error) {
      console.error("Şehir ismi alınamadı:", error);
      return "Bilinmeyen Konum";
    }
  };

  const fetchWeather = async (lat, lon) => {
    try {
      // Hava durumu verisi - daha fazla parametre ekledik
      const weatherResponse = await fetch(
        `${
          import.meta.env.VITE_OPEN_METEO_API_URL
        }?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,apparent_temperature&timezone=Europe/Istanbul`
      );
      const weatherData = await weatherResponse.json();
      
      if (weatherData.current) {
        setWeather({
          temperature: weatherData.current.temperature_2m,
          weathercode: weatherData.current.weather_code,
          humidity: weatherData.current.relative_humidity_2m,
          windSpeed: weatherData.current.wind_speed_10m,
          windDirection: weatherData.current.wind_direction_10m,
          apparentTemperature: weatherData.current.apparent_temperature,
        });
      }

      // Şehir ismi
      const city = await getCityFromCoordinates(lat, lon);
      setCityName(city);
      
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

  // Rüzgar yönünü ok yönüne çevir
  const getWindDirection = (degrees) => {
    const directions = ['K', 'KKD', 'KD', 'DKD', 'D', 'DGD', 'GD', 'GKD', 'G', 'GKB', 'KB', 'KKB'];
    const index = Math.round(degrees / 30) % 12;
    return directions[index];
  };

  // Mobil için kompakt layout
  if (isMobile) {
    return (
      <Box
        className="weather-box"
        onClick={() => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const { latitude, longitude } = position.coords;
                const weatherUrl = `${
                  import.meta.env.VITE_WEATHER_COM_URL
                }/${latitude},${longitude}`;
                window.open(weatherUrl, "_blank");
              },
              (error) => toast.error("Konum erişimi reddedildi")
            );
          }
        }}
        sx={{ 
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0.3,
          minWidth: "100px"
        }}
      >
        {weather ? (
          <>
            {/* Şehir ismi - üstte */}
            {cityName && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.3, mb: 0.3 }}>
                <LocationOn sx={{ fontSize: 14, color: "rgba(255,255,255,0.9)" }} />
                <Typography variant="caption" sx={{ 
                  fontSize: "0.8rem", 
                  fontWeight: 600, 
                  color: "rgba(255,255,255,0.9)",
                  textShadow: "0 1px 2px rgba(0,0,0,0.3)"
                }}>
                  {cityName}
                </Typography>
              </Box>
            )}

            {/* Hava durumu ikonu ve sıcaklık - ortada */}
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.2 }}>
              {weather.weathercode < 2 ? (
                <WiDaySunny size={32} />
              ) : weather.weathercode < 4 ? (
                <WiCloudy size={32} />
              ) : (
                <WiRain size={32} />
              )}
              <Typography variant="body2" sx={{ 
                fontWeight: 700, 
                fontSize: "1rem", 
                lineHeight: 1,
                color: "rgba(255,255,255,0.95)",
                textShadow: "0 1px 2px rgba(0,0,0,0.3)"
              }}>
                {Math.round(weather.temperature)}°C
              </Typography>
            </Box>

            {/* Nem ve rüzgar - altta */}
            <Box sx={{ display: "flex", gap: 0.8, mt: 0.3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.3 }}>
                <Opacity sx={{ fontSize: 14, color: "rgba(255,255,255,0.8)" }} />
                <Typography variant="caption" sx={{ 
                  fontSize: "0.75rem", 
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.8)",
                  textShadow: "0 1px 2px rgba(0,0,0,0.3)"
                }}>
                  {Math.round(weather.humidity)}%
                </Typography>
              </Box>
              {weather.windSpeed > 5 && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.3 }}>
                  <Air sx={{ fontSize: 14, color: "rgba(255,255,255,0.8)" }} />
                  <Typography variant="caption" sx={{ 
                    fontSize: "0.75rem", 
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.8)",
                    textShadow: "0 1px 2px rgba(0,0,0,0.3)"
                  }}>
                    {Math.round(weather.windSpeed)}
                  </Typography>
                </Box>
              )}
            </Box>
          </>
        ) : (
          <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>Yükleniyor...</Typography>
        )}
      </Box>
    );
  }

  // Desktop için geniş layout
  return (
    <Box
      className="weather-box"
      onClick={() => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              const weatherUrl = `${
                import.meta.env.VITE_WEATHER_COM_URL
              }/${latitude},${longitude}`;
              window.open(weatherUrl, "_blank");
            },
            (error) => toast.error("Konum erişimi reddedildi")
          );
        }
      }}
      sx={{ 
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0.5,
        minWidth: "160px"
      }}
    >
      {weather ? (
        <>
          {/* Şehir ismi - en üstte */}
          {cityName && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.3, mb: 0.5 }}>
              <LocationOn sx={{ fontSize: 14, color: "rgba(255,255,255,0.9)" }} />
              <Typography variant="caption" sx={{ 
                fontSize: "0.85rem", 
                fontWeight: 600, 
                color: "rgba(255,255,255,0.9)",
                textShadow: "0 1px 2px rgba(0,0,0,0.3)"
              }}>
                {cityName}
              </Typography>
            </Box>
          )}

          {/* Ana hava durumu bilgileri - yatay düzen */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: "100%" }}>
            {/* Sol taraf - Nem ve Rüzgar */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.4, alignItems: "flex-start" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                <Opacity sx={{ fontSize: 14, color: "rgba(255,255,255,0.8)" }} />
                <Typography variant="caption" sx={{ 
                  fontSize: "0.8rem", 
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.8)",
                  textShadow: "0 1px 2px rgba(0,0,0,0.3)"
                }}>
                  {Math.round(weather.humidity)}%
                </Typography>
              </Box>
              {weather.windSpeed > 5 && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                  <Air sx={{ fontSize: 14, color: "rgba(255,255,255,0.8)" }} />
                  <Typography variant="caption" sx={{ 
                    fontSize: "0.8rem", 
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.8)",
                    textShadow: "0 1px 2px rgba(0,0,0,0.3)"
                  }}>
                    {Math.round(weather.windSpeed)} km/s
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Orta - Hava durumu ikonu ve sıcaklık */}
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.3 }}>
              {weather.weathercode < 2 ? (
                <WiDaySunny size={32} />
              ) : weather.weathercode < 4 ? (
                <WiCloudy size={32} />
              ) : (
                <WiRain size={32} />
              )}
              <Typography variant="body2" sx={{ 
                fontWeight: 700, 
                fontSize: "1rem", 
                lineHeight: 1,
                color: "rgba(255,255,255,0.95)",
                textShadow: "0 1px 2px rgba(0,0,0,0.3)"
              }}>
                {Math.round(weather.temperature)}°C
              </Typography>
            </Box>

            {/* Sağ taraf - Hissedilen sıcaklık */}
            {weather.apparentTemperature && Math.abs(weather.apparentTemperature - weather.temperature) > 2 && (
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <Typography variant="caption" sx={{ 
                  fontSize: "0.7rem", 
                  opacity: 0.8, 
                  lineHeight: 1,
                  color: "rgba(255,255,255,0.8)",
                  textShadow: "0 1px 2px rgba(0,0,0,0.3)"
                }}>
                  Hissedilen
                </Typography>
                <Typography variant="caption" sx={{ 
                  fontSize: "0.85rem", 
                  fontWeight: 600, 
                  lineHeight: 1,
                  color: "rgba(255,255,255,0.9)",
                  textShadow: "0 1px 2px rgba(0,0,0,0.3)"
                }}>
                  {Math.round(weather.apparentTemperature)}°C
                </Typography>
              </Box>
            )}
          </Box>
        </>
      ) : (
        <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>Yükleniyor...</Typography>
      )}
    </Box>
  );
};

export default WeatherWidget;
