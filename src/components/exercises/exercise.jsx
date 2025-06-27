import React, { useState, useEffect } from "react";
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
} from "@mui/icons-material";
import { toast } from "react-toastify";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "../auth/firebaseConfig";

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
  const [openModal, setOpenModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [profileData, setProfileData] = useState({});
  const [userRequest, setUserRequest] = useState("");
  const [generatedProgram, setGeneratedProgram] = useState(null);
  const [geminiUsage, setGeminiUsage] = useState(null);

  // Kullanıcı profil verilerini çek
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const userDocRef = doc(db, "users", auth.currentUser?.uid);
        const docSnap = await getDoc(userDocRef);
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
      try {
        const usageDocRef = doc(db, "users", auth.currentUser?.uid, "apiUsage", "gemini");
        const docSnap = await getDoc(usageDocRef);
        if (docSnap.exists()) {
          setGeminiUsage(docSnap.data());
        } else {
          const todayStr = new Date().toISOString().slice(0, 10);
          const initialUsage = { date: todayStr, count: 0 };
          await setDoc(usageDocRef, initialUsage);
          setGeminiUsage(initialUsage);
        }
      } catch (error) {
        console.error("Gemini kullanım verisi çekme hatası:", error);
      }
    };

    if (auth.currentUser) {
      fetchGeminiUsage();
    }
  }, []);

  const canUseGemini = () => {
    if (!geminiUsage) return false;
    const todayStr = new Date().toISOString().slice(0, 10);
    if (geminiUsage.date !== todayStr) return true;
    return geminiUsage.count < 3; // Günde 3 kez kullanabilir
  };

  const incrementGeminiUsage = async () => {
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const usageDocRef = doc(db, "users", auth.currentUser?.uid, "apiUsage", "gemini");
      let updatedUsage = { ...geminiUsage };
      if (geminiUsage.date !== todayStr) {
        updatedUsage = { date: todayStr, count: 1 };
      } else {
        updatedUsage.count += 1;
      }
      await updateDoc(usageDocRef, updatedUsage);
      setGeminiUsage(updatedUsage);
    } catch (error) {
      console.error("Gemini kullanım sayacı güncelleme hatası:", error);
    }
  };

  const generatePersonalizedProgram = async () => {
    if (!canUseGemini()) {
      toast.error("Gemini günde sadece 3 kez kullanılabilir. Yarın tekrar deneyin.");
      return;
    }

    if (!userRequest.trim()) {
      toast.error("Lütfen spor hedeflerinizi ve isteklerinizi belirtin.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Güncel model adını kullan
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

      const prompt = `Sen profesyonel bir fitness koçusun. Kullanıcının bilgilerine göre kişiselleştirilmiş bir spor programı oluştur.

KULLANICI BİLGİLERİ:
- İsim: ${profileData.firstName || "Belirtilmemiş"}
- Yaş: ${profileData.age || "Belirtilmemiş"}
- Cinsiyet: ${profileData.gender === "male" ? "Erkek" : profileData.gender === "female" ? "Kadın" : "Belirtilmemiş"}
- Boy: ${profileData.height || "Belirtilmemiş"} cm
- Kilo: ${profileData.weight || "Belirtilmemiş"} kg

KULLANICI İSTEKLERİ:
${userRequest}

Lütfen aşağıdaki JSON formatında kesinlikle cevap ver. Başka hiçbir format kullanma:

{
  "title": "🏋️ KİŞİSELLEŞTİRİLMİŞ SPOR PROGRAMI",
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
    "YouTube'da 'egzersiz adı nasıl yapılır' araması yapın",
    "Doğru form için video izleyin",
    "Başlangıç seviyesi videoları tercih edin"
  ]
}

ÖNEMLİ KURALLAR:
1. SADECE JSON formatında cevap ver, başka hiçbir metin ekleme
2. Her gün için en az 2-3 egzersiz ekle
3. Egzersiz isimleri Türkçe olsun
4. Zorluk seviyesi: Başlangıç, Orta, İleri
5. Süreler gerçekçi olsun (30-60 dakika arası)
6. Video arama terimleri Türkçe olsun
7. Kullanıcının seviyesine uygun egzersizler seç
8. JSON formatını bozma, geçerli JSON olsun`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const programText = response.text();

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
      await updateDoc(userDocRef, {
        exercises: updatedExercises
      });

      // Gemini kullanım sayacını artır
      await incrementGeminiUsage();

      toast.success("Kişiselleştirilmiş spor programınız hazır!");
      setOpenModal(false);

    } catch (error) {
      // Daha detaylı hata mesajları
      if (error.message?.includes("API_KEY")) {
        setError("Gemini API anahtarı bulunamadı. Lütfen .env dosyasını kontrol edin.");
        toast.error("API anahtarı eksik veya geçersiz!");
      } else if (error.message?.includes("404")) {
        setError("Gemini API modeli bulunamadı. Lütfen daha sonra tekrar deneyin.");
        toast.error("API modeli geçici olarak kullanılamıyor!");
      } else if (error.message?.includes("429")) {
        setError("API kullanım limiti aşıldı. Lütfen daha sonra tekrar deneyin.");
        toast.error("API limiti aşıldı!");
      } else {
        setError("Program oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.");
        toast.error("Program oluşturulamadı: " + error.message);
      }
    } finally {
      setLoading(false);
    }
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
        videoSuggestions: Array.isArray(program.videoSuggestions) ? program.videoSuggestions : []
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
      videoSuggestions: []
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
        padding: { xs: 2, md: 4 },
      }}
    >
      <Container maxWidth="lg">
        <Typography
          variant="h2"
          sx={{
            textAlign: "center",
            color: "#fff",
            fontWeight: 800,
            mb: 6,
            textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
            animation: `${float} 3s ease-in-out infinite`,
            fontSize: { xs: "2rem", md: "3rem" },
          }}
        >
          <FitnessCenter
            sx={{
              fontSize: { xs: 40, md: 50 },
              verticalAlign: "middle",
              mr: 2,
            }}
          />
          AI Spor Koçu
        </Typography>

        <GlowingCard $glowColor="#2196F3" sx={{ p: 4, mb: 4 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 4,
            }}
          >
            <Typography variant="h5" sx={{ color: "#fff", fontWeight: 700 }}>
              Kişiselleştirilmiş Spor Programı
            </Typography>
            <AnimatedButton
              startIcon={<Add />}
              onClick={() => setOpenModal(true)}
              disabled={!canUseGemini()}
              sx={{
                padding: { xs: "6px 14px", md: "12px 30px" },
                fontSize: { xs: "0.6rem", md: "inherit" },
              }}
            >
              {canUseGemini() ? "Yeni Program Oluştur" : "Günlük Limit Doldu"}
            </AnimatedButton>
          </Box>

          {!canUseGemini() && (
            <Alert severity="info" sx={{ mb: 3, background: "rgba(255,255,255,0.9)" }}>
              Günde sadece 3 kez program oluşturabilirsiniz. Yarın tekrar deneyin.
            </Alert>
          )}

          {exercises.length === 0 ? (
            <Box
              sx={{
                textAlign: "center",
                p: 4,
                border: `2px dashed rgba(255,255,255,0.3)`,
                borderRadius: 3,
              }}
            >
              <Typography variant="h6" sx={{ color: "#fff", opacity: 0.8, mb: 2 }}>
                Henüz spor programınız yok
              </Typography>
              <Typography variant="body1" sx={{ color: "#fff", opacity: 0.6, mb: 3 }}>
                AI spor koçumuz size özel bir program oluşturmak için hazır!
              </Typography>
              <AnimatedButton
                onClick={() => setOpenModal(true)}
                disabled={!canUseGemini()}
              >
                İlk Programınızı Oluşturun
              </AnimatedButton>
            </Box>
          ) : (
            <Grid container spacing={3}>
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
                        p: 3,
                        background: "linear-gradient(45deg, rgba(33,150,243,0.4) 0%, rgba(166,246,255,0.3) 100%)",
                        borderBottom: "1px solid rgba(255,255,255,0.1)",
                        cursor: "pointer",
                      }}
                      onClick={() => setExpandedId(expandedId === exercise.id ? null : exercise.id)}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <FitnessCenter sx={{ fontSize: 30, color: "#4CAF50" }} />
                        <Box>
                          <Typography variant="h6" sx={{ color: "#fff", fontWeight: 600 }}>
                            {exercise.title}
                          </Typography>
                          <Typography variant="body2" sx={{ color: "#fff", opacity: 0.8 }}>
                            {new Date(exercise.createdAt).toLocaleDateString('tr-TR')}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const updatedExercises = exercises.filter((e) => e.id !== exercise.id);
                            setExercises(updatedExercises);
                            
                            // Firestore'dan da sil
                            try {
                              const userDocRef = doc(db, "users", auth.currentUser?.uid);
                              await updateDoc(userDocRef, {
                                exercises: updatedExercises
                              });
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
                      <Box sx={{ p: 3 }}>
                        {exercise.type === "ai-generated" && exercise.parsedContent ? (
                          <ProgramDisplay program={exercise.parsedContent} />
                        ) : exercise.type === "ai-generated" && exercise.content ? (
                          <ProgramDisplay program={parseProgram(exercise.content)} />
                        ) : (
                          <Typography variant="body1" sx={{ color: "#fff" }}>
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
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: 700, textAlign: "center" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="h5" sx={{ color: "#2196F3" }}>
                AI Spor Koçu
              </Typography>
              <IconButton onClick={() => setOpenModal(false)}>
                <Close sx={{ color: "#2196F3" }} />
              </IconButton>
            </Box>
          </DialogTitle>

          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, color: "#2196F3" }}>
                Profil Bilgileriniz
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: "center", background: "rgba(33,150,243,0.1)" }}>
                    <Person sx={{ color: "#2196F3", mb: 1 }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {profileData.firstName || "Belirtilmemiş"}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: "center", background: "rgba(33,150,243,0.1)" }}>
                    <Typography variant="h6" sx={{ color: "#2196F3" }}>
                      {profileData.age || "?"}
                    </Typography>
                    <Typography variant="body2">Yaş</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: "center", background: "rgba(33,150,243,0.1)" }}>
                    <Typography variant="h6" sx={{ color: "#2196F3" }}>
                      {profileData.height || "?"}
                    </Typography>
                    <Typography variant="body2">Boy (cm)</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: "center", background: "rgba(33,150,243,0.1)" }}>
                    <Typography variant="h6" sx={{ color: "#2196F3" }}>
                      {profileData.weight || "?"}
                    </Typography>
                    <Typography variant="body2">Kilo (kg)</Typography>
                  </Paper>
                </Grid>
              </Grid>

              <Typography variant="h6" sx={{ mb: 2, color: "#2196F3" }}>
                Spor Hedefleriniz ve İstekleriniz
              </Typography>
              <TextField
                label="Hedeflerinizi ve isteklerinizi detaylı olarak yazın..."
                multiline
                rows={6}
                fullWidth
                value={userRequest}
                onChange={(e) => setUserRequest(e.target.value)}
                placeholder="Örnek: Kilo vermek istiyorum, haftada 3 gün antrenman yapabilirim, evde egzersiz yapmak istiyorum, başlangıç seviyesindeyim..."
                sx={{ mb: 3 }}
              />

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => setOpenModal(false)}
                  sx={{ borderColor: "#2196F3", color: "#2196F3" }}
                >
                  İptal
                </Button>
                <AnimatedButton
                  onClick={generatePersonalizedProgram}
                  disabled={loading || !userRequest.trim()}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <FitnessCenter />}
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
        <Paper sx={{ p: 3, mb: 3, background: "rgba(33,150,243,0.1)", border: "1px solid rgba(33,150,243,0.3)" }}>
          <Typography variant="h6" sx={{ color: "#2196F3", mb: 2, fontWeight: 600 }}>
            📋 Program Özeti
          </Typography>
          <Typography variant="body1" sx={{ color: "#fff" }}>
            {program.summary}
          </Typography>
        </Paper>
      )}

      {/* Hedefler */}
      {program.goals.length > 0 && (
        <Paper sx={{ p: 3, mb: 3, background: "rgba(76,175,80,0.1)", border: "1px solid rgba(76,175,80,0.3)" }}>
          <Typography variant="h6" sx={{ color: "#4CAF50", mb: 2, fontWeight: 600 }}>
            🎯 Hedefler
          </Typography>
          <List dense>
            {program.goals.map((goal, index) => (
              <ListItem key={index} sx={{ py: 0.5 }}>
                <ListItemIcon>
                  <TrendingUp sx={{ color: "#4CAF50", fontSize: 20 }} />
                </ListItemIcon>
                <ListItemText primary={goal} sx={{ color: "#fff" }} />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Haftalık Program */}
      <Typography variant="h6" sx={{ color: "#FF9800", mb: 2, fontWeight: 600 }}>
        📅 Haftalık Program
      </Typography>
      
      {Object.entries(program.weeklyProgram).map(([day, dayProgram]) => (
        <StyledAccordion
          key={day}
          expanded={expandedDay === day}
          onChange={() => setExpandedDay(expandedDay === day ? null : day)}
        >
          <StyledAccordionSummary expandIcon={<ExpandMore sx={{ color: "#fff" }} />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: "100%" }}>
              {getDayIcon(day)}
              <Typography variant="h6" sx={{ color: "#fff", fontWeight: 600 }}>
                {day}
              </Typography>
              {dayProgram.duration && (
                <Chip
                  icon={<AccessTime />}
                  label={dayProgram.duration}
                  size="small"
                  sx={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}
                />
              )}
              {dayProgram.difficulty && (
                <Chip
                  label={dayProgram.difficulty}
                  size="small"
                  sx={{ 
                    background: getDifficultyColor(dayProgram.difficulty),
                    color: "#fff",
                    fontWeight: 600
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
                      <FitnessCenter sx={{ color: "#FF9800", fontSize: 20 }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary={exercise.name || exercise}
                      secondary={exercise.sets || exercise}
                      sx={{ color: "#fff" }}
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
              <Typography variant="body1" sx={{ color: "#fff", opacity: 0.8 }}>
                Dinlenme günü
              </Typography>
            )}
          </AccordionDetails>
        </StyledAccordion>
      ))}

      {/* Önemli Notlar */}
      {program.notes.length > 0 && (
        <Paper sx={{ p: 3, mt: 3, background: "rgba(255,152,0,0.1)", border: "1px solid rgba(255,152,0,0.3)" }}>
          <Typography variant="h6" sx={{ color: "#FF9800", mb: 2, fontWeight: 600 }}>
            💡 Önemli Notlar
          </Typography>
          <List dense>
            {program.notes.map((note, index) => (
              <ListItem key={index} sx={{ py: 0.5 }}>
                <ListItemIcon>
                  <Typography sx={{ color: "#FF9800", fontSize: 20 }}>•</Typography>
                </ListItemIcon>
                <ListItemText primary={note} sx={{ color: "#fff" }} />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Video Önerileri */}
      {program.videoSuggestions.length > 0 && (
        <Paper sx={{ p: 3, mt: 3, background: "rgba(244,67,54,0.1)", border: "1px solid rgba(244,67,54,0.3)" }}>
          <Typography variant="h6" sx={{ color: "#F44336", mb: 2, fontWeight: 600 }}>
            🎥 Video Önerileri
          </Typography>
          <Typography variant="body2" sx={{ color: "#fff", mb: 2 }}>
            Her egzersiz için YouTube'da arama yapabileceğiniz anahtar kelimeler:
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {program.videoSuggestions.map((suggestion, index) => (
              <Chip
                key={index}
                label={suggestion}
                size="small"
                icon={<YouTube />}
                onClick={() => {
                  const searchTerm = encodeURIComponent(suggestion);
                  window.open(`https://www.youtube.com/results?search_query=${searchTerm}`, '_blank');
                }}
                sx={{ 
                  background: "rgba(244,67,54,0.2)",
                  color: "#fff",
                  cursor: "pointer",
                  "&:hover": {
                    background: "rgba(244,67,54,0.4)",
                  }
                }}
              />
            ))}
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default Exercises; 