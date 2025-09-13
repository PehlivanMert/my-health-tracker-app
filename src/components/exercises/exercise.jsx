import React, { useState, useEffect, useContext } from "react";
import {
  Box,
  Typography,
  IconButton,
  Grid,
  CircularProgress,
  Alert,
  useTheme,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Container,
  styled,
  keyframes,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  useMediaQuery,
  Checkbox,
  FormControlLabel,
  FormGroup,
} from "@mui/material";
import {
  Delete,
  Edit,
  FitnessCenter,
  Add,
  Close,
  ExpandMore,
  PlayArrow,
  YouTube,
  AccessTime,
  TrendingUp,
  Person,
  SportsGymnastics,
  DirectionsRun,
  Pool,
  DirectionsBike,
  SelfImprovement,
  Spa,
  OpenInFull,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "../auth/firebaseConfig";
import { safeGetDoc, safeSetDoc, safeUpdateDoc } from "../../utils/firestoreUtils";
import { invalidateUserCache } from "../../utils/cacheUtils";
import { GlobalStateContext } from "../context/GlobalStateContext";

// Gemini AI konfigürasyonu
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
  100% { transform: translateY(0px); }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const GlowingCard = styled(Box, {
  shouldForwardProp: (prop) => prop !== "$glowColor",
})(({ theme, $glowColor }) => ({
  background: "rgba(255, 255, 255, 0.1)",
  backdropFilter: "blur(10px)",
  borderRadius: "24px",
  boxShadow: `0 0 20px ${$glowColor || "#2196F322"}`,
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    transform: "translateY(-5px)",
    boxShadow: `0 0 40px ${$glowColor || "#2196F344"}`,
  },
}));

const AnimatedButton = styled(Button)(({ theme }) => ({
  background: "linear-gradient(45deg, #2196F3 30%, #3F51B5 90%)",
  border: 0,
  borderRadius: 25,
  boxShadow: "0 3px 5px 2px rgba(33, 150, 243, .3)",
  color: "white",
  padding: "12px 30px",
  transition: "all 0.3s ease",
  "&:hover": {
    transform: "scale(1.05)",
    boxShadow: "0 5px 15px 3px rgba(33, 150, 243, .4)",
  },
}));

const StyledAccordion = styled(Accordion)(({ theme }) => ({
  background: "rgba(255, 255, 255, 0.1)",
  backdropFilter: "blur(10px)",
  borderRadius: "16px",
  marginBottom: "16px",
  "&:before": { display: "none" },
  "&.Mui-expanded": {
    margin: "16px 0",
  },
}));

const StyledAccordionSummary = styled(AccordionSummary)(({ theme }) => ({
  background: "linear-gradient(45deg, rgba(33,150,243,0.3) 0%, rgba(63,81,181,0.3) 100%)",
  borderRadius: "16px",
  color: "#fff",
  "&.Mui-expanded": {
    borderRadius: "16px 16px 0 0",
  },
}));

// Utility functions
const getDayIcon = (dayName) => {
  const icons = {
    'Pazartesi': <DirectionsRun />,
    'Salı': <FitnessCenter />,
    'Çarşamba': <Pool />,
    'Perşembe': <DirectionsBike />,
    'Cuma': <SportsGymnastics />,
    'Cumartesi': <SelfImprovement />,
    'Pazar': <Spa />
  };
  return icons[dayName] || <FitnessCenter />;
};

const getDifficultyColor = (difficulty) => {
  const colors = {
    'Başlangıç': 'rgba(76,175,80,0.8)',
    'Orta': 'rgba(255,152,0,0.8)',
    'İleri': 'rgba(244,67,54,0.8)',
    'Başlangıç/Orta': 'rgba(76,175,80,0.8)',
    'Orta/İleri': 'rgba(255,152,0,0.8)'
  };
  return colors[difficulty] || 'rgba(158,158,158,0.8)';
};

const Exercises = ({ exercises, setExercises }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { exerciseAIState, setExerciseAIState } = useContext(GlobalStateContext);
  const [openModal, setOpenModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [profileData, setProfileData] = useState({});
  const [userRequest, setUserRequest] = useState("");
  const [generatedProgram, setGeneratedProgram] = useState(null);
  const [geminiUsage, setGeminiUsage] = useState(null);
  
  // Yeni state'ler
  const [includeNutrition, setIncludeNutrition] = useState(false);
  const [bodyComposition, setBodyComposition] = useState({
    bodyFat: "",
    muscleMass: "",
    waterPercentage: "",
    boneMass: ""
  });
  const [nutritionPreferences, setNutritionPreferences] = useState({
    likedFoods: "",
    dislikedFoods: "",
    allergies: "",
    dietaryRestrictions: "",
    mealFrequency: "",
    cookingTime: ""
  });
  
  // Textarea büyütme state'i
  const [isTextareaExpanded, setIsTextareaExpanded] = useState(false);

  // Kullanıcı profil verilerini çek
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const userDocRef = doc(db, "users", auth.currentUser?.uid);
        const docSnap = await safeGetDoc(userDocRef);
        if (docSnap.exists() && docSnap.data().profile) {
          setProfileData(docSnap.data().profile);
        }
      } catch (error) {
        console.error("Profil verisi çekme hatası:", error);
      }
    };

    if (auth.currentUser) {
      fetchProfileData();
    }
  }, []);

  // Gemini kullanım sayısını kontrol et
  useEffect(() => {
    const fetchGeminiUsage = async () => {
      const usageDocRef = doc(db, "users", auth.currentUser?.uid, "apiUsage", "exerciseAI");
      const docSnap = await safeGetDoc(usageDocRef);
      if (docSnap.exists()) {
        setGeminiUsage(docSnap.data());
      } else {
        // Eğer doküman yoksa oluştur - Türkiye saatine göre
        const now = new Date();
        const turkeyDate = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Europe/Istanbul',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(now);
        const todayStr = turkeyDate; // Format: YYYY-MM-DD
        const initialUsage = { date: todayStr, count: 0 };
        await safeSetDoc(usageDocRef, initialUsage);
        setGeminiUsage(initialUsage);
      }
    };

    if (auth.currentUser) {
      fetchGeminiUsage();
    }
  }, []);

  const canUseGemini = () => {
    if (!geminiUsage) {
      console.log("🚫 canUseGemini: geminiUsage is null/undefined");
      return false;
    }
    
    // Türkiye saatine göre bugünün tarihini al - DÜZELTME
    const now = new Date();
    // Daha güvenilir yöntem: Intl.DateTimeFormat kullan
    const turkeyDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);
    const todayStr = turkeyDate; // Format: YYYY-MM-DD
    
    // Debug için ek bilgi
    console.log("🕐 Tarih hesaplama DEBUG:", {
      originalDate: now.toISOString(),
      turkeyDate: turkeyDate,
      todayStr: todayStr,
      turkeyTimeString: now.toLocaleString("tr-TR", {timeZone: "Europe/Istanbul"})
    });
    
    console.log("🔍 Exercise canUseGemini DEBUG:", {
      geminiUsageDate: geminiUsage.date,
      todayStr: todayStr,
      count: geminiUsage.count,
      isDifferentDay: geminiUsage.date !== todayStr,
      canUse: geminiUsage.date !== todayStr || geminiUsage.count < 3,
      currentTime: now.toLocaleString("tr-TR", {timeZone: "Europe/Istanbul"})
    });
    
    if (geminiUsage.date !== todayStr) {
      console.log("✅ Yeni gün - limit sıfırlandı!");
      return true;
    }
    
    const canUse = geminiUsage.count < 3;
    console.log(canUse ? "✅ Kullanılabilir" : "🚫 Limit doldu");
    return canUse;
  };

  const incrementGeminiUsage = async () => {
    // Türkiye saatine göre bugünün tarihini al - DÜZELTME
    const now = new Date();
    const turkeyDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);
    const todayStr = turkeyDate; // Format: YYYY-MM-DD
    
    console.log("📈 incrementGeminiUsage DEBUG:", {
      oldDate: geminiUsage.date,
      newDate: todayStr,
      oldCount: geminiUsage.count,
      isNewDay: geminiUsage.date !== todayStr
    });
    
    const usageDocRef = doc(db, "users", auth.currentUser?.uid, "apiUsage", "exerciseAI");
    let updatedUsage = { ...geminiUsage };
    if (geminiUsage.date !== todayStr) {
      updatedUsage = { date: todayStr, count: 1 };
      console.log("🔄 Yeni gün - sayaç sıfırlandı ve 1'e ayarlandı");
    } else {
      updatedUsage.count += 1;
      console.log(`📊 Sayaç artırıldı: ${geminiUsage.count} → ${updatedUsage.count}`);
    }
    await safeUpdateDoc(usageDocRef, updatedUsage);
    setGeminiUsage(updatedUsage);
  };

  // Test fonksiyonu - console'da çağırılabilir
  window.testGeminiLimit = () => {
    console.log("🧪 Test: canUseGemini() =", canUseGemini());
    console.log("🧪 Test: geminiUsage =", geminiUsage);
  };

  const generatePersonalizedProgramAsync = async () => {
    if (!canUseGemini()) {
      setExerciseAIState({
        isGenerating: false,
        showSuccessNotification: true,
        notificationMessage: "Gemini günde sadece 3 kez kullanılabilir. Yarın tekrar deneyin."
      });
      return;
    }

    if (!userRequest.trim()) {
      setExerciseAIState({
        isGenerating: false,
        showSuccessNotification: true,
        notificationMessage: "Lütfen spor hedeflerinizi ve isteklerinizi belirtin."
      });
      return;
    }

    try {
      // Güncel model adını kullan
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

      // Vücut kompozisyonu bilgilerini hazırla
      const bodyCompInfo = Object.values(bodyComposition).some(val => val.trim()) 
        ? `\nVÜCUT KOMPOZİSYONU:
- Vücut Yağı: ${bodyComposition.bodyFat || "Belirtilmemiş"}%
- Kas Kütlesi: ${bodyComposition.muscleMass || "Belirtilmemiş"} kg
- Su Oranı: ${bodyComposition.waterPercentage || "Belirtilmemiş"}%
- Kemik Kütlesi: ${bodyComposition.boneMass || "Belirtilmemiş"} kg`
        : "";

      // Beslenme tercihlerini hazırla
      const nutritionInfo = includeNutrition 
        ? `\nBESLENME TERCİHLERİ:
- Sevdiği Yiyecekler: ${nutritionPreferences.likedFoods || "Belirtilmemiş"}
- Sevmediği Yiyecekler: ${nutritionPreferences.dislikedFoods || "Belirtilmemiş"}
- Alerjiler: ${nutritionPreferences.allergies || "Yok"}
- Diyet Kısıtlamaları: ${nutritionPreferences.dietaryRestrictions || "Yok"}
- Beslenme Düzeni: ${nutritionPreferences.mealFrequency || "Belirtilmemiş"}
- Yemek Hazırlama Süresi: ${nutritionPreferences.cookingTime || "Belirtilmemiş"}

ÖNEMLİ BESLENME NOTLARI:
${nutritionPreferences.mealFrequency === "16:8" ? "- 16:8 Aralıklı Oruç: 16 saat açlık, 8 saat yeme penceresi" : ""}
${nutritionPreferences.mealFrequency === "18:6" ? "- 18:6 Aralıklı Oruç: 18 saat açlık, 6 saat yeme penceresi" : ""}
${nutritionPreferences.mealFrequency === "20:4" ? "- 20:4 Aralıklı Oruç: 20 saat açlık, 4 saat yeme penceresi" : ""}
${nutritionPreferences.mealFrequency === "OMAD" ? "- OMAD: Günde sadece 1 büyük öğün" : ""}
${nutritionPreferences.mealFrequency === "5:2" ? "- 5:2 Diyeti: 5 gün normal beslenme, 2 gün düşük kalori" : ""}
${nutritionPreferences.mealFrequency === "keto" ? "- Ketojenik Diyet: Düşük karbonhidrat, yüksek yağ" : ""}
${nutritionPreferences.mealFrequency === "paleo" ? "- Paleo Diyeti: İşlenmemiş, doğal besinler" : ""}
${nutritionPreferences.mealFrequency === "mediterranean" ? "- Akdeniz Diyeti: Zeytinyağı, balık, sebze ağırlıklı" : ""}
${nutritionPreferences.mealFrequency === "vegan" ? "- Vegan Diyet: Hayvansal ürün yok" : ""}
${nutritionPreferences.mealFrequency === "vegetarian" ? "- Vejetaryen Diyet: Et yok, süt ürünleri var" : ""}`
        : "";

      const prompt = `Sen profesyonel bir fitness koçusun. Kullanıcının bilgilerine göre kişiselleştirilmiş bir spor programı oluştur.

KULLANICI BİLGİLERİ:
- İsim: ${profileData.firstName || "Belirtilmemiş"}
- Yaş: ${profileData.age || "Belirtilmemiş"}
- Cinsiyet: ${profileData.gender === "male" ? "Erkek" : profileData.gender === "female" ? "Kadın" : "Belirtilmemiş"}
- Boy: ${profileData.height || "Belirtilmemiş"} cm
- Kilo: ${profileData.weight || "Belirtilmemiş"} kg${bodyCompInfo}

KULLANICI İSTEKLERİ:
${userRequest}${nutritionInfo}

ÖNEMLİ: ${includeNutrition ? 'KULLANICI BESLENME PROGRAMI İSTİYOR! Beslenme programını da dahil et.' : 'Kullanıcı sadece spor programı istiyor, beslenme programı dahil etme.'}

KALORİ HESAPLAMA: Kullanıcının yaş, cinsiyet, boy, kilo ve aktivite seviyesine göre günlük kalori ihtiyacını hesapla. Erkekler için: 88.362 + (13.397 × kg) + (4.799 × cm) - (5.677 × yaş), Kadınlar için: 447.593 + (9.247 × kg) + (3.098 × cm) - (4.330 × yaş). Sonucu aktivite seviyesine göre çarp (1.2-1.9 arası).

Lütfen aşağıdaki JSON formatında kesinlikle cevap ver. Başka hiçbir format kullanma:`;

      // Geliştirme için prompt'u console'a yazdır
      console.log("=== GEMINI PROMPT ===");
      console.log(prompt);
      console.log("=== BESLENME DURUMU ===");
      console.log("includeNutrition:", includeNutrition);
      console.log("nutritionInfo:", nutritionInfo);
      console.log("===================");

      const fullPrompt = prompt + `

{
  "title": "${includeNutrition ? '🏋️ KİŞİSELLEŞTİRİLMİŞ SPOR PROGRAMI 🍎 BESLENME PROGRAMI' : '🏋️ KİŞİSELLEŞTİRİLMİŞ SPOR PROGRAMI'}",
  "summary": "Kullanıcının hedeflerine uygun kısa özet (2-3 cümle)",
  "goals": [
    "Hedef 1",
    "Hedef 2", 
    "Hedef 3"
  ],
  "weeklyProgram": {
    "Pazartesi": {
      "type": "Antrenman Türü (örn: Üst Vücut)",
      "duration": "45 dakika",
      "difficulty": "Başlangıç",
      "exercises": [
        {
          "name": "Push-up",
          "sets": "3 set x 10 tekrar",
          "description": "Göğüs ve triceps kaslarını çalıştırır",
          "videoSearch": "push up nasıl yapılır"
        },
        {
          "name": "Dumbbell Row",
          "sets": "3 set x 12 tekrar",
          "description": "Sırt kaslarını güçlendirir",
          "videoSearch": "dumbbell row egzersizi"
        }
      ]
    },
    "Salı": {
      "type": "Antrenman Türü",
      "duration": "30 dakika",
      "difficulty": "Başlangıç",
      "exercises": [
        {
          "name": "Squat",
          "sets": "3 set x 15 tekrar",
          "description": "Bacak kaslarını çalıştırır",
          "videoSearch": "squat nasıl yapılır"
        }
      ]
    },
    "Çarşamba": {
      "type": "Antrenman Türü",
      "duration": "40 dakika",
      "difficulty": "Başlangıç",
      "exercises": [
        {
          "name": "Plank",
          "sets": "3 set x 30 saniye",
          "description": "Core kaslarını güçlendirir",
          "videoSearch": "plank egzersizi"
        }
      ]
    },
    "Perşembe": {
      "type": "Antrenman Türü",
      "duration": "35 dakika",
      "difficulty": "Başlangıç",
      "exercises": [
        {
          "name": "Lunges",
          "sets": "3 set x 10 tekrar (her bacak)",
          "description": "Bacak kaslarını dengeli çalıştırır",
          "videoSearch": "lunge egzersizi"
        }
      ]
    },
    "Cuma": {
      "type": "Antrenman Türü",
      "duration": "45 dakika",
      "difficulty": "Başlangıç",
      "exercises": [
        {
          "name": "Pull-up",
          "sets": "3 set x 5 tekrar",
          "description": "Sırt ve kol kaslarını güçlendirir",
          "videoSearch": "pull up nasıl yapılır"
        }
      ]
    },
    "Cumartesi": {
      "type": "Antrenman Türü",
      "duration": "30 dakika",
      "difficulty": "Başlangıç",
      "exercises": [
        {
          "name": "Burpees",
          "sets": "3 set x 8 tekrar",
          "description": "Tam vücut kardiyo egzersizi",
          "videoSearch": "burpee egzersizi"
        }
      ]
    },
    "Pazar": {
      "type": "Dinlenme",
      "duration": "20 dakika",
      "difficulty": "Başlangıç",
      "exercises": [
        {
          "name": "Hafif Yürüyüş",
          "sets": "20 dakika",
          "description": "Dinlenme günü aktivitesi",
          "videoSearch": "yürüyüş egzersizi"
        }
      ]
    }
  },
  "notes": [
    "Günde en az 2 litre su için",
    "Egzersiz öncesi 5-10 dakika ısınma yapın",
    "Egzersiz sonrası esneme hareketleri yapın",
    "Haftada 3-4 gün antrenman yapın",
    "İlerlemenizi takip etmek için not alın"
  ],
  "videoSuggestions": [
    "Push-up doğru form tekniği",
    "Squat nasıl yapılır başlangıç",
    "Plank egzersizi doğru pozisyon",
    "Lunge hareketi adım adım",
    "Pull-up başlangıç seviyesi",
    "Burpee egzersizi nasıl yapılır",
    "Kardiyo egzersizleri evde",
    "Esneme hareketleri antrenman sonrası"
  ]${includeNutrition ? `,
  "nutrition": {
    "dailyCalories": "Kullanıcının hesaplanmış günlük kalori ihtiyacı (örn: 1850-2100 kalori - kilo verme için 500 kalori açığı)",
    "macros": {
      "protein": "Protein gramı (vücut ağırlığının kg başına 1.6-2.2g)",
      "carbs": "Karbonhidrat gramı (kalorinin %45-65'i)", 
      "fat": "Yağ gramı (kalorinin %20-35'i)"
    },
    "weeklyMeals": {
      "Pazartesi": {
        "breakfast": {
          "time": "08:00-09:00",
          "foods": ["Yulaf ezmesi", "Muz", "Badem", "Süt"],
          "calories": "400-450"
        },
        "lunch": {
          "time": "12:00-13:00", 
          "foods": ["Izgara tavuk göğsü", "Bulgur pilavı", "Salata"],
          "calories": "600-700"
        },
        "dinner": {
          "time": "18:00-19:00",
          "foods": ["Somon balığı", "Sebze yemeği", "Esmer pirinç"],
          "calories": "500-600"
        }
      },
      "Salı": {
        "breakfast": {
          "time": "08:00-09:00",
          "foods": ["Omlet", "Tam buğday ekmeği", "Avokado"],
          "calories": "400-450"
        },
        "lunch": {
          "time": "12:00-13:00",
          "foods": ["Hindi eti", "Quinoa", "Brokoli"],
          "calories": "600-700"
        },
        "dinner": {
          "time": "18:00-19:00",
          "foods": ["Ton balığı", "Patates", "Yeşil salata"],
          "calories": "500-600"
        }
      },
      "Çarşamba": {
        "breakfast": {
          "time": "08:00-09:00",
          "foods": ["Smoothie", "Protein tozu", "Çilek"],
          "calories": "400-450"
        },
        "lunch": {
          "time": "12:00-13:00",
          "foods": ["Dana eti", "Esmer makarna", "Mantar"],
          "calories": "600-700"
        },
        "dinner": {
          "time": "18:00-19:00",
          "foods": ["Karides", "Sebze kızartması", "Kahverengi pirinç"],
          "calories": "500-600"
        }
      },
      "Perşembe": {
        "breakfast": {
          "time": "08:00-09:00",
          "foods": ["Peynirli tost", "Domates", "Zeytin"],
          "calories": "400-450"
        },
        "lunch": {
          "time": "12:00-13:00",
          "foods": ["Tavuk salatası", "Tam buğday ekmeği", "Ceviz"],
          "calories": "600-700"
        },
        "dinner": {
          "time": "18:00-19:00",
          "foods": ["Kuzu eti", "Patlıcan", "Bulgur"],
          "calories": "500-600"
        }
      },
      "Cuma": {
        "breakfast": {
          "time": "08:00-09:00",
          "foods": ["Yumurta", "Ispanak", "Tam buğday ekmeği"],
          "calories": "400-450"
        },
        "lunch": {
          "time": "12:00-13:00",
          "foods": ["Balık", "Pilav", "Sebze"],
          "calories": "600-700"
        },
        "dinner": {
          "time": "18:00-19:00",
          "foods": ["Tavuk", "Mantar", "Quinoa"],
          "calories": "500-600"
        }
      },
      "Cumartesi": {
        "breakfast": {
          "time": "08:00-09:00",
          "foods": ["Pancake", "Meyve", "Yoğurt"],
          "calories": "400-450"
        },
        "lunch": {
          "time": "12:00-13:00",
          "foods": ["Et", "Patates", "Salata"],
          "calories": "600-700"
        },
        "dinner": {
          "time": "18:00-19:00",
          "foods": ["Balık", "Sebze", "Pilav"],
          "calories": "500-600"
        }
      },
      "Pazar": {
        "breakfast": {
          "time": "08:00-09:00",
          "foods": ["Kahvaltı tabağı", "Peynir", "Zeytin"],
          "calories": "400-450"
        },
        "lunch": {
          "time": "12:00-13:00",
          "foods": ["Et yemeği", "Pilav", "Salata"],
          "calories": "600-700"
        },
        "dinner": {
          "time": "18:00-19:00",
          "foods": ["Balık", "Sebze", "Bulgur"],
          "calories": "500-600"
        }
      }
    },
    "nutritionNotes": [
      "Günde en az 2-3 litre su için",
      "Öğünler arasında 3-4 saat bekleyin",
      "Egzersiz öncesi karbonhidrat, sonrası protein alın",
      "Meyve ve sebzeleri bol tüketin",
      "İşlenmiş gıdalardan kaçının"
    ]
  }` : ''}
}

ÖNEMLİ KURALLAR:`;

      // Haftalık beslenme talimatını ekle
      const nutritionInstructions = includeNutrition ? `

BESLENME PROGRAMI TALİMATLARI:
- Haftalık beslenme planı hazırla (7 gün)
- Her gün için farklı yemekler kullan, aynı yemekleri tekrarlama
- Öğün sayısına göre plan yap: ${nutritionPreferences.mealFrequency} öğün
- Her gün farklı protein kaynakları, sebzeler ve karbonhidratlar kullan
- Kullanıcının sevdiği yiyecekleri dahil et: ${nutritionPreferences.likedFoods}
- Kullanıcının sevmediği yiyecekleri hariç tut: ${nutritionPreferences.dislikedFoods}
- Alerjileri dikkate al: ${nutritionPreferences.allergies}
- Diyet kısıtlamalarını uygula: ${nutritionPreferences.dietaryRestrictions}` : '';

      const finalPrompt = fullPrompt + nutritionInstructions;

      const result = await model.generateContent(finalPrompt);
      const response = await result.response;
      const programText = response.text();

      // Geliştirme için Gemini'den gelen cevabı console'a yazdır
      console.log("=== GEMINI RESPONSE ===");
      console.log(programText);
      console.log("=====================");

      // Programı parse et ve yapılandırılmış hale getir
      const parsedProgram = parseProgram(programText);
      
      setGeneratedProgram(parsedProgram);

      // Yeni programı exercises listesine ekle
      const newExercise = {
        id: Date.now().toString(),
        title: parsedProgram.title || "Kişiselleştirilmiş Spor Programı",
        content: programText,
        parsedContent: parsedProgram,
        createdAt: new Date().toISOString(),
        type: "ai-generated"
      };

      // Mevcut exercises listesine yeni programı ekle
      const updatedExercises = [...exercises, newExercise];
      setExercises(updatedExercises);

      // Firestore'a kaydet (mevcut exercises'i koruyarak)
      const userDocRef = doc(db, "users", auth.currentUser?.uid);
      await safeUpdateDoc(userDocRef, {
        exercises: updatedExercises
      });
      
      // Cache'i temizle
      invalidateUserCache(auth.currentUser?.uid);

      // Gemini kullanım sayacını artır
      await incrementGeminiUsage();

      setExerciseAIState({
        isGenerating: false,
        showSuccessNotification: true,
        notificationMessage: "Kişiselleştirilmiş spor programınız hazır!"
      });
      
      // Form'u temizle
      setUserRequest("");
      setIncludeNutrition(false);
      setBodyComposition({
        bodyFat: "",
        muscleMass: "",
        waterPercentage: "",
        boneMass: ""
      });
      setNutritionPreferences({
        likedFoods: "",
        dislikedFoods: "",
        allergies: "",
        dietaryRestrictions: "",
        mealFrequency: "",
        cookingTime: ""
      });

    } catch (error) {
      // Daha detaylı hata mesajları
      let errorMessage = "Program oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.";
      
      if (error.message?.includes("API_KEY")) {
        errorMessage = "Gemini API anahtarı bulunamadı. Lütfen .env dosyasını kontrol edin.";
      } else if (error.message?.includes("404")) {
        errorMessage = "Gemini API modeli bulunamadı. Lütfen daha sonra tekrar deneyin.";
      } else if (error.message?.includes("429")) {
        errorMessage = "API kullanım limiti aşıldı. Lütfen daha sonra tekrar deneyin.";
      }
      
      setExerciseAIState({
        isGenerating: false,
        showSuccessNotification: true,
        notificationMessage: errorMessage
      });
      
      console.error("Gemini API hatası:", error);
    }
  };

  const generatePersonalizedProgram = () => {
    setExerciseAIState({
      isGenerating: true,
      showSuccessNotification: true,
      notificationMessage: "🤖 AI spor programınızı hazırlıyor... Lütfen bekleyin."
    });
    
    setOpenModal(false);
    generatePersonalizedProgramAsync();
  };

  const parseProgram = (programText) => {
    if (!programText) return null;

    try {
      // JSON'u temizle ve parse et
      let cleanText = programText.trim();
      
      // Eğer JSON başlangıcı ve bitişi varsa, sadece o kısmı al
      const jsonStart = cleanText.indexOf('{');
      const jsonEnd = cleanText.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1) {
        cleanText = cleanText.substring(jsonStart, jsonEnd + 1);
      }
      
      // JSON'u parse et
      const program = JSON.parse(cleanText);
      
      // Gerekli alanları kontrol et ve varsayılan değerler ata
      const parsedProgram = {
        title: program.title || '🏋️ KİŞİSELLEŞTİRİLMİŞ SPOR PROGRAMI',
        summary: program.summary || 'Kişiselleştirilmiş spor programı',
        goals: Array.isArray(program.goals) ? program.goals : [],
        weeklyProgram: program.weeklyProgram || {},
        notes: Array.isArray(program.notes) ? program.notes : [],
        videoSuggestions: Array.isArray(program.videoSuggestions) ? program.videoSuggestions : [],
        nutrition: program.nutrition || null // Beslenme bölümünü ekle
      };
      
      // Haftalık programı kontrol et ve düzelt
      const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
      days.forEach(day => {
        if (parsedProgram.weeklyProgram[day]) {
          const dayProgram = parsedProgram.weeklyProgram[day];
          parsedProgram.weeklyProgram[day] = {
            type: dayProgram.type || 'Antrenman',
            duration: dayProgram.duration || '30 dakika',
            difficulty: dayProgram.difficulty || 'Başlangıç',
            exercises: Array.isArray(dayProgram.exercises) ? dayProgram.exercises : []
          };
        }
      });
      
      return parsedProgram;
      
    } catch (error) {
      // Fallback: Eski parse yöntemini dene
      return parseProgramFallback(programText);
    }
  };

  const parseProgramFallback = (programText) => {
    if (!programText) return null;

    const lines = programText.split('\n').filter(line => line.trim());
    
    const program = {
      title: '🏋️ KİŞİSELLEŞTİRİLMİŞ SPOR PROGRAMI',
      summary: '',
      goals: [],
      weeklyProgram: {},
      notes: [],
      videoSuggestions: [],
      nutrition: null // Beslenme bölümünü ekle
    };

    let currentSection = '';
    let currentDay = '';
    let inGoals = false;
    let inWeeklyProgram = false;
    let inNotes = false;
    let inVideoSuggestions = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Başlık kontrolü
      if (line.startsWith('# ') && !program.title) {
        program.title = line.substring(2).trim();
        continue;
      }

      // Özet bölümü
      if (line.includes('Program Özeti') || line.includes('Özet')) {
        currentSection = 'summary';
        inGoals = false;
        inWeeklyProgram = false;
        inNotes = false;
        inVideoSuggestions = false;
        continue;
      }

      // Hedefler bölümü
      if (line.includes('Hedefler') || line.includes('Goals')) {
        currentSection = 'goals';
        inGoals = true;
        inWeeklyProgram = false;
        inNotes = false;
        inVideoSuggestions = false;
        continue;
      }

      // Haftalık program bölümü
      if (line.includes('Haftalık Program') || line.includes('Weekly Program')) {
        currentSection = 'weeklyProgram';
        inGoals = false;
        inWeeklyProgram = true;
        inNotes = false;
        inVideoSuggestions = false;
        continue;
      }

      // Notlar bölümü
      if (line.includes('Notlar') || line.includes('Notes')) {
        currentSection = 'notes';
        inGoals = false;
        inWeeklyProgram = false;
        inNotes = true;
        inVideoSuggestions = false;
        continue;
      }

      // Video önerileri bölümü
      if (line.includes('Video') || line.includes('YouTube')) {
        currentSection = 'videoSuggestions';
        inGoals = false;
        inWeeklyProgram = false;
        inNotes = false;
        inVideoSuggestions = true;
        continue;
      }

      // Gün kontrolü (Pazartesi, Salı, vb.)
      if (inWeeklyProgram && (line.includes('Pazartesi') || line.includes('Salı') || 
          line.includes('Çarşamba') || line.includes('Perşembe') || 
          line.includes('Cuma') || line.includes('Cumartesi') || 
          line.includes('Pazar') || line.includes('Monday') || 
          line.includes('Tuesday') || line.includes('Wednesday') || 
          line.includes('Thursday') || line.includes('Friday') || 
          line.includes('Saturday') || line.includes('Sunday'))) {
        
        currentDay = line.replace(/^[-*]\s*/, '').trim();
        program.weeklyProgram[currentDay] = {
          type: 'Antrenman',
          duration: '30 dakika',
          difficulty: 'Başlangıç',
          exercises: []
        };
        continue;
      }

      // Egzersiz kontrolü
      if (inWeeklyProgram && currentDay && line.includes('**') && line.includes('-')) {
        const exerciseMatch = line.match(/\*\*([^*]+)\*\*\s*-\s*([^-]+)/);
        if (exerciseMatch) {
          const exerciseName = exerciseMatch[1].trim();
          const exerciseDetails = exerciseMatch[2].trim();
          program.weeklyProgram[currentDay].exercises.push({
            name: exerciseName,
            sets: exerciseDetails,
            description: exerciseDetails,
            videoSearch: `${exerciseName} nasıl yapılır`
          });
        }
        continue;
      }

      // Hedef ekleme
      if (inGoals && (line.startsWith('-') || line.startsWith('*'))) {
        const goal = line.replace(/^[-*]\s*/, '').trim();
        if (goal) {
          program.goals.push(goal);
        }
        continue;
      }

      // Not ekleme
      if (inNotes && (line.startsWith('-') || line.startsWith('*'))) {
        const note = line.replace(/^[-*]\s*/, '').trim();
        if (note) {
          program.notes.push(note);
        }
        continue;
      }

      // Video önerisi ekleme
      if (inVideoSuggestions && (line.startsWith('-') || line.startsWith('*'))) {
        const suggestion = line.replace(/^[-*]\s*/, '').trim();
        if (suggestion) {
          program.videoSuggestions.push(suggestion);
        }
        continue;
      }

      // Özet metni
      if (currentSection === 'summary' && line && !line.startsWith('#')) {
        program.summary += line + ' ';
      }
    }

    // Özet metnini temizle
    if (program.summary) {
      program.summary = program.summary.trim();
    }

    return program;
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1a2a6c 0%, #2196F3 50%, #3F51B5 100%)",
        padding: { xs: 1, sm: 2, md: 4 },
      }}
    >
      <Container maxWidth="lg">
        <Typography
          variant="h2"
          sx={{
            textAlign: "center",
            color: "#fff",
            fontWeight: 800,
            mb: { xs: 3, md: 6 },
            textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
            animation: `${float} 3s ease-in-out infinite`,
            fontSize: { xs: "1.5rem", sm: "2rem", md: "3rem" },
          }}
        >
          <FitnessCenter
            sx={{
              fontSize: { xs: 30, sm: 40, md: 50 },
              verticalAlign: "middle",
              mr: { xs: 1, md: 2 },
            }}
          />
          AI Spor Koçu
        </Typography>

        <GlowingCard $glowColor="#2196F3" sx={{ p: { xs: 2, md: 4 }, mb: 4 }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              justifyContent: "space-between",
              alignItems: { xs: "stretch", sm: "center" },
              mb: 4,
              gap: { xs: 2, sm: 0 },
            }}
          >
            <Typography variant="h5" sx={{ color: "#fff", fontWeight: 700, fontSize: { xs: "1.2rem", md: "1.5rem" }, textAlign: { xs: "center", sm: "left" } }}>
              Kişiselleştirilmiş Spor Programı
            </Typography>
            <AnimatedButton
              startIcon={<Add />}
              onClick={() => setOpenModal(true)}
              disabled={!canUseGemini() || exerciseAIState?.isGenerating}
              sx={{
                padding: { xs: "8px 16px", sm: "10px 20px", md: "12px 30px" },
                fontSize: { xs: "0.7rem", sm: "0.8rem", md: "inherit" },
                whiteSpace: "nowrap",
              }}
            >
              {exerciseAIState?.isGenerating ? "Program Oluşturuluyor..." : 
               canUseGemini() ? "Yeni Program Oluştur" : "Günlük Limit Doldu"}
            </AnimatedButton>
          </Box>

          {geminiUsage && !canUseGemini() && (
            <Alert severity="info" sx={{ mb: 3, background: "rgba(255,255,255,0.9)", fontSize: { xs: "0.8rem", md: "inherit" } }}>
              Günde sadece 3 kez program oluşturabilirsiniz. Yarın tekrar deneyin.
            </Alert>
          )}

          {exercises.length === 0 ? (
            <Box
              sx={{
                textAlign: "center",
                p: { xs: 3, md: 4 },
                border: `2px dashed rgba(255,255,255,0.3)`,
                borderRadius: 3,
              }}
            >
              <Typography variant="h6" sx={{ color: "#fff", opacity: 0.8, mb: 2, fontSize: { xs: "1rem", md: "1.25rem" } }}>
                Henüz spor programınız yok
              </Typography>
              <Typography variant="body1" sx={{ color: "#fff", opacity: 0.6, mb: 3, fontSize: { xs: "0.9rem", md: "1rem" } }}>
                AI spor koçumuz size özel bir program oluşturmak için hazır!
              </Typography>
              <AnimatedButton
                onClick={() => setOpenModal(true)}
                disabled={!canUseGemini()}
                sx={{ fontSize: { xs: "0.8rem", md: "inherit" } }}
              >
                İlk Programınızı Oluşturun
              </AnimatedButton>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {exercises.map((exercise) => (
                <Grid item xs={12} key={exercise.id}>
                  <GlowingCard
                    $glowColor="#A6F6FF"
                    sx={{
                      p: 0,
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        p: { xs: 2, md: 3 },
                        background: "linear-gradient(45deg, rgba(33,150,243,0.4) 0%, rgba(166,246,255,0.3) 100%)",
                        borderBottom: "1px solid rgba(255,255,255,0.1)",
                        cursor: "pointer",
                      }}
                      onClick={() => setExpandedId(expandedId === exercise.id ? null : exercise.id)}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, md: 2 }, flex: 1, minWidth: 0 }}>
                        <FitnessCenter sx={{ fontSize: { xs: 24, md: 30 }, color: "#4CAF50", flexShrink: 0 }} />
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography variant="h6" sx={{ color: "#fff", fontWeight: 600, fontSize: { xs: "1rem", md: "1.25rem" }, wordBreak: "break-word" }}>
                            {exercise.title}
                          </Typography>
                          <Typography variant="body2" sx={{ color: "#fff", opacity: 0.8, fontSize: { xs: "0.75rem", md: "0.875rem" } }}>
                            {new Date(exercise.createdAt).toLocaleDateString('tr-TR')}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
                        <IconButton
                          size="small"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const updatedExercises = exercises.filter((e) => e.id !== exercise.id);
                            setExercises(updatedExercises);
                            
                            // Firestore'dan da sil
                            try {
                              const userDocRef = doc(db, "users", auth.currentUser?.uid);
                              await safeUpdateDoc(userDocRef, {
                                exercises: updatedExercises
                              });
                              
                              // Cache'i temizle
                              invalidateUserCache(auth.currentUser?.uid);
                            } catch (error) {
                              toast.error("Program silinirken hata oluştu!");
                            }
                          }}
                          sx={{
                            color: "#FF5252",
                            "&:hover": {
                              background: "rgba(255,82,82,0.2)",
                              transform: "scale(1.1)",
                            },
                          }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedId(expandedId === exercise.id ? null : exercise.id);
                          }}
                          sx={{
                            color: "#fff",
                            transform: expandedId === exercise.id ? "rotate(180deg)" : "rotate(0deg)",
                            transition: "transform 0.3s",
                          }}
                        >
                          <ExpandMore fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>

                    <Collapse in={expandedId === exercise.id}>
                      <Box sx={{ p: { xs: 2, md: 3 } }}>
                        {exercise.type === "ai-generated" && exercise.parsedContent ? (
                          <ProgramDisplay program={exercise.parsedContent} />
                        ) : exercise.type === "ai-generated" && exercise.content ? (
                          <ProgramDisplay program={parseProgram(exercise.content)} />
                        ) : (
                          <Typography variant="body1" sx={{ color: "#fff", fontSize: { xs: "0.9rem", md: "1rem" } }}>
                            {exercise.content}
                          </Typography>
                        )}
                      </Box>
                    </Collapse>
                  </GlowingCard>
                </Grid>
              ))}
            </Grid>
          )}
        </GlowingCard>

        {/* Program Oluşturma Modal */}
        <Dialog
          open={openModal}
          onClose={() => setOpenModal(false)}
          fullWidth
          maxWidth="md"
          PaperProps={{
            sx: {
              background: "rgba(255,255,255,0.95)",
              backdropFilter: "blur(10px)",
              borderRadius: "24px",
              border: "1px solid rgba(33, 150, 243, 0.2)",
              m: { xs: 2, md: 0 },
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: 700, textAlign: "center", p: { xs: 2, md: 3 } }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="h5" sx={{ color: "#2196F3", fontSize: { xs: "1.2rem", md: "1.5rem" } }}>
                AI Spor Koçu
              </Typography>
              <IconButton onClick={() => {
                setOpenModal(false);
                // Form'u temizle
                setUserRequest("");
                setIncludeNutrition(false);
                setIsTextareaExpanded(false);
                setBodyComposition({
                  bodyFat: "",
                  muscleMass: "",
                  waterPercentage: "",
                  boneMass: ""
                });
                setNutritionPreferences({
                  likedFoods: "",
                  dislikedFoods: "",
                  allergies: "",
                  dietaryRestrictions: "",
                  mealFrequency: "",
                  cookingTime: ""
                });
              }}>
                <Close sx={{ color: "#2196F3" }} />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ p: { xs: 2, md: 3 } }}>
            <Box>
              <Typography variant="h6" sx={{ mb: 2, color: "#2196F3", fontSize: { xs: "1rem", md: "1.25rem" } }}>
                Spor Hedefleriniz ve İstekleriniz
              </Typography>
              <Box sx={{ position: "relative" }}>
                <TextField
                  label="Hedeflerinizi ve isteklerinizi detaylı olarak yazın..."
                  multiline
                  rows={isTextareaExpanded ? 12 : 4}
                  fullWidth
                  value={userRequest}
                  onChange={(e) => setUserRequest(e.target.value)}
                  placeholder="Örnek: Kilo vermek istiyorum, haftada 3 gün antrenman yapabilirim, evde egzersiz yapmak istiyorum, başlangıç seviyesindeyim..."
                  sx={{ 
                    mb: 3,
                    "& .MuiInputBase-root": {
                      minHeight: isTextareaExpanded ? "300px" : "auto"
                    }
                  }}
                />
                <IconButton
                  onClick={() => {
                    setIsTextareaExpanded(!isTextareaExpanded);
                    console.log('Textarea büyütüldü:', !isTextareaExpanded);
                  }}
                  sx={{
                    position: "absolute",
                    bottom: 12,
                    right: 8,
                    backgroundColor: "rgba(33, 150, 243, 0.1)",
                    border: "1px solid rgba(33, 150, 243, 0.3)",
                    "&:hover": {
                      backgroundColor: "rgba(33, 150, 243, 0.2)",
                      border: "1px solid rgba(33, 150, 243, 0.5)",
                    },
                    zIndex: 1,
                    width: 32,
                    height: 32
                  }}
                  size="small"
                >
                  <OpenInFull sx={{ fontSize: "1rem", color: "#2196F3" }} />
                </IconButton>
              </Box>

              {/* Vücut Kompozisyonu Bölümü */}
              <Typography variant="h6" sx={{ mb: 2, color: "#2196F3", fontSize: { xs: "1rem", md: "1.25rem" } }}>
                📊 Vücut Kompozisyonu (İsteğe Bağlı)
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, color: "#666", fontSize: { xs: "0.8rem", md: "0.9rem" } }}>
                Eğer vücut yağı, kas kütlesi, su oranı gibi bilgilerinizi biliyorsanız ekleyebilirsiniz. Bu bilgiler daha kişiselleştirilmiş program oluşturmamıza yardımcı olur.
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <TextField
                    label="Vücut Yağı (%)"
                    fullWidth
                    value={bodyComposition.bodyFat}
                    onChange={(e) => setBodyComposition(prev => ({ ...prev, bodyFat: e.target.value }))}
                    placeholder="Örnek: 15"
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Kas Kütlesi (kg)"
                    fullWidth
                    value={bodyComposition.muscleMass}
                    onChange={(e) => setBodyComposition(prev => ({ ...prev, muscleMass: e.target.value }))}
                    placeholder="Örnek: 35"
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Su Oranı (%)"
                    fullWidth
                    value={bodyComposition.waterPercentage}
                    onChange={(e) => setBodyComposition(prev => ({ ...prev, waterPercentage: e.target.value }))}
                    placeholder="Örnek: 60"
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Kemik Kütlesi (kg)"
                    fullWidth
                    value={bodyComposition.boneMass}
                    onChange={(e) => setBodyComposition(prev => ({ ...prev, boneMass: e.target.value }))}
                    placeholder="Örnek: 2.5"
                    size="small"
                  />
                </Grid>
              </Grid>

              {/* Beslenme Programı Seçeneği */}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeNutrition}
                    onChange={(e) => setIncludeNutrition(e.target.checked)}
                    sx={{ color: "#2196F3" }}
                  />
                }
                label={
                  <Typography variant="h6" sx={{ color: "#2196F3", fontSize: { xs: "1rem", md: "1.25rem" } }}>
                    🍎 Beslenme Programı da İstiyorum
                  </Typography>
                }
                sx={{ mb: 2 }}
              />

              {/* Beslenme Tercihleri */}
              {includeNutrition && (
                <Collapse in={includeNutrition}>
                  <Box sx={{ mb: 3, p: 2, bgcolor: "#f5f5f5", borderRadius: 2 }}>
                    <Typography variant="h6" sx={{ mb: 2, color: "#2196F3", fontSize: { xs: "1rem", md: "1.25rem" } }}>
                      🍽️ Beslenme Tercihleriniz
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          label="Sevdiğiniz Yiyecekler"
                          fullWidth
                          multiline
                          rows={2}
                          value={nutritionPreferences.likedFoods}
                          onChange={(e) => setNutritionPreferences(prev => ({ ...prev, likedFoods: e.target.value }))}
                          placeholder="Örnek: Tavuk, balık, sebzeler, meyveler, yulaf..."
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="Sevmediğiniz Yiyecekler"
                          fullWidth
                          multiline
                          rows={2}
                          value={nutritionPreferences.dislikedFoods}
                          onChange={(e) => setNutritionPreferences(prev => ({ ...prev, dislikedFoods: e.target.value }))}
                          placeholder="Örnek: Süt ürünleri, baharatlı yemekler..."
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          label="Alerjiler"
                          fullWidth
                          value={nutritionPreferences.allergies}
                          onChange={(e) => setNutritionPreferences(prev => ({ ...prev, allergies: e.target.value }))}
                          placeholder="Örnek: Fındık, gluten..."
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          label="Diyet Kısıtlamaları"
                          fullWidth
                          value={nutritionPreferences.dietaryRestrictions}
                          onChange={(e) => setNutritionPreferences(prev => ({ ...prev, dietaryRestrictions: e.target.value }))}
                          placeholder="Örnek: Vejetaryen, düşük karbonhidrat..."
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Beslenme Düzeni</InputLabel>
                          <Select
                            value={nutritionPreferences.mealFrequency}
                            onChange={(e) => setNutritionPreferences(prev => ({ ...prev, mealFrequency: e.target.value }))}
                            label="Beslenme Düzeni"
                          >
                            <MenuItem value="2">2 Öğün (Aralıklı Oruç)</MenuItem>
                            <MenuItem value="3">3 Öğün (Klasik)</MenuItem>
                            <MenuItem value="4">4 Öğün</MenuItem>
                            <MenuItem value="5">5 Öğün</MenuItem>
                            <MenuItem value="6">6 Öğün (Sık Beslenme)</MenuItem>
                            <MenuItem value="16:8">16:8 Aralıklı Oruç</MenuItem>
                            <MenuItem value="18:6">18:6 Aralıklı Oruç</MenuItem>
                            <MenuItem value="20:4">20:4 Aralıklı Oruç</MenuItem>
                            <MenuItem value="OMAD">OMAD (Günde 1 Öğün)</MenuItem>
                            <MenuItem value="5:2">5:2 Diyeti</MenuItem>
                            <MenuItem value="keto">Ketojenik Diyet</MenuItem>
                            <MenuItem value="paleo">Paleo Diyeti</MenuItem>
                            <MenuItem value="mediterranean">Akdeniz Diyeti</MenuItem>
                            <MenuItem value="vegan">Vegan Diyeti</MenuItem>
                            <MenuItem value="vegetarian">Vejetaryen Diyeti</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Yemek Hazırlama Süresi</InputLabel>
                          <Select
                            value={nutritionPreferences.cookingTime}
                            onChange={(e) => setNutritionPreferences(prev => ({ ...prev, cookingTime: e.target.value }))}
                            label="Yemek Hazırlama Süresi"
                          >
                            <MenuItem value="15">15 dakika</MenuItem>
                            <MenuItem value="30">30 dakika</MenuItem>
                            <MenuItem value="45">45 dakika</MenuItem>
                            <MenuItem value="60">1 saat</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </Box>
                </Collapse>
              )}

              {error && (
                <Alert severity="error" sx={{ mb: 3, fontSize: { xs: "0.8rem", md: "inherit" } }}>
                  {error}
                </Alert>
              )}

              <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "center", gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setOpenModal(false);
                    // Form'u temizle
                    setUserRequest("");
                    setIncludeNutrition(false);
                    setIsTextareaExpanded(false);
                    setBodyComposition({
                      bodyFat: "",
                      muscleMass: "",
                      waterPercentage: "",
                      boneMass: ""
                    });
                    setNutritionPreferences({
                      likedFoods: "",
                      dislikedFoods: "",
                      allergies: "",
                      dietaryRestrictions: "",
                      mealFrequency: "",
                      cookingTime: ""
                    });
                  }}
                  sx={{ borderColor: "#2196F3", color: "#2196F3", fontSize: { xs: "0.8rem", md: "inherit" } }}
                >
                  İptal
                </Button>
                <AnimatedButton
                  onClick={generatePersonalizedProgram}
                  disabled={loading || !userRequest.trim()}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <FitnessCenter />}
                  sx={{ fontSize: { xs: "0.8rem", md: "inherit" } }}
                >
                  {loading ? "Program Oluşturuluyor..." : "Program Oluştur"}
                </AnimatedButton>
              </Box>
            </Box>
          </DialogContent>
        </Dialog>
      </Container>
    </Box>
  );
};

// Program Görüntüleme Komponenti
const ProgramDisplay = ({ program }) => {
  const [expandedDay, setExpandedDay] = useState(null);

  if (!program) return null;

  return (
    <Box sx={{ color: "#fff" }}>
      {/* Program Özeti */}
      {program.summary && (
        <Paper sx={{ p: { xs: 2, md: 3 }, mb: 3, background: "rgba(156,39,176,0.1)", border: "1px solid rgba(156,39,176,0.3)" }}>
          <Typography variant="h6" sx={{ color: "#9C27B0", mb: 2, fontWeight: 600, fontSize: { xs: "1rem", md: "1.25rem" } }}>
            📋 Program Özeti
          </Typography>
          <Typography variant="body1" sx={{ color: "#fff", fontSize: { xs: "0.9rem", md: "1rem" } }}>
            {program.summary}
          </Typography>
        </Paper>
      )}

      {/* Hedefler */}
      {program.goals.length > 0 && (
        <Paper sx={{ p: { xs: 2, md: 3 }, mb: 3, background: "rgba(156,39,176,0.1)", border: "1px solid rgba(156,39,176,0.3)" }}>
          <Typography variant="h6" sx={{ color: "#9C27B0", mb: 2, fontWeight: 600, fontSize: { xs: "1rem", md: "1.25rem" } }}>
            🎯 Hedefler
          </Typography>
          <List dense>
            {program.goals.map((goal, index) => (
              <ListItem key={index} sx={{ py: 0.5 }}>
                <ListItemIcon>
                  <TrendingUp sx={{ color: "#9C27B0", fontSize: { xs: 18, md: 20 } }} />
                </ListItemIcon>
                <ListItemText primary={goal} sx={{ color: "#fff", fontSize: { xs: "0.85rem", md: "1rem" } }} />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Haftalık Program */}
      <Typography variant="h6" sx={{ color: "#FF6F00", mb: 2, fontWeight: 600, fontSize: { xs: "1rem", md: "1.25rem" } }}>
        📅 Haftalık Program
      </Typography>
      
      {(() => {
        // Günleri doğru sırada göstermek için sıralama
        const dayOrder = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
        const sortedDays = Object.entries(program.weeklyProgram).sort((a, b) => {
          const aIndex = dayOrder.indexOf(a[0]);
          const bIndex = dayOrder.indexOf(b[0]);
          return aIndex - bIndex;
        });

        return sortedDays.map(([day, dayProgram]) => (
          <StyledAccordion
            key={day}
            expanded={expandedDay === day}
            onChange={() => setExpandedDay(expandedDay === day ? null : day)}
          >
            <StyledAccordionSummary expandIcon={<ExpandMore sx={{ color: "#fff" }} />}>
              <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, md: 2 }, width: "100%", flexWrap: "wrap" }}>
                {getDayIcon(day)}
                <Typography variant="h6" sx={{ color: "#fff", fontWeight: 600, fontSize: { xs: "0.9rem", md: "1.25rem" } }}>
                  {day}
                </Typography>
                {dayProgram.duration && (
                  <Chip
                    icon={<AccessTime />}
                    label={dayProgram.duration}
                    size="small"
                    sx={{ background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: { xs: "0.7rem", md: "0.75rem" } }}
                  />
                )}
                {dayProgram.difficulty && (
                  <Chip
                    label={dayProgram.difficulty}
                    size="small"
                    sx={{ 
                      background: getDifficultyColor(dayProgram.difficulty),
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: { xs: "0.7rem", md: "0.75rem" }
                    }}
                  />
                )}
              </Box>
            </StyledAccordionSummary>
            <AccordionDetails sx={{ background: "rgba(0,0,0,0.1)" }}>
              {dayProgram.exercises.length > 0 ? (
                <List dense>
                  {dayProgram.exercises.map((exercise, index) => (
                    <ListItem key={index} sx={{ py: 1 }}>
                      <ListItemIcon>
                        <FitnessCenter sx={{ color: "#FF6F00", fontSize: { xs: 18, md: 20 } }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary={exercise.name || exercise}
                        secondary={exercise.sets || exercise}
                        sx={{ 
                          color: "#fff",
                          "& .MuiListItemText-primary": { fontSize: { xs: "0.85rem", md: "1rem" } },
                          "& .MuiListItemText-secondary": { fontSize: { xs: "0.75rem", md: "0.875rem" } }
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => {
                          const searchTerm = encodeURIComponent(exercise.videoSearch || exercise.name || exercise);
                          window.open(`https://www.youtube.com/results?search_query=${searchTerm}`, '_blank');
                        }}
                        sx={{ color: "#FF0000" }}
                      >
                        <YouTube />
                      </IconButton>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body1" sx={{ color: "#fff", opacity: 0.8, fontSize: { xs: "0.9rem", md: "1rem" } }}>
                  Dinlenme günü
                </Typography>
              )}
            </AccordionDetails>
          </StyledAccordion>
        ));
      })()}

      {/* Önemli Notlar */}
      {program.notes.length > 0 && (
        <Paper sx={{ p: { xs: 2, md: 3 }, mt: 3, background: "rgba(255,111,0,0.1)", border: "1px solid rgba(255,111,0,0.3)" }}>
          <Typography variant="h6" sx={{ color: "#FF6F00", mb: 2, fontWeight: 600, fontSize: { xs: "1rem", md: "1.25rem" } }}>
            💡 Önemli Notlar
          </Typography>
          <List dense>
            {program.notes.map((note, index) => (
              <ListItem key={index} sx={{ py: 0.5 }}>
                <ListItemIcon>
                  <Typography sx={{ color: "#FF6F00", fontSize: { xs: 18, md: 20 } }}>•</Typography>
                </ListItemIcon>
                <ListItemText primary={note} sx={{ color: "#fff", fontSize: { xs: "0.85rem", md: "1rem" } }} />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Beslenme Programı */}
      {program.nutrition && (
        <Paper sx={{ p: { xs: 2, md: 3 }, mt: 3, background: "rgba(255,111,0,0.1)", border: "1px solid rgba(255,111,0,0.3)" }}>
          <Typography variant="h6" sx={{ color: "#FF6F00", mb: 2, fontWeight: 600, fontSize: { xs: "1rem", md: "1.25rem" } }}>
            🍎 Beslenme Programı
          </Typography>
          
          {/* Günlük Kalori */}
          {program.nutrition.dailyCalories && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" sx={{ color: "#FF6F00", fontWeight: 600, mb: 1 }}>
                📊 Günlük Kalori Hedefi
              </Typography>
              <Typography variant="body1" sx={{ color: "#fff", fontSize: { xs: "0.9rem", md: "1rem" } }}>
                {program.nutrition.dailyCalories}
              </Typography>
            </Box>
          )}

          {/* Makro Besinler */}
          {program.nutrition.macros && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" sx={{ color: "#FF6F00", fontWeight: 600, mb: 1 }}>
                🥗 Makro Besin Dağılımı
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={12} sm={4}>
                  <Chip 
                    label={`Protein: ${program.nutrition.macros.protein}`} 
                    size="small" 
                    sx={{ 
                      background: "rgba(76,175,80,0.3)", 
                      color: "#fff", 
                      width: "100%",
                      fontSize: { xs: "0.7rem", sm: "0.75rem" },
                      height: { xs: "28px", sm: "32px" },
                      "& .MuiChip-label": {
                        whiteSpace: "normal",
                        lineHeight: 1.2,
                        padding: { xs: "4px 8px", sm: "6px 12px" }
                      }
                    }} 
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Chip 
                    label={`Karbonhidrat: ${program.nutrition.macros.carbs}`} 
                    size="small" 
                    sx={{ 
                      background: "rgba(33,150,243,0.3)", 
                      color: "#fff", 
                      width: "100%",
                      fontSize: { xs: "0.7rem", sm: "0.75rem" },
                      height: { xs: "28px", sm: "32px" },
                      "& .MuiChip-label": {
                        whiteSpace: "normal",
                        lineHeight: 1.2,
                        padding: { xs: "4px 8px", sm: "6px 12px" }
                      }
                    }} 
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Chip 
                    label={`Yağ: ${program.nutrition.macros.fat}`} 
                    size="small" 
                    sx={{ 
                      background: "rgba(255,152,0,0.3)", 
                      color: "#fff", 
                      width: "100%",
                      fontSize: { xs: "0.7rem", sm: "0.75rem" },
                      height: { xs: "28px", sm: "32px" },
                      "& .MuiChip-label": {
                        whiteSpace: "normal",
                        lineHeight: 1.2,
                        padding: { xs: "4px 8px", sm: "6px 12px" }
                      }
                    }} 
                  />
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Haftalık Beslenme Planı */}
          {program.nutrition.weeklyMeals && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" sx={{ color: "#FF6F00", fontWeight: 600, mb: 2 }}>
                🗓️ Haftalık Beslenme Planı
              </Typography>
              {(() => {
                // Günleri doğru sırada göstermek için sıralama
                const dayOrder = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
                const sortedDays = Object.entries(program.nutrition.weeklyMeals).sort((a, b) => {
                  const aIndex = dayOrder.indexOf(a[0]);
                  const bIndex = dayOrder.indexOf(b[0]);
                  return aIndex - bIndex;
                });

                return sortedDays.map(([dayName, dayMeals]) => (
                <Accordion key={dayName} sx={{ mb: 2, background: "rgba(255,255,255,0.05)" }}>
                  <AccordionSummary expandIcon={<ExpandMore sx={{ color: "#FF6F00" }} />}>
                    <Typography sx={{ color: "#FF6F00", fontWeight: 600, fontSize: { xs: "0.9rem", md: "1rem" } }}>
                      📅 {dayName}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {(() => {
                      // Öğünleri doğru sırada göstermek için sıralama
                      // Ara öğünler öğünler arasında olmalı, sonda değil
                      const mealOrder = ['breakfast', 'lunch', 'dinner'];
                      const sortedMeals = Object.entries(dayMeals).sort((a, b) => {
                        const aIndex = mealOrder.indexOf(a[0]);
                        const bIndex = mealOrder.indexOf(b[0]);
                        
                        // Eğer ikisi de mealOrder'da yoksa (snacks gibi), alfabetik sırala
                        if (aIndex === -1 && bIndex === -1) {
                          return a[0].localeCompare(b[0]);
                        }
                        
                        // Eğer biri mealOrder'da yoksa, onu sona koy
                        if (aIndex === -1) return 1;
                        if (bIndex === -1) return -1;
                        
                        return aIndex - bIndex;
                      });

                      return sortedMeals.map(([mealName, meal]) => (
                      <Box key={mealName} sx={{ mb: 2, p: 2, background: "rgba(255,255,255,0.03)", borderRadius: 1 }}>
                        <Typography variant="subtitle2" sx={{ color: "#FF6F00", fontWeight: 600, mb: 1 }}>
                          {mealName === 'breakfast' ? '🌅 Kahvaltı' : 
                           mealName === 'lunch' ? '🌞 Öğle Yemeği' : 
                           mealName === 'dinner' ? '🌙 Akşam Yemeği' : 
                           mealName === 'snacks' ? '🍎 Ara Öğünler' : mealName}
                          {meal.time && ` (${meal.time})`}
                          {meal.calories && ` - ${meal.calories} kalori`}
                        </Typography>
                        {meal.foods && Array.isArray(meal.foods) && (
                          <List dense>
                            {meal.foods.map((food, index) => (
                              <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
                                <ListItemIcon sx={{ minWidth: 24 }}>
                                  <Chip label="•" size="small" sx={{ background: "rgba(255,111,0,0.3)", color: "#fff", minWidth: "16px", height: "16px", fontSize: "0.7rem" }} />
                                </ListItemIcon>
                                <ListItemText primary={food} sx={{ color: "#fff", fontSize: { xs: "0.8rem", md: "0.9rem" } }} />
                              </ListItem>
                            ))}
                          </List>
                        )}
                      </Box>
                      ));
                    })()}
                  </AccordionDetails>
                </Accordion>
                ));
              })()}
            </Box>
          )}

          {/* Eski Öğün Planları (fallback) */}
          {program.nutrition.meals && !program.nutrition.weeklyMeals && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" sx={{ color: "#FF6F00", fontWeight: 600, mb: 1 }}>
                🍽️ Öğün Planları
              </Typography>
              {Object.entries(program.nutrition.meals).map(([mealName, meal]) => (
                <Accordion key={mealName} sx={{ mb: 1, background: "rgba(255,255,255,0.05)" }}>
                  <AccordionSummary expandIcon={<ExpandMore sx={{ color: "#FF6F00" }} />}>
                    <Typography sx={{ color: "#FF6F00", fontWeight: 600 }}>
                      {mealName === 'breakfast' ? '🌅 Kahvaltı' : 
                       mealName === 'lunch' ? '🌞 Öğle Yemeği' : 
                       mealName === 'dinner' ? '🌙 Akşam Yemeği' : 
                       mealName === 'snacks' ? '🍎 Ara Öğünler' : mealName}
                      {meal.time && ` (${meal.time})`}
                      {meal.calories && ` - ${meal.calories} kalori`}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {meal.foods && Array.isArray(meal.foods) && (
                      <List dense>
                        {meal.foods.map((food, index) => (
                          <ListItem key={index} sx={{ py: 0.5 }}>
                            <ListItemIcon>
                              <Chip label="•" size="small" sx={{ background: "rgba(255,111,0,0.3)", color: "#fff", minWidth: "20px", height: "20px" }} />
                            </ListItemIcon>
                            <ListItemText primary={food} sx={{ color: "#fff", fontSize: { xs: "0.85rem", md: "1rem" } }} />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}

          {/* Beslenme Notları */}
          {program.nutrition.nutritionNotes && program.nutrition.nutritionNotes.length > 0 && (
            <Box>
              <Typography variant="subtitle1" sx={{ color: "#FF6F00", fontWeight: 600, mb: 1 }}>
                💡 Beslenme Notları
              </Typography>
              <List dense>
                {program.nutrition.nutritionNotes.map((note, index) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <ListItemIcon>
                      <Chip label="•" size="small" sx={{ background: "rgba(255,111,0,0.3)", color: "#fff", minWidth: "20px", height: "20px" }} />
                    </ListItemIcon>
                    <ListItemText primary={note} sx={{ color: "#fff", fontSize: { xs: "0.85rem", md: "1rem" } }} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Paper>
      )}

      {/* Video Önerileri */}
      {program.videoSuggestions.length > 0 && (
        <Paper sx={{ p: { xs: 2, md: 3 }, mt: 3, background: "rgba(244,67,54,0.1)", border: "1px solid rgba(244,67,54,0.3)" }}>
          <Typography variant="h6" sx={{ color: "#F44336", mb: 2, fontWeight: 600, fontSize: { xs: "1rem", md: "1.25rem" } }}>
            🎥 Video Önerileri
          </Typography>
          <Typography variant="body2" sx={{ color: "#fff", mb: 2, fontSize: { xs: "0.8rem", md: "0.875rem" } }}>
            Egzersizlerinizi doğru form ile yapmak için YouTube'da arama yapabileceğiniz anahtar kelimeler:
          </Typography>
          <Grid container spacing={1}>
            {program.videoSuggestions.map((suggestion, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Chip
                  label={suggestion}
                  size="small"
                  icon={<YouTube />}
                  onClick={() => {
                    const searchTerm = encodeURIComponent(suggestion);
                    window.open(`https://www.youtube.com/results?search_query=${searchTerm}`, '_blank');
                  }}
                  sx={{ 
                    background: "rgba(244,67,54,0.3)",
                    color: "#fff",
                    cursor: "pointer",
                    width: "100%",
                    fontSize: { xs: "0.7rem", sm: "0.75rem" },
                    height: { xs: "32px", sm: "36px" },
                    "&:hover": {
                      background: "rgba(244,67,54,0.5)",
                      transform: "scale(1.02)",
                    },
                    transition: "all 0.2s ease",
                    "& .MuiChip-label": {
                      whiteSpace: "normal",
                      lineHeight: 1.2,
                      padding: { xs: "4px 8px", sm: "6px 12px" }
                    }
                  }}
                />
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}
    </Box>
  );
};

export default Exercises; 