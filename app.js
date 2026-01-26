/* ==========================================
   Info 24 Jam - Fixed Version
   All bugs fixed!
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
let userCurrentFile = null;
let currentView = 'map';
let isAdmin = false;
let deferredPrompt = null;
let appInitialized = false; // Prevent double initialization
let currentFilter = ''; // Track current filter

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

// ==================== TOAST NOTIFICATIONS ====================

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
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
    // Prevent double initialization
    if (appInitialized) {
        console.log('⚠️ App already initialized, skipping...');
        return;
    }
    
    console.log('🚀 Initializing Info 24 Jam App...');
    appInitialized = true;
    
    try {
        await waitForSupabase();
        initSupabase();
        initMap();
        getUserLocation();
        setupEventListeners();
        await loadReports();
        setupPWA();
        checkAdminStatus();
        
        console.log('✅ App initialized successfully!');
    } catch (error) {
        console.error('❌ Initialization error:', error);
        showToast('Gagal memulai aplikasi', 'error');
    }
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
    if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_KEY) {
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
    
    supabaseClient
        .channel('public:reports')
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'reports' 
        }, (payload) => {
            console.log('📡 Real-time update:', payload);
            
            if (payload.eventType === 'INSERT') {
                addReportToMap(payload.new);
                updateListView();
                showToast('Ada laporan baru!', 'info');
            } else if (payload.eventType === 'UPDATE') {
                updateReportMarker(payload.new);
                updateListView();
            } else if (payload.eventType === 'DELETE') {
                removeReportMarker(payload.old.id);
                updateListView();
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
        
        // Clear existing markers
        currentReports.forEach((report) => {
            if (report.marker && map) {
                map.removeLayer(report.marker);
            }
        });
        currentReports.clear();
        
        if (data) {
            data.forEach(report => addReportToMap(report));
            updateListView();
            console.log(`✅ Loaded ${data.length} reports`);
        }
    } catch (error) {
        console.error('❌ Error loading reports:', error);
        showToast('Gagal memuat laporan', 'error');
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

// ==================== MAP MANAGEMENT ====================

function initMap() {
    // Check if map already exists
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        console.error('❌ Map container not found');
        return;
    }
    
    // Clear any existing map
    if (map) {
        map.remove();
        map = null;
    }
    
    // Initialize new map
    map = L.map('map', {
        zoomControl: false // Disable default zoom control to prevent double
    }).setView([userLocation.lat, userLocation.lng], 13);
    
    // Add custom zoom control at bottom right
    L.control.zoom({
        position: 'bottomright'
    }).addTo(map);
    
    // Add tile layer without attribution
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '', // Remove Leaflet attribution
        maxZoom: 19
    }).addTo(map);
    
    // Remove Leaflet logo completely
    const attributionControl = map.attributionControl;
    if (attributionControl) {
        map.removeControl(attributionControl);
    }
    
    updateUserMarker();
    console.log('✅ Map initialized');
}

function updateUserMarker() {
    if (!map) return;
    
    if (userMarker) {
        userMarker.setLatLng([userLocation.lat, userLocation.lng]);
    } else {
        // Red pulsing marker for user location
        userMarker = L.circleMarker([userLocation.lat, userLocation.lng], {
            radius: 10,
            fillColor: '#EF4444',
            color: '#DC2626',
            weight: 3,
            opacity: 1,
            fillOpacity: 0.8,
            className: 'pulse-marker'
        }).addTo(map);
        
        userMarker.bindPopup(`
            <div style="text-align: center; padding: 8px;">
                <strong style="color: #EF4444; font-size: 16px;">📍 Lokasi Anda</strong><br>
                <span style="color: #6B7280; font-size: 12px;">
                    ${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}
                </span><br>
                <span style="color: #10B981; font-size: 11px; font-weight: 600;">
                    ✓ GPS Aktif
                </span>
            </div>
        `);
    }
}

function addReportToMap(report) {
    if (!map || currentReports.has(report.id)) return;
    
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
            <button onclick="window.showReportDetail('${report.id}')" style="background: #EF4444; color: white; padding: 8px 16px; border-radius: 8px; width: 100%; border: none; cursor: pointer; font-weight: 600; transition: all 0.2s;">
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
    if (reportItem && map) {
        map.removeLayer(reportItem.marker);
        currentReports.delete(reportId);
    }
}

function filterReportsOnMap(kategori) {
    currentFilter = kategori;
    
    currentReports.forEach((reportItem) => {
        if (!map) return;
        
        const report = reportItem.data;
        const marker = reportItem.marker;
        
        if (kategori === '' || report.kategori === kategori) {
            // Show marker
            if (!map.hasLayer(marker)) {
                marker.addTo(map);
            }
        } else {
            // Hide marker
            if (map.hasLayer(marker)) {
                map.removeLayer(marker);
            }
        }
    });
}

// ==================== LIST VIEW ====================

function updateListView() {
    const reportsList = document.getElementById('reportsList');
    const filterKategori = document.getElementById('filterKategori');
    
    if (!reportsList) return;
    
    const filterValue = filterKategori ? filterKategori.value : '';
    
    let reports = Array.from(currentReports.values()).map(r => r.data);
    
    // Apply filter
    if (filterValue) {
        reports = reports.filter(r => r.kategori === filterValue);
    }
    
    // Sort by date (newest first)
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
            <div class="report-card bg-white rounded-xl shadow-md overflow-hidden cursor-pointer" data-report-id="${report.id}">
                <div class="flex">
                    ${report.foto_url ? `
                        <img src="${report.foto_url}" class="w-24 h-24 object-cover" alt="Foto">
                    ` : `
                        <div class="w-24 h-24 flex items-center justify-center text-4xl" style="background-color: ${color}20;">
                            ${icon}
                        </div>
                    `}
                    <div class="flex-1 p-3">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-2xl">${icon}</span>
                            <span class="font-bold text-gray-800" style="color: ${color};">
                                ${categoryNames[report.kategori]}
                            </span>
                        </div>
                        <p class="text-sm text-gray-600 line-clamp-2 mb-2">
                            ${report.deskripsi}
                        </p>
                        <div class="flex items-center gap-3 text-xs text-gray-500">
                            <span>📍 ${report.latitude.toFixed(3)}, ${report.longitude.toFixed(3)}</span>
                            <span>⏰ ${formatTimeAgo(report.created_at)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Add click event to report cards
    reportsList.querySelectorAll('.report-card').forEach(card => {
        card.addEventListener('click', function() {
            const reportId = this.dataset.reportId;
            showReportDetail(reportId);
        });
    });
}

function toggleView() {
    const listPanel = document.getElementById('listPanel');
    const btnToggleView = document.getElementById('btnToggleView');
    
    if (currentView === 'map') {
        currentView = 'list';
        listPanel.classList.remove('hidden');
        btnToggleView.innerHTML = '<span class="material-symbols-outlined text-lg">map</span> 🗺️ Peta';
        updateListView();
    } else {
        currentView = 'map';
        listPanel.classList.add('hidden');
        btnToggleView.innerHTML = '<span class="material-symbols-outlined text-lg">list</span> 📋 List';
    }
}

// ==================== SEARCH & FILTER ====================

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        
        if (searchTerm === '') {
            // Show all markers
            currentReports.forEach((reportItem) => {
                if (map && !map.hasLayer(reportItem.marker)) {
                    reportItem.marker.addTo(map);
                }
            });
            return;
        }
        
        // Filter markers
        currentReports.forEach((reportItem) => {
            const report = reportItem.data;
            const marker = reportItem.marker;
            
            const matchesSearch = 
                report.deskripsi.toLowerCase().includes(searchTerm) ||
                categoryNames[report.kategori].toLowerCase().includes(searchTerm);
            
            if (map) {
                if (matchesSearch) {
                    if (!map.hasLayer(marker)) marker.addTo(map);
                } else {
                    if (map.hasLayer(marker)) map.removeLayer(marker);
                }
            }
        });
    });
}

function setupFilterChips() {
    const filterChips = document.querySelectorAll('.filter-chip');
    
    filterChips.forEach(chip => {
        chip.addEventListener('click', function() {
            // Remove active from all chips
            filterChips.forEach(c => c.classList.remove('active'));
            
            // Add active to clicked chip
            this.classList.add('active');
            
            // Get kategori
            const kategori = this.dataset.kategori || '';
            
            // Filter map
            filterReportsOnMap(kategori);
            
            console.log('Filter:', kategori || 'Semua');
        });
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
            
            if (map) {
                map.setView([userLocation.lat, userLocation.lng], 13);
            }
            
            const lokasiEl = document.getElementById('lokasi');
            if (lokasiEl) {
                lokasiEl.innerHTML = `<span style="color: #10B981; font-weight: 600;">✅ ${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}</span>`;
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
    const btnRemoveImage = document.getElementById('btnRemoveImage');
    
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
            
            // Show preview
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
    
    if (btnRemoveImage) {
        btnRemoveImage.addEventListener('click', () => {
            userCurrentFile = null;
            fileInput.value = '';
            if (fileName) fileName.textContent = '';
            if (imagePreview) imagePreview.classList.add('hidden');
        });
    }
    
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
            
            // Show preview
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
    if (!CONFIG.CLOUDINARY_CLOUD || !CONFIG.CLOUDINARY_PRESET) {
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
    // Main buttons
    const btnLapor = document.getElementById('btnLapor');
    const btnToggleView = document.getElementById('btnToggleView');
    const btnToggleLegend = document.getElementById('btnToggleLegend');
    const btnCloseLegend = document.getElementById('btnCloseLegend');
    const btnCloseList = document.getElementById('btnCloseList');
    const btnAdmin = document.getElementById('btnAdmin');
    const btnEmergency = document.getElementById('btnEmergency');
    const btnCloseEmergency = document.getElementById('btnCloseEmergency');
    
    if (btnLapor) btnLapor.addEventListener('click', () => openModal('modalLapor'));
    if (btnToggleView) btnToggleView.addEventListener('click', toggleView);
    if (btnToggleLegend) btnToggleLegend.addEventListener('click', toggleLegend);
    if (btnCloseLegend) btnCloseLegend.addEventListener('click', () => {
        document.getElementById('legendBox')?.classList.add('hidden');
    });
    if (btnCloseList) btnCloseList.addEventListener('click', toggleView);
    if (btnEmergency) btnEmergency.addEventListener('click', () => openModal('modalEmergency'));
    if (btnCloseEmergency) btnCloseEmergency.addEventListener('click', () => closeModal('modalEmergency'));
    
    if (btnAdmin) {
        btnAdmin.addEventListener('click', () => {
            if (isAdmin) {
                if (confirm('Logout sebagai admin?')) {
                    adminLogout();
                }
            } else {
                openModal('modalAdmin');
            }
        });
    }
    
    // Modal buttons
    const btnBatal = document.getElementById('btnBatal');
    const btnCloseInfo = document.getElementById('btnCloseInfo');
    const btnCancelAdmin = document.getElementById('btnCancelAdmin');
    const btnDeleteReport = document.getElementById('btnDeleteReport');
    
    if (btnBatal) btnBatal.addEventListener('click', () => closeModal('modalLapor'));
    if (btnCloseInfo) btnCloseInfo.addEventListener('click', () => closeModal('modalInfo'));
    if (btnCancelAdmin) btnCancelAdmin.addEventListener('click', () => closeModal('modalAdmin'));
    
    if (btnDeleteReport) {
        btnDeleteReport.addEventListener('click', () => {
            const reportId = btnDeleteReport.dataset.reportId;
            if (reportId) deleteReport(reportId);
        });
    }
    
    // Forms
    const formLapor = document.getElementById('formLapor');
    const formAdminLogin = document.getElementById('formAdminLogin');
    
    if (formLapor) formLapor.addEventListener('submit', handleFormSubmit);
    if (formAdminLogin) formAdminLogin.addEventListener('submit', handleAdminLogin);
    
    // Filter
    const filterKategori = document.getElementById('filterKategori');
    if (filterKategori) filterKategori.addEventListener('change', updateListView);
    
    setupCloudinaryUpload();
    setupSearch();
    setupFilterChips();
    
    // Close modal when clicking outside
    ['modalLapor', 'modalInfo', 'modalAdmin', 'modalEmergency'].forEach(modalId => {
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
    if (legendBox) {
        legendBox.classList.toggle('hidden');
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const kategori = document.getElementById('kategori')?.value;
    const deskripsi = document.getElementById('deskripsi')?.value;
    
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

// Make showReportDetail global
window.showReportDetail = showReportDetail;

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
    
    const email = document.getElementById('adminEmail')?.value;
    const password = document.getElementById('adminPassword')?.value;
    
    if (!supabaseClient) {
        showToast('Database belum terhubung!', 'error');
        return;
    }
    
    try {
        showLoading(true);
        
        // Hardcoded admin credentials
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
        btnAdmin.innerHTML = '<span class="material-symbols-outlined text-xl">verified</span>';
        btnAdmin.classList.add('bg-yellow-600', 'hover:bg-yellow-700');
        btnAdmin.classList.remove('bg-red-700', 'hover:bg-red-800');
        btnAdmin.title = 'Admin Mode - Klik untuk logout';
    }
}

function adminLogout() {
    isAdmin = false;
    localStorage.removeItem('adminToken');
    
    const btnAdmin = document.getElementById('btnAdmin');
    if (btnAdmin) {
        btnAdmin.innerHTML = '<span class="material-symbols-outlined text-xl">admin_panel_settings</span>';
        btnAdmin.classList.remove('bg-yellow-600', 'hover:bg-yellow-700');
        btnAdmin.classList.add('bg-red-700', 'hover:bg-red-800');
        btnAdmin.title = 'Admin Login';
    }
    
    showToast('Logout berhasil', 'info');
    loadReports();
}

// ==================== START APP ====================

// Only initialize once when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}