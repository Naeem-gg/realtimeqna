import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// NOTE: The USER needs to fill these values from their Firebase Console
// Find these in Project Settings > General > Your apps (Web app)
const firebaseConfig = {
  apiKey: "AIzaSyBZcuwXlj-_Mj4UQ7DoXCfRG1kvfwCT8vE",
  authDomain: "qnareaktime.firebaseapp.com",
  databaseURL: "https://qnareaktime-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "qnareaktime",
  storageBucket: "qnareaktime.firebasestorage.app",
  messagingSenderId: "209962332089",
  appId: "1:209962332089:web:dce6e98e0af82694b85068",
  measurementId: "G-30J0K2BWDT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
