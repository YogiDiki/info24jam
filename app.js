/* ==========================================
   Info 24 Jam - Main Application JS
   ========================================== */

// Configuration & Global Variables
let SUPABASE_URL = localStorage.getItem('supabaseUrl') || '';
let SUPABASE_KEY = localStorage.getItem('supabaseKey') || '';
let CLOUDINARY_CLOUD = localStorage.getItem('cloudinaryCloud') || '';
let CLOUDINARY_PRESET = localStorage.getItem('cloudinaryPreset') || '';

let map;
let userMarker;
let userLocation = { lat: -6.2088, lng: 106.8456 };
let supabaseClient;
let currentReports = new Map();
let userCurrentFile = null;

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

// Initialize Application
async function initApp() {
    console.log('🚀 Initializing Info 24 Jam App...');
    
    loadSettings();
    await waitForSupabase();
    initSupabase();
    initMap();
    getUserLocation();
    setupEventListeners();
    loadReports();
    
    console.log('✅ App initialized successfully!');
}

// Wait for Supabase library to load
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

// Settings Management
function loadSettings() {
    SUPABASE_URL = localStorage.getItem('supabaseUrl') || '';
    SUPABASE_KEY = localStorage.getItem('supabaseKey') || '';
    CLOUDINARY_CLOUD = localStorage.getItem('cloudinaryCloud') || '';
    CLOUDINARY_PRESET = localStorage.getItem('cloudinaryPreset') || '';
    
    document.getElementById('supabaseUrl').value = SUPABASE_URL;
    document.getElementById('supabaseKey').value = SUPABASE_KEY;
    document.getElementById('cloudinaryCloud').value = CLOUDINARY_CLOUD;
    document.getElementById('cloudinaryPreset').value = CLOUDINARY_PRESET;
}

function saveSettings() {
    const url = document.getElementById('supabaseUrl').value.trim();
    const key = document.getElementById('supabaseKey').value.trim();
    const cloud = document.getElementById('cloudinaryCloud').value.trim();
    const preset = document.getElementById('cloudinaryPreset').value.trim();
    
    if (!url || !key || !cloud || !preset) {
        alert('⚠️ Semua field harus diisi!');
        return;
    }
    
    localStorage.setItem('supabaseUrl', url);
    localStorage.setItem('supabaseKey', key);
    localStorage.setItem('cloudinaryCloud', cloud);
    localStorage.setItem('cloudinaryPreset', preset);
    
    SUPABASE_URL = url;
    SUPABASE_KEY = key;
    CLOUDINARY_CLOUD = cloud;
    CLOUDINARY_PRESET = preset;
    
    initSupabase();
    closeModal('modalSettings');
    alert('✅ Pengaturan berhasil disimpan!');
}

// Supabase Initialization
function initSupabase() {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.warn('⚠️ Supabase credentials not configured');
        return;
    }
    
    try {
        if (!window.supabase || typeof window.supabase.createClient !== 'function') {
            console.error('❌ Supabase library not loaded');
            return;
        }
        
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('✅ Supabase initialized');
        setupRealtimeListener();
    } catch (error) {
        console.error('❌ Supabase initialization error:', error);
    }
}

function setupRealtimeListener() {
    if (!supabaseClient) return;
    
    supabaseClient
        .channel('public:reports')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, (payload) => {
            console.log('📡 Real-time update:', payload);
            
            if (payload.eventType === 'INSERT') {
                addReportToMap(payload.new);
            } else if (payload.eventType === 'UPDATE') {
                updateReportMarker(payload.new);
            } else if (payload.eventType === 'DELETE') {
                removeReportMarker(payload.old.id);
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
        
        if (data) {
            data.forEach(report => addReportToMap(report));
            console.log(`✅ Loaded ${data.length} reports`);
        }
    } catch (error) {
        console.error('❌ Error loading reports:', error);
    } finally {
        showLoading(false);
    }
}

async function submitReport(formData) {
    if (!supabaseClient) {
        alert('❌ Supabase belum dikonfigurasi!');
        return;
    }
    
    try {
        showLoading(true);
        const submitBtn = document.querySelector('#formLapor button[type="submit"]');
        const spinner = document.getElementById('submitSpinner');
        submitBtn.disabled = true;
        spinner.classList.remove('hidden');
        
        const { data, error } = await supabaseClient
            .from('reports')
            .insert([formData])
            .select();
        
        if (error) throw error;
        
        console.log('✅ Report submitted:', data);
        alert('✅ Laporan berhasil dikirim!');
        
        closeModal('modalLapor');
        resetForm();
    } catch (error) {
        console.error('❌ Error submitting:', error);
        alert(`❌ Gagal mengirim: ${error.message}`);
    } finally {
        showLoading(false);
        submitBtn.disabled = false;
        spinner.classList.add('hidden');
    }
}

async function deleteReport(reportId) {
    if (!supabaseClient || !confirm('🗑️ Hapus laporan ini?')) return;
    
    try {
        const { error } = await supabaseClient.from('reports').delete().eq('id', reportId);
        if (error) throw error;
        
        alert('✅ Laporan berhasil dihapus');
        closeModal('modalInfo');
    } catch (error) {
        console.error('❌ Error deleting:', error);
        alert(`❌ Gagal menghapus: ${error.message}`);
    }
}

// Map Management
function initMap() {
    map = L.map('map').setView([userLocation.lat, userLocation.lng], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
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
        <div style="width: 250px">
            <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px">${icon} ${report.kategori.toUpperCase()}</div>
            <p style="margin-bottom: 12px">${report.deskripsi}</p>
            ${report.foto_url ? `<img src="${report.foto_url}" style="width: 100%; height: 160px; object-fit: cover; border-radius: 8px; margin-bottom: 12px">` : ''}
            <div style="font-size: 12px; color: #666; margin-bottom: 8px">
                <div>📍 ${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}</div>
                <div>⏰ ${new Date(report.created_at).toLocaleString('id-ID')}</div>
            </div>
            <button class="report-detail-btn" data-id="${report.id}" style="background: #EF4444; color: white; padding: 8px; border-radius: 6px; width: 100%; border: none; cursor: pointer">
                Lihat Detail
            </button>
        </div>
    `;
    
    marker.bindPopup(popupContent);
    currentReports.set(report.id, { marker, data: report });
}

function updateReportMarker(report) {
    const reportItem = currentReports.get(report.id);
    if (reportItem) reportItem.data = report;
}

function removeReportMarker(reportId) {
    const reportItem = currentReports.get(reportId);
    if (reportItem) {
        map.removeLayer(reportItem.marker);
        currentReports.delete(reportId);
    }
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
            map.setView([userLocation.lat, userLocation.lng], 13);
            
            const lokasiEl = document.getElementById('lokasi');
            if (lokasiEl) {
                lokasiEl.innerHTML = `<span style="color: #10B981">✅ ${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}</span>`;
            }
            
            console.log('📍 Location updated:', userLocation);
        },
        (error) => {
            console.warn('⚠️ Geolocation error:', error);
            const lokasiEl = document.getElementById('lokasi');
            if (lokasiEl) {
                lokasiEl.innerHTML = '<span style="color: #F59E0B">⚠️ GPS tidak tersedia</span>';
            }
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );
}

// Cloudinary Upload
function setupCloudinaryUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    
    if (!uploadArea || !fileInput) return;
    
    uploadArea.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            userCurrentFile = file;
            document.getElementById('fileName').textContent = `📄 ${file.name}`;
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
            document.getElementById('fileName').textContent = `📄 ${file.name}`;
        }
    });
}

async function uploadImageToCloudinary(file) {
    if (!CLOUDINARY_CLOUD || !CLOUDINARY_PRESET) {
        console.warn('⚠️ Cloudinary not configured');
        return null;
    }
    
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_PRESET);
        
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) throw new Error('Upload failed');
        
        const data = await response.json();
        console.log('✅ Image uploaded:', data.secure_url);
        return data.secure_url;
    } catch (error) {
        console.error('❌ Cloudinary error:', error);
        alert('❌ Gagal upload foto');
        return null;
    }
}

// Form Handling
function setupEventListeners() {
    document.getElementById('btnLapor')?.addEventListener('click', () => openModal('modalLapor'));
    document.getElementById('btnSettings')?.addEventListener('click', () => openModal('modalSettings'));
    document.getElementById('btnBatal')?.addEventListener('click', () => closeModal('modalLapor'));
    document.getElementById('btnCloseSettings')?.addEventListener('click', () => closeModal('modalSettings'));
    document.getElementById('btnCloseInfo')?.addEventListener('click', () => closeModal('modalInfo'));
    document.getElementById('btnSaveSettings')?.addEventListener('click', saveSettings);
    document.getElementById('formLapor')?.addEventListener('submit', handleFormSubmit);
    
    document.getElementById('btnDeleteReport')?.addEventListener('click', () => {
        const reportId = document.getElementById('btnDeleteReport').dataset.reportId;
        if (reportId) deleteReport(reportId);
    });
    
    setupCloudinaryUpload();
    
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('report-detail-btn')) {
            showReportDetail(e.target.dataset.id);
        }
    });
    
    console.log('✅ Event listeners setup');
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const kategori = document.getElementById('kategori').value;
    const deskripsi = document.getElementById('deskripsi').value;
    
    if (!kategori || !deskripsi) {
        alert('⚠️ Kategori dan deskripsi harus diisi!');
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

function resetForm() {
    const form = document.getElementById('formLapor');
    if (form) form.reset();
    
    const fileName = document.getElementById('fileName');
    if (fileName) fileName.textContent = '';
    
    userCurrentFile = null;
}

function showReportDetail(reportId) {
    const reportItem = currentReports.get(reportId);
    if (!reportItem) return;
    
    const report = reportItem.data;
    const icon = categoryIcons[report.kategori] || '❓';
    
    const content = `
        <div>
            <div style="margin-bottom: 16px">
                <h3 style="font-size: 24px; font-weight: bold">${icon} ${report.kategori.toUpperCase()}</h3>
            </div>
            
            ${report.foto_url ? `<img src="${report.foto_url}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 16px">` : ''}
            
            <div style="background: #F9FAFB; padding: 16px; border-radius: 8px; margin-bottom: 16px">
                <p style="margin-bottom: 12px">${report.deskripsi}</p>
                <div style="font-size: 12px; color: #4B5563">
                    <div><strong>📍 Koordinat:</strong> ${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}</div>
                    <div><strong>⏰ Waktu:</strong> ${new Date(report.created_at).toLocaleString('id-ID')}</div>
                    <div><strong>🆔 ID:</strong> ${report.id}</div>
                </div>
            </div>
        </div>
    `;
    
    const infoContent = document.getElementById('infoContent');
    if (infoContent) infoContent.innerHTML = content;
    
    const deleteBtn = document.getElementById('btnDeleteReport');
    if (deleteBtn) deleteBtn.dataset.reportId = reportId;
    
    openModal('modalInfo');
}

// Modal Management
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('hidden');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
    ['modalLapor', 'modalInfo', 'modalSettings'].forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal(modalId);
            });
        }
    });
});

// Utility
function showLoading(show) {
    const loadingBar = document.getElementById('loadingBar');
    if (loadingBar) loadingBar.style.opacity = show ? '1' : '0';
}

// Start App
document.addEventListener('DOMContentLoaded', initApp);