/**
 * Firebase Configuration — EXAMPLE FILE
 *
 * HOW TO USE:
 * 1. Copy this file and rename the copy to: firebase-config.js
 * 2. Replace every placeholder value below with your own Firebase project credentials
 * 3. DO NOT commit firebase-config.js — it is gitignored to protect your API keys
 *
 * WHERE TO FIND YOUR VALUES:
 * 1. Go to https://console.firebase.google.com/
 * 2. Open your project → Project Settings → General
 * 3. Scroll to "Your apps" → click the Web icon (</>) to register a web app if needed
 * 4. Copy the firebaseConfig object shown there
 *
 * Full setup guide: see SETUP.md
 */

// Replace these placeholder values with your Firebase project configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL:
    "https://YOUR_PROJECT_ID-default-rtdb.YOUR_REGION.firebasedatabase.app",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID", // optional — only needed if using Analytics
};

// Initialize Firebase
try {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("✅ Firebase initialized successfully");
  }
} catch (error) {
  console.error("❌ Firebase initialization error:", error);
}

// Export database reference for use in other files
const database = firebase.database();
