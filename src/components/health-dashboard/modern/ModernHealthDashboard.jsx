import React, { useState, useEffect, useContext } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../auth/firebaseConfig";
import { GlobalStateContext } from "../../context/GlobalStateContext";
import { HeartPulse, Droplets, Activity, Flame, TrendingUp, AlertCircle } from "lucide-react";
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
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Günaydın";
    if (hour >= 12 && hour < 18) return "İyi Günler";
    if (hour >= 18 && hour < 22) return "İyi Akşamlar";
    return "İyi Geceler";
  };

  return (
    <motion.div
      className="min-h-screen pt-2 sm:p-3 md:p-6 font-sans"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">

        {/* ── Kompakt Header ── */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              {getGreeting()}, <span className="text-cyan-400">{profileData.firstName || "Kullanıcı"}</span> 👋
            </h2>
            <p className="text-xs md:text-sm text-slate-400 font-medium">
              {format(new Date(), "dd MMMM yyyy, EEEE", { locale: tr })}
            </p>
          </div>
          <div className="hidden md:flex bg-indigo-500/15 backdrop-blur-md border border-indigo-500/20 rounded-full px-3 py-1 items-center gap-2">
            <HeartPulse className="h-4 w-4 text-indigo-400 animate-pulse" />
            <span className="text-xs font-semibold text-indigo-300">Sağlık Panosu</span>
          </div>
        </motion.div>

        {/* ── AI Önerileri (En Üste Taşındı) ── */}
        <motion.div variants={itemVariants}>
          <AiRecommendationsCard user={user} profileData={profileData} healthData={healthData} />
        </motion.div>

        {/* ── Kompakt İstatistikler (Mini Grid) ── */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          
          {/* Su Tüketimi Mini */}
          <div className="relative overflow-hidden rounded-2xl p-4 border border-white/10"
            style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(16px)" }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-1.5 bg-blue-500/15 rounded-lg border border-blue-500/20">
                <Droplets className="h-4 w-4 text-blue-400" />
              </div>
              <h3 className="font-semibold text-slate-300 text-xs">Su</h3>
            </div>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-2xl font-bold text-white">
                {healthData.waterData?.waterIntake || 0}
              </span>
              <span className="text-[10px] text-slate-400">/ {healthData.waterData?.dailyWaterTarget || 2000} ml</span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(((healthData.waterData?.waterIntake || 0) / (healthData.waterData?.dailyWaterTarget || 2000)) * 100, 100)}%`,
                  background: "linear-gradient(90deg, #3b82f6, #06b6d4)",
                }}
              />
            </div>
          </div>

          {/* VKİ Mini */}
          <div className="relative overflow-hidden rounded-2xl p-4 border border-white/10"
            style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(16px)" }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-1.5 bg-indigo-500/15 rounded-lg border border-indigo-500/20">
                <Activity className="h-4 w-4 text-indigo-400" />
              </div>
              <h3 className="font-semibold text-slate-300 text-xs">VKİ</h3>
            </div>
            {healthData.bmi ? (
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-white">{healthData.bmi.value}</span>
                <div className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                  {healthData.bmi.status}
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 mt-1">Eksik Profil Verisi</p>
            )}
          </div>

          {/* Takviye Mini (Mobilde 2. satıra kayar, md'de 3. kolon olur) */}
          <div className="col-span-2 md:col-span-1 relative overflow-hidden rounded-2xl p-4 border border-white/10"
            style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(16px)" }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-1.5 bg-amber-500/15 rounded-lg border border-amber-500/20">
                <Flame className="h-4 w-4 text-amber-400" />
              </div>
              <h3 className="font-semibold text-slate-300 text-xs">Takviye Serisi</h3>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-white">
                  {healthData.supplementStats?.currentStreak || 0}
                </span>
                <span className="text-[10px] text-slate-400">gün</span>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Toplam {healthData.supplementStats?.totalConsumed || 0}
              </div>
            </div>
          </div>

        </motion.div>

        {/* ── Grafikler (En Altta, Modern/Daraltılmış) ── */}
        <motion.div variants={itemVariants}>
          <ModernChartsSection user={user} />
        </motion.div>

      </div>
    </motion.div>
  );
};

export default ModernHealthDashboard;
