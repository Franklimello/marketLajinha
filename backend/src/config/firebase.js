// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// ... existing code ...
{{ modified code here }}
// ... rest of code ...


// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDF51FzoLyRU52X4-jXMW1evIr3DKw9vQ8",
  authDomain: "marcketlainha.firebaseapp.com",
  projectId: "marcketlainha",
  storageBucket: "marcketlainha.firebasestorage.app",
  messagingSenderId: "910649841875",
  appId: "1:910649841875:web:3ea1a73381a6914f56dc26",
  measurementId: "G-QJ6RRF830R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);