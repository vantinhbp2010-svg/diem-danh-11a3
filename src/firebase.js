import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDqXu6fB6ZDNtijOoZV0Z-Sk4gQSCvw7Gs",
  authDomain: "diem-danh-11a3.firebaseapp.com",
  projectId: "diem-danh-11a3",
  storageBucket: "diem-danh-11a3.firebasestorage.app",
  messagingSenderId: "93802221159",
  appId: "1:93802221159:web:1ca23633bb7782e018cec2",
  measurementId: "G-TX64VHQWEN",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);