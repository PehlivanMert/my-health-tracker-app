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
      className="min-h-screen p-4 md:p-8 font-sans"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Hero Header ── */}
        <motion.div
          variants={itemVariants}
          className="relative overflow-hidden rounded-3xl p-8 text-white shadow-2xl"
          style={{ background: "linear-gradient(135deg, #4f46e5 0%, #0891b2 100%)" }}
        >
          {/* Decorative blobs */}
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <HeartPulse className="h-9 w-9 text-red-300 animate-pulse" />
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Sağlık Panosu</h1>
              </div>
              <p className="text-blue-100/80 font-medium ml-2">
                {format(new Date(), "dd MMMM yyyy, EEEE", { locale: tr })}
              </p>
              <h2 className="text-xl font-semibold mt-3 text-white/90">
                Merhaba, <span className="text-white font-bold">{profileData.firstName || "Kullanıcı"}! 👋</span>
              </h2>
            </div>

            <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl py-4 px-6 text-center w-full md:w-auto">
              <span className="block text-sm font-medium text-white/70 mb-1">Bugünkü Hedefiniz</span>
              <span className="block text-xl font-bold text-white">Sağlıklı Kal! 💪</span>
            </div>
          </div>
        </motion.div>

        {/* ── Stats Grid ── */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

          {/* Su Tüketimi */}
          <div className="group relative overflow-hidden rounded-3xl p-6 border border-white/10 hover:border-blue-500/30 transition-all duration-300 hover:-translate-y-1"
            style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(16px)" }}>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-3xl" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-400 text-sm">Su Tüketimi</h3>
              <div className="p-2.5 bg-blue-500/15 rounded-2xl border border-blue-500/20">
                <Droplets className="h-5 w-5 text-blue-400" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-4xl font-bold text-white">
                {healthData.waterData?.waterIntake || 0}
              </span>
              <span className="text-sm text-slate-400 font-medium">
                / {healthData.waterData?.dailyWaterTarget || 2000} ml
              </span>
            </div>
            <div className="w-full bg-white/8 rounded-full h-2 overflow-hidden">
              <div
                className="h-2 rounded-full transition-all duration-1000"
                style={{
                  width: `${Math.min(((healthData.waterData?.waterIntake || 0) / (healthData.waterData?.dailyWaterTarget || 2000)) * 100, 100)}%`,
                  background: "linear-gradient(90deg, #60a5fa, #06b6d4)",
                }}
              />
            </div>
          </div>

          {/* VKİ */}
          <div className="group relative overflow-hidden rounded-3xl p-6 border border-white/10 hover:border-indigo-500/30 transition-all duration-300 hover:-translate-y-1"
            style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(16px)" }}>
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-3xl" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-400 text-sm">Vücut Kitle İndeksi</h3>
              <div className="p-2.5 bg-indigo-500/15 rounded-2xl border border-indigo-500/20">
                <Activity className="h-5 w-5 text-indigo-400" />
              </div>
            </div>
            {healthData.bmi ? (
              <>
                <span className="text-4xl font-bold text-white">{healthData.bmi.value}</span>
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {healthData.bmi.status}
                </div>
              </>
            ) : (
              <div className="mt-2">
                <p className="text-sm text-slate-400">BMI hesaplanamadı.</p>
                <p className="text-xs text-slate-500 mt-1">Profil &gt; Boy/Kilo bilgilerini girin.</p>
              </div>
            )}
          </div>

          {/* Takviye Serisi */}
          <div className="group relative overflow-hidden rounded-3xl p-6 border border-white/10 hover:border-amber-500/30 transition-all duration-300 hover:-translate-y-1"
            style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(16px)" }}>
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-3xl" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-400 text-sm">Takviye İstatistikleri</h3>
              <div className="p-2.5 bg-amber-500/15 rounded-2xl border border-amber-500/20">
                <Flame className="h-5 w-5 text-amber-400" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-4xl font-bold text-white">
                {healthData.supplementStats?.currentStreak || 0}
              </span>
              <span className="text-sm text-slate-400 font-medium">günlük seri</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-slate-400">
              <AlertCircle className="h-4 w-4" />
              Toplam: {healthData.supplementStats?.totalConsumed || 0} adet
            </div>
          </div>

        </motion.div>

        {/* ── AI + Charts ── */}
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
