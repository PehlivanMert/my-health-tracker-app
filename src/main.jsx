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

// Service Worker kaydı (PWA güncelleme bildirimi ile)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/service-worker.js")
    .then((registration) => {
      console.log("Service Worker kayıt edildi:", registration);

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
      console.error("Service Worker kaydedilirken hata oluştu:", error);
    });
}
