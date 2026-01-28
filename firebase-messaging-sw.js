/* Firebase Cloud Messaging Service Worker - Info 24 Jam */

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBtpmKwxXjlD9U4UcmQIoFIzgRpVFDjG8g",
  authDomain: "info24jam-82a85.firebaseapp.com",
  projectId: "info24jam-82a85",
  storageBucket: "info24jam-82a85.firebasestorage.app",
  messagingSenderId: "498489273117",
  appId: "1:498489273117:web:832a63a7515c6866234ff4",
  measurementId: "G-GP4NPJ73VT"
};

firebase.initializeApp(firebaseConfig);

// Retrieve Firebase Messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  
  const notificationTitle = payload.notification?.title || 'Info 24 Jam';
  const notificationOptions = {
    body: payload.notification?.body || 'Anda memiliki notifikasi baru',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    data: payload.data || {},
    actions: [
      { action: 'view', title: '👁️ Lihat' },
      { action: 'close', title: '❌ Tutup' }
    ],
    tag: 'info24jam-notification',
    requireInteraction: false,
    timestamp: Date.now()
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});