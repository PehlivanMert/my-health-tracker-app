const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());
const cors = require("cors");
app.use(cors());

app.post("/api/qwen-proxy", async (req, res) => {
  try {
    if (process.env.NODE_ENV === "development") {
      console.log("Gönderilen İstek Verisi:", req.body);
    }

    const response = await axios.post(
      "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions", // OpenAI uyumlu endpoint
      req.body,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.QWEN_API_KEY}`,
        },
      }
    );

    if (process.env.NODE_ENV === "development") {
      console.log("API Yanıtı:", response.data);
    }
    res.json(response.data);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("API Hatası:", error.message);
      console.error("Hata Detayları:", error.response?.data);
    }
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  if (process.env.NODE_ENV === "development") {
    console.log(`Proxy server çalışıyor: http://localhost:${PORT}`);
  }
});
