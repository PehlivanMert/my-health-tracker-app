import React, { useState, useEffect, useContext } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../../auth/firebaseConfig";
import { GlobalStateContext } from "../../context/GlobalStateContext";
import { Button } from "@/components/ui/button";
import { HeartPulse, Droplets, Activity, Flame, TrendingUp, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "react-toastify";
import AiRecommendationsCard from "./AiRecommendationsCard";
import ModernChartsSection from "./ModernChartsSection";
import { motion } from "framer-motion";

const ModernHealthDashboard = ({ user }) => {
  const { healthDashboardState, setHealthDashboardState } = useContext(GlobalStateContext);
  const [profileData, setProfileData] = useState({ firstName: "", height: "", weight: "", age: null });
  const [healthData, setHealthData] = useState({ waterData: null, bmi: null, supplementStats: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        const userRef = doc(db, "users", user.uid);
        const [userSnap, waterSnap, supplementStatsSnap] = await Promise.all([
          getDoc(userRef),
          getDoc(doc(db, "users", user.uid, "water", "current")),
          getDoc(doc(db, "users", user.uid, "stats", "supplementConsumption")),
        ]);

        if (userSnap.exists()) {
          const data = userSnap.data();
          const prof = data.profile || {};
          setProfileData({ ...prof });

          // Calculate BMI
          let bmiData = null;
          if (prof.height && prof.weight) {
            const h = prof.height / 100;
            const bmiVal = prof.weight / (h * h);
            let status = "Normal";
            if (bmiVal < 18.5) status = "Zayıf";
            else if (bmiVal < 24.9) status = "Normal";
            else if (bmiVal < 29.9) status = "Fazla Kilolu";
            else status = "Obez";
            bmiData = { value: bmiVal.toFixed(1), status };
          }

          setHealthData({
            waterData: waterSnap.exists() ? waterSnap.data() : { waterIntake: 0, dailyWaterTarget: 2000 },
            bmi: bmiData,
            supplementStats: supplementStatsSnap.exists() ? supplementStatsSnap.data() : null,
          });
        }
      } catch (error) {
        toast.error("Veri yükleme hatası: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchAllData();
  }, [user]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };

  return (
    <motion.div 
      className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 font-sans"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section with Glassmorphism */}
        <motion.div variants={itemVariants} className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
          
          {/* Decorative shapes */}
          <div className="absolute -right-10 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
          <div className="absolute -left-10 -bottom-24 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <HeartPulse className="h-10 w-10 text-red-400 animate-pulse" />
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Sağlık Panosu</h1>
              </div>
              <p className="text-blue-100 font-medium text-lg ml-2">
                {format(new Date(), "dd MMMM yyyy, EEEE", { locale: tr })}
              </p>
              <h2 className="text-2xl font-semibold mt-4 text-white/90">
                Merhaba, <span className="text-white">{profileData.firstName || "Kullanıcı"}!</span>
              </h2>
            </div>
            
            <div className="flex flex-col gap-3 w-full md:w-auto">
              <div className="bg-white/20 text-white border-none shadow-lg backdrop-blur-md rounded-xl py-3 px-6 text-center transition-all duration-300">
                <span className="block text-sm font-medium opacity-80">Bugünkü Hedefiniz</span>
                <span className="block text-xl font-bold">Sağlıklı Kal!</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Water Intake Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-500 dark:text-slate-400">Su Tüketimi</h3>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-2xl">
                <Droplets className="h-6 w-6 text-blue-500" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-slate-800 dark:text-white">
                {healthData.waterData?.waterIntake || 0}
              </span>
              <span className="text-sm font-medium text-slate-500">
                / {healthData.waterData?.dailyWaterTarget || 2000} ml
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-4 overflow-hidden">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-1000" 
                style={{ width: `${Math.min(((healthData.waterData?.waterIntake || 0) / (healthData.waterData?.dailyWaterTarget || 2000)) * 100, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* BMI Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-500 dark:text-slate-400">Vücut Kitle İndeksi</h3>
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl">
                <Activity className="h-6 w-6 text-indigo-500" />
              </div>
            </div>
            {healthData.bmi ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-slate-800 dark:text-white">
                    {healthData.bmi.value}
                  </span>
                </div>
                <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                  <TrendingUp className="h-4 w-4" />
                  Durum: {healthData.bmi.status}
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2 mt-2">
                <span className="text-sm text-slate-400">BMI hesaplanamadı.</span>
                <span className="text-xs text-slate-500">Lütfen profilinizden boy ve kilo bilgilerinizi güncelleyin.</span>
              </div>
            )}
          </div>

          {/* Supplement Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-500 dark:text-slate-400">Takviye İstatistikleri</h3>
              <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-2xl">
                <Flame className="h-6 w-6 text-amber-500" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-slate-800 dark:text-white">
                {healthData.supplementStats?.currentStreak || 0}
              </span>
              <span className="text-sm font-medium text-slate-500">günlük seri</span>
            </div>
            <div className="mt-4 text-sm text-slate-500 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Toplam tüketim: {healthData.supplementStats?.totalConsumed || 0} adet
            </div>
          </div>

        </motion.div>

        {/* Modern Charts & AI Recommendations */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AiRecommendationsCard user={user} profileData={profileData} healthData={healthData} />
          </div>
          <div className="lg:col-span-1">
            <ModernChartsSection user={user} />
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
};

export default ModernHealthDashboard;
