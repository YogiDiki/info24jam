/* ==========================================
   Info 24 Jam - Main Application JS (FINAL FIX)
   ========================================== */

// ==========================================
// Configuration & Global Variables
// ==========================================

let SUPABASE_URL = localStorage.getItem('supabaseUrl') || '';
let SUPABASE_KEY = localStorage.getItem('supabaseKey') || '';
let CLOUDINARY_CLOUD = localStorage.getItem('cloudinaryCloud') || '';
let CLOUDINARY_PRESET = localStorage.getItem('cloudinaryPreset') || '';

let map;
let userMarker;
let userLocation = { lat: -6.2088, lng: 106.8456 }; // Default: Jakarta
let supabase;
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

// ==========================================
// Initialize Application
// ==========================================

async function initApp() {
    console.log('🚀 Initializing Info 24 Jam App...');
    
    // Load settings dari localStorage
    loadSettings();
    
    // Tunggu sampai Supabase library ready (FIX: Tambah delay)
    await waitForSupabase();
    
    // Inisialisasi Supabase
    initSupabase();
    
    // Inisialisasi Map
    initMap();
    
    // Get User Location
    getUserLocation();
    
    // Setup Event Listeners
    setupEventListeners();
    
    // Load existing reports
    loadReports();
    
    console.log('✅ App initialized successfully!');
}

// ==========================================
// FIX: Wait for Supabase library to load
// ==========================================

function waitForSupabase() {
    return new Promise((resolve) => {
        if (typeof window.supabase !== 'undefined') {
            resolve();
            return;
        }
        
        let attempts = 0;
        const maxAttempts = 50; // 5 detik maksimal
        
        const checkInterval = setInterval(() => {
            attempts++;
            
            if (typeof window.supabase !== 'undefined') {
                clearInterval(checkInterval);
                console.log('✅ Supabase library loaded');
                resolve();
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                console.error('❌ Supabase library gagal ter-load setelah 5 detik');
                resolve(); // Tetap lanjut meski gagal
            }
        }, 100);
    });
}

// ==========================================
// Settings Management
// ==========================================

function loadSettings() {
    SUPABASE_URL = localStorage.getItem('supabaseUrl') || '';
    SUPABASE_KEY = localStorage.getItem('supabaseKey') || '';
    CLOUDINARY_CLOUD = localStorage.getItem('cloudinaryCloud') || '';
    CLOUDINARY_PRESET = localStorage.getItem('cloudinaryPreset') || '';
    
    // Populate settings modal
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
    
    // Reinitialize Supabase
    initSupabase();
    
    closeModal('modalSettings');
    alert('✅ Pengaturan berhasil disimpan!');
}

// ==========================================
// Supabase Initialization & Real-time
// ==========================================

function initSupabase() {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.warn('⚠️ Supabase credentials not configured. Silakan buka Pengaturan untuk setup.');
        return;
    }
    
    try {
        // FIX: Validasi window.supabase dengan cara lebih aman
        if (!window.supabase || typeof window.supabase.createClient !== 'function') {
            console.error('❌ Supabase library tidak ter-load dengan benar!');
            console.log('Pastikan script <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script> ada di index.html');
            return;
        }
        
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('✅ Supabase initialized successfully');
        
        // Setup real-time subscription
        setupRealtimeListener();
    } catch (error) {
        console.error('❌ Supabase initialization error:', error);
        alert('❌ Gagal inisialisasi Supabase. Periksa kredensial di Pengaturan.');
    }
}

function setupRealtimeListener() {
    if (!supabase) return;
    
    // Subscribe to reports changes
    const subscription = supabase
        .channel('public:reports')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'reports' },
            (payload) => {
                console.log('📡 Real-time update received:', payload);
                
                if (payload.eventType === 'INSERT') {
                    addReportToMap(payload.new);
                } else if (payload.eventType === 'UPDATE') {
                    updateReportMarker(payload.new);
                } else if (payload.eventType === 'DELETE') {
                    removeReportMarker(payload.old.id);
                }
            }
        )
        .subscribe((status) => {
            console.log('📡 Real-time subscription status:', status);
        });
}

async function loadReports() {
    if (!supabase) {
        console.warn('⚠️ Supabase not initialized. Silakan setup kredensial di Pengaturan.');
        return;
    }
    
    try {
        showLoading(true);
        
        const { data, error } = await supabase
            .from('reports')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            data.forEach(report => addReportToMap(report));
            console.log(`✅ Loaded ${data.length} reports`);
        } else {
            console.log('📭 Belum ada laporan');
        }
    } catch (error) {
        console.error('❌ Error loading reports:', error);
        alert(`❌ Gagal memuat laporan: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

async function submitReport(formData) {
    if (!supabase) {
        alert('❌ Supabase belum dikonfigurasi! Buka Pengaturan untuk mengisinya.');
        return;
    }
    
    try {
        showLoading(true);
        const submitBtn = document.querySelector('#formLapor button[type="submit"]');
        const spinner = document.getElementById('submitSpinner');
        submitBtn.disabled = true;
        spinner.classList.remove('hidden');
        
        // Insert to Supabase
        const { data, error } = await supabase
            .from('reports')
            .insert([formData])
            .select();
        
        if (error) throw error;
        
        console.log('✅ Report submitted:', data);
        alert('✅ Laporan Anda berhasil dikirim! Terima kasih atas infonya.');
        
        closeModal('modalLapor');
        resetForm();
    } catch (error) {
        console.error('❌ Error submitting report:', error);
        alert(`❌ Gagal mengirim laporan: ${error.message}`);
    } finally {
        showLoading(false);
        const submitBtn = document.querySelector('#formLapor button[type="submit"]');
        const spinner = document.getElementById('submitSpinner');
        if (submitBtn) submitBtn.disabled = false;
        if (spinner) spinner.classList.add('hidden');
    }
}

async function deleteReport(reportId) {
    if (!supabase) return;
    
    if (!confirm('🗑️ Hapus laporan ini?')) return;
    
    try {
        const { error } = await supabase
            .from('reports')
            .delete()
            .eq('id', reportId);
        
        if (error) throw error;
        
        console.log('✅ Report deleted:', reportId);
        alert('✅ Laporan berhasil dihapus');
        closeModal('modalInfo');
    } catch (error) {
        console.error('❌ Error deleting report:', error);
        alert(`❌ Gagal menghapus laporan: ${error.message}`);
    }
}

// ==========================================
// Map Management
// ==========================================

function initMap() {
    map = L.map('map').setView([userLocation.lat, userLocation.lng], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);
    
    // Add user location marker
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
        
        userMarker.bindPopup('<div class="text-center"><strong>📍 Lokasi Anda</strong></div>');
    }
}

function addReportToMap(report) {
    if (currentReports.has(report.id)) {
        return; // Already on map
    }
    
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
    
    // Create popup content
    const popupContent = `
        <div class="w-64">
            <div class="font-bold text-lg mb-2">${icon} ${report.kategori.toUpperCase()}</div>
            <p class="text-gray-700 mb-3">${report.deskripsi}</p>
            ${report.foto_url ? `<img src="${report.foto_url}" alt="Report photo" class="w-full h-40 object-cover rounded-lg mb-3">` : ''}
            <div class="text-xs text-gray-500 mb-2">
                <div>📍 ${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}</div>
                <div>⏰ ${new Date(report.created_at).toLocaleString('id-ID')}</div>
            </div>
            <button class="report-detail-btn bg-red-600 text-white px-3 py-1 rounded text-sm w-full hover:bg-red-700" data-id="${report.id}">
                Lihat Detail
            </button>
        </div>
    `;
    
    marker.bindPopup(popupContent);
    
    currentReports.set(report.id, {
        marker: marker,
        data: report
    });
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

// ==========================================
// Geolocation
// ==========================================

function getUserLocation() {
    if ('geolocation' in navigator) {
        navigator.geolocation.watchPosition(
            (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                updateUserMarker();
                
                // Update map center on first load
                if (map) {
                    map.setView([userLocation.lat, userLocation.lng], 13);
                }
                
                // Update location display in form
                const lokasiEl = document.getElementById('lokasi');
                if (lokasiEl) {
                    lokasiEl.innerHTML = 
                        `<span class="text-green-600">✅ ${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}</span>`;
                }
                
                console.log('📍 Location updated:', userLocation);
            },
            (error) => {
                console.warn('⚠️ Geolocation error:', error);
                const lokasiEl = document.getElementById('lokasi');
                if (lokasiEl) {
                    lokasiEl.innerHTML = 
                        `<span class="text-yellow-600">⚠️ GPS tidak tersedia, gunakan lokasi default</span>`;
                }
            },
            {
                enableHighAccuracy: true,
                maximumAge: 10000,
                timeout: 5000
            }
        );
    } else {
        console.warn('⚠️ Geolocation tidak didukung browser ini');
    }
}

// ==========================================
// Cloudinary Image Upload
// ==========================================

function setupCloudinaryUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    
    if (!uploadArea || !fileInput) return;
    
    // Click to upload
    uploadArea.addEventListener('click', () => fileInput.click());
    
    // File input change
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            userCurrentFile = file;
            document.getElementById('fileName').textContent = `📄 ${file.name}`;
        }
    });
    
    // Drag and drop
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
        
        if (!response.ok) {
            throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('✅ Image uploaded to Cloudinary:', data.secure_url);
        return data.secure_url;
    } catch (error) {
        console.error('❌ Cloudinary upload error:', error);
        alert('❌ Gagal upload foto. Periksa konfigurasi Cloudinary di Pengaturan.');
        return null;
    }
}

// ==========================================
// Form Handling
// ==========================================

function setupEventListeners() {
    // Modal triggers
    document.getElementById('btnLapor')?.addEventListener('click', () => openModal('modalLapor'));
    document.getElementById('btnSettings')?.addEventListener('click', () => openModal('modalSettings'));
    
    // Modal closes
    document.getElementById('btnBatal')?.addEventListener('click', () => closeModal('modalLapor'));
    document.getElementById('btnCloseSettings')?.addEventListener('click', () => closeModal('modalSettings'));
    document.getElementById('btnCloseInfo')?.addEventListener('click', () => closeModal('modalInfo'));
    
    // Settings
    document.getElementById('btnSaveSettings')?.addEventListener('click', saveSettings);
    
    // Form submission
    document.getElementById('formLapor')?.addEventListener('submit', handleFormSubmit);
    
    // Delete report
    document.getElementById('btnDeleteReport')?.addEventListener('click', () => {
        const reportId = document.getElementById('btnDeleteReport').dataset.reportId;
        if (reportId) deleteReport(reportId);
    });
    
    // Cloudinary setup
    setupCloudinaryUpload();
    
    // Map click listener for report details
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('report-detail-btn')) {
            const reportId = e.target.dataset.id;
            showReportDetail(reportId);
        }
    });
    
    console.log('✅ Event listeners setup complete');
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
    
    // Upload image if provided
    if (userCurrentFile) {
        console.log('📤 Uploading image...');
        fotoUrl = await uploadImageToCloudinary(userCurrentFile);
    }
    
    // Prepare report data
    const reportData = {
        kategori: kategori,
        deskripsi: deskripsi,
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
            <div class="mb-4">
                <h3 class="text-2xl font-bold text-gray-800">${icon} ${report.kategori.toUpperCase()}</h3>
            </div>
            
            ${report.foto_url ? `<img src="${report.foto_url}" alt="Report photo" class="w-full h-48 object-cover rounded-lg mb-4">` : ''}
            
            <div class="bg-gray-50 p-4 rounded-lg mb-4">
                <p class="text-gray-700 text-sm mb-3">${report.deskripsi}</p>
                <div class="text-xs text-gray-600 space-y-1">
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

// ==========================================
// Modal Management
// ==========================================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Close modals on background click
document.addEventListener('DOMContentLoaded', () => {
    ['modalLapor', 'modalInfo', 'modalSettings'].forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal(modalId);
                }
            });
        }
    });
});

// ==========================================
// Utility Functions
// ==========================================

function showLoading(show) {
    const loadingBar = document.getElementById('loadingBar');
    if (loadingBar) {
        loadingBar.style.opacity = show ? '1' : '0';
    }
}

// ==========================================
// Start Application
// ==========================================

document.addEventListener('DOMContentLoaded', initApp);