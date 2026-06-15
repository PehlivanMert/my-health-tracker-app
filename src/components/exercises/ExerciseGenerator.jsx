import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CloseIcon from "@mui/icons-material/Close";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

const InputField = ({ label, value, onChange, placeholder, type = "text" }) => (
  <div className="flex flex-col mb-4 w-full">
    <label className="text-slate-300 text-sm font-medium mb-1">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
    />
  </div>
);

const ExerciseGenerator = ({ open, onClose, onGenerate, isGenerating }) => {
  const [userRequest, setUserRequest] = useState("");
  const [includeNutrition, setIncludeNutrition] = useState(false);
  const [isTextareaExpanded, setIsTextareaExpanded] = useState(false);
  const [bodyComposition, setBodyComposition] = useState({
    bodyFat: "",
    muscleMass: "",
    waterPercentage: "",
    boneMass: ""
  });
  const [nutritionPreferences, setNutritionPreferences] = useState({
    likedFoods: "",
    dislikedFoods: "",
    allergies: "",
    dietaryRestrictions: "",
    mealFrequency: "",
    cookingTime: ""
  });

  if (!open) return null;

  const handleGenerate = () => {
    onGenerate(userRequest, includeNutrition, bodyComposition, nutritionPreferences, () => {
      // Clear form on success
      setUserRequest("");
      setIncludeNutrition(false);
      setBodyComposition({ bodyFat: "", muscleMass: "", waterPercentage: "", boneMass: "" });
      setNutritionPreferences({ likedFoods: "", dislikedFoods: "", allergies: "", dietaryRestrictions: "", mealFrequency: "", cookingTime: "" });
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-3xl bg-slate-800/90 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-blue-600/20 to-indigo-600/20">
          <div className="flex items-center gap-3">
            <FitnessCenterIcon className="text-blue-400 text-3xl" />
            <h2 className="text-2xl font-bold text-white">AI Spor Koçu</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl transition-all"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
          
          {/* Main Request */}
          <section>
            <h3 className="text-lg font-bold text-blue-400 mb-2 flex items-center gap-2">
              <CheckCircleIcon fontSize="small" /> Spor Hedefleriniz
            </h3>
            <div className="relative">
              <textarea
                value={userRequest}
                onChange={(e) => setUserRequest(e.target.value)}
                placeholder="Örnek: Kilo vermek istiyorum, haftada 3 gün antrenman yapabilirim, evde egzersiz yapmak istiyorum, başlangıç seviyesindeyim..."
                className={`w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none ${
                  isTextareaExpanded ? "h-64" : "h-32"
                }`}
              />
              <button
                onClick={() => setIsTextareaExpanded(!isTextareaExpanded)}
                className="absolute bottom-4 right-4 p-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg transition-all backdrop-blur-sm"
              >
                <OpenInFullIcon fontSize="small" />
              </button>
            </div>
          </section>

          {/* Body Composition */}
          <section>
            <h3 className="text-lg font-bold text-blue-400 mb-2 flex items-center gap-2">
              <FitnessCenterIcon fontSize="small" /> Vücut Kompozisyonu (İsteğe Bağlı)
            </h3>
            <p className="text-slate-400 text-sm mb-4">Bu bilgiler daha kişiselleştirilmiş program oluşturmamıza yardımcı olur.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField
                label="Vücut Yağı (%)"
                placeholder="Örnek: 15"
                value={bodyComposition.bodyFat}
                onChange={(e) => setBodyComposition({ ...bodyComposition, bodyFat: e.target.value })}
              />
              <InputField
                label="Kas Kütlesi (kg)"
                placeholder="Örnek: 35"
                value={bodyComposition.muscleMass}
                onChange={(e) => setBodyComposition({ ...bodyComposition, muscleMass: e.target.value })}
              />
              <InputField
                label="Su Oranı (%)"
                placeholder="Örnek: 60"
                value={bodyComposition.waterPercentage}
                onChange={(e) => setBodyComposition({ ...bodyComposition, waterPercentage: e.target.value })}
              />
              <InputField
                label="Kemik Kütlesi (kg)"
                placeholder="Örnek: 2.5"
                value={bodyComposition.boneMass}
                onChange={(e) => setBodyComposition({ ...bodyComposition, boneMass: e.target.value })}
              />
            </div>
          </section>

          {/* Nutrition */}
          <section>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  checked={includeNutrition}
                  onChange={(e) => setIncludeNutrition(e.target.checked)}
                  className="w-6 h-6 rounded-lg bg-white/5 border border-white/20 checked:bg-blue-500 appearance-none transition-all cursor-pointer"
                />
                <CheckCircleIcon className={`absolute inset-0 m-auto text-white text-sm pointer-events-none transition-opacity ${includeNutrition ? 'opacity-100' : 'opacity-0'}`} sx={{ fontSize: 16 }} />
              </div>
              <span className="text-lg font-bold text-blue-400 flex items-center gap-2">
                <RestaurantIcon fontSize="small" /> Beslenme Programı da İstiyorum
              </span>
            </label>

            <AnimatePresence>
              {includeNutrition && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-4"
                >
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
                    <InputField
                      label="Sevdiğiniz Yiyecekler"
                      placeholder="Örnek: Tavuk, yulaf, muz"
                      value={nutritionPreferences.likedFoods}
                      onChange={(e) => setNutritionPreferences({ ...nutritionPreferences, likedFoods: e.target.value })}
                    />
                    <InputField
                      label="Sevmediğiniz Yiyecekler"
                      placeholder="Örnek: Brokoli, balık"
                      value={nutritionPreferences.dislikedFoods}
                      onChange={(e) => setNutritionPreferences({ ...nutritionPreferences, dislikedFoods: e.target.value })}
                    />
                    <InputField
                      label="Alerjiler"
                      placeholder="Örnek: Fıstık, laktoz"
                      value={nutritionPreferences.allergies}
                      onChange={(e) => setNutritionPreferences({ ...nutritionPreferences, allergies: e.target.value })}
                    />
                    
                    <div className="flex flex-col mb-4">
                      <label className="text-slate-300 text-sm font-medium mb-1">Beslenme Düzeni (Diyet Tarzı)</label>
                      <select
                        value={nutritionPreferences.mealFrequency}
                        onChange={(e) => setNutritionPreferences({ ...nutritionPreferences, mealFrequency: e.target.value })}
                        className="bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all [&>option]:bg-slate-800"
                      >
                        <option value="">Standart (3 Öğün + Ara Öğünler)</option>
                        <option value="16:8">16:8 Aralıklı Oruç (Intermittent Fasting)</option>
                        <option value="18:6">18:6 Aralıklı Oruç</option>
                        <option value="20:4">20:4 Aralıklı Oruç (Savaşçı Diyeti)</option>
                        <option value="OMAD">OMAD (Günde Tek Öğün)</option>
                        <option value="5:2">5:2 Diyeti</option>
                        <option value="keto">Ketojenik Diyet</option>
                        <option value="paleo">Paleo Diyeti</option>
                        <option value="mediterranean">Akdeniz Diyeti</option>
                        <option value="vegan">Vegan</option>
                        <option value="vegetarian">Vejetaryen</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-white/10 bg-slate-800/50 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all border border-white/10"
          >
            İptal
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !userRequest.trim()}
            className={`px-8 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 ${
              isGenerating || !userRequest.trim()
                ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white hover:shadow-blue-500/25"
            }`}
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Hazırlanıyor...
              </>
            ) : (
              "Program Oluştur"
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ExerciseGenerator;
