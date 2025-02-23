// src/components/HealthRecommendations.jsx
import React from "react";
import { useHealth } from "../../hooks/useHealth";

export const HealthRecommendations = () => {
  const { loading, recommendations, fetchRecommendations } = useHealth();

  const handleGetRecommendations = async () => {
    const userInfo = {
      name: "Mert",
      age: 25,
      height: 190,
      weight: 93,
    };

    try {
      await fetchRecommendations(userInfo);
    } catch (error) {
      console.error("Öneriler alınırken hata:", error);
    }
  };

  return (
    <div>
      <button onClick={handleGetRecommendations} disabled={loading}>
        {loading ? "Yükleniyor..." : "Öneriler Al"}
      </button>
      {recommendations && <div>{recommendations}</div>}
    </div>
  );
};
