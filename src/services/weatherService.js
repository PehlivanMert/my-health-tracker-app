import { toast } from "react-toastify";

export const getUserLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Tarayıcınız konum servisini desteklemiyor."));
      return;
    }

    navigator.permissions.query({ name: 'geolocation' }).then((permissionStatus) => {
      if (permissionStatus.state === 'denied') {
        toast.warning("Konum izni reddedildi. Hava durumu gösterilemiyor.");
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position.coords),
        (error) => {
          console.error('Konum hatası:', error);
          let errorMessage = "Konum alınamadı";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Konum izni verilmedi";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Konum bilgisi alınamadı";
              break;
            case error.TIMEOUT:
              errorMessage = "Konum alma zaman aşımına uğradı";
              break;
            default:
              errorMessage = "Konum alınırken bir hata oluştu";
          }
          reject(new Error(errorMessage));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    }).catch((error) => {
      console.error('İzin sorgulama hatası:', error);
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position.coords),
        (error) => reject(new Error("Konum izni verilmedi"))
      );
    });
  });
};

export const getCityFromCoordinates = async (latitude, longitude) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&accept-language=tr`
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
      
      return {
        city: city,
        country: data.address.country || "Türkiye",
        fullAddress: data.display_name || `${city}, ${data.address.country || "Türkiye"}`
      };
    }
    
    return {
      city: "Bilinmeyen Konum",
      country: "Türkiye",
      fullAddress: "Bilinmeyen Konum, Türkiye"
    };
    
  } catch (error) {
    console.error("Şehir ismi alınamadı:", error);
    return {
      city: "Bilinmeyen Konum",
      country: "Türkiye",
      fullAddress: "Bilinmeyen Konum, Türkiye"
    };
  }
};

export const getWeatherData = async (latitude, longitude) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_OPEN_METEO_API_URL}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,apparent_temperature,pressure_msl,cloud_cover,precipitation,rain,showers,snowfall,visibility,uv_index,is_day&timezone=Europe/Istanbul`
    );
    const data = await response.json();
    if (!data.current) throw new Error("Hava durumu verisi alınamadı");
    
    return {
      temperature: data.current.temperature_2m,
      humidity: data.current.relative_humidity_2m,
      weathercode: data.current.weather_code,
      windSpeed: data.current.wind_speed_10m,
      windDirection: data.current.wind_direction_10m,
      apparentTemperature: data.current.apparent_temperature,
      pressure: data.current.pressure_msl,
      cloudCover: data.current.cloud_cover,
      precipitation: data.current.precipitation,
      rain: data.current.rain,
      showers: data.current.showers,
      snowfall: data.current.snowfall,
      visibility: data.current.visibility,
      uvIndex: data.current.uv_index,
      isDay: data.current.is_day,
    };
  } catch (error) {
    console.error("Hava durumu hatası:", error.message);
    return null;
  }
};

export const getWindDirection = (degrees) => {
  const directions = ['K', 'KKD', 'KD', 'DKD', 'D', 'DGD', 'GD', 'GKD', 'G', 'GKB', 'KB', 'KKB'];
  const index = Math.round(degrees / 30) % 12;
  return directions[index];
};

export const getLocationBasedActivities = (city, weather, temperature) => {
  const activities = {
    outdoor: [], indoor: [], cultural: [], artistic: [], sports: [], wellness: [], weather_specific: []
  };

  if (weather && temperature) {
    if (temperature > 25) {
      activities.weather_specific.push("Güneş kremi kullanmayı unutmayın", "Bol su için", "Gölgeli alanları tercih edin", "Hafif kıyafetler giyin");
    } else if (weather.weathercode >= 3) {
      activities.weather_specific.push("Yağmurlu hava için kapalı aktiviteler önerilir", "Isınma hareketlerini ihmal etmeyin", "Sıcak içecekler tüketin");
    }

    if (weather.windSpeed > 20) {
      activities.weather_specific.push("Rüzgarlı havada dış aktiviteler için dikkatli olun", "Rüzgar sporları için ideal hava koşulları", "Su kaybınız artıyor, daha fazla su için");
    }

    if (weather.uvIndex > 7) {
      activities.weather_specific.push("Yüksek UV indeksi - güneş kremi kullanın", "Gölgeli aktiviteler tercih edin", "UV korumalı kıyafetler giyin");
    }

    if (weather.cloudCover > 80) {
      activities.weather_specific.push("Bulutlu hava - açık hava aktiviteleri için ideal", "Güneş yanığı riski düşük");
    }

    if (weather.precipitation > 0 || weather.rain > 0 || weather.showers > 0) {
      activities.weather_specific.push("Yağmurlu hava - kapalı spor salonları önerilir", "Yağmur sonrası temiz hava aktiviteleri", "Su geçirmez kıyafetler kullanın");
    }

    if (weather.snowfall > 0) {
      activities.weather_specific.push("Karlı hava - kış sporları için ideal", "Isınma hareketlerini ihmal etmeyin", "Kalın kıyafetler giyin");
    }

    if (weather.visibility < 5) {
      activities.weather_specific.push("Düşük görüş - dış aktiviteler için dikkatli olun", "Güvenlik için reflektörlü kıyafetler kullanın");
    }

    if (weather.humidity > 80) {
      activities.weather_specific.push("Yüksek nem - terleme artıyor", "Bol su için", "Hafif kıyafetler tercih edin");
    } else if (weather.humidity < 30) {
      activities.weather_specific.push("Düşük nem - cilt kuruluğu riski", "Nemlendirici kullanın", "Bol su için");
    }
  }

  return activities;
};
