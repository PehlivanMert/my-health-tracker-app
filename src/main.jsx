import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

// Uygulamayı sarmalayarak başlat
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .getRegistration()
    .then((registration) => {
      if (!registration) {
        return navigator.serviceWorker
          .register("/firebase-messaging-sw.js")
          .then((registration) => {
            console.log(
              "✅ Firebase Messaging SW başarıyla kaydedildi:",
              registration
            );
            return registration;
          })
          .catch((error) => {
            console.error("❌ SW kaydı başarısız:", error);
            throw error;
          });
      } else {
        console.log("🟢 Firebase Messaging SW zaten kayıtlı:", registration);
        return registration;
      }
    })
    .then((registration) => {
      registration.onupdatefound = () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.onstatechange = () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              if (
                confirm(
                  "Yeni bir güncelleme var! Şimdi yenilemek ister misiniz?"
                )
              ) {
                window.location.reload();
              }
            }
          };
        }
      };
    })
    .catch((error) => {
      console.error(
        "Service Worker kaydı veya güncelleme kontrolü sırasında hata oluştu:",
        error
      );
    });
}
