import { useState, useEffect, useContext } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../components/auth/firebaseConfig";
import { GlobalStateContext } from "../components/context/GlobalStateContext";

export const useAuthFlow = () => {
  const { user, setUser } = useContext(GlobalStateContext);
  const [authChecked, setAuthChecked] = useState(false);
  const [lastEmailSent, setLastEmailSent] = useState(
    parseInt(localStorage.getItem("lastEmailSent")) || 0
  );
  const [remainingTime, setRemainingTime] = useState(0);

  // Email gönderme zamanlayıcısı
  useEffect(() => {
    let interval;
    if (lastEmailSent) {
      interval = setInterval(() => {
        const now = Date.now();
        const timePassed = Math.floor((now - lastEmailSent) / 1000);
        if (timePassed < 60) {
          setRemainingTime(60 - timePassed);
        } else {
          setRemainingTime(0);
          setLastEmailSent(0);
          localStorage.removeItem("lastEmailSent");
          clearInterval(interval);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lastEmailSent]);

  // Firebase Auth: Kullanıcı Oturumunu İzleme ve Doğrulama
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (!firebaseUser.emailVerified) {
          await firebaseUser.reload();
          const updatedUser = auth.currentUser;
          setUser(updatedUser?.emailVerified ? updatedUser : firebaseUser); // firebaseUser'ı setliyoruz ki auth akışında email doğrulama sayfası görünsün
        } else {
          setUser(firebaseUser);
        }
      } else {
        setUser(null);
      }
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, [setUser]);

  // Email Doğrulama Kontrolü (Polling)
  useEffect(() => {
    if (user && !user.emailVerified) {
      const interval = setInterval(async () => {
        try {
          await user.reload();
          const updatedUser = auth.currentUser;
          if (updatedUser?.emailVerified) {
            setUser(updatedUser);
          }
        } catch (error) {
          if (process.env.NODE_ENV === "development") {
            console.error("Yenileme hatası:", error);
          }
        }
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [user, setUser]);

  return {
    user,
    authChecked,
    lastEmailSent,
    setLastEmailSent,
    remainingTime,
  };
};
