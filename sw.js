/* ==========================================
   Service Worker - Offline Support
   ========================================== */

const CACHE_NAME = 'info24jam-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('📦 Caching assets...');
            return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
                console.warn('⚠️ Some assets could not be cached:', err);
                // Don't fail the install if some assets can't be cached
                return Promise.resolve();
            });
        })
    );
    
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('🚀 Service Worker activating...');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    
    self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Skip API requests - always use network
    if (event.request.url.includes('supabase.co') || 
        event.request.url.includes('cloudinary.com') ||
        event.request.url.includes('openstreetmap.org')) {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    return new Response('Offline - No internet connection', { status: 503 });
                })
        );
        return;
    }
    
    // For app assets, use cache-first strategy
    event.respondWith(
        caches.match(event.request).then((response) => {
            if (response) {
                return response;
            }
            
            return fetch(event.request).then((response) => {
                // Don't cache if not successful
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                
                // Clone the response
                const responseToCache = response.clone();
                
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
                
                return response;
            }).catch(() => {
                // Return offline page or cached version
                return caches.match(event.request).then((cachedResponse) => {
                    return cachedResponse || new Response('Offline', { status: 503 });
                });
            });
        })
    );
});

// Background sync for offline reports
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-reports') {
        event.waitUntil(syncOfflineReports());
    }
});

async function syncOfflineReports() {
    try {
        console.log('🔄 Syncing offline reports...');
        // This would sync any queued reports when connection is restored
        // Implementation depends on how you store offline reports
        return Promise.resolve();
    } catch (error) {
        console.error('❌ Sync error:', error);
        return Promise.reject(error);
    }
}

// Push notifications (optional future feature)
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    const options = {
        body: data.body || 'Info 24 Jam - Ada laporan darurat baru',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: 'info24jam-notification',
        requireInteraction: true
    };
    
    event.waitUntil(self.registration.showNotification(data.title || '🚨 Info 24 Jam', options));
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            for (let client of clientList) {
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});

console.log('✅ Service Worker loaded');
