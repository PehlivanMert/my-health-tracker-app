import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { GlobalStateProvider } from "./components/context/GlobalStateContext";

const container = document.getElementById("root");
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <GlobalStateProvider>
      <App />
    </GlobalStateProvider>
  </React.StrictMode>
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
