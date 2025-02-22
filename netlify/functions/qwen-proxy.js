// /netlify/functions/qwen-proxy.js
const axios = require("axios");
require("dotenv").config();

exports.handler = async function (event, context) {
  // POST isteği kontrolü
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    // Request body'i parse et
    const requestBody = JSON.parse(event.body);
    console.log("Gönderilen İstek Verisi:", requestBody);

    // Qwen API'ye istek
    const response = await axios.post(
      "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions",
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.QWEN_API_KEY}`,
        },
      }
    );

    console.log("API Yanıtı:", response.data);

    // Başarılı yanıt
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // CORS için
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: JSON.stringify(response.data),
    };
  } catch (error) {
    console.error("API Hatası:", error.message);
    console.error("Hata Detayları:", error.response?.data);

    // Hata yanıtı
    return {
      statusCode: error.response?.status || 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: error.message,
        details: error.response?.data,
      }),
    };
  }
};

// CORS için OPTIONS request handler
exports.handler.options = async () => {
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
    body: "",
  };
};
