/* ==========================================
   Info 24 Jam - Utility Helpers (Optional)
   Advanced features dan helper functions
   ========================================== */

// ==========================================
// Storage Utilities
// ==========================================

const StorageUtil = {
    // Save dengan expiry
    setWithExpiry(key, value, expiryMs) {
        const item = {
            value: value,
            expiry: Date.now() + expiryMs
        };
        localStorage.setItem(key, JSON.stringify(item));
    },
    
    // Get dengan check expiry
    getWithExpiry(key) {
        const item = JSON.parse(localStorage.getItem(key));
        if (!item) return null;
        
        if (Date.now() > item.expiry) {
            localStorage.removeItem(key);
            return null;
        }
        
        return item.value;
    },
    
    // Clear all info24jam data
    clearAppData() {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('info24jam_') || 
                key === 'supabaseUrl' || 
                key === 'supabaseKey' ||
                key === 'cloudinaryCloud' ||
                key === 'cloudinaryPreset') {
                localStorage.removeItem(key);
            }
        });
    }
};

// ==========================================
// Offline Queue (untuk offline form submission)
// ==========================================

const OfflineQueue = {
    QUEUE_KEY: 'info24jam_offline_queue',
    
    // Add laporan to offline queue
    addReport(reportData) {
        const queue = this.getQueue();
        queue.push({
            id: Date.now(),
            data: reportData,
            timestamp: new Date().toISOString(),
            retries: 0
        });
        localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
        console.log('📋 Report added to offline queue');
    },
    
    // Get queue
    getQueue() {
        const queue = localStorage.getItem(this.QUEUE_KEY);
        return queue ? JSON.parse(queue) : [];
    },
    
    // Process queue when online
    async processQueue(supabase) {
        if (!navigator.onLine) {
            console.log('⚠️ Still offline, queue waiting...');
            return;
        }
        
        const queue = this.getQueue();
        if (queue.length === 0) {
            console.log('✅ Queue kosong');
            return;
        }
        
        console.log(`🔄 Processing ${queue.length} offline reports...`);
        
        for (const item of queue) {
            try {
                const { error } = await supabase
                    .from('reports')
                    .insert([item.data]);
                
                if (error) throw error;
                
                // Remove from queue
                this.removeFromQueue(item.id);
                console.log(`✅ Report ${item.id} synced`);
            } catch (error) {
                console.error(`❌ Failed to sync report ${item.id}:`, error);
                
                // Increment retries
                item.retries++;
                if (item.retries > 3) {
                    this.removeFromQueue(item.id);
                    console.log(`⚠️ Report ${item.id} removed after 3 retries`);
                }
            }
        }
    },
    
    // Remove from queue
    removeFromQueue(id) {
        let queue = this.getQueue();
        queue = queue.filter(item => item.id !== id);
        localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
    }
};

// ==========================================
// Geolocation Advanced
// ==========================================

const GeoUtils = {
    // Calculate distance between 2 points (Haversine formula)
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return (R * c).toFixed(2); // Return in km
    },
    
    // Get address from coordinates (Reverse Geocoding)
    async getAddressFromCoords(lat, lng) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
            );
            const data = await response.json();
            return data.address?.city || data.address?.town || 'Unknown location';
        } catch (error) {
            console.error('Geocoding error:', error);
            return null;
        }
    },
    
    // Watch position dengan timeout
    watchPositionWithTimeout(onSuccess, onError, timeout = 30000) {
        const timeoutId = setTimeout(() => {
            onError({ code: 1, message: 'Timeout getting location' });
        }, timeout);
        
        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                clearTimeout(timeoutId);
                onSuccess(position);
            },
            (error) => {
                clearTimeout(timeoutId);
                onError(error);
            }
        );
        
        return watchId;
    }
};

// ==========================================
// Analytics (Optional)
// ==========================================

const Analytics = {
    events: [],
    
    // Track event
    trackEvent(eventName, data = {}) {
        const event = {
            name: eventName,
            timestamp: new Date().toISOString(),
            data: data
        };
        
        this.events.push(event);
        console.log(`📊 Event tracked: ${eventName}`, data);
        
        // Save to localStorage (max 100 events)
        if (this.events.length > 100) {
            this.events.shift();
        }
        
        localStorage.setItem('info24jam_analytics', JSON.stringify(this.events));
    },
    
    // Get analytics
    getAnalytics() {
        return this.events;
    },
    
    // Get stats
    getStats() {
        const reportsByCategory = {};
        
        this.events
            .filter(e => e.name === 'report_submitted')
            .forEach(e => {
                const cat = e.data.kategori;
                reportsByCategory[cat] = (reportsByCategory[cat] || 0) + 1;
            });
        
        return {
            totalEvents: this.events.length,
            totalReports: this.events.filter(e => e.name === 'report_submitted').length,
            reportsByCategory: reportsByCategory
        };
    },
    
    // Export analytics as CSV
    exportAsCSV() {
        let csv = 'Event,Timestamp,Data\n';
        this.events.forEach(event => {
            csv += `"${event.name}","${event.timestamp}","${JSON.stringify(event.data)}"\n`;
        });
        
        // Download
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics_${Date.now()}.csv`;
        a.click();
    }
};

// ==========================================
// Notification Utilities
// ==========================================

const NotificationUtil = {
    // Request notification permission
    async requestPermission() {
        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                return true;
            }
            
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        return false;
    },
    
    // Send notification
    async sendNotification(title, options = {}) {
        if (Notification.permission === 'granted') {
            const defaultOptions = {
                icon: '/icons/icon-192.png',
                badge: '/icons/icon-192.png',
                tag: 'info24jam-notification',
                requireInteraction: false
            };
            
            return new Notification(title, { ...defaultOptions, ...options });
        }
    },
    
    // Notify new report nearby
    async notifyNearbyReport(report, distance) {
        await this.sendNotification(`🚨 ${report.kategori.toUpperCase()} - ${distance} jauhnya`, {
            body: report.deskripsi.substring(0, 100),
            tag: `report-${report.id}`,
            requireInteraction: true
        });
    }
};

// ==========================================
// Image Compression (Pre-upload)
// ==========================================

const ImageUtil = {
    // Compress image before upload
    async compressImage(file, maxWidth = 1200, quality = 0.7) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > height) {
                        if (width > maxWidth) {
                            height *= maxWidth / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxWidth) {
                            width *= maxWidth / height;
                            height = maxWidth;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    canvas.toBlob(resolve, 'image/jpeg', quality);
                };
                
                img.onerror = reject;
                img.src = e.target.result;
            };
            
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },
    
    // Get file size in human readable format
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
};

// ==========================================
// Export untuk digunakan di app.js
// ==========================================

// Uncomment untuk menggunakan di app.js:
// - Use OfflineQueue.addReport() saat offline
// - Use GeoUtils untuk reverse geocoding
// - Use Analytics untuk tracking
// - Use NotificationUtil untuk push notifications
// - Use ImageUtil untuk compress sebelum upload

console.log('✅ Utilities loaded (optional features available)');
