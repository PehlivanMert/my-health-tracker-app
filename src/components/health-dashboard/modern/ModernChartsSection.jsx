import React, { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../../auth/firebaseConfig";

// Mevcut grafik bileşenlerini doğrudan ithal ediyoruz
import WaterConsumptionChart from "../../wellnesstracker/WaterConsumptionChart";
import SupplementConsumptionChart from "../../wellnesstracker/SupplementConsumptionChart";

const ModernChartsSection = ({ user }) => {
  const [waterHistory, setWaterHistory] = useState([]);
  const [supplementHistory, setSupplementHistory] = useState([]);

  const fetchChartData = async () => {
    if (!user) return;
    try {
      const waterRef = collection(db, "users", user.uid, "water", "history", "records");
      const supplementRef = collection(db, "users", user.uid, "stats", "supplementHistory", "records");

      const [waterSnap, supplementSnap] = await Promise.all([
        getDocs(waterRef),
        getDocs(supplementRef),
      ]);

      const wHistory = waterSnap.docs.map(doc => doc.data());
      const sHistory = supplementSnap.docs.map(doc => doc.data());

      setWaterHistory(wHistory);
      setSupplementHistory(sHistory);
    } catch (error) {
      console.error("Grafik verileri alınırken hata:", error);
    }
  };

  useEffect(() => {
    fetchChartData();
  }, [user]);

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-xl shadow-cyan-500/10 border border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-green-400 to-teal-500 rounded-2xl shadow-md">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <h3 className="font-bold text-xl text-white tracking-tight">Detaylı Analizler</h3>
        </div>
        <p className="text-sm text-slate-400 mb-6">Su ve takviye istatistiklerinizin detaylı kırılımı.</p>
        
        <div className="space-y-6">
          {/* Wrapper for old MUI/Recharts component to protect its styling scope */}
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
            <WaterConsumptionChart waterHistory={waterHistory} onRefresh={fetchChartData} />
          </div>
          
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
            <SupplementConsumptionChart historyData={supplementHistory} onRefresh={fetchChartData} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernChartsSection;
