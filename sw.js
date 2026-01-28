/* Service Worker - Info 24 Jam (PWA + FCM Combined) */

// Import Firebase scripts for FCM
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

const CACHE_NAME = 'info24jam-v1.0.2';
const urlsToCache = [
    '/',
    '/index.html',
    '/app.js',
    '/config.js',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/maskable-icon.png'
];

// ==========================================
// Firebase Cloud Messaging Setup
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyBtpmKwxXjlD9U4UcmQIoFIzgRpVFDjG8g",
    authDomain: "info24jam-82a85.firebaseapp.com",
    projectId: "info24jam-82a85",
    storageBucket: "info24jam-82a85.firebasestorage.app",
    messagingSenderId: "498489273117",
    appId: "1:498489273117:web:832a63a7515c6866234ff4",
    measurementId: "G-GP4NPJ73VT"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handle background FCM messages
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] FCM background message:', payload);
    
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

// ==========================================
// PWA Service Worker Events
// ==========================================

// Install Service Worker
self.addEventListener('install', event => {
    console.log('[SW] Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching core files');
                return cache.addAll(urlsToCache.filter(url => url.startsWith('/')));
            })
            .catch(err => {
                console.error('[SW] Cache error:', err);
            })
    );
    
    self.skipWaiting();
});

// Activate Service Worker
self.addEventListener('activate', event => {
    console.log('[SW] Activating...');
    
    event.waitUntil(
        Promise.all([
            // Clean old caches
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // Take control immediately
            self.clients.claim()
        ])
    );
});

// Fetch Strategy: Network First, fallback to Cache
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    if (!event.request.url.startsWith('http')) return;
    
    event.respondWith(
        fetch(event.request)
            .then(response => {
                if (response && response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request)
                    .then(cachedResponse => {
                        if (cachedResponse) return cachedResponse;
                        
                        if (event.request.mode === 'navigate') {
                            return caches.match('/index.html');
                        }
                        
                        return new Response('Offline', {
                            status: 503,
                            statusText: 'Service Unavailable',
                            headers: new Headers({
                                'Content-Type': 'text/plain'
                            })
                        });
                    });
            })
    );
});

// Push Notification Handler (for web push API)
self.addEventListener('push', event => {
    console.log('[SW] Push received');
    
    let data = {};
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data = { title: 'Info 24 Jam', body: event.data.text() };
        }
    }
    
    const title = data.title || 'Info 24 Jam';
    const options = {
        body: data.body || 'Anda memiliki notifikasi baru',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        vibrate: [200, 100, 200],
        data: data.data || {},
        actions: [
            { action: 'view', title: '👁️ Lihat' },
            { action: 'close', title: '❌ Tutup' }
        ],
        tag: data.tag || 'info24jam-notification',
        requireInteraction: false
    };
    
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Notification Click Handler
self.addEventListener('notificationclick', event => {
    console.log('[SW] Notification clicked:', event.action);
    
    event.notification.close();
    
    if (event.action === 'close') return;
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clientList => {
                for (let client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        return client.focus();
                    }
                }
                
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
    );
});

console.log('[SW] Service Worker (PWA + FCM) loaded successfully');