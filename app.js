/* Info 24 Jam - Fixed App.js */

const CONFIG = {
    SUPABASE_URL: 'https://brdyvgmnidzxrwidpzqm.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZHl2Z21uaWR6eHJ3aWRwenFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5NjI0MjgsImV4cCI6MjA4NDUzODQyOH0.83XgYx8_94fnVbPd0N7q9FAfPFUTjJcliDOzTGNzfRQ',
    CLOUDINARY_CLOUD: 'dj1f8hjcj',
    CLOUDINARY_PRESET: 'laporan_warga'
};

let map, userMarker, supabaseClient;
let userLocation = { lat: -6.2088, lng: 106.8456 };
let currentReports = new Map();
let appInitialized = false;

const categoryColors = {
    banjir: '#3B82F6',
    kebakaran: '#EF4444',
    kecelakaan: '#FBBF24',
    kriminal: '#8B5CF6',
    macet: '#F59E0B'
};

// Initialize App
async function initApp() {
    if (appInitialized) return;
    appInitialized = true;
    
    console.log('🚀 Initializing Info 24 Jam App...');
    
    try {
        await waitForSupabase();
        initSupabase();
        initMap();
        getUserLocation();
        setupEventListeners();
        await loadReports();
        console.log('✅ App initialized!');
    } catch (error) {
        console.error('❌ Init error:', error);
    }
}

function waitForSupabase() {
    return new Promise((resolve) => {
        if (typeof window.supabase !== 'undefined') {
            resolve();
            return;
        }
        
        let attempts = 0;
        const check = setInterval(() => {
            attempts++;
            if (typeof window.supabase !== 'undefined') {
                clearInterval(check);
                resolve();
            } else if (attempts >= 50) {
                clearInterval(check);
                resolve();
            }
        }, 100);
    });
}

// Supabase
function initSupabase() {
    try {
        if (window.supabase && typeof window.supabase.createClient === 'function') {
            supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
            console.log('✅ Supabase initialized');
        }
    } catch (error) {
        console.error('❌ Supabase error:', error);
    }
}

async function loadReports() {
    if (!supabaseClient) return;
    
    try {
        const { data, error } = await supabaseClient
            .from('reports')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        currentReports.clear();
        if (data) {
            data.forEach(report => addReportToMap(report));
            console.log(`✅ Loaded ${data.length} reports`);
        }
    } catch (error) {
        console.error('❌ Error loading reports:', error);
    }
}

async function submitReport(formData) {
    if (!supabaseClient) return;
    
    try {
        const { data, error } = await supabaseClient
            .from('reports')
            .insert([formData])
            .select();
        
        if (error) throw error;
        
        console.log('✅ Report submitted');
        closeModalLapor();
        alert('✅ Laporan berhasil dikirim!');
    } catch (error) {
        console.error('❌ Submit error:', error);
        alert('❌ Gagal mengirim laporan');
    }
}

// Map
function initMap() {
    const mapEl = document.getElementById('map');
    if (!mapEl) return;
    
    if (map) {
        map.remove();
        map = null;
    }
    
    map = L.map('map', {
        zoomControl: false,
        attributionControl: false
    }).setView([userLocation.lat, userLocation.lng], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
    }).addTo(map);
    
    updateUserMarker();
    console.log('✅ Map initialized');
}

function updateUserMarker() {
    if (!map) return;
    
    if (userMarker) {
        userMarker.setLatLng([userLocation.lat, userLocation.lng]);
    } else {
        userMarker = L.circleMarker([userLocation.lat, userLocation.lng], {
            radius: 10,
            fillColor: '#EF4444',
            color: '#DC2626',
            weight: 3,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(map);
        
        userMarker.bindPopup('<strong>📍 Lokasi Anda</strong>');
    }
}

function addReportToMap(report) {
    if (!map || currentReports.has(report.id)) return;
    
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
        <div style="padding: 8px;">
            <strong style="color: ${color};">${report.kategori.toUpperCase()}</strong><br>
            <p style="margin: 8px 0; color: #333;">${report.deskripsi}</p>
            <small style="color: #666;">⏰ ${new Date(report.created_at).toLocaleString('id-ID')}</small>
        </div>
    `;
    
    marker.bindPopup(popupContent);
    currentReports.set(report.id, { marker, data: report });
}

// Geolocation
function getUserLocation() {
    if (!('geolocation' in navigator)) return;
    
    navigator.geolocation.watchPosition(
        (position) => {
            userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            
            updateUserMarker();
            if (map) map.setView([userLocation.lat, userLocation.lng], 13);
            
            const locationText = document.getElementById('locationText');
            if (locationText) {
                locationText.textContent = `${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}`;
            }
            
            console.log('📍 Location updated:', userLocation);
        },
        (error) => {
            console.warn('⚠️ Geolocation error:', error);
        },
        { 
            enableHighAccuracy: true, 
            maximumAge: 10000, 
            timeout: 5000 
        }
    );
}

// Event Listeners
function setupEventListeners() {
    // FAB - Open Modal
    const btnLapor = document.getElementById('btnLapor');
    if (btnLapor) {
        btnLapor.addEventListener('click', openModalLapor);
    }
    
    // Close Modal
    const closeModal = document.getElementById('closeModal');
    if (closeModal) {
        closeModal.addEventListener('click', closeModalLapor);
    }
    
    // Form Submit
    const formLapor = document.getElementById('formLapor');
    if (formLapor) {
        formLapor.addEventListener('submit', handleSubmit);
    }
    
    // Upload Area
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', () => fileInput.click());
    }
    
    // Map Controls
    const zoomIn = document.getElementById('zoomIn');
    const zoomOut = document.getElementById('zoomOut');
    const centerLocation = document.getElementById('centerLocation');
    
    if (zoomIn) zoomIn.addEventListener('click', () => map && map.zoomIn());
    if (zoomOut) zoomOut.addEventListener('click', () => map && map.zoomOut());
    if (centerLocation) {
        centerLocation.addEventListener('click', () => {
            if (map) map.setView([userLocation.lat, userLocation.lng], 15);
        });
    }
    
    // Filter Chips
    const filterChips = document.querySelectorAll('.filter-chip');
    filterChips.forEach(chip => {
        chip.addEventListener('click', function() {
            filterChips.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            
            const filter = this.dataset.filter || '';
            filterReports(filter);
        });
    });
    
    console.log('✅ Event listeners setup');
}

function filterReports(kategori) {
    currentReports.forEach((item) => {
        if (!map) return;
        
        if (kategori === '' || item.data.kategori === kategori) {
            if (!map.hasLayer(item.marker)) {
                item.marker.addTo(map);
            }
        } else {
            if (map.hasLayer(item.marker)) {
                map.removeLayer(item.marker);
            }
        }
    });
}

// Modal Functions
function openModalLapor() {
    const modal = document.getElementById('modalLapor');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeModalLapor() {
    const modal = document.getElementById('modalLapor');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// Handle Form Submit
async function handleSubmit(e) {
    e.preventDefault();
    
    const judul = document.getElementById('judulLaporan')?.value;
    const kategori = document.getElementById('kategoriSelect')?.value;
    const deskripsi = document.getElementById('deskripsiDetail')?.value;
    
    if (!judul || !kategori || !deskripsi) {
        alert('⚠️ Semua field harus diisi!');
        return;
    }
    
    const reportData = {
        kategori,
        deskripsi: `${judul} - ${deskripsi}`,
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        foto_url: null,
        created_at: new Date().toISOString()
    };
    
    await submitReport(reportData);
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}