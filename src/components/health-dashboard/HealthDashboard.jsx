import React, { useState, useEffect, useContext } from "react";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { db } from "../auth/firebaseConfig";
import { toast } from "react-toastify";
import {
  Box,
  CircularProgress,
  Grid,
  Typography,
  Card,
  CardContent,
  Avatar,
  useTheme,
  Button,
  useMediaQuery,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Container,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
} from "@mui/material";
import {
  FitnessCenter,
  Refresh,
  LocalHospital,
  Cake,
  Height,
  Scale,
  ExpandMore as ExpandMoreIcon,
  OpenInNew,
  ShoppingCart,
  PlayArrow,
  YouTube,
  Book,
  Article,
  Movie,
  Tv,
  Headphones,
  LocationOn,
  Park,
  DirectionsRun,
  Pool,
  SportsTennis,
  Hiking,
  DirectionsBike,
  FitnessCenter as GymIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { keyframes } from "@emotion/react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { styled, alpha } from "@mui/material/styles";
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { GlobalStateContext } from '../context/GlobalStateContext';

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
  100% { transform: translateY(0px); }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
`;

// Gemini AI konfigürasyonu
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "GEMINI_API_KEY");

const API_URL = "/api/qwen-proxy"; /* "http://localhost:3001/api/qwen-proxy"; */

// Konum verisi alma fonksiyonu
const getUserLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Tarayıcınız konum servisini desteklemiyor."));
      return;
    }

    // Konum izni durumunu kontrol et
    navigator.permissions.query({ name: 'geolocation' }).then((permissionStatus) => {
      if (permissionStatus.state === 'denied') {
        toast.warning("Konum izni reddedildi. Hava durumu gösterilemiyor.");
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve(position.coords);
        },
        (error) => {
          console.error('HealthDashboard - Konum hatası:', error);
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
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 dakika cache
        }
      );
    }).catch((error) => {
      console.error('HealthDashboard - İzin sorgulama hatası:', error);
      // Fallback olarak direkt konum iste
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position.coords),
        (error) => reject(new Error("Konum izni verilmedi"))
      );
    });
  });
};

// Koordinatları şehir ismine çeviren fonksiyon
const getCityFromCoordinates = async (latitude, longitude) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&accept-language=tr`
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

// Hava durumu verisi alma fonksiyonu
const getWeatherData = async (latitude, longitude) => {
  try {
    const response = await fetch(
      `${
        import.meta.env.VITE_OPEN_METEO_API_URL
      }?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,apparent_temperature,pressure_msl,cloud_cover,precipitation,rain,showers,snowfall,visibility,uv_index,is_day&timezone=Europe/Istanbul`
    );
    const data = await response.json();
    if (!data.current) {
      throw new Error("Hava durumu verisi alınamadı");
    }
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

// Rüzgar yönünü belirle
const getWindDirection = (degrees) => {
  const directions = ['K', 'KKD', 'KD', 'DKD', 'D', 'DGD', 'GD', 'GKD', 'G', 'GKB', 'KB', 'KKB'];
  const index = Math.round(degrees / 30) % 12;
  return directions[index];
};

// Konuma özel kapsamlı etkinlik önerileri
const getLocationBasedActivities = (city, weather, temperature) => {
  const activities = {
    outdoor: [],
    indoor: [],
    cultural: [],
    artistic: [],
    sports: [],
    wellness: [],
    weather_specific: []
  };

  // Hava durumuna göre temel aktiviteler (AI'ya gönderilecek)
  if (weather && temperature) {
    if (temperature > 25) {
      activities.weather_specific.push(
        "Güneş kremi kullanmayı unutmayın",
        "Bol su için",
        "Gölgeli alanları tercih edin",
        "Hafif kıyafetler giyin"
      );
    } else if (weather.weathercode >= 3) { // Yağmurlu/karlı
      activities.weather_specific.push(
        "Yağmurlu hava için kapalı aktiviteler önerilir",
        "Isınma hareketlerini ihmal etmeyin",
        "Sıcak içecekler tüketin"
      );
    }

    // Yeni hava durumu parametreleri için öneriler
    if (weather.windSpeed > 20) {
      activities.weather_specific.push(
        "Rüzgarlı havada dış aktiviteler için dikkatli olun",
        "Rüzgar sporları için ideal hava koşulları",
        "Su kaybınız artıyor, daha fazla su için"
      );
    }

    if (weather.uvIndex > 7) {
      activities.weather_specific.push(
        "Yüksek UV indeksi - güneş kremi kullanın",
        "Gölgeli aktiviteler tercih edin",
        "UV korumalı kıyafetler giyin"
      );
    }

    if (weather.cloudCover > 80) {
      activities.weather_specific.push(
        "Bulutlu hava - açık hava aktiviteleri için ideal",
        "Güneş yanığı riski düşük"
      );
    }

    if (weather.precipitation > 0 || weather.rain > 0 || weather.showers > 0) {
      activities.weather_specific.push(
        "Yağmurlu hava - kapalı spor salonları önerilir",
        "Yağmur sonrası temiz hava aktiviteleri",
        "Su geçirmez kıyafetler kullanın"
      );
    }

    if (weather.snowfall > 0) {
      activities.weather_specific.push(
        "Karlı hava - kış sporları için ideal",
        "Isınma hareketlerini ihmal etmeyin",
        "Kalın kıyafetler giyin"
      );
    }

    if (weather.visibility < 5) {
      activities.weather_specific.push(
        "Düşük görüş - dış aktiviteler için dikkatli olun",
        "Güvenlik için reflektörlü kıyafetler kullanın"
      );
    }

    if (weather.humidity > 80) {
      activities.weather_specific.push(
        "Yüksek nem - terleme artıyor",
        "Bol su için",
        "Hafif kıyafetler tercih edin"
      );
    } else if (weather.humidity < 30) {
      activities.weather_specific.push(
        "Düşük nem - cilt kuruluğu riski",
        "Nemlendirici kullanın",
        "Bol su için"
      );
    }
  }

  return activities;
};

const CUSTOMIZABLE_FIELDS = {
  mood: {
    label: 'Ruh Hali',
    icon: '😊',
    options: [
      'Mutlu', 'Stresli', 'Yorgun', 'Motivasyona ihtiyacım var', 'Rahatlamak istiyorum', 'Enerjik',
      'Odaklanmak istiyorum', 'Keyifsiz', 'Heyecanlı', 'Sakin', 'İlham arıyorum', 'Düşünceli',
      'Sosyal', 'Yalnız', 'Macera arıyorum', 'Kendimi geliştirmek istiyorum', 'Duygusal', 'Kendime vakit ayırmak istiyorum'
    ]
  },
  interest: {
    label: 'İlgi Alanı',
    icon: '⭐',
    options: [
      'Sağlık', 'Teknoloji', 'Sanat', 'Bilim', 'Kültür', 'Spor', 'Psikoloji', 'Felsefe', 'Tarih', 'Macera', 'Fantezi',
      'Müzik', 'Sinema', 'Doğa', 'Yemek', 'Seyahat', 'Kariyer', 'Kişisel Gelişim', 'Edebiyat', 'Fotoğrafçılık', 'Dijital Oyunlar',
      'Hayvanlar', 'Moda', 'Girişimcilik', 'Ekonomi', 'Sürdürülebilirlik', 'Astronomi', 'Robotik', 'Yazılım', 'Dünya Kültürleri', 'Yoga', 'Meditasyon'
    ]
  },
  nutrition: {
    label: 'Beslenme Tercihi',
    icon: '🥗',
    options: [
      'Vegan', 'Vejetaryen', 'Glutensiz', 'Düşük Karbonhidrat', 'Yüksek Protein', 'Fark etmez',
      'Akdeniz Diyeti', 'Ketojenik', 'Paleo', 'Düşük Yağlı', 'Dengeli', 'Aralıklı Oruç', 'Yüksek Lifli', 'Şekersiz', 'Organik', 'Yerel Ürünler', 'Sporcu Diyeti', 'Düşük Sodyum', 'Yüksek Demir', 'Yüksek Kalsiyum'
    ]
  },
  readingType: {
    label: 'Okuma Türü',
    icon: '📚',
    options: [
      'Roman', 'Kişisel Gelişim', 'Bilimsel', 'Makale', 'Biyografi', 'Felsefe', 'Kısa Hikaye', 'Fark etmez',
      'Şiir', 'Çizgi Roman', 'Deneme', 'Tarih', 'Psikoloji', 'Teknoloji', 'Sanat', 'Klasikler', 'Fantastik', 'Polisiye', 'Gerilim', 'Çocuk Kitabı', 'Gençlik', 'Motivasyon', 'Popüler Bilim', 'Seyahat', 'Sağlık', 'Ekonomi', 'Dünya Edebiyatı'
    ]
  },
  watchingType: {
    label: 'İzleme Türü',
    icon: '🎬',
    options: [
      'Belgesel', 'Film', 'Dizi', 'YouTube', 'Podcast', 'Fark etmez',
      'Kısa Film', 'Animasyon', 'Bilim Kurgu', 'Komedi', 'Dram', 'Aksiyon', 'Macera', 'Gerilim', 'Fantastik', 'Biyografi', 'Müzikal', 'Spor', 'Doğa', 'Sağlık', 'Teknoloji', 'Sanat', 'Kültür', 'Sosyal Medya', 'Motivasyon', 'Kariyer', 'Seyahat', 'Yemek', 'Müzik', 'Tarih', 'Çocuk', 'Aile', 'Reality Show', 'Talk Show', 'Eğitim', 'Kısa Video'
    ]
  },
};

const HealthDashboard = ({ user }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { healthDashboardState, setHealthDashboardState } = useContext(GlobalStateContext);
  const [healthData, setHealthData] = useState({
    recommendations: "",
    bmi: null,
    yesterdayWaterIntake: null, // yeni alan
    supplementConsumptionStats: null, // yeni alan
    recommendationsHistory: [],
  });
  const [profileData, setProfileData] = useState({
    firstName: "",
    birthDate: null,
    height: "",
    weight: "",
  });
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiCooldown, setApiCooldown] = useState(false);
  const [geminiUsage, setGeminiUsage] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [customizationOpen, setCustomizationOpen] = useState(false);
  const [customization, setCustomization] = useState({});
  // Global state'den değerleri al
  const { showSuccessNotification, notificationMessage, isGenerating } = healthDashboardState;
  
  // Global state güncelleme fonksiyonları
  const updateGlobalState = (updates) => {
    setHealthDashboardState(prev => ({ ...prev, ...updates }));
  };

  // Geçmişte kaydedilen öneriden seçim yapıldığında ana içerikte göster
  const handleSelectRecommendation = (rec) => {
    setRecommendations(rec.content);
    setShowHistory(false); // Seçim yapıldığında dropdown'ı kapat
  };

  useEffect(() => {
    const fetchGeminiUsage = async () => {
      const usageDocRef = doc(db, "users", user.uid, "apiUsage", "healthDashboard");
      const docSnap = await getDoc(usageDocRef);
      if (docSnap.exists()) {
        setGeminiUsage(docSnap.data());
      } else {
        // Eğer doküman yoksa oluştur
        const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
        const initialUsage = { date: todayStr, count: 0 };
        await setDoc(usageDocRef, initialUsage);
        setGeminiUsage(initialUsage);
      }
    };

    if (user) {
      fetchGeminiUsage();
    }
  }, [user]);

  // Gemini kullanım sınırını kontrol eden fonksiyon: Eğer kullanım sayısı 2'ye ulaşmışsa false döner.
  const canUseGemini = () => {
    if (!geminiUsage) return true; // Veriler henüz yüklenmediyse true döndür (buton aktif olsun)
    const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
    if (geminiUsage.date !== todayStr) return true; // Yeni gün, sayaç sıfırlanır
    return geminiUsage.count < 2;
  };

  // Gemini API kullanımı sonrası sayacı bir artıran fonksiyon
  const incrementGeminiUsage = async () => {
    const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
    const usageDocRef = doc(db, "users", user.uid, "apiUsage", "healthDashboard");
    let updatedUsage = { ...geminiUsage };
    if (geminiUsage.date !== todayStr) {
      updatedUsage = { date: todayStr, count: 1 };
    } else {
      updatedUsage.count += 1;
    }
    await updateDoc(usageDocRef, updatedUsage);
    setGeminiUsage(updatedUsage);
  };

  // Firebase'den kullanıcı verilerini çekiyoruz.
  const fetchAllData = async () => {
    try {
      const userRef = doc(db, "users", user.uid);

      // Tüm verileri tek seferde çekmek için Promise.all kullanalım
      const [userSnap, waterSnap, supplementsSnap, supplementStatsSnap] =
        await Promise.all([
          getDoc(userRef),
          getDoc(doc(db, "users", user.uid, "water", "current")),
          getDocs(collection(db, "users", user.uid, "supplements")),
          getDoc(doc(db, "users", user.uid, "stats", "supplementConsumption")),
        ]);

      // Su verilerini işleme
      const waterData = waterSnap.exists() ? waterSnap.data() : {};

      // Supplement istatistiklerini işleme
      const supplementStats = supplementStatsSnap.exists()
        ? supplementStatsSnap.data()
        : {};

      // Supplement listesini işleme
      const supplements = supplementsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Tüm verileri state'e kaydetme
      if (userSnap.exists()) {
        const data = userSnap.data();
        setProfileData({
          ...data.profile,
          birthDate: data.profile?.birthDate
            ? typeof data.profile.birthDate === "number"
              ? new Date(data.profile.birthDate * 1000)
              : new Date(data.profile.birthDate)
            : null,
        });

        // Öneri geçmişini tarih sırasına göre sırala (en son en üstte olacak)
        let recommendationHistory =
          data.healthData?.recommendationsHistory || [];

        // Tarih bilgisine göre sıralama yapmadan önce tarihleri karşılaştırılabilir format kontrolü
        const sortedHistory = [...recommendationHistory].sort((a, b) => {
          // Eğer tarih formatı ISO string ise doğrudan karşılaştır
          if (a.date.includes("T") && b.date.includes("T")) {
            return new Date(b.date) - new Date(a.date);
          }

          // Tarih formatı düz string ise, yeni Date nesnesi oluştur
          // Türkçe tarih formatını parse et (örn: "25 Şubat 2025 Salı")
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

        setHealthData((prev) => ({
          ...prev,
          ...data.healthData,
          supplements,
          waterData: {
            currentIntake: waterData.waterIntake || 0,
            target: waterData.dailyWaterTarget || 2000,
            history: waterData.history || [],
            yesterday: waterData.yesterdayWaterIntake || 0,
          },
          supplementStats,
          recommendationsHistory: sortedHistory,
        }));

        setRecommendations(data.healthData?.recommendations || null);
      }
    } catch (error) {
      toast.error("Veri yükleme hatası: " + error.message);
    }
  };

  const calculateBMI = () => {
    if (!profileData.height || !profileData.weight) return null;
    const heightInMeters = profileData.height / 100;
    const bmi = profileData.weight / (heightInMeters * heightInMeters);

    let status = "";
    if (bmi < 18.5) status = "Zayıf";
    else if (bmi < 24.9) status = "Normal";
    else if (bmi < 29.9) status = "Fazla Kilolu";
    else status = "Obez";

    return { value: bmi.toFixed(2), status };
  };

  // Öneri oluştururken, profil bilgileriyle birlikte yeni istatistikleri de API'ye gönderiyoruz.
  const generateRecommendations = async (customizationInput = customization) => {
    if (apiCooldown) return;
    if (!canUseGemini()) {
      toast.error("Gemini günde sadece iki kez kullanılabilir.");
      return;
    }
    
    // Başlangıç bildirimi göster
    updateGlobalState({
      isGenerating: true,
      notificationMessage: "🤖 AI önerilerinizi hazırlıyor... Lütfen bekleyin.",
      showSuccessNotification: true
    });
    
    setCustomizationOpen(false); // Pop-up'ı kapat
    setCustomization({}); // State'i sıfırla
    
    // Arka planda çalıştır
    generateRecommendationsAsync(customizationInput);
  };

  const generateRecommendationsAsync = async (customizationInput = customization) => {
    try {
      const age = profileData.age;
      const bmi = calculateBMI();

      // Konum ve hava durumu verisi al
      let locationData = null;
      let weatherData = null;
      let locationActivities = null;
      let cityInfo = null;

      try {
        const coords = await getUserLocation();
        locationData = coords;
        weatherData = await getWeatherData(coords.latitude, coords.longitude);
        cityInfo = await getCityFromCoordinates(coords.latitude, coords.longitude);
        locationActivities = getLocationBasedActivities(cityInfo?.city, weatherData, weatherData?.temperature);
      } catch (error) {
        console.warn("Konum verisi alınamadı:", error.message);
        // Varsayılan aktiviteler kullan
        locationActivities = getLocationBasedActivities("Bilinmeyen Konum", null, 20);
      }

      // Güncel tarih ve saat bilgisini 'Tarih ve Saat' olarak alıyoruz
      const currentDateTime = new Date().toLocaleString("tr-TR", {
        dateStyle: "full",
        timeStyle: "short",
      });

      // Son 10 öneri geçmişini al (tekrarları önlemek için)
      const last10Recommendations = (healthData.recommendationsHistory || [])
        .slice(0, 10)
        .map((rec, idx) => `#${idx + 1}: ${rec.content.substring(0, 300)}...`)
        .join("\n");

      // Son 10 önerinin meals kısmını da al
      const last10Meals = (healthData.recommendationsHistory || [])
        .slice(0, 10)
        .map((rec, idx) => {
          try {
            const jsonStart = rec.content.indexOf('{');
            const jsonEnd = rec.content.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1) {
              const parsed = JSON.parse(rec.content.substring(jsonStart, jsonEnd + 1));
              return `#${idx + 1}: Kahvaltı: ${parsed.sections?.nutrition?.meals?.breakfast || ''}, Öğle: ${parsed.sections?.nutrition?.meals?.lunch || ''}, Akşam: ${parsed.sections?.nutrition?.meals?.dinner || ''}, Ara: ${parsed.sections?.nutrition?.meals?.snacks || ''}`;
            }
          } catch {}
          return '';
        })
        .join('\n');

      // Son 10 okuma önerisi (books/articles)
      const last10Readings = (healthData.recommendationsHistory || [])
        .slice(0, 10)
        .map((rec, idx) => {
          try {
            const jsonStart = rec.content.indexOf('{');
            const jsonEnd = rec.content.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1) {
              const parsed = JSON.parse(rec.content.substring(jsonStart, jsonEnd + 1));
              const books = (parsed.sections?.reading?.books || []).map(b => b.title).join(', ');
              const articles = (parsed.sections?.reading?.articles || []).map(a => a.title).join(', ');
              return `#${idx + 1}: Kitaplar: ${books} | Makaleler: ${articles}`;
            }
          } catch {}
          return '';
        })
        .join('\n');

      // Son 10 izleme önerisi (videos/documentaries/series/podcasts)
      const last10Watchings = (healthData.recommendationsHistory || [])
        .slice(0, 10)
        .map((rec, idx) => {
          try {
            const jsonStart = rec.content.indexOf('{');
            const jsonEnd = rec.content.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1) {
              const parsed = JSON.parse(rec.content.substring(jsonStart, jsonEnd + 1));
              const videos = (parsed.sections?.watching?.videos || []).map(v => v.title).join(', ');
              const documentaries = (parsed.sections?.watching?.documentaries || []).map(d => d.title).join(', ');
              const series = (parsed.sections?.watching?.series || []).map(s => s.title).join(', ');
              const podcasts = (parsed.sections?.watching?.podcasts || []).map(p => p.title).join(', ');
              return `#${idx + 1}: Videolar: ${videos} | Belgeseller: ${documentaries} | Diziler: ${series} | Podcastler: ${podcasts}`;
            }
          } catch {}
          return '';
        })
        .join('\n');

      // Özelleştirme alanlarını prompta ekle (sadece mevcut başlıklarla eşleşenler)
      let customizationPrompt = '';
      Object.entries(customizationInput || {}).forEach(([key, value]) => {
        if (CUSTOMIZABLE_FIELDS[key] && value && value !== 'Fark etmez') {
          customizationPrompt += `\n${CUSTOMIZABLE_FIELDS[key].label}: ${value}`;
        }
      });

      const prompt = `Kullanıcı bilgileri:
İsim: ${profileData.firstName || "Belirtilmemiş"},
Yaş: ${age || "Belirtilmemiş"},
Cinsiyet: ${profileData.gender || "Belirtilmemiş"},
Boy: ${profileData.height || "Belirtilmemiş"} cm,
Kilo: ${profileData.weight || "Belirtilmemiş"} kg,
${bmi ? `VKİ: ${bmi.value} (${bmi.status})` : ""}
${customizationPrompt}

Konum ve Hava Durumu:
${cityInfo ? `Şehir: ${cityInfo.city}, ${cityInfo.country}` : "Konum: Belirtilmemiş"}
${cityInfo && cityInfo.fullAddress ? `, Yakın Çevre: ${cityInfo.fullAddress}` : ''}
 ${weatherData ? `Sıcaklık: ${weatherData.temperature}°C, Hissedilen: ${weatherData.apparentTemperature}°C, Nem: ${weatherData.humidity}%, Rüzgar: ${weatherData.windSpeed} km/s (${getWindDirection(weatherData.windDirection)}), Basınç: ${weatherData.pressure} hPa, UV İndeksi: ${weatherData.uvIndex}, Bulut Oranı: ${weatherData.cloudCover}%, Yağış: ${weatherData.precipitation}mm, Görüş: ${weatherData.visibility}km, ${weatherData.isDay ? 'Gündüz' : 'Gece'}` : "Hava durumu: Belirtilmemiş"}

Su Tüketimi:
- Dün içilen: ${healthData.waterData?.yesterday || 0} ml
- Hedef: ${healthData.waterData?.target || 2000} ml
- Bugünkü içilen: ${healthData.waterData?.currentIntake || 0} ml

Takviyeler:Kalan/Toplam Miktar:
${
  healthData.supplements
    ?.map((s) => `- ${s.name} (${s.quantity}/${s.initialQuantity})`)
    .join("\n") || "Kayıtlı takviye yok"
}

Son 7 Gün Takviye Kullanımı:
${JSON.stringify(healthData.supplementStats, null, 2) || "Veri yok"}

Tarih ve Saat: ${currentDateTime}

🌟 UYGULAMA ÖZELLİKLERİ:
Bu uygulama çok kapsamlı bir sağlık takip uygulamasıdır ve şu özelliklere sahiptir:

💧 DETAYLI SU TAKİBİ:
- Günlük su hedefi belirleme ve takip
- Akıllı su hatırlatıcıları (hava durumu, aktivite seviyesi, kişisel tercihlere göre)
- Su içme geçmişi ve istatistikleri
- Farklı içecek türleri (su, çay, kahve, spor içeceği vb.) takibi
- Hava durumuna göre su ihtiyacı önerileri
- Motivasyonel mesajlar ve başarı kutlamaları

💊 TAKVİYE TAKİBİ:
- Detaylı takviye envanteri (miktar, kalan süre, günlük kullanım)
- Akıllı takviye hatırlatıcıları
- Takviye tüketim istatistikleri ve trendleri
- Takviye bitme uyarıları
- Kişiselleştirilmiş takviye önerileri

🏃‍♂️ AI EGZERSİZ RUTİN:
- Kişiselleştirilmiş egzersiz programları (yaş, cinsiyet, hedefler, fitness seviyesi)
- Detaylı egzersiz açıklamaları ve teknikleri
- Aşamalı program ilerlemesi
- Egzersiz geçmişi ve performans takibi
- Motivasyonel egzersiz önerileri

📅 AKILLI TAKVİM:
- Günlük rutin planlama ve takip
- Rutin hatırlatıcıları ve bildirimleri
- Aylık rutin görünümü
- Rutin tamamlama istatistikleri
- Kişiselleştirilmiş rutin önerileri

🎯 DİĞER ÖZELLİKLER:
- VKİ hesaplama ve analizi
- Hava durumu entegrasyonu
- Konum bazlı aktivite önerileri
- Kişiselleştirilmiş beslenme önerileri
- Okuma ve izleme önerileri
- Motivasyonel mesajlar
- Kapsamlı sağlık istatistikleri

🌟 *Kişiselleştirilmiş Sağlık Rehberi* 🌟

Aşağıdaki JSON formatında kesinlikle 3000 karakteri geçmeyen bir sağlık rehberi hazırla:

{
  "title": "🏥 KİŞİSELLEŞTİRİLMİŞ SAĞLIK REHBERİ",
  "summary": "Kullanıcının mevcut durumuna göre hazırlanmış kapsamlı sağlık önerileri",
  "sections": {
    "waterIntake": {
      "title": "💧 Su Tüketimi Analizi",
      "content": "Hidrasyon durumu ve yaratıcı su içme taktikleri (300-400 karakter)",
      "icon": "🧊",
      "tips": ["İpucu 1", "İpucu 2", "İpucu 3"]
    },
    "supplements": {
      "title": "💊 Takviye Kullanım Rehberi",
      "content": "Kullanım trendleri ve uzman görüşü (300-400 karakter)",
      "icon": "💡",
      "recommendations": ["Öneri 1", "Öneri 2"],
      "currentSupplements": [
        {
          "name": "Takviye Adı",
          "benefit": "Faydası",
          "dosage": "Dozajı",
          "timing": "Kullanım zamanı",
          "caution": "Dikkat edilmesi gerekenler",
          "naturalSources": "Doğal kaynaklar",
          "scientificExplanation": "Bilimsel açıklama"
        }
      ],
      "extraSuggestions": [
        {
          "name": "Ekstra Takviye Adı",
          "benefit": "Faydası",
          "dosage": "Dozajı",
          "timing": "Kullanım zamanı",
          "caution": "Dikkat edilmesi gerekenler",
          "naturalSources": "Doğal kaynaklar",
          "scientificExplanation": "Bilimsel açıklama"
        }
      ]
    },
    "bmiAnalysis": {
      "title": "📊 VKİ Bilimsel Analizi",
      "content": "Mevcut değerin detaylı analizi ve öneriler (300-400 karakter)",
      "icon": "📈",
      "status": "Mevcut durum",
      "advice": "Uzman tavsiyesi"
    },
    "locationBasedActivities": {
      "title": "📍 ${cityInfo?.city || "Konum"} Özel Etkinlik Önerileri",
      "content": "${cityInfo?.city || "Bulunduğunuz konum"} ve hava durumuna göre kapsamlı etkinlik önerileri (300-400 karakter)",
      "icon": "🌍",
      "cityName": "${cityInfo?.city || "Bilinmeyen Konum"}",
      "outdoorActivities": ["Yapay zeka tarafından oluşturulacak - ${cityInfo?.city || "konum"} için açık hava aktiviteleri"],
      "indoorActivities": ["Yapay zeka tarafından oluşturulacak - kapalı alan aktiviteleri"],
      "culturalActivities": ["Yapay zeka tarafından oluşturulacak - ${cityInfo?.city || "konum"} için kültürel etkinlikler"],
      "artisticActivities": ["Yapay zeka tarafından oluşturulacak - ${cityInfo?.city || "konum"} için sanatsal etkinlikler"],
      "sportsActivities": ["Yapay zeka tarafından oluşturulacak - ${cityInfo?.city || "konum"} için spor etkinlikleri"],
      "wellnessActivities": ["Yapay zeka tarafından oluşturulacak - wellness aktiviteleri"],
      "weatherTips": ${JSON.stringify(locationActivities?.weather_specific || [])},
      "locationInfo": {
        "city": "${cityInfo?.city || "Bilinmeyen Konum"}",
        "country": "${cityInfo?.country || "Türkiye"}",
        "temperature": ${weatherData?.temperature || "null"},
        "apparentTemperature": ${weatherData?.apparentTemperature || "null"},
        "humidity": ${weatherData?.humidity || "null"},
        "windSpeed": ${weatherData?.windSpeed || "null"},
        "windDirection": ${weatherData?.windDirection || "null"},
        "pressure": ${weatherData?.pressure || "null"},
        "weatherCondition": ${weatherData?.weathercode || "null"},
        "uvIndex": ${weatherData?.uvIndex || "null"},
        "cloudCover": ${weatherData?.cloudCover || "null"},
        "precipitation": ${weatherData?.precipitation || "null"},
        "rain": ${weatherData?.rain || "null"},
        "showers": ${weatherData?.showers || "null"},
        "snowfall": ${weatherData?.snowfall || "null"},
        "visibility": ${weatherData?.visibility || "null"},
        "isDay": ${weatherData?.isDay || "null"}
      }
    },
    "nutrition": {
      "title": "🥗 Beslenme Önerileri",
      "content": "Her seferinde farklı, mevsimsel, yöresel ve yaratıcı besin kombinasyonları (300-400 karakter). Son 10 öneride verilen öğünleri tekrar etme. Farklı mutfaklardan, farklı protein kaynakları ve sebzeler kullan. Klasiklerin dışına çık.",
      "icon": "🍎",
      "meals": {
        "breakfast": "Farklı ve yaratıcı bir kahvaltı önerisi",
        "lunch": "Farklı ve yaratıcı bir öğle yemeği önerisi",
        "dinner": "Farklı ve yaratıcı bir akşam yemeği önerisi",
        "snacks": "Farklı ve yaratıcı bir ara öğün önerisi"
      }
    },
    "recipe": {
      "title": "👨‍🍳 Şefin Önerisi",
      "content": "Sağlıklı bir tarif (300-400 karakter)",
      "icon": "🍽️",
      "recipeName": "Tarif adı",
      "ingredients": ["Malzeme 1", "Malzeme 2", "Malzeme 3"],
      "instructions": "Hazırlanış adımları",
      "localRecipes": [
        {
          "name": "Lokasyona özel yemek adı",
          "description": "Yemeğin kısa açıklaması",
          "ingredients": ["Malzeme 1", "Malzeme 2"],
          "instructions": "Hazırlanış adımları",
          "region": "${cityInfo?.city || 'Bilinmeyen Konum'}"
        }
      ]
    },
    "motivation": {
      "title": "🌟 Günün Motivasyonu",
      "content": "Bilimsel ilham sözü ve kişisel hedef (300-400 karakter)",
      "icon": "✨",
      "quote": "İlham verici söz",
      "dailyGoal": "Günlük hedef"
    },
    "reading": {
      "title": "📚 Okuma Önerileri",
      "content": "Her seferinde farklı, çeşitli, mevsimsel, kültürel ve yaratıcı kitap ve makale önerileri (300-400 karakter). Son 10 öneride verilen kitap ve makaleleri tekrar etme. Farklı tür, kategori, dil ve zorluk seviyelerinde öneriler sun.",
      "icon": "📖",
      "books": [
        {
          "title": "Kitap adı",
          "author": "Yazar adı",
          "description": "Kitap açıklaması",
          "category": "Kategori (Sağlık/Bilim/Bilim Kurgu/Sanat/Kültür/Felsefe/Tarih/Teknoloji/Psikoloji/Fantezi/Macera/Biyografi)",
          "language": "Dil (Türkçe/İngilizce)",
          "difficulty": "Zorluk (Başlangıç/Orta/İleri)",
          "pages": "Sayfa sayısı",
          "buyLink": "Satın alma linki (Kitapyurdu/İdefix/Amazon)",
          "pdfLink": "PDF linki (varsa)",
          "isbn": "ISBN numarası"
        }
      ],
      "articles": [
        {
          "title": "Makale başlığı",
          "source": "Kaynak",
          "url": "Link",
          "summary": "Özet",
          "category": "Kategori",
          "readingTime": "Okuma süresi"
        }
      ]
    },
    "watching": {
      "title": "📺 İzleme Önerileri",
      "content": "Her seferinde farklı, çeşitli, kültürel, eğitici ve yaratıcı video, dizi, belgesel ve podcast önerileri (300-400 karakter). Son 10 öneride verilen içerikleri tekrar etme. Farklı platform, tür, dil ve kategori kullan.",
      "icon": "🎬",
      "videos": [
        {
          "title": "Video başlığı",
          "channel": "Kanal adı",
          "duration": "Süre",
          "description": "Açıklama",
          "url": "YouTube linki",
          "category": "Kategori",
          "language": "Dil"
        }
      ],
      "documentaries": [
        {
          "title": "Dokümanter adı",
          "platform": "Platform (Netflix/TRT Belgesel/National Geographic/Prime Video)",
          "duration": "Süre",
          "description": "Açıklama",
          "category": "Kategori",
          "year": "Yıl",
          "watchLink": "İzleme linki",
          "trailerLink": "Fragman linki"
        }
      ],
      "series": [
        {
          "title": "Dizi adı",
          "platform": "Platform",
          "seasons": "Sezon sayısı",
          "episodes": "Bölüm sayısı",
          "description": "Açıklama",
          "category": "Kategori",
          "rating": "Yaş sınırı",
          "watchLink": "İzleme linki",
          "trailerLink": "Fragman linki"
        }
      ],
      "podcasts": [
        {
          "title": "Podcast adı",
          "host": "Sunucu",
          "episode": "Bölüm",
          "duration": "Süre",
          "description": "Açıklama",
          "category": "Kategori",
          "platform": "Platform",
          "listenLink": "Dinleme linki"
        }
      ]
    }
  },
  "priority": "En önemli 3 öneri",
  "nextSteps": "Yarın için plan"
}

🔍 *ÖNEMLİ KURALLAR:*
1. SADECE JSON formatında cevap ver, başka hiçbir metin ekleme
2. Her bölümü kullanıcının mevcut durumuna göre kişiselleştir
3. Bilimsel terimleri günlük dile çevir
4. Pozitif ve teşvik edici dil kullan
5. Kullanıcının yaş, cinsiyet, VKİ ve su/takviye verilerini dikkate al
6. Gerçekçi ve uygulanabilir öneriler ver
7. JSON formatını bozma, geçerli JSON olsun
8. Konuma özel aktivite önerilerinde şehir ismini, hava durumunu ve yakın çevreyi (ilçe, semt, mahalle, park, AVM, kütüphane, spor salonu, kültür merkezi vb.) dikkate al.
9. Kültürel, sanatsal, spor ve wellness aktivitelerini dengeli dağıt
10. Okuma önerilerinde çeşitli kategoriler kullan: Sağlık, Bilim, Bilim Kurgu, Sanat, Kültür, Felsefe, Tarih, Teknoloji, Psikoloji, Fantezi, Macera, Biyografi
11. Video önerilerinde farklı platformları dahil et: YouTube, Netflix, Disney+, Prime Video, TRT Belgesel, National Geographic
12. Kullanıcının yaşına ve ilgi alanlarına uygun içerik seç
13. Türkçe ve yabancı içerikleri dengeli dağıt
14. Hem eğitici hem eğlenceli içerikler öner
15. Takviye bölümünde currentSupplements alanını sadece kullanıcıda olanlar, extraSuggestions alanını ise kullanıcıda olmayan ama önerilen takviyeler için doldur. Her iki alanı da doldurmayı unutma. Her takviye için detaylı bilgi ver (name, benefit, dosage, timing, caution, naturalSources, scientificExplanation). Eğer öneri yoksa ilgili alanı boş dizi yap.
16. Beslenme önerilerinde bir öneri içinde balık, tavuk ve kırmızı etten sadece birini öner. Bir günde ikisi veya üçü asla birlikte olmasın. Eğer öğünde balık varsa, o gün başka bir öğünde tavuk veya kırmızı et olmasın. Aynı gün içinde sadece bir protein türü (balık, tavuk veya kırmızı et) olsun, diğerleri olmasın.
17. Recipe bölümünde mutlaka lokasyona özel (şehir veya ülke mutfağına ait) en az 1 yemek tarifi öner. Eğer şehir bilgisi yoksa Türkiye mutfağından öner.
18. Son 10 öneriyi tekrar etme, her seferinde farklı ve çeşitli öneriler üret. Daha önce önerilen kitap, film, dizi, tarif ve aktiviteleri tekrar etme.
19. Her öneri üretiminde farklı ve yaratıcı içerikler sunmak için çeşitliliğe öncelik ver.
20. Bugünün tarihi: ${currentDateTime}.
21. Eğer kullanıcıdan ilgi alanı veya ruh hali bilgisi gelirse, bunu da dikkate al.
22. Eğer öneri geçmişi varsa, işte son 10 öneri (tekrar etme!):\n${last10Recommendations}\n23. Son 10 öneride verilen öğünleri tekrar etme. İşte son 10 öğün önerisi: ${last10Meals}\n24. Son 10 okuma önerisindeki kitap ve makaleleri tekrar etme. İşte son 10 okuma önerisi: ${last10Readings}\n25. Son 10 izleme önerisindeki video, belgesel, dizi ve podcastleri tekrar etme. İşte son 10 izleme önerisi: ${last10Watchings}\n`

      // Gemini AI kullanarak öneri oluştur
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp", generationConfig: { temperature: 0.85, topP: 0.95 } });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const recommendationText = response.text();

      if (recommendationText) {
        const newRecommendation = {
          date: new Date().toISOString(), // ISO string formatında kaydet
          content: recommendationText,
          displayDate: currentDateTime, // Görüntüleme için ayrı bir alan
        };

        // Güncellenmiş öneri geçmişini oluştur
        const updatedHistory = [
          newRecommendation,
          ...(healthData.recommendationsHistory || []),
        ];

        await updateDoc(doc(db, "users", user.uid), {
          "healthData.recommendations": recommendationText,
          "healthData.lastUpdated": new Date().toISOString(),
          "healthData.recommendationsHistory": updatedHistory,
        });

        setRecommendations(recommendationText);
        setHealthData((prev) => ({
          ...prev,
          recommendationsHistory: updatedHistory,
        }));

        // İşlem başarılıysa Gemini kullanım sayacını artır
        incrementGeminiUsage();

        setApiCooldown(true);
        setTimeout(() => setApiCooldown(false), 60000);
        
        // Başarı bildirimi göster
        updateGlobalState({
          isGenerating: false,
          notificationMessage: "🎉 Kişiselleştirilmiş sağlık önerileriniz hazır!",
          showSuccessNotification: true
        });
        
        // Console log ekle
        console.log("✅ Gemini'den cevap geldi ve öneriler güncellendi:", {
          timestamp: new Date().toISOString(),
          recommendationLength: recommendationText.length,
          hasRecommendations: !!recommendationText
        });
        
        // 5 saniye sonra bildirimi kapat
        setTimeout(() => {
          updateGlobalState({ showSuccessNotification: false });
        }, 5000);
      }
    } catch (error) {
      console.error("Gemini API Hatası:", error);
      console.error("Hata Detayları:", error.response || error.message);
      
      // Hata bildirimi göster
      updateGlobalState({
        isGenerating: false,
        notificationMessage: "❌ Öneri oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.",
        showSuccessNotification: true
      });
      
      // 5 saniye sonra bildirimi kapat
      setTimeout(() => {
        updateGlobalState({ showSuccessNotification: false });
      }, 5000);
      
      if (error.message?.includes("400")) {
        toast.error("API anahtarı geçersiz veya model bulunamadı. Lütfen ayarları kontrol edin.");
      } else if (error.message?.includes("403")) {
        toast.error("API erişim izni yok. Lütfen API anahtarınızı kontrol edin.");
      } else if (error.message?.includes("429")) {
        toast.error("API kullanım limiti aşıldı. Lütfen daha sonra tekrar deneyin.");
      } else {
        toast.error("Öneri oluşturulamadı: " + error.message);
      }
    }
  };

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  // Öneri metnini JSON formatında parse ediyoruz.
  const parseRecommendations = () => {
    if (!recommendations) return { parsedData: null, fallbackData: null };

    try {
      // JSON'u temizle ve parse et
      let cleanText = recommendations.trim();
      
      // Eğer JSON başlangıcı ve bitişi varsa, sadece o kısmı al
      const jsonStart = cleanText.indexOf('{');
      const jsonEnd = cleanText.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1) {
        cleanText = cleanText.substring(jsonStart, jsonEnd + 1);
      }
      
      // JSON'u parse et
      const parsedData = JSON.parse(cleanText);
      
      // Gerekli alanları kontrol et ve varsayılan değerler ata
      const validatedData = {
        title: parsedData.title || '🏥 KİŞİSELLEŞTİRİLMİŞ SAĞLIK REHBERİ',
        summary: parsedData.summary || 'Kişiselleştirilmiş sağlık önerileri',
        sections: parsedData.sections || {},
        priority: parsedData.priority || 'Önemli öneriler',
        nextSteps: parsedData.nextSteps || 'Yarın için plan'
      };
      
      return { parsedData: validatedData, fallbackData: null };
      
    } catch (error) {
      // Fallback: Eski parse yöntemini dene
      return { parsedData: null, fallbackData: parseRecommendationsFallback() };
    }
  };

  // Eski parse yöntemi (fallback için)
  const parseRecommendationsFallback = () => {
    if (!recommendations) return { preamble: null, sections: [] };

    const lines = recommendations.split("\n");
    let preamble = null;
    let sections = [];
    let currentSection = null;

    // İlk satır bir header değilse preamble olarak alıyoruz.
    if (lines.length > 0 && !lines[0].match(/^\d+\.\s/)) {
      preamble = lines[0].trim();
    }

    // Eğer preamble varsa, döngüye ikinci satırdan başlıyoruz.
    const startIndex = preamble ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === "") continue;

      // Eğer satır, "numara nokta boşluk" formatında başlıyorsa:
      if (line.match(/^\d+\.\s/)) {
        // Eğer hemen önceki satır "Hazırlanışı:" ile bitiyorsa, bu satırı alt madde olarak kabul et.
        if (i > 0 && lines[i - 1].trim().endsWith("Hazırlanışı:")) {
          if (currentSection) {
            currentSection.content += "\n" + line;
          } else {
            preamble = (preamble ? preamble + "\n" : "") + line;
          }
        } else {
          // Yeni bölüm başlığı olduğunu varsayalım.
          if (currentSection) {
            sections.push(currentSection);
          }
          const match = line.match(/^(\d+)\.\s*(.+)$/);
          const number = match ? match[1] : null;
          const heading = match ? match[2] : line;
          currentSection = { number, heading, content: "" };
        }
      } else {
        // Satır, header formatında değilse, mevcut bölümün içeriğine ekle.
        if (currentSection) {
          currentSection.content += (currentSection.content ? "\n" : "") + line;
        } else {
          preamble = (preamble ? preamble + "\n" : "") + line;
        }
      }
    }
    if (currentSection) {
      sections.push(currentSection);
    }
    return { preamble, sections };
  };

  const parsed = parseRecommendations();

  const MetricCard = ({ icon, title, value, unit, color }) => (
    <Card
      sx={{
        background:
          theme.palette.mode === "dark"
            ? `linear-gradient(45deg, ${color}20 30%, ${color}10 90%)`
            : `linear-gradient(45deg, ${color}10 30%, ${color}05 90%)`,
        border: `1px solid ${color}30`,
        borderRadius: "16px",
        p: 2,
        height: "100%",
        transition: "transform 0.3s ease",
        "&:hover": { transform: "translateY(-4px)" },
      }}
    >
      <Box display="flex" alignItems="center" gap={2}>
        <Avatar
          sx={{
            bgcolor: `${color}20`,
            color: color,
            borderRadius: "12px",
            width: 44,
            height: 44,
          }}
        >
          {icon}
        </Avatar>
        <Box>
          <Typography variant="body2" color="textSecondary">
            {title}
          </Typography>
          <Box display="flex" alignItems="baseline" gap={1}>
            <Typography variant="h6" fontWeight={600}>
              {value || "-"}
            </Typography>
            {unit && (
              <Typography variant="body2" color="textSecondary">
                {unit}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    </Card>
  );

  // Pop-up açma fonksiyonu
  const handleOpenCustomization = () => {
    setCustomizationOpen(true);
  };
  const handleCloseCustomization = () => {
    setCustomizationOpen(false);
  };
  const handleCustomizationChange = (field, value) => {
    setCustomization((prev) => ({ ...prev, [field]: value }));
  };
  const handleCustomizationClear = () => {
    setCustomization({});
  };

  return (
    <Box
      sx={{
        background: "linear-gradient(135deg, #dbe9ff 0%, #f0f5ff 100%)",
        minHeight: "100vh",
        p: isMobile ? 1 : 4,
      }}
    >
      <Box sx={{ maxWidth: 1440, margin: "0 auto" }}>
        {/* Header */}
        <Box
          sx={{
            background:
              "linear-gradient(135deg, #1a2a6c 0%, #2196F3 50%, #3F51B5 100%)",
            borderRadius: 4,
            p: { xs: 2, md: 4 },
            mb: 4,
            boxShadow: 3,
          }}
        >
          <Box
            display="flex"
            flexDirection={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", sm: "center" }}
            gap={{ xs: 2, sm: 0 }}
          >
            <Box>
              <Typography
                variant="h2"
                sx={{
                  textAlign: "center",
                  color: "#fff",
                  fontWeight: 800,
                  mb: { xs: 2, sm: 3, md: 6 },
                  mr: { xs: 0, sm: 7 },
                  textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
                  animation: `${fadeIn} 1s ease, ${float} 6s ease-in-out infinite`,
                  fontSize: { xs: "1.5rem", sm: "2rem", md: "3rem", lg: "4rem" },
                }}
              >
                <LocalHospital
                  sx={{
                    fontSize: { xs: 24, sm: 30, md: 50 },
                    verticalAlign: "middle",
                    mr: { xs: 1, md: 2 },
                  }}
                />
                Sağlık Panosu
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: "#fff",
                  textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
                  animation: `${float} 6s ease-in-out infinite`,
                  fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" },
                  textAlign: { xs: "center", sm: "left" },
                }}
              >
                {new Date().toLocaleDateString("tr-TR", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={handleOpenCustomization}
              disabled={apiCooldown || !canUseGemini() || isGenerating}
              sx={{
                borderRadius: "12px",
                py: { xs: 1, md: 1.5 },
                px: { xs: 2, md: 4 },
                fontWeight: 600,
                textTransform: "none",
                background: "rgba(255,255,255,0.2)",
                backdropFilter: "blur(10px)",
                fontSize: { xs: "0.75rem", sm: "0.8rem", md: "inherit" },
                whiteSpace: "nowrap",
                "&:hover": { background: "rgba(255,255,255,0.3)" },
              }}
            >
              {isGenerating ? "AI Önerileri Hazırlanıyor..." :
               !canUseGemini() ? "Günlük Limit Doldu" : 
               "Günlük Kişisel Önerini Oluştur"}
            </Button>
          </Box>
        </Box>
        {/* Metrikler */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {[
            {
              icon: <Cake sx={{ fontSize: { xs: 20, md: 24 } }} />,
              title: "Yaş",
              value: profileData.age,
              color: theme.palette.secondary.main,
            },
            {
              icon: <Height sx={{ fontSize: { xs: 20, md: 24 } }} />,
              title: "Boy",
              value: profileData.height,
              unit: "cm",
              color: theme.palette.info.main,
            },
            {
              icon: <Scale sx={{ fontSize: { xs: 20, md: 24 } }} />,
              title: "Kilo",
              value: profileData.weight,
              unit: "kg",
              color: theme.palette.warning.main,
            },
            {
              icon: <FitnessCenter sx={{ fontSize: { xs: 20, md: 24 } }} />,
              title: "VKİ",
              value: calculateBMI()?.value,
              unit: calculateBMI()?.status,
              color: theme.palette.success.main,
            },
          ].map((metric, index) => (
            <Grid item xs={6} sm={6} md={3} key={index}>
              <MetricCard {...metric} />
            </Grid>
          ))}
        </Grid>
        {/* Kişiselleştirilmiş Öneriler Header with Accordion for History */}
        <Box
          display="flex"
          flexDirection={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }}
          mb={3}
          position="relative"
          gap={{ xs: 2, sm: 0 }}
        >
          <Typography
            variant="h4"
            fontWeight={700}
            sx={{
              fontFamily: '"Montserrat", sans-serif',
              letterSpacing: "0.5px",
              color: "#1a2a6c",
              fontSize: { xs: "1.2rem", sm: "1.5rem", md: "1.875rem" },
              textAlign: { xs: "center", sm: "left" },
            }}
          >
            Kişiselleştirilmiş Öneriler
          </Typography>

          {/* Geçmiş Öneriler Panel */}
          <Box sx={{ position: "relative", display: "inline-block" }}>
            <Button
              variant="outlined"
              endIcon={<ExpandMoreIcon />}
              onClick={(e) => setShowHistory(!showHistory)}
              sx={{
                borderRadius: "12px",
                py: { xs: 0.5, md: 1 },
                px: { xs: 2, md: 3 },
                fontWeight: 600,
                color: "#1a2a6c",
                borderColor: "#1a2a6c",
                fontSize: { xs: "0.75rem", md: "inherit" },
                "&:hover": { borderColor: "#2196F3" },
              }}
            >
              Geçmiş Öneriler
            </Button>
            {showHistory && (
              <Box
                sx={{
                  position: "absolute",
                  right: 0,
                  top: "100%",
                  mt: 1,
                  width: { xs: 280, sm: 300 },
                  maxHeight: 400,
                  bgcolor: "background.paper",
                  borderRadius: "12px",
                  boxShadow: 3,
                  zIndex: 999,
                  overflow: "hidden",
                  border: "1px solid #e0e0e0",
                }}
              >
                <Box sx={{ p: 2, borderBottom: "1px solid #e0e0e0" }}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    Önceki Öneriler
                  </Typography>
                </Box>
                <Box sx={{ maxHeight: 350, overflow: "auto" }}>
                  {healthData.recommendationsHistory && healthData.recommendationsHistory.length > 0 ? (
                    healthData.recommendationsHistory.map((rec, index) => (
                      <Box
                        key={index}
                        sx={{
                          p: 2,
                          borderBottom: "1px solid #f0f0f0",
                          cursor: "pointer",
                          "&:hover": { bgcolor: "#f5f5f5" },
                        }}
                        onClick={() => handleSelectRecommendation(rec)}
                      >
                        <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                          {rec.displayDate || new Date(rec.date).toLocaleDateString("tr-TR")}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ fontSize: "0.8rem" }}>
                          {rec.content.substring(0, 100)}...
                        </Typography>
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body2" color="textSecondary" sx={{ p: 2 }}>
                      Önceki öneri bulunamadı.
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
          </Box>
        </Box>
        {/* Kişiselleştirilmiş Öneriler Content */}
        {/* JSON Format Render */}
        {parsed.parsedData ? (
          <Box>
            {/* Başlık ve Özet */}
            <Card
              sx={{
                width: "100%",
                mb: 4,
                background:
                  "linear-gradient(135deg, #1a2a6c 0%, #2196F3 50%, #3F51B5 100%)",
                borderRadius: "16px",
                boxShadow: 3,
              }}
            >
              <CardContent sx={{ color: "white", py: { xs: 3, md: 4 }, px: { xs: 2, md: 3 } }}>
                <Typography
                  variant="h4"
                  sx={{
                    textAlign: "center",
                    fontWeight: 700,
                    mb: 2,
                    fontSize: { xs: "1.2rem", sm: "1.5rem", md: "2rem" },
                  }}
                >
                  {parsed.parsedData.title}
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    textAlign: "center",
                    fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" },
                    lineHeight: 1.8,
                    opacity: 0.9,
                  }}
                >
                  {parsed.parsedData.summary}
                </Typography>
              </CardContent>
            </Card>

            {/* Bölümler */}
            <Grid container spacing={2}>
              {Object.entries(parsed.parsedData.sections).map(([key, section], index) => (
                <Grid item xs={12} sm={6} lg={4} key={key}>
                  <Card
                    sx={{
                      height: "400px", // Sabit yükseklik
                      background:
                        "linear-gradient(135deg, #1a2a6c 0%, #2196F3 50%, #3F51B5 100%)",
                      borderRadius: "16px",
                      transition:
                        "transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out",
                      "&:hover": {
                        transform: "translateY(-5px)",
                        boxShadow: theme.shadows[10],
                      },
                    }}
                  >
                    <CardContent sx={{ 
                      height: "100%", 
                      p: { xs: 2, md: 3 },
                      display: "flex",
                      flexDirection: "column",
                      overflow: "hidden"
                    }}>
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          height: "100%",
                          gap: 1.5,
                        }}
                      >
                        <Typography
                          variant="h6"
                          sx={{
                            color: "#fff",
                            borderBottom: "2px solid rgba(255,255,255,0.2)",
                            pb: 1.5,
                            mb: 1.5,
                            fontWeight: 700,
                            fontSize: { xs: "1rem", sm: "1.1rem", md: "1.25rem" },
                            letterSpacing: "0.5px",
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            wordBreak: "break-word",
                            flexShrink: 0, // Başlık sabit kalsın
                          }}
                        >
                          <span>{section.icon}</span>
                          {section.title}
                        </Typography>
                        
                        {/* Scrollable content area */}
                        <Box sx={{ 
                          flex: 1, 
                          overflow: "auto",
                          pr: 1, // Scroll bar için boşluk
                          "&::-webkit-scrollbar": {
                            width: "6px",
                          },
                          "&::-webkit-scrollbar-track": {
                            background: "rgba(255,255,255,0.1)",
                            borderRadius: "3px",
                          },
                          "&::-webkit-scrollbar-thumb": {
                            background: "rgba(255,255,255,0.3)",
                            borderRadius: "3px",
                            "&:hover": {
                              background: "rgba(255,255,255,0.5)",
                            },
                          },
                        }}>
                          <Typography
                            component="div"
                            sx={{
                              color: "rgba(255,255,255,0.95)",
                              fontSize: { xs: "0.8rem", sm: "0.85rem", md: "0.9rem" },
                              lineHeight: 1.6,
                              mb: 1.5,
                            }}
                          >
                            {section.content}
                          </Typography>

                          {/* Özel içerik türleri */}
                          {section.tips && (
                            <Box sx={{ mt: 1.5 }}>
                              <Typography variant="subtitle2" sx={{ color: "#fff", mb: 0.5, fontWeight: 600, fontSize: { xs: "0.75rem", md: "0.8rem" } }}>
                                💡 İpuçları:
                              </Typography>
                              <ul style={{ color: "rgba(255,255,255,0.9)", margin: 0, paddingLeft: 16, fontSize: { xs: "0.7rem", md: "0.75rem" } }}>
                                {section.tips.map((tip, idx) => (
                                  <li key={idx}>{tip}</li>
                                ))}
                              </ul>
                            </Box>
                          )}

                          {section.recommendations && (
                            <Box sx={{ mt: 1.5 }}>
                              <Typography variant="subtitle2" sx={{ color: "#fff", mb: 0.5, fontWeight: 600, fontSize: { xs: "0.75rem", md: "0.8rem" } }}>
                                📋 Öneriler:
                              </Typography>
                              <ul style={{ color: "rgba(255,255,255,0.9)", margin: 0, paddingLeft: 16, fontSize: { xs: "0.7rem", md: "0.75rem" } }}>
                                {section.recommendations
                                  .filter(rec => typeof rec === 'string')
                                  .map((rec, idx) => (
                                    <li key={idx}>{rec}</li>
                                  ))}
                              </ul>
                            </Box>
                          )}

                          {section.phases && (
                            <Box sx={{ mt: 1.5 }}>
                              <Typography variant="subtitle2" sx={{ color: "#fff", mb: 0.5, fontWeight: 600, fontSize: { xs: "0.75rem", md: "0.8rem" } }}>
                                📅 Aşamalar:
                              </Typography>
                              {section.phases.map((phase, idx) => (
                                <Box key={idx} sx={{ mb: 0.5, p: 0.5, bgcolor: "rgba(255,255,255,0.1)", borderRadius: 1 }}>
                                  <Typography variant="body2" sx={{ color: "#fff", fontWeight: 600, fontSize: { xs: "0.7rem", md: "0.8rem" } }}>
                                    {phase.phase}
                                  </Typography>
                                  <ul style={{ color: "rgba(255,255,255,0.9)", margin: "2px 0 0 0", paddingLeft: 16, fontSize: { xs: "0.65rem", md: "0.7rem" } }}>
                                    {phase.exercises.map((exercise, exIdx) => (
                                      <li key={exIdx}>{exercise}</li>
                                    ))}
                                  </ul>
                                </Box>
                              ))}
                            </Box>
                          )}

                          {section.meals && (
                            <Box sx={{ mt: 1.5 }}>
                              <Typography variant="subtitle2" sx={{ color: "#fff", mb: 0.5, fontWeight: 600, fontSize: { xs: "0.75rem", md: "0.8rem" } }}>
                                🍽️ Öğünler:
                              </Typography>
                              {Object.entries(section.meals).map(([mealType, meal]) => (
                                <Box key={mealType} sx={{ mb: 0.5 }}>
                                  <Typography variant="body2" sx={{ color: "#fff", fontWeight: 600, textTransform: "capitalize", fontSize: { xs: "0.7rem", md: "0.8rem" } }}>
                                    {mealType === "breakfast" ? "Kahvaltı" : 
                                     mealType === "lunch" ? "Öğle" : 
                                     mealType === "dinner" ? "Akşam" : "Ara Öğün"}: {meal}
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          )}

                          {section.ingredients && (
                            <Box sx={{ mt: 1.5 }}>
                              <Typography variant="subtitle2" sx={{ color: "#fff", mb: 0.5, fontWeight: 600, fontSize: { xs: "0.75rem", md: "0.8rem" } }}>
                                🥘 Malzemeler:
                              </Typography>
                              <ul style={{ color: "rgba(255,255,255,0.9)", margin: 0, paddingLeft: 16, fontSize: { xs: "0.7rem", md: "0.75rem" } }}>
                                {section.ingredients.map((ingredient, idx) => (
                                  <li key={idx}>{ingredient}</li>
                                ))}
                              </ul>
                            </Box>
                          )}

                          {section.instructions && (
                            <Box sx={{ mt: 1.5 }}>
                              <Typography variant="subtitle2" sx={{ color: "#fff", mb: 0.5, fontWeight: 600, fontSize: { xs: "0.75rem", md: "0.8rem" } }}>
                                👨‍🍳 Hazırlanış:
                              </Typography>
                              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.9)", fontSize: { xs: "0.7rem", md: "0.75rem" }, lineHeight: 1.5 }}>
                                {section.instructions}
                              </Typography>
                            </Box>
                          )}

                          {section.outdoorActivities && (
                            <Box sx={{ mt: 1.5 }}>
                              <Typography variant="subtitle2" sx={{ color: "#fff", mb: 0.5, fontWeight: 600, fontSize: { xs: "0.75rem", md: "0.8rem" } }}>
                                🌳 Açık Hava:
                              </Typography>
                              <ul style={{ color: "rgba(255,255,255,0.9)", margin: 0, paddingLeft: 16, fontSize: { xs: "0.7rem", md: "0.75rem" } }}>
                                {section.outdoorActivities.map((activity, idx) => (
                                  <li key={idx}>{activity}</li>
                                ))}
                              </ul>
                            </Box>
                          )}

                          {section.indoorActivities && (
                            <Box sx={{ mt: 1.5 }}>
                              <Typography variant="subtitle2" sx={{ color: "#fff", mb: 0.5, fontWeight: 600, fontSize: { xs: "0.75rem", md: "0.8rem" } }}>
                                🏠 Kapalı Alan:
                              </Typography>
                              <ul style={{ color: "rgba(255,255,255,0.9)", margin: 0, paddingLeft: 16, fontSize: { xs: "0.7rem", md: "0.75rem" } }}>
                                {section.indoorActivities.map((activity, idx) => (
                                  <li key={idx}>{activity}</li>
                                ))}
                              </ul>
                            </Box>
                          )}

                          {section.culturalActivities && (
                            <Box sx={{ mt: 1.5 }}>
                              <Typography variant="subtitle2" sx={{ color: "#fff", mb: 0.5, fontWeight: 600, fontSize: { xs: "0.75rem", md: "0.8rem" } }}>
                                🏛️ Kültürel:
                              </Typography>
                              <ul style={{ color: "rgba(255,255,255,0.9)", margin: 0, paddingLeft: 16, fontSize: { xs: "0.7rem", md: "0.75rem" } }}>
                                {section.culturalActivities.map((activity, idx) => (
                                  <li key={idx}>{activity}</li>
                                ))}
                              </ul>
                            </Box>
                          )}

                          {section.artisticActivities && (
                            <Box sx={{ mt: 1.5 }}>
                              <Typography variant="subtitle2" sx={{ color: "#fff", mb: 0.5, fontWeight: 600, fontSize: { xs: "0.75rem", md: "0.8rem" } }}>
                                🎨 Sanatsal:
                              </Typography>
                              <ul style={{ color: "rgba(255,255,255,0.9)", margin: 0, paddingLeft: 16, fontSize: { xs: "0.7rem", md: "0.75rem" } }}>
                                {section.artisticActivities.map((activity, idx) => (
                                  <li key={idx}>{activity}</li>
                                ))}
                              </ul>
                            </Box>
                          )}

                          {section.sportsActivities && (
                            <Box sx={{ mt: 1.5 }}>
                              <Typography variant="subtitle2" sx={{ color: "#fff", mb: 0.5, fontWeight: 600, fontSize: { xs: "0.75rem", md: "0.8rem" } }}>
                                ⚽ Spor:
                              </Typography>
                              <ul style={{ color: "rgba(255,255,255,0.9)", margin: 0, paddingLeft: 16, fontSize: { xs: "0.7rem", md: "0.75rem" } }}>
                                {section.sportsActivities.map((activity, idx) => (
                                  <li key={idx}>{activity}</li>
                                ))}
                              </ul>
                            </Box>
                          )}

                          {section.wellnessActivities && (
                            <Box sx={{ mt: 1.5 }}>
                              <Typography variant="subtitle2" sx={{ color: "#fff", mb: 0.5, fontWeight: 600, fontSize: { xs: "0.75rem", md: "0.8rem" } }}>
                                🧘‍♀️ Wellness:
                              </Typography>
                              <ul style={{ color: "rgba(255,255,255,0.9)", margin: 0, paddingLeft: 16, fontSize: { xs: "0.7rem", md: "0.75rem" } }}>
                                {section.wellnessActivities.map((activity, idx) => (
                                  <li key={idx}>{activity}</li>
                                ))}
                              </ul>
                            </Box>
                          )}

                          {section.weatherTips && section.weatherTips.length > 0 && (
                            <Box sx={{ mt: 1.5 }}>
                              <Typography variant="subtitle2" sx={{ color: "#fff", mb: 0.5, fontWeight: 600, fontSize: { xs: "0.75rem", md: "0.8rem" } }}>
                                🌤️ Hava Durumu İpuçları:
                              </Typography>
                              <ul style={{ color: "rgba(255,255,255,0.9)", margin: 0, paddingLeft: 16, fontSize: { xs: "0.7rem", md: "0.75rem" } }}>
                                {section.weatherTips.map((tip, idx) => (
                                  <li key={idx}>{tip}</li>
                                ))}
                              </ul>
                            </Box>
                          )}

                          {section.locationInfo && (
                            <Box sx={{ mt: 1.5, p: 1, bgcolor: "rgba(255,255,255,0.1)", borderRadius: 1 }}>
                              <Typography variant="subtitle2" sx={{ color: "#fff", mb: 0.5, fontWeight: 600, fontSize: { xs: "0.75rem", md: "0.8rem" } }}>
                                📍 Konum Bilgileri:
                              </Typography>
                              {section.locationInfo.city && (
                                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)", fontSize: { xs: "0.65rem", md: "0.7rem" }, mb: 0.25 }}>
                                  <LocationOn sx={{ fontSize: 12, mr: 0.5, verticalAlign: "middle" }} />
                                  {section.locationInfo.city}, {section.locationInfo.country}
                                </Typography>
                              )}
                              {section.locationInfo.temperature && (
                                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)", fontSize: { xs: "0.65rem", md: "0.7rem" } }}>
                                  🌡️ {section.locationInfo.temperature}°C
                                </Typography>
                              )}
                            </Box>
                          )}

                          {section.quote && (
                            <Box sx={{ mt: 1.5, p: 1.5, bgcolor: "rgba(255,255,255,0.1)", borderRadius: 2, textAlign: "center" }}>
                              <Typography variant="body2" sx={{ color: "#fff", fontStyle: "italic", mb: 0.5, fontSize: { xs: "0.7rem", md: "0.8rem" } }}>
                                "{section.quote}"
                              </Typography>
                              {section.dailyGoal && (
                                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)", fontWeight: 600, fontSize: { xs: "0.65rem", md: "0.75rem" } }}>
                                  🎯 {section.dailyGoal}
                                </Typography>
                              )}
                            </Box>
                          )}

                          {section.books && (
                            <Box sx={{ mt: 1.5 }}>
                              <Typography variant="subtitle2" sx={{ color: "#fff", mb: 0.5, fontWeight: 600, fontSize: { xs: "0.75rem", md: "0.8rem" } }}>
                                📚 Kitap Önerileri:
                              </Typography>
                              {section.books.slice(0, 2).map((book, idx) => (
                                <Box key={idx} sx={{ mb: 1, p: 1, bgcolor: "rgba(255,255,255,0.1)", borderRadius: 1 }}>
                                  <Typography variant="body2" sx={{ color: "#fff", fontWeight: 600, mb: 0.25, fontSize: { xs: "0.7rem", md: "0.8rem" } }}>
                                    "{book.title}" - {book.author}
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.9)", mb: 0.5, fontSize: { xs: "0.65rem", md: "0.75rem" } }}>
                                    {book.description}
                                  </Typography>
                                  <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                                    <Chip 
                                      label={book.category} 
                                      size="small" 
                                      sx={{ 
                                        bgcolor: "rgba(255,255,255,0.2)", 
                                        color: "#fff",
                                        fontSize: { xs: "0.55rem", md: "0.65rem" }
                                      }}
                                    />
                                    <Chip 
                                      label={book.language} 
                                      size="small" 
                                      sx={{ 
                                        bgcolor: "rgba(255,255,255,0.2)", 
                                        color: "#fff",
                                        fontSize: { xs: "0.55rem", md: "0.65rem" }
                                      }}
                                    />
                                  </Box>
                                </Box>
                              ))}
                            </Box>
                          )}

                          {section.articles && (
                            <Box sx={{ mt: 1.5 }}>
                              <Typography variant="subtitle2" sx={{ color: "#fff", mb: 0.5, fontWeight: 600, fontSize: { xs: "0.75rem", md: "0.8rem" } }}>
                                📰 Makale Önerileri:
                              </Typography>
                              {section.articles.slice(0, 2).map((article, idx) => (
                                <Box key={idx} sx={{ mb: 1, p: 1, bgcolor: "rgba(255,255,255,0.1)", borderRadius: 1 }}>
                                  <Typography variant="body2" sx={{ color: "#fff", fontWeight: 600, mb: 0.25, fontSize: { xs: "0.7rem", md: "0.8rem" } }}>
                                    {article.title}
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.9)", mb: 0.5, fontSize: { xs: "0.65rem", md: "0.75rem" } }}>
                                    {article.summary}
                                  </Typography>
                                  <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                                    <Chip 
                                      label={article.category} 
                                      size="small" 
                                      sx={{ 
                                        bgcolor: "rgba(255,255,255,0.2)", 
                                        color: "#fff",
                                        fontSize: { xs: "0.55rem", md: "0.65rem" }
                                      }}
                                    />
                                    <Chip 
                                      label={article.readingTime} 
                                      size="small" 
                                      sx={{ 
                                        bgcolor: "rgba(255,255,255,0.2)", 
                                        color: "#fff",
                                        fontSize: { xs: "0.55rem", md: "0.65rem" }
                                      }}
                                    />
                                  </Box>
                                </Box>
                              ))}
                            </Box>
                          )}

                          {section.videos && (
                            <Box sx={{ mt: 1.5 }}>
                              <Typography variant="subtitle2" sx={{ color: "#fff", mb: 0.5, fontWeight: 600, fontSize: { xs: "0.75rem", md: "0.8rem" } }}>
                                🎥 Video Önerileri:
                              </Typography>
                              {section.videos.slice(0, 2).map((video, idx) => (
                                <Box key={idx} sx={{ mb: 1, p: 1, bgcolor: "rgba(255,255,255,0.1)", borderRadius: 1 }}>
                                  <Typography variant="body2" sx={{ color: "#fff", fontWeight: 600, mb: 0.25, fontSize: { xs: "0.7rem", md: "0.8rem" } }}>
                                    {video.title}
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.9)", mb: 0.5, fontSize: { xs: "0.65rem", md: "0.75rem" } }}>
                                    {video.description}
                                  </Typography>
                                  <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                                    <Chip 
                                      label={video.category} 
                                      size="small" 
                                      sx={{ 
                                        bgcolor: "rgba(255,255,255,0.2)", 
                                        color: "#fff",
                                        fontSize: { xs: "0.55rem", md: "0.65rem" }
                                      }}
                                    />
                                    <Chip 
                                      label={video.duration} 
                                      size="small" 
                                      sx={{ 
                                        bgcolor: "rgba(255,255,255,0.2)", 
                                        color: "#fff",
                                        fontSize: { xs: "0.55rem", md: "0.65rem" }
                                      }}
                                    />
                                  </Box>
                                </Box>
                              ))}
                            </Box>
                          )}

                          {section.documentaries && (
                            <Box sx={{ mt: 1.5 }}>
                              <Typography variant="subtitle2" sx={{ color: "#fff", mb: 0.5, fontWeight: 600, fontSize: { xs: "0.75rem", md: "0.8rem" } }}>
                                📺 Belgesel Önerileri:
                              </Typography>
                              {section.documentaries.slice(0, 2).map((doc, idx) => (
                                <Box key={idx} sx={{ mb: 1, p: 1, bgcolor: "rgba(255,255,255,0.1)", borderRadius: 1 }}>
                                  <Typography variant="body2" sx={{ color: "#fff", fontWeight: 600, mb: 0.25, fontSize: { xs: "0.7rem", md: "0.8rem" } }}>
                                    {doc.title}
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.9)", mb: 0.5, fontSize: { xs: "0.65rem", md: "0.75rem" } }}>
                                    {doc.description}
                                  </Typography>
                                  <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                                    <Chip 
                                      label={doc.platform} 
                                      size="small" 
                                      sx={{ 
                                        bgcolor: "rgba(255,255,255,0.2)", 
                                        color: "#fff",
                                        fontSize: { xs: "0.55rem", md: "0.65rem" }
                                      }}
                                    />
                                    <Chip 
                                      label={doc.duration} 
                                      size="small" 
                                      sx={{ 
                                        bgcolor: "rgba(255,255,255,0.2)", 
                                        color: "#fff",
                                        fontSize: { xs: "0.55rem", md: "0.65rem" }
                                      }}
                                    />
                                  </Box>
                                </Box>
                              ))}
                            </Box>
                          )}

                          {section.series && (
                            <Box sx={{ mt: 1.5 }}>
                              <Typography variant="subtitle2" sx={{ color: "#fff", mb: 0.5, fontWeight: 600, fontSize: { xs: "0.75rem", md: "0.8rem" } }}>
                                📺 Dizi Önerileri:
                              </Typography>
                              {section.series.slice(0, 2).map((serie, idx) => (
                                <Box key={idx} sx={{ mb: 1, p: 1, bgcolor: "rgba(255,255,255,0.1)", borderRadius: 1 }}>
                                  <Typography variant="body2" sx={{ color: "#fff", fontWeight: 600, mb: 0.25, fontSize: { xs: "0.7rem", md: "0.8rem" } }}>
                                    {serie.title}
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.9)", mb: 0.5, fontSize: { xs: "0.65rem", md: "0.75rem" } }}>
                                    {serie.description}
                                  </Typography>
                                  <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                                    <Chip 
                                      label={serie.platform} 
                                      size="small" 
                                      sx={{ 
                                        bgcolor: "rgba(255,255,255,0.2)", 
                                        color: "#fff",
                                        fontSize: { xs: "0.55rem", md: "0.65rem" }
                                      }}
                                    />
                                    <Chip 
                                      label={`${serie.seasons} Sezon`} 
                                      size="small" 
                                      sx={{ 
                                        bgcolor: "rgba(255,255,255,0.2)", 
                                        color: "#fff",
                                        fontSize: { xs: "0.55rem", md: "0.65rem" }
                                      }}
                                    />
                                  </Box>
                                </Box>
                              ))}
                            </Box>
                          )}

                          {section.podcasts && (
                            <Box sx={{ mt: 1.5 }}>
                              <Typography variant="subtitle2" sx={{ color: "#fff", mb: 0.5, fontWeight: 600, fontSize: { xs: "0.75rem", md: "0.8rem" } }}>
                                🎧 Podcast Önerileri:
                              </Typography>
                              {section.podcasts.slice(0, 2).map((podcast, idx) => (
                                <Box key={idx} sx={{ mb: 1, p: 1, bgcolor: "rgba(255,255,255,0.1)", borderRadius: 1 }}>
                                  <Typography variant="body2" sx={{ color: "#fff", fontWeight: 600, mb: 0.25, fontSize: { xs: "0.7rem", md: "0.8rem" } }}>
                                    {podcast.title}
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.9)", mb: 0.5, fontSize: { xs: "0.65rem", md: "0.75rem" } }}>
                                    {podcast.description}
                                  </Typography>
                                  <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                                    <Chip 
                                      label={podcast.platform} 
                                      size="small" 
                                      sx={{ 
                                        bgcolor: "rgba(255,255,255,0.2)", 
                                        color: "#fff",
                                        fontSize: { xs: "0.55rem", md: "0.65rem" }
                                      }}
                                    />
                                    <Chip 
                                      label={podcast.duration} 
                                      size="small" 
                                      sx={{ 
                                        bgcolor: "rgba(255,255,255,0.2)", 
                                        color: "#fff",
                                        fontSize: { xs: "0.55rem", md: "0.65rem" }
                                      }}
                                    />
                                  </Box>
                                </Box>
                              ))}
                            </Box>
                          )}

                          {section.currentSupplements && Array.isArray(section.currentSupplements) && section.currentSupplements.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="subtitle2" sx={{ color: '#fff', mb: 1, fontWeight: 700, fontSize: { xs: '0.95rem', md: '1.1rem' } }}>
                                Kullandıkların
                              </Typography>
                              {section.currentSupplements.map((supp, idx) => (
                                <Card key={idx} sx={{ mb: 2, background: "rgba(255,255,255,0.08)", borderRadius: "12px", boxShadow: 2 }}>
                                  <CardContent sx={{ color: '#fff', py: { xs: 2, md: 2.5 }, px: { xs: 2, md: 3 } }}>
                                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#fff', fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' } }}>{supp.name}</Typography>
                                    {supp.benefit && <Typography sx={{ mb: 0.5, color: '#fff', fontSize: { xs: '0.85rem', md: '0.95rem' } }}><b>Fayda:</b> {supp.benefit}</Typography>}
                                    {supp.dosage && <Typography sx={{ mb: 0.5, color: '#fff', fontSize: { xs: '0.85rem', md: '0.95rem' } }}><b>Doz:</b> {supp.dosage}</Typography>}
                                    {supp.timing && <Typography sx={{ mb: 0.5, color: '#fff', fontSize: { xs: '0.85rem', md: '0.95rem' } }}><b>Zaman:</b> {supp.timing}</Typography>}
                                    {supp.caution && <Typography sx={{ mb: 0.5, color: '#fff', fontSize: { xs: '0.85rem', md: '0.95rem' } }}><b>Dikkat:</b> {supp.caution}</Typography>}
                                    {supp.naturalSources && <Typography sx={{ mb: 0.5, color: '#fff', fontSize: { xs: '0.85rem', md: '0.95rem' } }}><b>Doğal Kaynaklar:</b> {supp.naturalSources}</Typography>}
                                    {supp.scientificExplanation && <Typography sx={{ mb: 0.5, color: '#fff', fontSize: { xs: '0.85rem', md: '0.95rem' } }}><b>Bilimsel Açıklama:</b> {supp.scientificExplanation}</Typography>}
                                  </CardContent>
                                </Card>
                              ))}
                            </Box>
                          )}
                          {section.extraSuggestions && Array.isArray(section.extraSuggestions) && section.extraSuggestions.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="subtitle2" sx={{ color: '#fff', mb: 1, fontWeight: 700, fontSize: { xs: '0.95rem', md: '1.1rem' } }}>
                                Ekstra Önerilen Takviyeler
                              </Typography>
                              {section.extraSuggestions.map((supp, idx) => (
                                <Card key={idx} sx={{ mb: 2, background: "rgba(255,255,255,0.08)", borderRadius: "12px", boxShadow: 2 }}>
                                  <CardContent sx={{ color: '#fff', py: { xs: 2, md: 2.5 }, px: { xs: 2, md: 3 } }}>
                                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#fff', fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' } }}>{supp.name}</Typography>
                                    {supp.benefit && <Typography sx={{ mb: 0.5, color: '#fff', fontSize: { xs: '0.85rem', md: '0.95rem' } }}><b>Fayda:</b> {supp.benefit}</Typography>}
                                    {supp.dosage && <Typography sx={{ mb: 0.5, color: '#fff', fontSize: { xs: '0.85rem', md: '0.95rem' } }}><b>Doz:</b> {supp.dosage}</Typography>}
                                    {supp.timing && <Typography sx={{ mb: 0.5, color: '#fff', fontSize: { xs: '0.85rem', md: '0.95rem' } }}><b>Zaman:</b> {supp.timing}</Typography>}
                                    {supp.caution && <Typography sx={{ mb: 0.5, color: '#fff', fontSize: { xs: '0.85rem', md: '0.95rem' } }}><b>Dikkat:</b> {supp.caution}</Typography>}
                                    {supp.naturalSources && <Typography sx={{ mb: 0.5, color: '#fff', fontSize: { xs: '0.85rem', md: '0.95rem' } }}><b>Doğal Kaynaklar:</b> {supp.naturalSources}</Typography>}
                                    {supp.scientificExplanation && <Typography sx={{ mb: 0.5, color: '#fff', fontSize: { xs: '0.85rem', md: '0.95rem' } }}><b>Bilimsel Açıklama:</b> {supp.scientificExplanation}</Typography>}
                                  </CardContent>
                                </Card>
                              ))}
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Öncelik ve Sonraki Adımlar */}
            {(parsed.parsedData.priority || parsed.parsedData.nextSteps) && (
              <Grid container spacing={2} sx={{ mt: 3 }}>
                {parsed.parsedData.priority && (
                  <Grid item xs={12} md={6}>
                    <Card
                      sx={{
                        background: "linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)",
                        borderRadius: "16px",
                        boxShadow: 3,
                      }}
                    >
                      <CardContent sx={{ color: "white", py: { xs: 2, md: 3 }, px: { xs: 2, md: 3 } }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, fontSize: { xs: "1rem", md: "1.25rem" } }}>
                          🎯 Öncelikli Öneriler
                        </Typography>
                        <Typography variant="body1" sx={{ fontSize: { xs: "0.85rem", md: "1rem" } }}>
                          {parsed.parsedData.priority}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                {parsed.parsedData.nextSteps && (
                  <Grid item xs={12} md={6}>
                    <Card
                      sx={{
                        background: "linear-gradient(135deg, #FF9800 0%, #FFB74D 100%)",
                        borderRadius: "16px",
                        boxShadow: 3,
                      }}
                    >
                      <CardContent sx={{ color: "white", py: { xs: 2, md: 3 }, px: { xs: 2, md: 3 } }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, fontSize: { xs: "1rem", md: "1.25rem" } }}>
                          📅 Yarın İçin Plan
                        </Typography>
                        <Typography variant="body1" sx={{ fontSize: { xs: "0.85rem", md: "1rem" } }}>
                          {parsed.parsedData.nextSteps}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            )}
          </Box>
        ) : (
          /* Öneri yoksa boş durum */
          <Card
            sx={{
              width: "100%",
              background:
                "linear-gradient(135deg, #1a2a6c 0%, #2196F3 50%, #3F51B5 100%)",
              borderRadius: "16px",
              boxShadow: 3,
            }}
          >
            <CardContent sx={{ color: "white", py: { xs: 4, md: 6 }, px: { xs: 2, md: 3 }, textAlign: "center" }}>
              <Typography variant="h5" sx={{ mb: 2, fontWeight: 600, fontSize: { xs: "1.2rem", md: "1.5rem" } }}>
                🏥 Kişiselleştirilmiş Sağlık Rehberi
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9, fontSize: { xs: "0.9rem", md: "1rem" } }}>
                AI destekli sağlık önerilerinizi oluşturmak için yukarıdaki butona tıklayın.
              </Typography>
            </CardContent>
          </Card>
        )}
        
      </Box>
      <Dialog open={customizationOpen} onClose={handleCloseCustomization} PaperProps={{
        sx: {
          borderRadius: { xs: 0, sm: 4 },
          background: 'linear-gradient(135deg, #2196F3 0%, #21CBF3 100%)',
          color: '#fff',
          boxShadow: 8,
          minWidth: { xs: '100vw', sm: 320, md: 400 },
          width: { xs: '100vw', sm: '90vw', md: 480 },
          maxWidth: { xs: '100vw', sm: '90vw', md: 480 },
          height: { xs: '100vh', sm: 'auto' },
          maxHeight: { xs: '100vh', sm: 700 },
          p: 0,
          m: 0
        }
      }} fullScreen={typeof window !== 'undefined' && window.innerWidth < 600}>
        <DialogTitle sx={{
          fontWeight: 700,
          fontSize: { xs: '1.1rem', sm: '1.5rem' },
          textAlign: 'center',
          letterSpacing: 1,
          background: 'linear-gradient(135deg, #1976d2 0%, #21CBF3 100%)',
          color: '#fff',
          borderTopLeftRadius: { xs: 0, sm: 16 },
          borderTopRightRadius: { xs: 0, sm: 16 },
          py: { xs: 1.5, sm: 2 },
          px: { xs: 1, sm: 2 }
        }}>
          <span style={{fontSize: '2rem', marginRight: 8}}>✨</span>Kişisel Öneri Özelleştir
          <Typography variant="body2" sx={{ mt: 1, color: 'rgba(255,255,255,0.85)', fontWeight: 400, fontSize: { xs: '0.85rem', sm: '0.95rem' } }}>
            Daha motive edici, sana özel ve çeşitli öneriler için aşağıdaki alanları doldurabilirsin.
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ py: { xs: 2, sm: 3 }, px: { xs: 1, sm: 4 } }}>
          {Object.entries(CUSTOMIZABLE_FIELDS).map(([key, field]) => (
            <FormControl key={key} fullWidth margin="normal" sx={{ mb: { xs: 1.5, sm: 2 } }}>
              <InputLabel sx={{ color: '#fff', fontWeight: 600, fontSize: { xs: '0.95rem', sm: '1rem' } }}>{field.icon} {field.label}</InputLabel>
              <Select
                value={customization[key] || ''}
                label={field.label}
                onChange={e => handleCustomizationChange(key, e.target.value)}
                sx={{
                  background: 'rgba(255,255,255,0.08)',
                  color: '#fff',
                  borderRadius: 2,
                  fontWeight: 500,
                  fontSize: { xs: '0.95rem', sm: '1rem' },
                  '& .MuiSelect-icon': { color: '#fff' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#fff' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#FFD700' },
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      bgcolor: '#fff',
                      color: '#222',
                      borderRadius: 2,
                      boxShadow: 6,
                      maxHeight: 320,
                      fontSize: { xs: '0.95rem', sm: '1rem' }
                    }
                  }
                }}
              >
                <MenuItem value="">Seçiniz</MenuItem>
                {field.options.map(opt => (
                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                ))}
              </Select>
            </FormControl>
          ))}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: { xs: 1, sm: 3 }, pb: { xs: 1.5, sm: 2 } }}>
          <Button onClick={handleCustomizationClear} sx={{ color: '#fff', fontWeight: 600, textTransform: 'none', fontSize: { xs: '0.95rem', sm: '1rem' } }}>Temizle</Button>
          <Button onClick={handleCloseCustomization} sx={{ color: '#fff', fontWeight: 600, textTransform: 'none', fontSize: { xs: '0.95rem', sm: '1rem' } }}>Vazgeç</Button>
          <Button variant="contained" onClick={() => generateRecommendations(customization)} sx={{
            background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            color: '#222',
            fontWeight: 700,
            borderRadius: 2,
            px: { xs: 2, sm: 3 },
            boxShadow: 4,
            textTransform: 'none',
            fontSize: { xs: '0.95rem', sm: '1rem' },
            '&:hover': { background: 'linear-gradient(135deg, #38f9d7 0%, #43e97b 100%)' }
          }}>Öneri Oluştur</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HealthDashboard;
