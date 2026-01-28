/* Config.js - Configuration loader untuk Info 24 Jam */

// Untuk production (Vercel), environment variables akan di-inject
// Untuk development lokal, gunakan values dari file ini

const CONFIG = {
    // Supabase
    SUPABASE_URL: 'https://brdyvgmnidzxrwidpzqm.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZHl2Z21uaWR6eHJ3aWRwenFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5NjI0MjgsImV4cCI6MjA4NDUzODQyOH0.83XgYx8_94fnVbPd0N7q9FAfPFUTjJcliDOzTGNzfRQ',
    
    // Cloudinary
    CLOUDINARY_CLOUD: 'dj1f8hjcj',
    CLOUDINARY_PRESET: 'laporan_warga',
    
    // Firebase
    FIREBASE: {
        apiKey: "AIzaSyBtpmKwxXjlD9U4UcmQIoFIzgRpVFDjG8g",
        authDomain: "info24jam-82a85.firebaseapp.com",
        projectId: "info24jam-82a85",
        storageBucket: "info24jam-82a85.firebasestorage.app",
        messagingSenderId: "498489273117",
        appId: "1:498489273117:web:832a63a7515c6866234ff4",
        measurementId: "G-GP4NPJ73VT"
    },
    
    // VAPID Key - Ganti dengan key Anda dari Firebase Console
    // Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
    VAPID_PUBLIC_KEY: 'BBLnXXpSQCDro6B4Tndg9oIb2DumuwegFCa4c7mMiJqJnuVlsRXrAFMOmehMg3T6lwmaZonaS_LuwDZASszAYlk'
};

// Export untuk digunakan di app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}