import React, { useState, useEffect } from "react";
import { Sparkles, Loader2, Bot, ArrowRight, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../auth/firebaseConfig";
import { callGeminiWithRetry, getErrorMessage } from "../../../services/geminiService";
import { getUserLocation, getCityFromCoordinates, getWeatherData, getLocationBasedActivities } from "../../../services/weatherService";
import { toast } from "react-toastify";

const AiRecommendationsCard = ({ user, profileData, healthData }) => {
  const [recommendations, setRecommendations] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const fetchStoredRecommendations = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.healthData?.recommendations) {
            setRecommendations(data.healthData.recommendations);
          }
        }
      } catch (error) {
        console.error("Öneriler yüklenirken hata oluştu:", error);
      }
    };
    if (user) fetchStoredRecommendations();
  }, [user]);

  const generateRecommendationsAsync = async () => {
    setIsGenerating(true);
    toast.info("AI önerileri hazırlanıyor. Lütfen bekleyin...", { autoClose: 3000 });

    try {
      let activities = {
        outdoor: [], indoor: [], cultural: [], artistic: [], sports: [], wellness: [], weather_specific: []
      };

      try {
        const coords = await getUserLocation();
        const cityData = await getCityFromCoordinates(coords.latitude, coords.longitude);
        const weather = await getWeatherData(coords.latitude, coords.longitude);
        if (weather) {
          activities = getLocationBasedActivities(cityData.city, weather, weather.temperature);
        }
      } catch (locationError) {
        console.log("Konum bilgisi alınamadı, genel öneriler oluşturulacak.");
      }

      const prompt = `Sen profesyonel bir sağlık asistanısın. Kullanıcının profiline ve hava durumuna göre günlük tavsiyeler ver.
        Kullanıcı: ${profileData.firstName || "Bilinmiyor"}, Yaş: ${profileData.age || "Belirtilmedi"}, 
        Boy: ${profileData.height || "Belirtilmedi"} cm, Kilo: ${profileData.weight || "Belirtilmedi"} kg.
        Su Tüketimi: ${healthData.waterData?.waterIntake || 0}/${healthData.waterData?.dailyWaterTarget || 2000} ml.
        Hava Durumu Tavsiyeleri: ${activities.weather_specific.join(', ')}.
        Lütfen beslenme, egzersiz ve uyku için üç kısa paragraf tavsiye ver. Format Markdown olmalı.`;

      const result = await callGeminiWithRetry(prompt, null, 2);
      
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        "healthData.recommendations": result,
      });
      
      setRecommendations(result);
      toast.success("Önerileriniz başarıyla güncellendi!");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsGenerating(false);
    }
  };

  const renderContent = () => {
    if (!recommendations) return <p className="text-slate-500 italic">Henüz bir öneri oluşturulmadı.</p>;
    
    let textToRender = recommendations;
    if (typeof recommendations === "string") {
      try {
        const parsed = JSON.parse(recommendations);
        if (parsed.text) textToRender = parsed.text;
        else if (parsed.recommendation) textToRender = parsed.recommendation;
        else if (parsed.recommendations) textToRender = parsed.recommendations;
        else if (parsed.parts && parsed.parts[0]?.text) textToRender = parsed.parts[0].text;
        else textToRender = Object.values(parsed).join("\n\n");
      } catch (e) {
        // Not JSON, keep as is
      }
    } else if (typeof recommendations === "object") {
       textToRender = recommendations.text || recommendations.recommendation || recommendations.recommendations || Object.values(recommendations).join("\n\n");
    }
    
    textToRender = typeof textToRender === "string" ? textToRender.replace(/```markdown/gi, '').replace(/```json/gi, '').replace(/```/g, '').trim() : String(textToRender);

    // Basit bir markdown ayrıştırıcı
    const sections = textToRender.split(/\n\n+/);
    return sections.map((section, idx) => (
      <div key={idx} className="mb-4">
        {section.startsWith('**') || section.startsWith('##') ? (
          <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-lg mb-2">
            {section.replace(/[*#]/g, '').trim()}
          </h4>
        ) : section.startsWith('-') || section.startsWith('*') ? (
          <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-400">
            {section.split('\n').map((item, i) => (
              <li key={i}>{item.replace(/^[-*]\s*/, '').trim()}</li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-600 dark:text-slate-400">{section}</p>
        )}
      </div>
    ));
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col h-full relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-32 bg-blue-50 dark:bg-blue-900/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all duration-500 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/20"></div>
      
      <div className="relative z-10 flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-md">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <h3 className="font-bold text-xl text-slate-800 dark:text-white tracking-tight">Yapay Zeka Önerileri</h3>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={generateRecommendationsAsync}
          disabled={isGenerating}
          className="rounded-full shadow-sm hover:shadow transition-all bg-white dark:bg-slate-800"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin text-indigo-500" />
          ) : (
            <RefreshCcw className="h-4 w-4 mr-2 text-indigo-500" />
          )}
          Yenile
        </Button>
      </div>

      <div className="relative z-10 flex-grow bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700/50 overflow-y-auto max-h-[400px] prose prose-slate dark:prose-invert prose-sm">
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-500">
            <Sparkles className="h-8 w-8 text-indigo-400 animate-pulse mb-3" />
            <p className="animate-pulse font-medium">Sağlık verileriniz analiz ediliyor...</p>
          </div>
        ) : (
          renderContent()
        )}
      </div>
      
      {!recommendations && !isGenerating && (
        <Button 
          onClick={generateRecommendationsAsync}
          className="relative z-10 w-full mt-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl py-6 shadow-lg shadow-indigo-500/25 transition-all duration-300 group/btn"
        >
          <Sparkles className="mr-2 h-5 w-5" />
          <span className="font-semibold text-base">İlk Önerini Al</span>
          <ArrowRight className="ml-2 h-5 w-5 opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all duration-300" />
        </Button>
      )}
    </div>
  );
};

export default AiRecommendationsCard;
