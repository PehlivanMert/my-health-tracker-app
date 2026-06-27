import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import YouTubeIcon from "@mui/icons-material/YouTube";
import RestaurantIcon from "@mui/icons-material/Restaurant";

const getDifficultyColor = (difficulty) => {
  const colors = {
    'Başlangıç': 'bg-green-500/20 text-green-400 border-green-500/30',
    'Orta': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    'İleri': 'bg-red-500/20 text-red-400 border-red-500/30',
    'Başlangıç/Orta': 'bg-green-500/20 text-green-400 border-green-500/30',
    'Orta/İleri': 'bg-orange-500/20 text-orange-400 border-orange-500/30'
  };
  return colors[difficulty] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
};

const ProgramDisplay = ({ program }) => {
  const [expandedDay, setExpandedDay] = useState(null);

  if (!program) return null;

  return (
    <div className="space-y-6 text-slate-200 mt-4">
      {/* Program Özeti */}
      {program.summary && (
        <div className="bg-purple-900/20 border border-purple-500/30 rounded-2xl p-5">
          <h4 className="text-purple-400 font-bold mb-2 flex items-center gap-2">
            📋 Program Özeti
          </h4>
          <p className="text-slate-300">{program.summary}</p>
        </div>
      )}

      {/* Hedefler */}
      {program.goals?.length > 0 && (
        <div className="bg-purple-900/20 border border-purple-500/30 rounded-2xl p-5">
          <h4 className="text-purple-400 font-bold mb-3 flex items-center gap-2">
            🎯 Hedefler
          </h4>
          <ul className="space-y-2">
            {program.goals.map((goal, index) => (
              <li key={index} className="flex items-start gap-2">
                <TrendingUpIcon className="text-purple-400 mt-1" fontSize="small" />
                <span>{goal}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Haftalık Program */}
      <div>
        <h4 className="text-orange-400 font-bold mb-3 flex items-center gap-2 text-xl">
          📅 Haftalık Program
        </h4>
        <div className="space-y-3">
          {(() => {
            const dayOrder = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
            const sortedDays = Object.entries(program.weeklyProgram || {}).sort((a, b) => {
              return dayOrder.indexOf(a[0]) - dayOrder.indexOf(b[0]);
            });

            return sortedDays.map(([day, dayProgram]) => (
              <div key={day} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpandedDay(expandedDay === day ? null : day)}
                  className="w-full flex items-center justify-between p-4 bg-gradient-to-r hover:brightness-110 transition-all from-blue-600/20 to-indigo-600/20"
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-white text-lg">{day}</span>
                    {dayProgram.duration && (
                      <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-white/10 text-slate-300">
                        <AccessTimeIcon fontSize="small" /> {dayProgram.duration}
                      </span>
                    )}
                    {dayProgram.difficulty && (
                      <span className={`text-xs px-2 py-1 rounded-md border ${getDifficultyColor(dayProgram.difficulty)}`}>
                        {dayProgram.difficulty}
                      </span>
                    )}
                  </div>
                  {expandedDay === day ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </button>
                <AnimatePresence>
                  {expandedDay === day && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-black/20"
                    >
                      <div className="p-4 space-y-3">
                        {dayProgram.exercises?.length > 0 ? (
                          dayProgram.exercises.map((exercise, index) => (
                            <div key={index} className="flex justify-between items-start gap-4 p-3 bg-white/5 rounded-xl">
                              <div className="flex gap-3 items-start">
                                <FitnessCenterIcon className="text-orange-400 mt-1" fontSize="small" />
                                <div>
                                  <div className="font-bold text-white">{exercise.name || exercise}</div>
                                  <div className="text-sm text-slate-400">{exercise.sets || exercise}</div>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  const searchTerm = encodeURIComponent(exercise.videoSearch || exercise.name || exercise);
                                  window.open(`https://www.youtube.com/results?search_query=${searchTerm}`, '_blank');
                                }}
                                className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-all flex-shrink-0"
                              >
                                <YouTubeIcon />
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="text-slate-400 p-2">Dinlenme günü</div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Önemli Notlar */}
      {program.notes?.length > 0 && (
        <div className="bg-orange-900/20 border border-orange-500/30 rounded-2xl p-5">
          <h4 className="text-orange-400 font-bold mb-3 flex items-center gap-2">
            💡 Önemli Notlar
          </h4>
          <ul className="space-y-2">
            {program.notes.map((note, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-orange-400">•</span>
                <span className="text-slate-300">{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Beslenme Programı */}
      {program.nutrition && (
        <div className="bg-orange-900/20 border border-orange-500/30 rounded-2xl p-5 mt-6">
          <h4 className="text-orange-400 font-bold mb-4 flex items-center gap-2 text-xl">
            <RestaurantIcon /> Beslenme Programı
          </h4>

          {program.nutrition.dailyCalories && (
            <div className="mb-4">
              <h5 className="text-orange-400 font-bold mb-1">📊 Günlük Kalori Hedefi</h5>
              <p className="text-slate-300">{program.nutrition.dailyCalories}</p>
            </div>
          )}

          {program.nutrition.macros && (
            <div className="mb-6">
              <h5 className="text-orange-400 font-bold mb-2">🥗 Makro Besin Dağılımı</h5>
              <div className="flex flex-wrap gap-2">
                <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-lg text-sm border border-green-500/30">
                  Protein: {program.nutrition.macros.protein}
                </span>
                <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-lg text-sm border border-blue-500/30">
                  Karbonhidrat: {program.nutrition.macros.carbs}
                </span>
                <span className="bg-orange-500/20 text-orange-300 px-3 py-1 rounded-lg text-sm border border-orange-500/30">
                  Yağ: {program.nutrition.macros.fat}
                </span>
              </div>
            </div>
          )}

          {program.nutrition.weeklyMeals && (
            <div>
              <h5 className="text-orange-400 font-bold mb-3">🗓️ Haftalık Beslenme Planı</h5>
              <div className="space-y-3">
                {(() => {
                  const dayOrder = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
                  const sortedDays = Object.entries(program.nutrition.weeklyMeals).sort((a, b) => {
                    return dayOrder.indexOf(a[0]) - dayOrder.indexOf(b[0]);
                  });

                  return sortedDays.map(([dayName, dayMeals]) => (
                    <div key={dayName} className="bg-black/20 rounded-xl overflow-hidden">
                      <div className="p-3 bg-white/5 font-bold text-orange-400 border-b border-white/5">
                        {dayName}
                      </div>
                      <div className="p-4 space-y-4">
                        {(() => {
                          const mealOrder = ['breakfast', 'lunch', 'dinner'];
                          const sortedMeals = Object.entries(dayMeals).sort((a, b) => {
                            const aI = mealOrder.indexOf(a[0]);
                            const bI = mealOrder.indexOf(b[0]);
                            if (aI === -1 && bI === -1) return a[0].localeCompare(b[0]);
                            if (aI === -1) return 1;
                            if (bI === -1) return -1;
                            return aI - bI;
                          });

                          return sortedMeals.map(([mealName, meal]) => (
                            <div key={mealName} className="bg-white/5 rounded-lg p-3">
                              <div className="text-orange-400 font-bold mb-2 flex flex-wrap gap-2 text-sm">
                                <span>
                                  {mealName === 'breakfast' ? '🌅 Kahvaltı' :
                                   mealName === 'lunch' ? '🌞 Öğle Yemeği' :
                                   mealName === 'dinner' ? '🌙 Akşam Yemeği' :
                                   mealName === 'snacks' ? '🍎 Ara Öğünler' : mealName}
                                </span>
                                {meal.time && <span className="text-slate-400">({meal.time})</span>}
                                {meal.calories && <span className="text-slate-400">- {meal.calories} kcal</span>}
                              </div>
                              <ul className="space-y-1">
                                {meal.foods?.map((food, i) => (
                                  <li key={i} className="flex justify-between items-center text-slate-300 text-sm">
                                    <div className="flex items-center gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500/50"></span>
                                      {food}
                                    </div>
                                    <button
                                      onClick={() => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(food + ' tarifi')}`, '_blank')}
                                      className="text-red-400 hover:text-red-300 transition-colors"
                                    >
                                      <YouTubeIcon fontSize="small" />
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {program.nutrition.nutritionNotes?.length > 0 && (
            <div className="mt-4">
              <h5 className="text-orange-400 font-bold mb-2">💡 Beslenme Notları</h5>
              <ul className="space-y-1">
                {program.nutrition.nutritionNotes.map((note, index) => (
                  <li key={index} className="flex items-start gap-2 text-slate-300 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500/50 mt-1.5 shrink-0"></span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Video Önerileri */}
      {program.videoSuggestions?.length > 0 && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-2xl p-5">
          <h4 className="text-red-400 font-bold mb-2 flex items-center gap-2">
            🎥 Video Önerileri
          </h4>
          <p className="text-slate-400 text-sm mb-4">
            Egzersizlerinizi doğru form ile yapmak için YouTube'da arama yapabileceğiniz anahtar kelimeler:
          </p>
          <div className="flex flex-wrap gap-2">
            {program.videoSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(suggestion)}`, '_blank')}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-white rounded-xl transition-all border border-red-500/30 text-sm"
              >
                <YouTubeIcon fontSize="small" className="text-red-400" />
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const MarkdownRenderer = ({ content }) => {
  if (!content) return null;
  const textToRender = typeof content === "string" ? content.replace(/```markdown/gi, '').replace(/```json/gi, '').replace(/```/g, '').trim() : String(content);
  const sections = textToRender.split(/\n\n+/);

  const formatText = (text) => {
    let formatted = text.replace(/^[-*]\s*/, '').trim();
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-blue-400">$1</strong>');
    return { __html: formatted };
  };

  return (
    <div className="space-y-4">
      {sections.map((section, idx) => {
        const isHeading = section.startsWith('**') || section.startsWith('##') || section.startsWith('###');
        const isList = section.startsWith('-') || section.startsWith('*');

        if (isHeading) {
          return (
            <h4 key={idx} className="font-bold text-xl text-orange-400 mt-6 mb-3 flex items-center gap-2">
              {section.replace(/[*#]/g, '').trim()}
            </h4>
          );
        }

        if (isList) {
          return (
            <ul key={idx} className="space-y-3">
              {section.split('\n').filter(Boolean).map((item, i) => (
                <li key={idx + "-" + i} className="flex items-start gap-3 bg-white/5 p-4 rounded-xl border border-white/10 shadow-sm hover:bg-white/10 transition-all">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500/50 mt-2 shrink-0"></span>
                  <span className="text-slate-300 leading-relaxed flex-1" dangerouslySetInnerHTML={formatText(item)} />
                </li>
              ))}
            </ul>
          );
        }

        return (
          <div key={idx} className="bg-white/5 p-4 rounded-xl border border-white/10 shadow-sm">
            <p className="text-slate-300 leading-relaxed" dangerouslySetInnerHTML={formatText(section)} />
          </div>
        );
      })}
    </div>
  );
};

const ExerciseCard = ({ exercise, onDelete, expandedId, setExpandedId }) => {
  const isExpanded = expandedId === exercise.id;

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-xl transition-all hover:shadow-cyan-500/10 hover:border-cyan-500/20">
      {/* Card Header */}
      <div
        className="flex justify-between items-center p-4 sm:p-6 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 cursor-pointer"
        onClick={() => setExpandedId(isExpanded ? null : exercise.id)}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shrink-0 shadow-lg">
            <FitnessCenterIcon className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-white text-lg sm:text-xl truncate">
              {exercise.title}
            </h3>
            <p className="text-slate-400 text-sm">
              {new Date(exercise.createdAt).toLocaleDateString('tr-TR')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(exercise.id);
            }}
            className="p-2 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-xl transition-all"
          >
            <DeleteIcon />
          </button>
          <div className={`p-2 text-slate-300 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}>
            <ExpandMoreIcon />
          </div>
        </div>
      </div>

      {/* Card Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/5"
          >
            <div className="p-4 sm:p-6">
              {exercise.type === "ai-generated" && exercise.parsedContent ? (
                <ProgramDisplay program={exercise.parsedContent} />
              ) : (
                <MarkdownRenderer content={exercise.content} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExerciseCard;
