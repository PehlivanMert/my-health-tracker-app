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
    if (!recommendations) return (
      <div className="flex flex-col items-center justify-center h-40 text-slate-500">
        <Sparkles className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
        <p className="italic font-medium">Henüz bir öneri oluşturulmadı.</p>
      </div>
    );

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

    const sections = textToRender.split(/\n\n+/);

    const formatText = (text) => {
      let formatted = text.replace(/^[-*]\s*/, '').trim();
      // Highlight bold text with vibrant color
      formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-indigo-700 dark:text-indigo-300">$1</strong>');
      return { __html: formatted };
    };

    return (
      <div className="space-y-5 pb-4 pr-2">
        {sections.map((section, idx) => {
          const isHeading = section.startsWith('**') || section.startsWith('##') || section.startsWith('###');
          const isList = section.startsWith('-') || section.startsWith('*');

          if (isHeading) {
            return (
              <h4 key={idx} className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 text-lg sm:text-xl mt-6 mb-3 flex items-center gap-2 drop-shadow-sm">
                <Sparkles className="h-5 w-5 text-blue-500 shrink-0" />
                {section.replace(/[*#]/g, '').trim()}
              </h4>
            );
          }

          if (isList) {
            return (
              <ul key={idx} className="space-y-3">
                {section.split('\n').filter(Boolean).map((item, i) => (
                  <li key={idx + "-" + i} className="flex items-start gap-3 bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group/item">
                    <div className="bg-emerald-100 dark:bg-emerald-900/40 p-1.5 rounded-full shrink-0 group-hover/item:scale-110 group-hover/item:bg-emerald-200 dark:group-hover/item:bg-emerald-800/50 transition-all mt-0.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span
                      className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm sm:text-base flex-1"
                      dangerouslySetInnerHTML={formatText(item)}
                    />
                  </li>
                ))}
              </ul>
            );
          }

          return (
            <div key={idx} className="bg-blue-50/70 dark:bg-slate-800/50 p-5 rounded-2xl border border-blue-100/50 dark:border-slate-700/50 shadow-sm">
              <p
                className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm sm:text-base"
                dangerouslySetInnerHTML={formatText(section)}
              />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col h-full relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-32 bg-blue-50 dark:bg-blue-900/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all duration-700 group-hover:bg-blue-100/80 dark:group-hover:bg-blue-900/20"></div>

      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/30">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-extrabold text-xl sm:text-2xl text-slate-800 dark:text-white tracking-tight">AI Önerileri</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Size özel günlük analiz</p>
          </div>
        </div>

        <Button
          onClick={generateRecommendationsAsync}
          disabled={isGenerating}
          className="rounded-full shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-0 font-bold px-6"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin text-white" />
          ) : (
            <RefreshCcw className="h-4 w-4 mr-2 text-white" />
          )}
          {isGenerating ? "Analiz Ediliyor..." : "Yeni Öneri Al"}
        </Button>
      </div>

      <div className="relative z-10 flex-grow rounded-2xl overflow-y-auto max-h-[450px] custom-scrollbar">
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center h-48 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-700/50">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
              <Sparkles className="h-10 w-10 text-indigo-500 animate-pulse mb-4 relative z-10" />
            </div>
            <p className="animate-pulse font-bold text-slate-600 dark:text-slate-300">Sağlık verileriniz inceleniyor...</p>
            <p className="text-sm text-slate-400 mt-2">Bu işlem birkaç saniye sürebilir</p>
          </div>
        ) : (
          renderContent()
        )}
      </div>

      {!recommendations && !isGenerating && (
        <Button
          onClick={generateRecommendationsAsync}
          className="relative z-10 w-full mt-6 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-2xl py-7 shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-1 transition-all duration-300 group/btn"
        >
          <Sparkles className="mr-3 h-6 w-6" />
          <span className="font-extrabold text-lg">İlk Analizi Başlat</span>
          <ArrowRight className="ml-2 h-6 w-6 opacity-0 -translate-x-4 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all duration-300" />
        </Button>
      )}
    </div>
  );
};

export default AiRecommendationsCard;
