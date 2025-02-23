// netlify/edge-functions/qwen-proxy.js
export default async (request, context) => {
  try {
    const payload = await request.json();

    // API isteğini gönder (Fetch API kullanıyoruz)
    const response = await fetch(
      "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Netlify.env.get("QWEN_API_KEY")}`,
        },
        body: JSON.stringify({
          model: "qwen-max",
          messages: payload.messages,
          max_tokens: Math.min(payload.max_tokens || 500, 1000), // Token limiti
          temperature: Math.min(payload.temperature || 0.7, 1.0),
        }),
      }
    );

    // Response'u işle
    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    return Response.json(await response.json());
  } catch (error) {
    return Response.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
};

// Config (Zaman aşımı ve bölge ayarı)
export const config = {
  path: "/api/qwen-proxy",
  onError: "bypass",
  runtime: "edge", // Özel runtime
  regions: ["iad1"], // Washington DC bölgesi
  maxDuration: 30, // Maksimum 30 saniye
};
