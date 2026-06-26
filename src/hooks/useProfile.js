import { useState, useEffect, useCallback } from "react";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../components/auth/firebaseConfig";
import {
  cachedFirestoreGet,
  invalidateUserCache,
} from "../utils/cacheUtils";
import { toast } from "react-toastify";

export const useProfile = (user) => {
  const [profileData, setProfileData] = useState({
    username: "",
    gender: "",
    birthDate: null,
    height: "",
    weight: "",
    profileImage: "",
    firstName: "",
    lastName: "",
    waterGoal: 2000,
  });
  const [openProfileModal, setOpenProfileModal] = useState(false);
  const [openProfileCompletionModal, setOpenProfileCompletionModal] =
    useState(false);
  const [showBirthdayAnimation, setShowBirthdayAnimation] = useState(false);

  // Doğum günü kontrolü
  useEffect(() => {
    if (user && profileData.birthDate) {
      const today = new Date();
      const birthDate = new Date(profileData.birthDate);

      // Ay ve gün eşleşiyor mu kontrol et
      if (
        today.getMonth() === birthDate.getMonth() &&
        today.getDate() === birthDate.getDate()
      ) {
        // Bu yıl için animasyon zaten gösterilmiş mi kontrol et
        const animationKey = `birthday_animation_shown_${user.uid}_${today.getFullYear()}`;
        const hasShownThisYear = localStorage.getItem(animationKey);

        if (!hasShownThisYear) {
          setShowBirthdayAnimation(true);
          localStorage.setItem(animationKey, "true");

          // 10 saniye sonra animasyonu otomatik kapat
          setTimeout(() => {
            setShowBirthdayAnimation(false);
          }, 10000);
        }
      }
    }
  }, [user, profileData.birthDate]);

  // Profil verilerini getir
  const fetchProfileData = useCallback(async () => {
    if (user && user.uid) {
      try {
        const profileDataRes = await cachedFirestoreGet(
          `users/${user.uid}/profile`,
          () => getDoc(doc(db, "users", user.uid))
        );

        let prof = {};
        if (profileDataRes && profileDataRes.profile) {
          prof = profileDataRes.profile;
        }

        setProfileData((prev) => ({
          ...prev,
          ...prof,
          birthDate: prof.birthDate ? new Date(prof.birthDate) : null,
          waterGoal: prof.waterGoal || 2000,
        }));

        // Profil tamamlama dialogu: sadece bu oturumda gösterilmediyse aç
        const completionDismissedKey = `profile_completion_dismissed_${user.uid}`;
        const alreadyDismissed = localStorage.getItem(completionDismissedKey);

        if (!prof.isProfileCompleted && !alreadyDismissed && (!prof.username || !prof.gender || !prof.birthDate || !prof.height || !prof.weight)) {
          setOpenProfileCompletionModal(true);
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Profil verisi çekilirken hata:", error);
        }
      }
    }
  }, [user]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleProfileUpdate = async (updatedData) => {
    if (user && user.uid) {
      try {
        const userRef = doc(db, "users", user.uid);
        const profileToSave = { ...updatedData, isProfileCompleted: true };
        if (profileToSave.birthDate instanceof Date) {
          profileToSave.birthDate = profileToSave.birthDate.toISOString();
        }

        const docSnap = await getDoc(userRef);
        if (!docSnap.exists()) {
          await setDoc(userRef, { profile: profileToSave });
        } else {
          await updateDoc(userRef, { profile: profileToSave });
        }

        invalidateUserCache(`users/${user.uid}/profile`);
        setProfileData(updatedData);
        setOpenProfileModal(false);
        setOpenProfileCompletionModal(false);

        // Profil tamamlandı olarak işaretle — bir daha otomatik açılmasın
        localStorage.setItem(`profile_completion_dismissed_${user.uid}`, "true");

        toast.success("Profil başarıyla güncellendi!");
      } catch (error) {
        console.error("Profil güncellenirken hata:", error);
        toast.error("Profil güncellenirken bir hata oluştu.");
      }
    }
  };

  return {
    profileData,
    setProfileData,
    openProfileModal,
    setOpenProfileModal,
    openProfileCompletionModal,
    setOpenProfileCompletionModal,
    showBirthdayAnimation,
    setShowBirthdayAnimation,
    handleProfileUpdate,
    fetchProfileData,
  };
};
