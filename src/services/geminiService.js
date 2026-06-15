import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "GEMINI_API_KEY");

export const callGeminiAPI = async (prompt) => {
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash", 
    generationConfig: { temperature: 0.85, topP: 0.95 } 
  });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const callGeminiWithRetry = async (prompt, updateGlobalState, maxRetries = 3) => {
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        const delay = Math.pow(2, attempt - 2) * 1000;
        updateGlobalState?.({
          notificationMessage: `🔄 Bağlantı hatası alındı. ${attempt}/${maxRetries} deneme yapılıyor... (${delay/1000}s bekleniyor)`,
          showSuccessNotification: true
        });
        await sleep(delay);
      }
      
      const result = await callGeminiAPI(prompt);
      
      if (result && result.trim()) {
        return result;
      } else {
        throw new Error("API boş cevap döndü");
      }
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries) {
        break;
      }
    }
  }
  throw lastError || new Error("API çağrısı başarısız oldu");
};

export const getErrorMessage = (error) => {
  const errorMessage = error?.message || error?.toString() || "Bilinmeyen hata";
  
  if (errorMessage.includes("400")) {
    return "API anahtarı geçersiz veya model bulunamadı. Lütfen ayarları kontrol edin.";
  } else if (errorMessage.includes("403")) {
    return "API erişim izni yok. Lütfen API anahtarınızı kontrol edin.";
  } else if (errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("Quota exceeded")) {
    const retryMatch = errorMessage.match(/retry in (\d+\.?\d*)s/i);
    if (retryMatch) {
      const retrySeconds = Math.ceil(parseFloat(retryMatch[1]));
      return `API kotası dolmuş. Lütfen ${retrySeconds} saniye sonra tekrar deneyin.`;
    }
    return "API kullanım limiti aşıldı. Lütfen daha sonra tekrar deneyin.";
  } else if (errorMessage.includes("network") || errorMessage.includes("fetch") || errorMessage.includes("timeout")) {
    return "İnternet bağlantısı hatası. Lütfen bağlantınızı kontrol edip tekrar deneyin.";
  } else {
    return "Öneri oluşturulurken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.";
  }
};
