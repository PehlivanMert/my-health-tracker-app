export const getHealthRecommendations = async (userInfo) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const API_URL = import.meta.env.DEV
      ? "http://localhost:3001/api/qwen-proxy"
      : "/.netlify/functions/qwen-proxy";

    const prompt = `Kullanıcı bilgileri: İsim: ${userInfo.name}, Yaş: ${userInfo.age}, Boy: ${userInfo.height}cm, Kilo: ${userInfo.weight}kg. Vücut kitle indeksini hesaplayıp günlük ve haftalık sağlıklı yaşam önerileri ver. Max 3 madde ve 1 sağlıklı tarif içersin. ve json formatına uygun olsun.`;

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: "qwen-max",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP hatası! durum: ${response.status}`);
    }

    const data = await response.json();

    if (!data.choices?.length) {
      throw new Error("Geçersiz API yanıtı");
    }

    return data.choices[0].message.content;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("İstek zaman aşımına uğradı");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};
