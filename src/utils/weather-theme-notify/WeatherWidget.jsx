import React, { useState, useEffect } from "react";
import { Box, Typography, useMediaQuery, useTheme, Chip } from "@mui/material";
import { WiDaySunny, WiCloudy, WiRain, WiStrongWind, WiSnow, WiFog } from "react-icons/wi";
import { LocationOn, Opacity, Air, Thermostat } from "@mui/icons-material";
import { toast } from "react-toastify";

const WeatherWidget = () => {
  const [weather, setWeather] = useState(null);
  const [cityName, setCityName] = useState(null);
  const [loadingDone, setLoadingDone] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));

  // Koordinatlardan şehir ismini al
  const getCityFromCoordinates = async (lat, lon) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&accept-language=tr`
      );
      const data = await response.json();
      
      if (data && data.address) {
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
      const baseUrl = import.meta.env.VITE_OPEN_METEO_API_URL;
      if (!baseUrl) {
        throw new Error("VITE_OPEN_METEO_API_URL tanımlı değil");
      }
      const weatherResponse = await fetch(
        `${baseUrl}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,apparent_temperature,pressure_msl,cloud_cover,precipitation,rain,showers,snowfall,visibility,uv_index,is_day&timezone=Europe/Istanbul`
      );
      const weatherData = await weatherResponse.json();
      
      if (weatherData.current) {
        const weatherInfo = {
          temperature: weatherData.current.temperature_2m,
          weathercode: weatherData.current.weather_code,
          humidity: weatherData.current.relative_humidity_2m,
          windSpeed: weatherData.current.wind_speed_10m,
          windDirection: weatherData.current.wind_direction_10m,
          apparentTemperature: weatherData.current.apparent_temperature,
          pressure: weatherData.current.pressure_msl,
          cloudCover: weatherData.current.cloud_cover,
          precipitation: weatherData.current.precipitation,
          rain: weatherData.current.rain,
          showers: weatherData.current.showers,
          snowfall: weatherData.current.snowfall,
          visibility: weatherData.current.visibility,
          uvIndex: weatherData.current.uv_index,
          isDay: weatherData.current.is_day,
        };
        
        setWeather(weatherInfo);
      }

      const city = await getCityFromCoordinates(lat, lon);
      setCityName(city);
      setLoadingDone(true);
      
    } catch (error) {
      console.error(error);
      setLoadError(error?.message || "Hava durumu alınamadı");
      setLoadingDone(true);
      toast.error("Hava durumu alınamadı");
    }
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      toast.error("Tarayıcınız konum servisini desteklemiyor");
      setLoadError("Konum servisi desteklenmiyor");
      setLoadingDone(true);
      return;
    }

    navigator.permissions.query({ name: 'geolocation' }).then((permissionStatus) => {
      if (permissionStatus.state === 'denied') {
        toast.warning("Konum izni reddedildi. Hava durumu gösterilemiyor.");
        setLoadError("Konum izni reddedildi");
        setLoadingDone(true);
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeather(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.error('Konum hatası:', error);
          switch (error.code) {
            case error.PERMISSION_DENIED:
              toast.warning("Konum izni verilmedi. Hava durumu gösterilemiyor.");
              setLoadError("Konum izni verilmedi");
              break;
            case error.POSITION_UNAVAILABLE:
              toast.error("Konum bilgisi alınamadı");
              setLoadError("Konum bilgisi alınamadı");
              break;
            case error.TIMEOUT:
              toast.error("Konum alma zaman aşımına uğradı");
              setLoadError("Konum zaman aşımı");
              break;
            default:
              toast.error("Konum alınırken bir hata oluştu");
              setLoadError("Konum hatası");
          }
          setLoadingDone(true);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    }).catch((error) => {
      console.error('İzin sorgulama hatası:', error);
      navigator.geolocation.getCurrentPosition(
        (position) => fetchWeather(position.coords.latitude, position.coords.longitude),
        (error) => {
          toast.warning("Konum izni verilmedi");
          setLoadError("Konum izni verilmedi");
          setLoadingDone(true);
        }
      );
    });
  }, []);

  // Hava durumu ikonunu belirle
  const getWeatherIcon = (weathercode) => {
    if (weathercode < 2) return <WiDaySunny size={isMobile ? 24 : 28} />;
    if (weathercode < 4) return <WiCloudy size={isMobile ? 24 : 28} />;
    if (weathercode < 50) return <WiRain size={isMobile ? 24 : 28} />;
    if (weathercode < 70) return <WiSnow size={isMobile ? 24 : 28} />;
    if (weathercode < 80) return <WiRain size={isMobile ? 24 : 28} />;
    if (weathercode < 90) return <WiSnow size={isMobile ? 24 : 28} />;
    if (weathercode < 100) return <WiFog size={isMobile ? 24 : 28} />;
    return <WiDaySunny size={isMobile ? 24 : 28} />;
  };

  // Rüzgar yönünü belirle
  const getWindDirection = (degrees) => {
    const directions = ['K', 'KKD', 'KD', 'DKD', 'D', 'DGD', 'GD', 'GKD', 'G', 'GKB', 'KB', 'KKB'];
    const index = Math.round(degrees / 30) % 12;
    return directions[index];
  };

  // Hissedilen sıcaklık farkını belirle
  const getApparentTempDiff = () => {
    if (!weather?.apparentTemperature) {
      return null;
    }
    const diff = weather.apparentTemperature - weather.temperature;
    // Fark 1°C'den fazlaysa göster (daha hassas)
    if (Math.abs(diff) < 1) return null;
    return diff;
  };

  const handleWeatherClick = () => {
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
  };

  if (!weather && !loadError) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          p: 1,
          borderRadius: 2,
          bgcolor: "rgba(255,255,255,0.1)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.2)",
          minWidth: isMobile ? "120px" : "140px",
          height: isMobile ? "60px" : "70px",
          justifyContent: "center"
        }}
      >
        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.8)" }}>
          Yükleniyor...
        </Typography>
      </Box>
    );
  }

  if (!weather && loadError) {
    // Yükleme başarısızsa widget'ı minimal bir uyarı ile göster
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          p: 1,
          borderRadius: 2,
          bgcolor: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.15)",
          minWidth: isMobile ? "120px" : "140px",
          height: isMobile ? "60px" : "70px",
          justifyContent: "center"
        }}
      >
        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.8)" }}>
          Hava durumu yok
        </Typography>
      </Box>
    );
  }

  const apparentTempDiff = getApparentTempDiff();

  return (
    <Box
      onClick={handleWeatherClick}
      sx={{
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: isMobile ? 1 : 1.5,
        p: isMobile ? 1 : 1.5,
        borderRadius: 3,
        bgcolor: "rgba(255,255,255,0.1)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.2)",
        minWidth: isMobile ? "140px" : "180px",
        maxWidth: isMobile ? "160px" : "220px",
        height: isMobile ? "70px" : "80px",
        transition: "all 0.3s ease",
        "&:hover": {
          bgcolor: "rgba(255,255,255,0.15)",
          transform: "translateY(-2px)",
          boxShadow: "0 8px 25px rgba(0,0,0,0.15)"
        }
      }}
    >
      {/* Sol taraf - Ana hava durumu */}
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
        {getWeatherIcon(weather.weathercode)}
        <Typography 
          variant="body2" 
          sx={{ 
            fontWeight: 700, 
            fontSize: isMobile ? "0.9rem" : "1rem",
            lineHeight: 1,
            color: "rgba(255,255,255,0.95)",
            textShadow: "0 1px 2px rgba(0,0,0,0.3)"
          }}
        >
          {weather.apparentTemperature ? Math.round(weather.apparentTemperature) : Math.round(weather.temperature)}°
        </Typography>
      </Box>

      {/* Orta - Detaylar */}
      <Box sx={{ 
        display: "flex", 
        flexDirection: "column", 
        gap: 0.3,
        flex: 1,
        minWidth: 0
      }}>
        {/* Şehir adı */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.3 }}>
          <LocationOn sx={{ fontSize: isMobile ? 12 : 14, color: "rgba(255,255,255,0.8)" }} />
          <Typography 
            variant="caption" 
            sx={{ 
              fontSize: isMobile ? "0.7rem" : "0.75rem",
              fontWeight: 600, 
              color: "rgba(255,255,255,0.9)",
              textShadow: "0 1px 2px rgba(0,0,0,0.3)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}
          >
            {cityName}
          </Typography>
        </Box>

        {/* Nem ve rüzgar */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.2 }}>
            <Opacity sx={{ fontSize: isMobile ? 10 : 12, color: "rgba(255,255,255,0.7)" }} />
            <Typography 
              variant="caption" 
              sx={{ 
                fontSize: isMobile ? "0.65rem" : "0.7rem",
                fontWeight: 600,
                color: "rgba(255,255,255,0.8)",
                textShadow: "0 1px 2px rgba(0,0,0,0.3)"
              }}
            >
              {Math.round(weather.humidity)}%
            </Typography>
          </Box>
          
          {weather.windSpeed > 3 && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.2 }}>
              <Air sx={{ fontSize: isMobile ? 10 : 12, color: "rgba(255,255,255,0.7)" }} />
              <Typography 
                variant="caption" 
                sx={{ 
                  fontSize: isMobile ? "0.65rem" : "0.7rem",
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.8)",
                  textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                  whiteSpace: "nowrap"
                }}
              >
                {isMobile ? (
                  `${Math.round(weather.windSpeed)} ${getWindDirection(weather.windDirection)}`
                ) : (
                  `${Math.round(weather.windSpeed)} km/s ${getWindDirection(weather.windDirection)}`
                )}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default WeatherWidget;
