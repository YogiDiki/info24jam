/* Service Worker - Info 24 Jam */

const CACHE_NAME = 'info24jam-v1.0.0';
const urlsToCache = [
    '/',
    '/index.html',
    '/app.js',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap',
    'https://fonts.googleapis.com/icon?family=Material+Icons'
];

// Install Service Worker
self.addEventListener('install', event => {
    console.log('[SW] Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching files');
                return cache.addAll(urlsToCache);
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
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    
    return self.clients.claim();
});

// Fetch Strategy: Network First, fallback to Cache
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;
    
    // Skip chrome extensions
    if (event.request.url.startsWith('chrome-extension://')) return;
    
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Clone response
                const responseClone = response.clone();
                
                // Update cache
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseClone);
                });
                
                return response;
            })
            .catch(() => {
                // Network failed, try cache
                return caches.match(event.request)
                    .then(cachedResponse => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        
                        // Return offline page for navigation requests
                        if (event.request.mode === 'navigate') {
                            return caches.match('/index.html');
                        }
                        
                        return new Response('Offline', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});

// Push Notification Handler
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
    
    if (event.action === 'close') {
        // User clicked close
        return;
    }
    
    // Default action or 'view' action
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clientList => {
                // Check if app is already open
                for (let client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        return client.focus();
                    }
                }
                
                // Open new window
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
    );
});

// Background Sync (for offline report submission)
self.addEventListener('sync', event => {
    console.log('[SW] Background sync:', event.tag);
    
    if (event.tag === 'sync-reports') {
        event.waitUntil(syncReports());
    }
});

async function syncReports() {
    try {
        // Get pending reports from IndexedDB or localStorage
        const pendingReports = await getPendingReports();
        
        for (let report of pendingReports) {
            try {
                // Try to submit report
                await fetch('/api/reports', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(report)
                });
                
                // Remove from pending
                await removePendingReport(report.id);
                
                // Show success notification
                self.registration.showNotification('✅ Laporan Terkirim', {
                    body: 'Laporan yang tertunda berhasil dikirim',
                    icon: '/icons/icon-192.png'
                });
            } catch (err) {
                console.error('[SW] Sync error:', err);
            }
        }
    } catch (err) {
        console.error('[SW] Sync reports error:', err);
    }
}

async function getPendingReports() {
    // Implement IndexedDB or localStorage retrieval
    return [];
}

async function removePendingReport(id) {
    // Implement removal logic
}

// Message Handler (for communication with main app)
self.addEventListener('message', event => {
    console.log('[SW] Message received:', event.data);
    
    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({
            version: CACHE_NAME
        });
    }
});

console.log('[SW] Service Worker loaded');