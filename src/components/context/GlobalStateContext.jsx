import React, { createContext, useState, useEffect } from "react";
import { auth, db } from "../auth/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";

// Global state için context oluşturuyoruz
export const GlobalStateContext = createContext();

export const GlobalStateProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [supplements, setSupplements] = useState([]);

  // Firebase Auth ile kullanıcı durumunu izleyelim
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Kullanıcı varsa supplements verisini Firestore’dan çekelim
  useEffect(() => {
    const fetchSupplements = async () => {
      if (user && user.uid) {
        try {
          const ref = collection(db, "users", user.uid, "supplements");
          const querySnapshot = await getDocs(ref);
          const supplementsData = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setSupplements(supplementsData);
        } catch (error) {
          if (process.env.NODE_ENV === "development") {
            console.error("Supplements verisi çekilirken hata:", error);
          }
        }
      }
    };
    fetchSupplements();
  }, [user]);

  return (
    <GlobalStateContext.Provider
      value={{ user, setUser, supplements, setSupplements }}
    >
      {children}
    </GlobalStateContext.Provider>
  );
};
