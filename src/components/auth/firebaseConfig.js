// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBChufygTN7Zapv2b3gPD-Tx8NhMByJvdQ",
  authDomain: "my-health-tracker-6bee8.firebaseapp.com",
  projectId: "my-health-tracker-6bee8",
  storageBucket: "my-health-tracker-6bee8.firebasestorage.app",
  messagingSenderId: "1090996160962",
  appId: "1:1090996160962:web:a8034a710f631d7250ae5b",
  measurementId: "G-Q2X30DHVTG",
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
