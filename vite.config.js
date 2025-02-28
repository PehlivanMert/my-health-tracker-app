import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "react/jsx-runtime": resolve(
        __dirname,
        "node_modules/react/jsx-runtime.js"
      ),
      "react/jsx-dev-runtime": resolve(
        __dirname,
        "node_modules/react/jsx-dev-runtime.js"
      ),
    },
  },
  define: {
    __FIREBASE_API_KEY__: JSON.stringify(process.env.VITE_FIREBASE_API_KEY),
    __FIREBASE_AUTH_DOMAIN__: JSON.stringify(
      process.env.VITE_FIREBASE_AUTH_DOMAIN
    ),
    __FIREBASE_PROJECT_ID__: JSON.stringify(
      process.env.VITE_FIREBASE_PROJECT_ID
    ),
    __FIREBASE_STORAGE_BUCKET__: JSON.stringify(
      process.env.VITE_FIREBASE_STORAGE_BUCKET
    ),
    __FIREBASE_MESSAGING_SENDER_ID__: JSON.stringify(
      process.env.VITE_FIREBASE_MESSAGING_SENDER_ID
    ),
    __FIREBASE_APP_ID__: JSON.stringify(process.env.VITE_FIREBASE_APP_ID),
    __FIREBASE_MEASUREMENT_ID__: JSON.stringify(
      process.env.VITE_FIREBASE_MEASUREMENT_ID
    ),
  },
  build: {
    rollupOptions: {
      external: [
        "firebase/app",
        "firebase/messaging",
        "firebase/firestore",
        "firebase/auth",
      ],
      output: {
        manualChunks: {
          firebase: ["firebase/app", "firebase/auth", "firebase/firestore"],
        },
      },
    },
    sourcemap: process.env.NODE_ENV !== "production",
  },
});
