import { useState, useEffect, useRef, useCallback } from "react";
import { doc } from "firebase/firestore";
import { db } from "../components/auth/firebaseConfig";
import { safeGetDoc, safeSetDoc, safeUpdateDoc } from "../utils/firestoreUtils";
import { cachedFirestoreGet, invalidateUserCache } from "../utils/cacheUtils";
import { format } from "date-fns";

export const useExercises = (user) => {
  const [exercises, setExercises] = useState([]);
  const [editingExercise, setEditingExercise] = useState(null);

  const isInitialLoad = useRef(true);
  const isDataLoading = useRef(true);
  const lastExercisesState = useRef([]);

  // Firestore'dan Kullanıcı Verilerini Yükleme
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;
      try {
        if (!user.emailVerified) return;

        const userDocRef = doc(db, "users", user.uid);
        const cacheKey = `user_exercises_${user.uid}`;
        let exercisesData = null;

        try {
          exercisesData = await cachedFirestoreGet(
            cacheKey,
            async () => {
              const docSnap = await safeGetDoc(userDocRef);
              return docSnap.exists() ? docSnap.data() : null;
            },
            5 * 60 * 1000 // 5 dakika cache
          );
        } catch (error) {
          const docSnap = await safeGetDoc(userDocRef);
          exercisesData = docSnap.exists() ? docSnap.data() : null;
        }

        if (exercisesData) {
          const loadedExercises = exercisesData.exercises || [];
          setExercises(loadedExercises);
          lastExercisesState.current = loadedExercises;
          isInitialLoad.current = false;
          isDataLoading.current = false;
        } else {
          await safeSetDoc(userDocRef, { exercises: [] });
          setExercises([]);
          lastExercisesState.current = [];
          isInitialLoad.current = false;
          isDataLoading.current = false;
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Veri yükleme hatası:", error);
        }
        isDataLoading.current = false;
      }
    };
    loadUserData();
  }, [user]);

  // Egzersiz Güncelleme - Korumalı
  useEffect(() => {
    if (!user || isInitialLoad.current || isDataLoading.current) return;

    const hasRealChange =
      JSON.stringify(exercises) !== JSON.stringify(lastExercisesState.current);
    const isEmptyArray = Array.isArray(exercises) && exercises.length === 0;
    const wasEmptyArray =
      Array.isArray(lastExercisesState.current) &&
      lastExercisesState.current.length === 0;

    if (hasRealChange && !(isEmptyArray && !wasEmptyArray)) {
      const updateExercisesInFirestore = async () => {
        try {
          const userDocRef = doc(db, "users", user.uid);
          await safeUpdateDoc(userDocRef, { exercises });
          lastExercisesState.current = [...exercises];
          invalidateUserCache(user.uid);
        } catch (error) {
          if (process.env.NODE_ENV === "development") {
            console.error("Veri kaydetme hatası:", error);
          }
        }
      };
      updateExercisesInFirestore();
    }
  }, [exercises, user]);

  const handleExerciseSubmit = useCallback((exercise) => {
    setExercises((prev) =>
      exercise.id
        ? prev.map((e) => (e.id === exercise.id ? exercise : e))
        : [...prev, { ...exercise, id: Date.now().toString() }]
    );
    setEditingExercise(null);
  }, []);

  return {
    exercises,
    setExercises,
    editingExercise,
    setEditingExercise,
    handleExerciseSubmit,
  };
};
