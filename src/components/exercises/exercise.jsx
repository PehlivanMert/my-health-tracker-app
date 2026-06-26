import React, { useState, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Container, Alert } from "@mui/material";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import AddIcon from "@mui/icons-material/Add";
import { doc } from "firebase/firestore";
import { toast } from "react-toastify";

import { db, auth } from "../auth/firebaseConfig";
import { safeUpdateDoc } from "../../utils/firestoreUtils";
import { invalidateUserCache } from "../../utils/cacheUtils";
import { GlobalStateContext } from "../context/GlobalStateContext";
import { useExercises } from "../../hooks/useExercises";
import { useExerciseAI } from "../../hooks/useExerciseAI";

import ExerciseCard from "./ExerciseCard";
import ExerciseGenerator from "./ExerciseGenerator";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const Exercises = ({ user }) => {
  const { exerciseAIState, setExerciseAIState } = useContext(GlobalStateContext);
  const { exercises, setExercises } = useExercises(user);
  const [openModal, setOpenModal] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const { generatePersonalizedProgram, canUseGemini, geminiUsage } = useExerciseAI(
    user,
    exercises,
    setExercises,
    setExerciseAIState
  );

  const handleDelete = async (exerciseId) => {
    const updatedExercises = exercises.filter((e) => e.id !== exerciseId);
    setExercises(updatedExercises);

    try {
      const userDocRef = doc(db, "users", user.uid);
      await safeUpdateDoc(userDocRef, {
        exercises: updatedExercises
      });
      invalidateUserCache(user.uid);
    } catch (error) {
      toast.error("Program silinirken hata oluştu!");
    }
  };

  if (!user) return <div className="text-center p-8 text-white">Lütfen giriş yapın</div>;

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <Container maxWidth="lg" className="space-y-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-8"
        >
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 flex items-center justify-center gap-4">
            <FitnessCenterIcon sx={{ fontSize: { xs: 40, sm: 50 } }} className="text-blue-500" />
            AI Spor Koçu
          </h1>
          <p className="text-slate-400 mt-4 text-lg">Yapay zeka destekli kişiselleştirilmiş spor programınız</p>
        </motion.div>

        {/* Main Content Area */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6 mb-8">
            <h2 className="text-2xl font-bold text-white text-center sm:text-left">
              Programlarınız
            </h2>
            <button
              onClick={() => setOpenModal(true)}
              disabled={!canUseGemini() || exerciseAIState?.isGenerating}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all shadow-lg ${!canUseGemini() || exerciseAIState?.isGenerating
                  ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white hover:shadow-blue-500/25"
                }`}
            >
              <AddIcon />
              {exerciseAIState?.isGenerating ? "Oluşturuluyor..." :
                canUseGemini() ? "Yeni Program Oluştur" : "Günlük Limit Doldu"}
            </button>
          </div>

          {geminiUsage && !canUseGemini() && (
            <Alert severity="info" className="mb-6 rounded-2xl">
              Günde sadece 3 kez program oluşturabilirsiniz. Yarın tekrar deneyin.
            </Alert>
          )}

          {exercises.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-white/10 rounded-3xl bg-white/5">
              <h3 className="text-xl text-white font-bold mb-2">Henüz spor programınız yok</h3>
              <p className="text-slate-400 mb-6">AI spor koçumuz size özel bir program oluşturmak için hazır!</p>
              <button
                onClick={() => setOpenModal(true)}
                disabled={!canUseGemini()}
                className="px-6 py-3 rounded-xl bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30 hover:bg-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                İlk Programınızı Oluşturun
              </button>
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-4"
            >
              {exercises
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .map((exercise) => (
                  <motion.div key={exercise.id} variants={itemVariants}>
                    <ExerciseCard
                      exercise={exercise}
                      onDelete={handleDelete}
                      expandedId={expandedId}
                      setExpandedId={setExpandedId}
                    />
                  </motion.div>
                ))}
            </motion.div>
          )}
        </div>

      </Container>

      {/* Program Oluşturma Modalı */}
      <AnimatePresence>
        {openModal && (
          <ExerciseGenerator
            open={openModal}
            onClose={() => setOpenModal(false)}
            onGenerate={(request, includeNutr, bodyComp, nutrPrefs, onSuccess) => {
              generatePersonalizedProgram(request, includeNutr, bodyComp, nutrPrefs, () => {
                onSuccess();
              });
            }}
            isGenerating={exerciseAIState?.isGenerating}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Exercises;