// netlify/functions/qwen-proxy.js
const axios = require("axios");
require("dotenv").config();

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

exports.handler = async function (event, context) {
  // OPTIONS isteğini CORS için yönet
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    if (!process.env.QWEN_API_KEY) {
      throw new Error("API anahtarı yapılandırılmamış");
    }

    const requestBody = JSON.parse(event.body);

    const response = await axios({
      method: "post",
      url: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions",
      data: requestBody,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.QWEN_API_KEY}`,
      },
      timeout: 20000, // 20 saniye
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response.data),
    };
  } catch (error) {
    console.error("Hata detayları:", {
      message: error.message,
      response: error.response?.data,
      stack: error.stack,
    });

    return {
      statusCode: error.response?.status || 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        details: error.response?.data || "Sunucu hatası",
      }),
    };
  }
};
