import { useState, useEffect, useCallback } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { doc } from "firebase/firestore";
import { db } from "../components/auth/firebaseConfig";
import { safeGetDoc, safeSetDoc, safeUpdateDoc } from "../utils/firestoreUtils";
import { invalidateUserCache } from "../utils/cacheUtils";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export const useExerciseAI = (user, exercises, setExercises, setExerciseAIState) => {
  const [profileData, setProfileData] = useState({});
  const [geminiUsage, setGeminiUsage] = useState(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;
      try {
        const userDocRef = doc(db, "users", user.uid);
        const docSnap = await safeGetDoc(userDocRef);
        if (docSnap.exists() && docSnap.data().profile) {
          setProfileData(docSnap.data().profile);
        }
      } catch (error) {
        console.error("Profil verisi çekme hatası:", error);
      }
    };
    fetchProfileData();
  }, [user]);

  useEffect(() => {
    const fetchGeminiUsage = async () => {
      if (!user) return;
      const usageDocRef = doc(db, "users", user.uid, "apiUsage", "exerciseAI");
      const docSnap = await safeGetDoc(usageDocRef);
      if (docSnap.exists()) {
        setGeminiUsage(docSnap.data());
      } else {
        const now = new Date();
        const turkeyDate = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Europe/Istanbul',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(now);
        const initialUsage = { date: turkeyDate, count: 0 };
        await safeSetDoc(usageDocRef, initialUsage);
        setGeminiUsage(initialUsage);
      }
    };
    fetchGeminiUsage();
  }, [user]);

  const canUseGemini = useCallback(() => {
    if (!geminiUsage) return false;
    const now = new Date();
    const turkeyDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);

    if (geminiUsage.date !== turkeyDate) return true;
    return geminiUsage.count < 3;
  }, [geminiUsage]);

  const incrementGeminiUsage = async () => {
    if (!user) return;
    const now = new Date();
    const turkeyDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);

    const usageDocRef = doc(db, "users", user.uid, "apiUsage", "exerciseAI");
    let updatedUsage = { ...geminiUsage };
    if (geminiUsage.date !== turkeyDate) {
      updatedUsage = { date: turkeyDate, count: 1 };
    } else {
      updatedUsage.count += 1;
    }
    await safeUpdateDoc(usageDocRef, updatedUsage);
    setGeminiUsage(updatedUsage);
  };

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const callGeminiAPI = async (prompt) => {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { temperature: 0.85, topP: 0.95 } });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  };

  const callGeminiWithRetry = async (prompt, maxRetries = 3) => {
    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          const delay = Math.pow(2, attempt - 2) * 1000;
          setExerciseAIState({
            isGenerating: true,
            showSuccessNotification: true,
            notificationMessage: `🔄 Bağlantı hatası alındı. ${attempt}/${maxRetries} deneme yapılıyor... (${delay/1000}s bekleniyor)`
          });
          await sleep(delay);
        }
        const result = await callGeminiAPI(prompt);
        if (result && result.trim()) return result;
        throw new Error("API boş cevap döndü");
      } catch (error) {
        lastError = error;
        if (attempt === maxRetries) break;
      }
    }
    throw lastError || new Error("API çağrısı başarısız oldu");
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
      nutrition: null
    };

    let currentSection = '';
    let currentDay = '';
    let inGoals = false;
    let inWeeklyProgram = false;
    let inNotes = false;
    let inVideoSuggestions = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('# ') && !program.title) {
        program.title = line.substring(2).trim();
        continue;
      }
      if (line.includes('Program Özeti') || line.includes('Özet')) {
        currentSection = 'summary';
        inGoals = inWeeklyProgram = inNotes = inVideoSuggestions = false;
        continue;
      }
      if (line.includes('Hedefler') || line.includes('Goals')) {
        currentSection = 'goals';
        inGoals = true;
        inWeeklyProgram = inNotes = inVideoSuggestions = false;
        continue;
      }
      if (line.includes('Haftalık Program') || line.includes('Weekly Program')) {
        currentSection = 'weeklyProgram';
        inWeeklyProgram = true;
        inGoals = inNotes = inVideoSuggestions = false;
        continue;
      }
      if (line.includes('Notlar') || line.includes('Notes')) {
        currentSection = 'notes';
        inNotes = true;
        inGoals = inWeeklyProgram = inVideoSuggestions = false;
        continue;
      }
      if (line.includes('Video') || line.includes('YouTube')) {
        currentSection = 'videoSuggestions';
        inVideoSuggestions = true;
        inGoals = inWeeklyProgram = inNotes = false;
        continue;
      }

      if (inWeeklyProgram && (line.includes('Pazartesi') || line.includes('Salı') || 
          line.includes('Çarşamba') || line.includes('Perşembe') || 
          line.includes('Cuma') || line.includes('Cumartesi') || 
          line.includes('Pazar'))) {
        currentDay = line.replace(/^[-*]\s*/, '').trim();
        program.weeklyProgram[currentDay] = {
          type: 'Antrenman',
          duration: '30 dakika',
          difficulty: 'Başlangıç',
          exercises: []
        };
        continue;
      }

      if (inWeeklyProgram && currentDay && line.includes('**') && line.includes('-')) {
        const exerciseMatch = line.match(/\*\*([^*]+)\*\*\s*-\s*([^-]+)/);
        if (exerciseMatch) {
          program.weeklyProgram[currentDay].exercises.push({
            name: exerciseMatch[1].trim(),
            sets: exerciseMatch[2].trim(),
            description: exerciseMatch[2].trim(),
            videoSearch: `${exerciseMatch[1].trim()} nasıl yapılır`
          });
        }
        continue;
      }

      if (inGoals && (line.startsWith('-') || line.startsWith('*'))) {
        const goal = line.replace(/^[-*]\s*/, '').trim();
        if (goal) program.goals.push(goal);
        continue;
      }

      if (inNotes && (line.startsWith('-') || line.startsWith('*'))) {
        const note = line.replace(/^[-*]\s*/, '').trim();
        if (note) program.notes.push(note);
        continue;
      }

      if (inVideoSuggestions && (line.startsWith('-') || line.startsWith('*'))) {
        const suggestion = line.replace(/^[-*]\s*/, '').trim();
        if (suggestion) program.videoSuggestions.push(suggestion);
        continue;
      }

      if (currentSection === 'summary' && line && !line.startsWith('#')) {
        program.summary += line + ' ';
      }
    }

    if (program.summary) program.summary = program.summary.trim();
    return program;
  };

  const parseProgram = (programText) => {
    if (!programText) return null;
    try {
      let cleanText = programText.trim();
      const jsonStart = cleanText.indexOf('{');
      const jsonEnd = cleanText.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        cleanText = cleanText.substring(jsonStart, jsonEnd + 1);
      }
      
      const program = JSON.parse(cleanText);
      const parsedProgram = {
        title: program.title || '🏋️ KİŞİSELLEŞTİRİLMİŞ SPOR PROGRAMI',
        summary: program.summary || 'Kişiselleştirilmiş spor programı',
        goals: Array.isArray(program.goals) ? program.goals : [],
        weeklyProgram: program.weeklyProgram || {},
        notes: Array.isArray(program.notes) ? program.notes : [],
        videoSuggestions: Array.isArray(program.videoSuggestions) ? program.videoSuggestions : [],
        nutrition: program.nutrition || null
      };
      
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
      return parseProgramFallback(programText);
    }
  };

  const generatePersonalizedProgram = async (userRequest, includeNutrition, bodyComposition, nutritionPreferences, setOpenModal) => {
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

    setExerciseAIState({
      isGenerating: true,
      showSuccessNotification: true,
      notificationMessage: "🤖 AI spor programınızı hazırlıyor... Lütfen bekleyin."
    });
    if (setOpenModal) setOpenModal(false);

    try {
      const bodyCompInfo = Object.values(bodyComposition).some(val => val.trim()) 
        ? `\nVÜCUT KOMPOZİSYONU:
- Vücut Yağı: ${bodyComposition.bodyFat || "Belirtilmemiş"}%
- Kas Kütlesi: ${bodyComposition.muscleMass || "Belirtilmemiş"} kg
- Su Oranı: ${bodyComposition.waterPercentage || "Belirtilmemiş"}%
- Kemik Kütlesi: ${bodyComposition.boneMass || "Belirtilmemiş"} kg`
        : "";

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
${nutritionPreferences.mealFrequency === "keto" ? "- Ketojenik Diyet: Düşük karbonhidrat, yüksek yağ" : ""}` 
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

Lütfen JSON formatında kesinlikle cevap ver:
{
  "title": "${includeNutrition ? '🏋️ KİŞİSELLEŞTİRİLMİŞ SPOR PROGRAMI 🍎 BESLENME PROGRAMI' : '🏋️ KİŞİSELLEŞTİRİLMİŞ SPOR PROGRAMI'}",
  "summary": "Özet",
  "goals": ["Hedef 1"],
  "weeklyProgram": {
    "Pazartesi": {
      "type": "Antrenman Türü",
      "duration": "45 dakika",
      "difficulty": "Başlangıç",
      "exercises": [{"name": "Push-up", "sets": "3x10", "description": "Göğüs", "videoSearch": "push up nasıl yapılır"}]
    }
  },
  "notes": ["Su için"],
  "videoSuggestions": ["Push-up teknik"]${includeNutrition ? `,
  "nutrition": {
    "dailyCalories": "2000 kalori",
    "macros": {"protein": "150g", "carbs": "200g", "fat": "60g"},
    "weeklyMeals": {
      "Pazartesi": {
        "breakfast": {"time": "08:00", "foods": ["Yulaf"], "calories": "400"},
        "lunch": {"time": "13:00", "foods": ["Tavuk"], "calories": "600"},
        "dinner": {"time": "19:00", "foods": ["Balık"], "calories": "500"}
      }
    },
    "nutritionNotes": ["Su için"]
  }` : ''}
}`;

      const programText = await callGeminiWithRetry(prompt, 3);
      if (!programText || !programText.trim()) throw new Error("API boş cevap döndü");

      const parsedProgram = parseProgram(programText);
      const newExercise = {
        id: Date.now().toString(),
        title: parsedProgram.title || "Kişiselleştirilmiş Spor Programı",
        content: programText,
        parsedContent: parsedProgram,
        createdAt: new Date().toISOString(),
        type: "ai-generated"
      };

      const updatedExercises = [...exercises, newExercise];
      setExercises(updatedExercises);

      const userDocRef = doc(db, "users", user.uid);
      await safeUpdateDoc(userDocRef, { exercises: updatedExercises });
      invalidateUserCache(user.uid);
      await incrementGeminiUsage();

      setExerciseAIState({
        isGenerating: false,
        showSuccessNotification: true,
        notificationMessage: "Kişiselleştirilmiş spor programınız hazır!"
      });

      return true; // Başarılı
    } catch (error) {
      let errorMessage = "Program oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.";
      if (error.message?.includes("503") || error.message?.includes("overloaded")) {
        errorMessage = "Gemini API şu anda yoğun. Lütfen birkaç dakika sonra tekrar deneyin.";
      } else if (error.message?.includes("429") || error.message?.includes("quota")) {
        errorMessage = "API kullanım limiti aşıldı. Lütfen daha sonra tekrar deneyin.";
      }

      setExerciseAIState({
        isGenerating: false,
        showSuccessNotification: false,
        notificationMessage: errorMessage
      });
      console.error("Program oluşturma hatası:", error);
      return false; // Başarısız
    }
  };

  return {
    generatePersonalizedProgram,
    canUseGemini,
    geminiUsage
  };
};
