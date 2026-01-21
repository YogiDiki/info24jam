/* ==========================================
   Info 24 Jam - Production Version v2.0
   NEW FEATURES: Emergency Contacts + Hazard Zones
   ========================================== */

// ⚙️ KONFIGURASI
const CONFIG = {
    SUPABASE_URL: 'https://brdyvgmnidzxrwidpzqm.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZHl2Z21uaWR6eHJ3aWRwenFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5NjI0MjgsImV4cCI6MjA4NDUzODQyOH0.83XgYx8_94fnVbPd0N7q9FAfPFUTjJcliDOzTGNzfRQ',
    CLOUDINARY_CLOUD: 'dj1f8hjcj',
    CLOUDINARY_PRESET: 'laporan_warga'
};

// Global Variables
let map;
let userMarker;
let userLocation = { lat: -6.2088, lng: 106.8456 };
let supabaseClient;
let currentReports = new Map();
let currentZones = new Map();
let zoneCircles = new Map();
let userCurrentFile = null;
let currentView = 'map';
let isAdmin = false;
let deferredPrompt = null;

const categoryIcons = {
    banjir: '🌊',
    kebakaran: '🔥',
    kecelakaan: '🚗',
    kriminal: '⚠️',
    macet: '🚦',
    lainnya: '❓'
};

const categoryColors = {
    banjir: '#3B82F6',
    kebakaran: '#EF4444',
    kecelakaan: '#FBBF24',
    kriminal: '#8B5CF6',
    macet: '#F59E0B',
    lainnya: '#6B7280'
};

const categoryNames = {
    banjir: 'Banjir',
    kebakaran: 'Kebakaran',
    kecelakaan: 'Kecelakaan',
    kriminal: 'Kriminal',
    macet: 'Kemacetan',
    lainnya: 'Lainnya'
};

const zoneLevelColors = {
    tinggi: '#EF4444',
    sedang: '#FBBF24',
    rendah: '#10B981'
};

const zoneTypeIcons = {
    banjir: '🌊',
    longsor: '🏔️',
    kriminal: '⚠️',
    kecelakaan: '🚗'
};

// ==================== TOAST NOTIFICATIONS ====================

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500'
    };
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    toast.className = `toast ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-sm`;
    toast.innerHTML = `
        <span class="text-xl">${icons[type]}</span>
        <span class="flex-1">${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== INITIALIZATION ====================

async function initApp() {
    console.log('🚀 Initializing Info 24 Jam App v2.0...');
    
    if (CONFIG.SUPABASE_URL === 'YOUR_SUPABASE_URL_HERE') {
        showToast('⚠️ Aplikasi belum dikonfigurasi! Hubungi admin.', 'warning');
        console.error('❌ Kredensial belum diisi di CONFIG');
    }
    
    await waitForSupabase();
    initSupabase();
    initMap();
    getUserLocation();
    setupEventListeners();
    loadReports();
    loadZones();
    setupPWA();
    checkAdminStatus();
    
    console.log('✅ App initialized successfully!');
}

function waitForSupabase() {
    return new Promise((resolve) => {
        if (typeof window.supabase !== 'undefined') {
            resolve();
            return;
        }
        
        let attempts = 0;
        const maxAttempts = 50;
        
        const checkInterval = setInterval(() => {
            attempts++;
            
            if (typeof window.supabase !== 'undefined') {
                clearInterval(checkInterval);
                console.log('✅ Supabase library loaded');
                resolve();
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                console.error('❌ Supabase library failed to load');
                resolve();
            }
        }, 100);
    });
}

// ==================== SUPABASE ====================

function initSupabase() {
    if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_KEY || 
        CONFIG.SUPABASE_URL === 'YOUR_SUPABASE_URL_HERE') {
        console.warn('⚠️ Supabase credentials not configured');
        return;
    }
    
    try {
        if (!window.supabase || typeof window.supabase.createClient !== 'function') {
            console.error('❌ Supabase library not loaded');
            return;
        }
        
        supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
        console.log('✅ Supabase initialized');
        setupRealtimeListener();
    } catch (error) {
        console.error('❌ Supabase initialization error:', error);
        showToast('Gagal koneksi ke database', 'error');
    }
}

function setupRealtimeListener() {
    if (!supabaseClient) return;
    
    // Listen to reports
    supabaseClient
        .channel('public:reports')
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'reports' 
        }, (payload) => {
            console.log('📡 Report update:', payload);
            
            if (payload.eventType === 'INSERT') {
                addReportToMap(payload.new);
                updateListView();
                updateStats();
                showToast('Ada laporan baru!', 'info');
            } else if (payload.eventType === 'UPDATE') {
                updateReportMarker(payload.new);
                updateListView();
            } else if (payload.eventType === 'DELETE') {
                removeReportMarker(payload.old.id);
                updateListView();
                updateStats();
            }
        })
        .subscribe();
    
    // Listen to zones
    supabaseClient
        .channel('public:hazard_zones')
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'hazard_zones' 
        }, (payload) => {
            console.log('📡 Zone update:', payload);
            
            if (payload.eventType === 'INSERT') {
                addZoneToMap(payload.new);
                updateZonesView();
                updateZoneStats();
                showToast('Zona rawan baru ditambahkan!', 'info');
            } else if (payload.eventType === 'DELETE') {
                removeZoneFromMap(payload.old.id);
                updateZonesView();
                updateZoneStats();
            }
        })
        .subscribe();
}

async function loadReports() {
    if (!supabaseClient) {
        console.warn('⚠️ Supabase not initialized');
        return;
    }
    
    try {
        showLoading(true);
        
        const { data, error } = await supabaseClient
            .from('reports')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        currentReports.forEach((report) => {
            if (report.marker) {
                map.removeLayer(report.marker);
            }
        });
        currentReports.clear();
        
        if (data) {
            data.forEach(report => addReportToMap(report));
            updateListView();
            updateStats();
            console.log(`✅ Loaded ${data.length} reports`);
        }
    } catch (error) {
        console.error('❌ Error loading reports:', error);
        showToast('Gagal memuat laporan', 'error');
    } finally {
        showLoading(false);
    }
}

async function loadZones() {
    if (!supabaseClient) {
        console.warn('⚠️ Supabase not initialized');
        return;
    }
    
    try {
        showLoading(true);
        
        const { data, error } = await supabaseClient
            .from('hazard_zones')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            // Table might not exist yet
            console.warn('⚠️ Hazard zones table not found. Create it in Supabase with:');
            console.log(`
CREATE TABLE hazard_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    level TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE hazard_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON hazard_zones
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON hazard_zones
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users only" ON hazard_zones
    FOR DELETE USING (true);
            `);
            return;
        }
        
        zoneCircles.forEach((circle) => {
            map.removeLayer(circle);
        });
        currentZones.clear();
        zoneCircles.clear();
        
        if (data) {
            data.forEach(zone => addZoneToMap(zone));
            updateZonesView();
            updateZoneStats();
            console.log(`✅ Loaded ${data.length} hazard zones`);
        }
    } catch (error) {
        console.error('❌ Error loading zones:', error);
    } finally {
        showLoading(false);
    }
}

async function submitReport(formData) {
    if (!supabaseClient) {
        showToast('Database belum terhubung!', 'error');
        return;
    }
    
    try {
        showLoading(true);
        const submitBtn = document.querySelector('#formLapor button[type="submit"]');
        const spinner = document.getElementById('submitSpinner');
        
        if (submitBtn) submitBtn.disabled = true;
        if (spinner) spinner.classList.remove('hidden');
        
        const { data, error } = await supabaseClient
            .from('reports')
            .insert([formData])
            .select();
        
        if (error) throw error;
        
        console.log('✅ Report submitted:', data);
        showToast('Laporan berhasil dikirim!', 'success');
        
        closeModal('modalLapor');
        resetForm();
    } catch (error) {
        console.error('❌ Error submitting:', error);
        showToast(`Gagal mengirim: ${error.message}`, 'error');
    } finally {
        showLoading(false);
        const submitBtn = document.querySelector('#formLapor button[type="submit"]');
        const spinner = document.getElementById('submitSpinner');
        if (submitBtn) submitBtn.disabled = false;
        if (spinner) spinner.classList.add('hidden');
    }
}

async function deleteReport(reportId) {
    if (!supabaseClient) {
        showToast('Database belum terhubung!', 'error');
        return;
    }
    
    if (!isAdmin) {
        showToast('Hanya admin yang bisa menghapus laporan!', 'error');
        return;
    }
    
    if (!confirm('🗑️ Hapus laporan ini?')) return;
    
    try {
        showLoading(true);
        const { error } = await supabaseClient
            .from('reports')
            .delete()
            .eq('id', reportId);
        
        if (error) throw error;
        
        showToast('Laporan berhasil dihapus', 'success');
        closeModal('modalInfo');
    } catch (error) {
        console.error('❌ Error deleting:', error);
        showToast(`Gagal menghapus: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

async function submitZone(zoneData) {
    if (!supabaseClient) {
        showToast('Database belum terhubung!', 'error');
        return;
    }
    
    if (!isAdmin) {
        showToast('Hanya admin yang bisa menambah zona!', 'error');
        return;
    }
    
    try {
        showLoading(true);
        
        const { data, error } = await supabaseClient
            .from('hazard_zones')
            .insert([zoneData])
            .select();
        
        if (error) throw error;
        
        console.log('✅ Zone submitted:', data);
        showToast('Zona rawan berhasil ditambahkan!', 'success');
        
        closeModal('modalAddZone');
        document.getElementById('formAddZone').reset();
    } catch (error) {
        console.error('❌ Error submitting zone:', error);
        showToast(`Gagal menambah zona: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

// ==================== MAP MANAGEMENT ====================

function initMap() {
    map = L.map('map').setView([userLocation.lat, userLocation.lng], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);
    
    updateUserMarker();
    console.log('✅ Map initialized');
}

function updateUserMarker() {
    if (userMarker) {
        userMarker.setLatLng([userLocation.lat, userLocation.lng]);
    } else {
        userMarker = L.circleMarker([userLocation.lat, userLocation.lng], {
            radius: 8,
            fillColor: '#3B82F6',
            color: '#1E40AF',
            weight: 3,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(map);
        
        userMarker.bindPopup('<strong>📍 Lokasi Anda</strong>');
    }
}

function addReportToMap(report) {
    if (currentReports.has(report.id)) return;
    
    const icon = categoryIcons[report.kategori] || '❓';
    const color = categoryColors[report.kategori] || '#6B7280';
    
    const marker = L.circleMarker([report.latitude, report.longitude], {
        radius: 10,
        fillColor: color,
        color: color,
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
    }).addTo(map);
    
    const popupContent = `
        <div style="width: 250px; font-family: system-ui;">
            <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px; color: ${color};">
                ${icon} ${categoryNames[report.kategori].toUpperCase()}
            </div>
            <p style="margin-bottom: 12px; color: #374151; line-height: 1.4;">${report.deskripsi}</p>
            ${report.foto_url ? `<img src="${report.foto_url}" style="width: 100%; height: 160px; object-fit: cover; border-radius: 8px; margin-bottom: 12px;">` : ''}
            <div style="font-size: 12px; color: #6B7280; margin-bottom: 12px; line-height: 1.6;">
                <div><strong>📍</strong> ${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}</div>
                <div><strong>⏰</strong> ${formatDate(report.created_at)}</div>
            </div>
            <button class="report-detail-btn" data-id="${report.id}" style="background: #EF4444; color: white; padding: 8px 16px; border-radius: 8px; width: 100%; border: none; cursor: pointer; font-weight: 600; transition: all 0.2s;">
                Lihat Detail
            </button>
        </div>
    `;
    
    marker.bindPopup(popupContent);
    currentReports.set(report.id, { marker, data: report });
}

function updateReportMarker(report) {
    const reportItem = currentReports.get(report.id);
    if (reportItem) {
        reportItem.data = report;
    }
}

function removeReportMarker(reportId) {
    const reportItem = currentReports.get(reportId);
    if (reportItem) {
        map.removeLayer(reportItem.marker);
        currentReports.delete(reportId);
    }
}

function addZoneToMap(zone) {
    if (currentZones.has(zone.id)) return;
    
    const color = zoneLevelColors[zone.level] || '#6B7280';
    
    const circle = L.circle([zone.latitude, zone.longitude], {
        radius: zone.radius,
        fillColor: color,
        color: color,
        weight: 2,
        opacity: 0.6,
        fillOpacity: 0.2
    }).addTo(map);
    
    const icon = zoneTypeIcons[zone.type] || '⚠️';
    
    const popupContent = `
        <div style="width: 250px; font-family: system-ui;">
            <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px; color: ${color};">
                ${icon} ${zone.name}
            </div>
            <div style="margin-bottom: 8px;">
                <span style="background: ${color}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                    ${zone.level.toUpperCase()}
                </span>
            </div>
            ${zone.description ? `<p style="margin-bottom: 8px; color: #374151; font-size: 14px;">${zone.description}</p>` : ''}
            <div style="font-size: 12px; color: #6B7280;">
                <div><strong>📍</strong> ${zone.latitude.toFixed(5)}, ${zone.longitude.toFixed(5)}</div>
                <div><strong>📏</strong> Radius: ${zone.radius}m</div>
            </div>
        </div>
    `;
    
    circle.bindPopup(popupContent);
    
    currentZones.set(zone.id, zone);
    zoneCircles.set(zone.id, circle);
}

function removeZoneFromMap(zoneId) {
    const circle = zoneCircles.get(zoneId);
    if (circle) {
        map.removeLayer(circle);
        zoneCircles.delete(zoneId);
        currentZones.delete(zoneId);
    }
}

// ==================== LIST VIEW ====================

function updateListView() {
    const reportsList = document.getElementById('reportsList');
    const filterKategori = document.getElementById('filterKategori').value;
    
    if (!reportsList) return;
    
    let reports = Array.from(currentReports.values()).map(r => r.data);
    
    if (filterKategori) {
        reports = reports.filter(r => r.kategori === filterKategori);
    }
    
    reports.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    if (reports.length === 0) {
        reportsList.innerHTML = `
            <div class="text-center py-12 text-gray-500">
                <div class="text-6xl mb-4">📭</div>
                <p class="text-lg font-semibold">Belum ada laporan</p>
                <p class="text-sm">Jadilah yang pertama melaporkan!</p>
            </div>
        `;
        return;
    }
    
    reportsList.innerHTML = reports.map(report => {
        const icon = categoryIcons[report.kategori] || '❓';
        const color = categoryColors[report.kategori] || '#6B7280';
        
        return `
            <div class="report-card bg-white rounded-xl shadow-md overflow-hidden" onclick="showReportDetail('${report.id}')">
                <div class="flex">
                    ${report.foto_url ? `
                        <img src="${report.foto_url}" class="w-24 h-24 object-cover" alt="Foto">
                    ` : `
                        <div class="w-24 h-24 flex items-center justify-center text-4xl" style="background-color: ${color}20;">
                            ${icon}
                        </div>
                    `}
                    <div class="flex-1 p-3">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="category-badge" style="background-color: ${color};">
                                ${icon} ${categoryNames[report.kategori]}
                            </span>
                        </div>
                        <p class="text-sm text-gray-700 line-clamp-2 mb-2">
                            ${report.deskripsi}
                        </p>
                        <div class="flex items-center gap-3 text-xs text-gray-500">
                            <span>📍 ${report.latitude.toFixed(3)}, ${report.longitude.toFixed(3)}</span>
                        </div>
                        <div class="text-xs text-gray-400 mt-1">
                            ⏰ ${formatTimeAgo(report.created_at)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function updateStats() {
    const totalReports = currentReports.size;
    
    // Count today's reports
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayReports = Array.from(currentReports.values())
        .filter(r => new Date(r.data.created_at) >= today).length;
    
    // Active reports (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeReports = Array.from(currentReports.values())
        .filter(r => new Date(r.data.created_at) >= oneDayAgo).length;
    
    const totalEl = document.getElementById('totalReports');
    const todayEl = document.getElementById('todayReports');
    const activeEl = document.getElementById('activeReports');
    
    if (totalEl) totalEl.textContent = totalReports;
    if (todayEl) todayEl.textContent = todayReports;
    if (activeEl) activeEl.textContent = activeReports;
}

// ==================== ZONES VIEW ====================

function updateZonesView() {
    const zonesList = document.getElementById('zonesList');
    const filterLevel = document.getElementById('filterZoneLevel').value;
    
    if (!zonesList) return;
    
    let zones = Array.from(currentZones.values());
    
    if (filterLevel) {
        zones = zones.filter(z => z.level === filterLevel);
    }
    
    zones.sort((a, b) => {
        const levelOrder = { tinggi: 0, sedang: 1, rendah: 2 };
        return levelOrder[a.level] - levelOrder[b.level];
    });
    
    if (zones.length === 0) {
        zonesList.innerHTML = `
            <div class="text-center py-12 text-gray-500">
                <div class="text-6xl mb-4">📍</div>
                <p class="text-lg font-semibold">Belum ada zona rawan</p>
                <p class="text-sm">Admin dapat menambahkan zona</p>
            </div>
        `;
        return;
    }
    
    zonesList.innerHTML = zones.map(zone => {
        const color = zoneLevelColors[zone.level] || '#6B7280';
        const icon = zoneTypeIcons[zone.type] || '⚠️';
        
        return `
            <div class="zone-card bg-white rounded-xl shadow-md p-4" style="border-left-color: ${color};">
                <div class="flex items-start justify-between mb-2">
                    <div class="flex items-center gap-2">
                        <span class="text-2xl">${icon}</span>
                        <div>
                            <div class="font-bold text-gray-800">${zone.name}</div>
                            <div class="text-xs text-gray-500">${zone.type}</div>
                        </div>
                    </div>
                    <span class="category-badge" style="background-color: ${color};">
                        ${zone.level.toUpperCase()}
                    </span>
                </div>
                ${zone.description ? `
                    <p class="text-sm text-gray-600 mb-2">${zone.description}</p>
                ` : ''}
                <div class="text-xs text-gray-500 space-y-1">
                    <div>📍 ${zone.latitude.toFixed(5)}, ${zone.longitude.toFixed(5)}</div>
                    <div>📏 Radius: ${zone.radius} meter</div>
                    <div>⏰ ${formatTimeAgo(zone.created_at)}</div>
                </div>
                <button onclick="focusOnZone('${zone.id}')" class="mt-3 w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg text-sm font-semibold transition">
                    🎯 Lihat di Peta
                </button>
            </div>
        `;
    }).join('');
}

function updateZoneStats() {
    const totalZones = currentZones.size;
    
    const highRiskZones = Array.from(currentZones.values())
        .filter(z => z.level === 'tinggi').length;
    
    const mediumRiskZones = Array.from(currentZones.values())
        .filter(z => z.level === 'sedang').length;
    
    const totalEl = document.getElementById('totalZones');
    const highEl = document.getElementById('highRiskZones');
    const mediumEl = document.getElementById('mediumRiskZones');
    
    if (totalEl) totalEl.textContent = totalZones;
    if (highEl) highEl.textContent = highRiskZones;
    if (mediumEl) mediumEl.textContent = mediumRiskZones;
}

function focusOnZone(zoneId) {
    const zone = currentZones.get(zoneId);
    if (!zone) return;
    
    // Switch to map view
    switchView('map');
    
    // Center map on zone
    map.setView([zone.latitude, zone.longitude], 15);
    
    // Open popup
    const circle = zoneCircles.get(zoneId);
    if (circle) {
        circle.openPopup();
    }
}

// ==================== VIEW SWITCHING ====================

function switchView(view) {
    currentView = view;
    
    // Hide all panels
    document.getElementById('map').classList.add('hidden');
    document.getElementById('listPanel').classList.add('hidden');
    document.getElementById('contactsPanel').classList.add('hidden');
    document.getElementById('zonesPanel').classList.add('hidden');
    
    // Show selected panel
    if (view === 'map') {
        document.getElementById('map').classList.remove('hidden');
        setTimeout(() => map.invalidateSize(), 100);
    } else if (view === 'list') {
        document.getElementById('listPanel').classList.remove('hidden');
        updateListView();
        updateStats();
    } else if (view === 'contacts') {
        document.getElementById('contactsPanel').classList.remove('hidden');
    } else if (view === 'zones') {
        document.getElementById('zonesPanel').classList.remove('hidden');
        updateZonesView();
        updateZoneStats();
    }
    
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.view === view) {
            item.classList.add('active');
        }
    });
}

// ==================== GEOLOCATION ====================

function getUserLocation() {
    if (!('geolocation' in navigator)) {
        console.warn('⚠️ Geolocation not supported');
        showToast('GPS tidak didukung di browser ini', 'warning');
        return;
    }
    
    navigator.geolocation.watchPosition(
        (position) => {
            userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            
            updateUserMarker();
            map.setView([userLocation.lat, userLocation.lng], 13);
            
            const lokasiEl = document.getElementById('lokasi');
            if (lokasiEl) {
                lokasiEl.innerHTML = `<span style="color: #10B981; font-weight: 600;">✅ ${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}</span>`;
            }
            
            const zoneLocationEl = document.getElementById('zoneLocation');
            if (zoneLocationEl) {
                zoneLocationEl.textContent = `${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}`;
            }
            
            console.log('📍 Location updated:', userLocation);
        },
        (error) => {
            console.warn('⚠️ Geolocation error:', error);
            showToast('GPS tidak tersedia - menggunakan lokasi default', 'warning');
            
            const lokasiEl = document.getElementById('lokasi');
            if (lokasiEl) {
                lokasiEl.innerHTML = '<span style="color: #F59E0B; font-weight: 600;">⚠️ GPS tidak tersedia - menggunakan lokasi default</span>';
            }
        },
        { 
            enableHighAccuracy: true, 
            maximumAge: 10000, 
            timeout: 5000 
        }
    );
}

// ==================== CLOUDINARY UPLOAD ====================

function setupCloudinaryUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const fileName = document.getElementById('fileName');
    const imagePreview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    
    if (!uploadArea || !fileInput) return;
    
    uploadArea.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            userCurrentFile = file;
            if (fileName) {
                fileName.textContent = `📄 ${file.name}`;
                fileName.style.color = '#10B981';
                fileName.style.fontWeight = '600';
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                if (previewImg && imagePreview) {
                    previewImg.src = e.target.result;
                    imagePreview.classList.remove('hidden');
                }
            };
            reader.readAsDataURL(file);
        }
    });
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            userCurrentFile = file;
            fileInput.files = e.dataTransfer.files;
            if (fileName) {
                fileName.textContent = `📄 ${file.name}`;
                fileName.style.color = '#10B981';
                fileName.style.fontWeight = '600';
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                if (previewImg && imagePreview) {
                    previewImg.src = e.target.result;
                    imagePreview.classList.remove('hidden');
                }
            };
            reader.readAsDataURL(file);
        }
    });
}

async function uploadImageToCloudinary(file) {
    if (!CONFIG.CLOUDINARY_CLOUD || !CONFIG.CLOUDINARY_PRESET ||
        CONFIG.CLOUDINARY_CLOUD === 'YOUR_CLOUDINARY_CLOUD_NAME') {
        console.warn('⚠️ Cloudinary not configured');
        showToast('Upload foto tidak tersedia', 'warning');
        return null;
    }
    
    try {
        showToast('Mengupload foto...', 'info');
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CONFIG.CLOUDINARY_PRESET);
        
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CONFIG.CLOUDINARY_CLOUD}/image/upload`, 
            {
                method: 'POST',
                body: formData
            }
        );
        
        if (!response.ok) throw new Error('Upload failed');
        
        const data = await response.json();
        console.log('✅ Image uploaded:', data.secure_url);
        showToast('Foto berhasil diupload!', 'success');
        return data.secure_url;
    } catch (error) {
        console.error('❌ Cloudinary error:', error);
        showToast('Gagal upload foto', 'error');
        return null;
    }
}

// ==================== FORM HANDLING ====================

function setupEventListeners() {
    // Bottom navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            switchView(item.dataset.view);
        });
    });
    
    // Main buttons
    document.getElementById('btnLapor')?.addEventListener('click', () => {
        if (isAdmin) {
            const adminMenu = document.getElementById('adminMenu');
            adminMenu.classList.toggle('show');
        } else {
            openModal('modalLapor');
        }
    });
    
    document.getElementById('btnToggleLegend')?.addEventListener('click', toggleLegend);
    document.getElementById('btnCloseLegend')?.addEventListener('click', () => {
        document.getElementById('legendBox').classList.add('hidden');
    });
    
    document.getElementById('btnAdmin')?.addEventListener('click', () => {
        if (isAdmin) {
            if (confirm('Logout sebagai admin?')) {
                adminLogout();
            }
        } else {
            openModal('modalAdmin');
        }
    });
    
    // Admin menu
    document.getElementById('btnAddZone')?.addEventListener('click', () => {
        document.getElementById('adminMenu').classList.remove('show');
        openModal('modalAddZone');
    });
    
    document.getElementById('btnManageReports')?.addEventListener('click', () => {
        document.getElementById('adminMenu').classList.remove('show');
        switchView('list');
    });
    
    document.getElementById('btnLogoutAdmin')?.addEventListener('click', () => {
        document.getElementById('adminMenu').classList.remove('show');
        adminLogout();
    });
    
    // Modal buttons
    document.getElementById('btnBatal')?.addEventListener('click', () => closeModal('modalLapor'));
    document.getElementById('btnCloseInfo')?.addEventListener('click', () => closeModal('modalInfo'));
    document.getElementById('btnCancelAdmin')?.addEventListener('click', () => closeModal('modalAdmin'));
    document.getElementById('btnCancelZone')?.addEventListener('click', () => closeModal('modalAddZone'));
    
    document.getElementById('formLapor')?.addEventListener('submit', handleFormSubmit);
    document.getElementById('formAdminLogin')?.addEventListener('submit', handleAdminLogin);
    document.getElementById('formAddZone')?.addEventListener('submit', handleZoneSubmit);
    
    document.getElementById('btnDeleteReport')?.addEventListener('click', () => {
        const reportId = document.getElementById('btnDeleteReport').dataset.reportId;
        if (reportId) deleteReport(reportId);
    });
    
    // Filters
    document.getElementById('filterKategori')?.addEventListener('change', updateListView);
    document.getElementById('filterZoneLevel')?.addEventListener('change', updateZonesView);
    
    setupCloudinaryUpload();
    
    // Event delegation
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('report-detail-btn')) {
            showReportDetail(e.target.dataset.id);
        }
        
        // Close admin menu when clicking outside
        const adminMenu = document.getElementById('adminMenu');
        const btnLapor = document.getElementById('btnLapor');
        if (adminMenu && !adminMenu.contains(e.target) && e.target !== btnLapor) {
            adminMenu.classList.remove('show');
        }
    });
    
    // Close modals when clicking outside
    ['modalLapor', 'modalInfo', 'modalAdmin', 'modalAddZone'].forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal(modalId);
            });
        }
    });
    
    console.log('✅ Event listeners setup');
}

function toggleLegend() {
    const legendBox = document.getElementById('legendBox');
    legendBox.classList.toggle('hidden');
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const kategori = document.getElementById('kategori').value;
    const deskripsi = document.getElementById('deskripsi').value;
    
    if (!kategori || !deskripsi) {
        showToast('Kategori dan deskripsi harus diisi!', 'warning');
        return;
    }
    
    let fotoUrl = null;
    
    if (userCurrentFile) {
        console.log('📤 Uploading image...');
        fotoUrl = await uploadImageToCloudinary(userCurrentFile);
    }
    
    const reportData = {
        kategori,
        deskripsi,
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        foto_url: fotoUrl,
        created_at: new Date().toISOString()
    };
    
    await submitReport(reportData);
}

async function handleZoneSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('zoneName').value;
    const type = document.getElementById('zoneType').value;
    const level = document.getElementById('zoneLevel').value;
    const radius = parseInt(document.getElementById('zoneRadius').value);
    const description = document.getElementById('zoneDescription').value;
    
    if (!name || !type || !level || !radius) {
        showToast('Semua field wajib diisi!', 'warning');
        return;
    }
    
    const zoneData = {
        name,
        type,
        level,
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        radius,
        description,
        created_at: new Date().toISOString()
    };
    
    await submitZone(zoneData);
}

function resetForm() {
    const form = document.getElementById('formLapor');
    if (form) form.reset();
    
    const fileName = document.getElementById('fileName');
    if (fileName) {
        fileName.textContent = '';
        fileName.style.color = '';
        fileName.style.fontWeight = '';
    }
    
    const imagePreview = document.getElementById('imagePreview');
    if (imagePreview) imagePreview.classList.add('hidden');
    
    userCurrentFile = null;
}

function showReportDetail(reportId) {
    const reportItem = currentReports.get(reportId);
    if (!reportItem) return;
    
    const report = reportItem.data;
    const icon = categoryIcons[report.kategori] || '❓';
    const color = categoryColors[report.kategori] || '#6B7280';
    
    const content = `
        <div>
            <div style="margin-bottom: 16px;">
                <h3 style="font-size: 24px; font-weight: bold; color: ${color};">
                    ${icon} ${categoryNames[report.kategori].toUpperCase()}
                </h3>
            </div>
            
            ${report.foto_url ? `<img src="${report.foto_url}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 12px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">` : ''}
            
            <div style="background: #F9FAFB; padding: 16px; border-radius: 12px; margin-bottom: 16px;">
                <p style="margin-bottom: 12px; color: #374151; line-height: 1.6;">${report.deskripsi}</p>
                <div style="font-size: 12px; color: #6B7280; line-height: 1.8;">
                    <div><strong>📍 Koordinat:</strong> ${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}</div>
                    <div><strong>⏰ Waktu:</strong> ${formatDate(report.created_at)}</div>
                    <div><strong>🆔 ID:</strong> ${report.id}</div>
                </div>
            </div>
        </div>
    `;
    
    const infoContent = document.getElementById('infoContent');
    if (infoContent) infoContent.innerHTML = content;
    
    const deleteBtn = document.getElementById('btnDeleteReport');
    if (deleteBtn) {
        deleteBtn.dataset.reportId = reportId;
        if (isAdmin) {
            deleteBtn.classList.remove('hidden');
        } else {
            deleteBtn.classList.add('hidden');
        }
    }
    
    openModal('modalInfo');
}

// ==================== MODAL MANAGEMENT ====================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

// ==================== UTILITY ====================

function showLoading(show) {
    const loadingBar = document.getElementById('loadingBar');
    if (loadingBar) {
        loadingBar.style.opacity = show ? '1' : '0';
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('id-ID', { 
        dateStyle: 'full', 
        timeStyle: 'short' 
    });
}

function formatTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Baru saja';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} menit lalu`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} jam lalu`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} hari lalu`;
    
    return formatDate(dateString);
}

window.showReportDetail = showReportDetail;
window.focusOnZone = focusOnZone;

// ==================== PWA INSTALLATION ====================

function setupPWA() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        setTimeout(() => {
            showInstallPrompt();
        }, 10000);
    });
    
    window.addEventListener('appinstalled', () => {
        console.log('✅ PWA installed successfully');
        showToast('Aplikasi berhasil diinstall!', 'success');
        hideInstallPrompt();
        deferredPrompt = null;
    });
    
    const btnInstall = document.getElementById('btnInstallApp');
    const btnInstallLater = document.getElementById('btnInstallLater');
    const btnCloseInstall = document.getElementById('btnCloseInstall');
    
    if (btnInstall) {
        btnInstall.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                console.log('✅ User accepted install');
                showToast('Menginstall aplikasi...', 'info');
            } else {
                console.log('❌ User dismissed install');
            }
            
            hideInstallPrompt();
            deferredPrompt = null;
        });
    }
    
    if (btnInstallLater) {
        btnInstallLater.addEventListener('click', () => {
            hideInstallPrompt();
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            localStorage.setItem('installPromptDismissed', tomorrow.toISOString());
        });
    }
    
    if (btnCloseInstall) {
        btnCloseInstall.addEventListener('click', hideInstallPrompt);
    }
}

function showInstallPrompt() {
    const dismissed = localStorage.getItem('installPromptDismissed');
    if (dismissed && new Date(dismissed) > new Date()) {
        return;
    }
    
    if (window.matchMedia('(display-mode: standalone)').matches) {
        return;
    }
    
    const prompt = document.getElementById('installPrompt');
    if (prompt) {
        prompt.classList.remove('hidden');
    }
}

function hideInstallPrompt() {
    const prompt = document.getElementById('installPrompt');
    if (prompt) {
        prompt.classList.add('hidden');
    }
}

// ==================== ADMIN AUTHENTICATION ====================

function checkAdminStatus() {
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
        isAdmin = true;
        updateAdminUI();
    }
}

async function handleAdminLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    
    if (!supabaseClient) {
        showToast('Database belum terhubung!', 'error');
        return;
    }
    
    try {
        showLoading(true);
        
        // Simple auth check
        if (email === 'admin@info24jam.com' && password === 'admin123') {
            isAdmin = true;
            localStorage.setItem('adminToken', 'admin_session_' + Date.now());
            
            showToast('Login berhasil! Anda sekarang Admin', 'success');
            closeModal('modalAdmin');
            updateAdminUI();
            loadReports();
        } else {
            showToast('Email atau password salah!', 'error');
        }
    } catch (error) {
        console.error('❌ Admin login error:', error);
        showToast('Login gagal', 'error');
    } finally {
        showLoading(false);
    }
}

function updateAdminUI() {
    const btnAdmin = document.getElementById('btnAdmin');
    if (btnAdmin && isAdmin) {
        btnAdmin.innerHTML = '👑 Admin';
        btnAdmin.classList.add('bg-yellow-600', 'hover:bg-yellow-700');
        btnAdmin.classList.remove('bg-red-700', 'hover:bg-red-800');
    }
    
    const btnLapor = document.getElementById('btnLapor');
    if (btnLapor && isAdmin) {
        btnLapor.innerHTML = '⚙️';
        btnLapor.title = 'Menu Admin';
    }
}

function adminLogout() {
    isAdmin = false;
    localStorage.removeItem('adminToken');
    
    const btnAdmin = document.getElementById('btnAdmin');
    if (btnAdmin) {
        btnAdmin.innerHTML = '🔐';
        btnAdmin.classList.remove('bg-yellow-600', 'hover:bg-yellow-700');
        btnAdmin.classList.add('bg-red-700', 'hover:bg-red-800');
    }
    
    const btnLapor = document.getElementById('btnLapor');
    if (btnLapor) {
        btnLapor.innerHTML = '📢';
        btnLapor.title = 'Buat Laporan Baru';
    }
    
    showToast('Logout berhasil', 'info');
    loadReports();
}

// ==================== START APP ====================

document.addEventListener('DOMContentLoaded', initApp);