export const useHealth = () => {
  const [loading, setLoading] = useState(false);
  const [apiCooldown, setApiCooldown] = useState(false);
  const [recommendations, setRecommendations] = useState(null);

  const fetchRecommendations = async (userInfo) => {
    if (apiCooldown) {
      toast.warning("Lütfen bir dakika bekleyin");
      return;
    }

    setLoading(true);
    try {
      const recommendationText = await getHealthRecommendations(userInfo);

      await updateDoc(doc(db, "users", user.uid), {
        "healthData.recommendations": recommendationText,
        "healthData.lastUpdated": new Date(),
      });

      setRecommendations(recommendationText);
      setApiCooldown(true);
      setTimeout(() => setApiCooldown(false), 60000);
    } catch (error) {
      toast.error(`Hata: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    recommendations,
    apiCooldown,
    fetchRecommendations,
  };
};
