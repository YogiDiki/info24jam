/* Info 24 Jam - Complete App.js v3.1 */

const CONFIG = {
    SUPABASE_URL: 'https://brdyvgmnidzxrwidpzqm.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZHl2Z21uaWR6eHJ3aWRwenFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5NjI0MjgsImV4cCI6MjA4NDUzODQyOH0.83XgYx8_94fnVbPd0N7q9FAfPFUTjJcliDOzTGNzfRQ',
    CLOUDINARY_CLOUD: 'dj1f8hjcj',
    CLOUDINARY_PRESET: 'laporan_warga'
};

let map, userMarker, supabaseClient;
let userLocation = { lat: -6.2088, lng: 106.8456 };
let currentReports = new Map();
let allReportsData = [];
let appInitialized = false;
let isAdmin = false;
let deferredPrompt = null;
let uploadedImageUrl = null;

const categoryColors = {
    banjir: '#3B82F6',
    kebakaran: '#EF4444',
    kecelakaan: '#FBBF24',
    kriminal: '#8B5CF6',
    macet: '#F59E0B',
    lainnya: '#6B7280'
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
        checkAdminStatus();
        setupPWA();
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
        allReportsData = data || [];
        
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
        showNotification('✅ Laporan berhasil dikirim!', 'success');
        
        await loadReports();
    } catch (error) {
        console.error('❌ Submit error:', error);
        showNotification('❌ Gagal mengirim laporan', 'error');
    }
}

// Admin: Delete Report - FIXED
async function deleteReport(reportId) {
    if (!isAdmin) {
        showNotification('⚠️ Hanya admin yang bisa menghapus laporan!', 'warning');
        return;
    }
    
    if (!confirm('Yakin ingin menghapus laporan ini?')) {
        return;
    }
    
    try {
        const { error } = await supabaseClient
            .from('reports')
            .delete()
            .eq('id', reportId);
        
        if (error) throw error;
        
        // Remove from map
        const reportItem = currentReports.get(reportId);
        if (reportItem && map) {
            map.removeLayer(reportItem.marker);
        }
        currentReports.delete(reportId);
        
        // Remove from allReportsData
        allReportsData = allReportsData.filter(r => r.id !== reportId);
        
        showNotification('✅ Laporan berhasil dihapus!', 'success');
        
        // Reload list if open
        const modalList = document.getElementById('modalList');
        if (modalList && modalList.classList.contains('show')) {
            await showReportList();
        }
    } catch (error) {
        console.error('❌ Delete error:', error);
        showNotification('❌ Gagal menghapus laporan', 'error');
    }
}

// Animated Notification System - NEW
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    
    notification.innerHTML = `
        <div class="notification-icon">${icons[type] || icons.info}</div>
        <div class="notification-message">${message}</div>
    `;
    
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Auto remove after 3s
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
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
        <div style="padding: 8px; min-width: 200px;">
            <strong style="color: ${color};">${report.kategori.toUpperCase()}</strong><br>
            <p style="margin: 8px 0; color: #333;">${report.deskripsi}</p>
            ${report.foto_url ? `<img src="${report.foto_url}" style="width: 100%; border-radius: 8px; margin: 8px 0;" />` : ''}
            ${report.pelapor_nama ? `<small style="color: #666;">👤 ${report.pelapor_nama}</small><br>` : ''}
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
    const menuBtn = document.getElementById('menuBtn');
    if (menuBtn) {
        menuBtn.addEventListener('click', showMenu);
    }
    
    const btnLapor = document.getElementById('btnLapor');
    if (btnLapor) {
        btnLapor.addEventListener('click', openModalLapor);
    }
    
    const closeModal = document.getElementById('closeModal');
    if (closeModal) {
        closeModal.addEventListener('click', closeModalLapor);
    }
    
    const formLapor = document.getElementById('formLapor');
    if (formLapor) {
        formLapor.addEventListener('submit', handleSubmit);
    }
    
    // File Upload with Preview - FIXED
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await handleFileUpload(file);
            }
        });
    }
    
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
    
    const filterChips = document.querySelectorAll('.filter-chip');
    filterChips.forEach(chip => {
        chip.addEventListener('click', function() {
            filterChips.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            
            const filter = this.dataset.filter || '';
            filterReports(filter);
        });
    });
    
    const btnEmergency = document.getElementById('btnEmergency');
    if (btnEmergency) {
        btnEmergency.addEventListener('click', showEmergencyModal);
    }
    
    const closeEmergency = document.getElementById('closeEmergency');
    if (closeEmergency) {
        closeEmergency.addEventListener('click', closeEmergencyModal);
    }
    
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    const closeLogin = document.getElementById('closeLogin');
    if (closeLogin) {
        closeLogin.addEventListener('click', closeLoginModal);
    }
    
    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn) {
        profileBtn.addEventListener('click', () => {
            if (isAdmin) {
                if (confirm('Logout dari admin?')) {
                    logout();
                }
            } else {
                openLoginModal();
            }
        });
    }
    
    const btnInstall = document.getElementById('btnInstall');
    if (btnInstall) {
        btnInstall.addEventListener('click', installPWA);
    }
    
    // Search functionality - FIXED
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
    
    console.log('✅ Event listeners setup');
}

// Search Function - NEW
function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    
    if (!query) {
        // Show all markers
        currentReports.forEach((item) => {
            if (!map.hasLayer(item.marker)) {
                item.marker.addTo(map);
            }
        });
        return;
    }
    
    // Search in reports
    currentReports.forEach((item) => {
        const report = item.data;
        const searchText = `
            ${report.kategori} 
            ${report.deskripsi} 
            ${report.pelapor_nama || ''}
        `.toLowerCase();
        
        if (searchText.includes(query)) {
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

// File Upload with Preview - FIXED
async function handleFileUpload(file) {
    const preview = document.getElementById('imagePreview');
    const uploadArea = document.getElementById('uploadArea');
    
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        preview.innerHTML = `
            <img src="${e.target.result}" style="width: 100%; border-radius: 12px;" />
            <button type="button" class="remove-image-btn" onclick="removeImage()">
                <i class="material-icons">close</i>
            </button>
        `;
        preview.classList.remove('hidden');
        uploadArea.classList.add('hidden');
    };
    reader.readAsDataURL(file);
    
    // Upload to Cloudinary
    try {
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
        
        const data = await response.json();
        uploadedImageUrl = data.secure_url;
        
        console.log('✅ Image uploaded:', uploadedImageUrl);
        showNotification('✅ Gambar berhasil diupload!', 'success');
    } catch (error) {
        console.error('❌ Upload error:', error);
        showNotification('❌ Gagal upload gambar', 'error');
    }
}

function removeImage() {
    const preview = document.getElementById('imagePreview');
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    
    preview.innerHTML = '';
    preview.classList.add('hidden');
    uploadArea.classList.remove('hidden');
    fileInput.value = '';
    uploadedImageUrl = null;
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

// Modals
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
        
        const form = document.getElementById('formLapor');
        if (form) form.reset();
        
        // Reset image
        removeImage();
    }
}

async function handleSubmit(e) {
    e.preventDefault();
    
    const judul = document.getElementById('judulLaporan')?.value;
    const kategori = document.getElementById('kategoriSelect')?.value;
    const deskripsi = document.getElementById('deskripsiDetail')?.value;
    const pelaporNama = document.getElementById('pelaporNama')?.value;
    const pelaporKontak = document.getElementById('pelaporKontak')?.value;
    const kontributorStatus = document.querySelector('.status-option.active')?.dataset.status || 'relawan';
    
    if (!judul || !kategori || !deskripsi || !pelaporNama || !pelaporKontak) {
        showNotification('⚠️ Semua field harus diisi!', 'warning');
        return;
    }
    
    const reportData = {
        kategori,
        deskripsi: `${judul} - ${deskripsi}`,
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        pelapor_nama: pelaporNama,
        pelapor_kontak: pelaporKontak,
        kontributor_status: kontributorStatus,
        foto_url: uploadedImageUrl,
        created_at: new Date().toISOString()
    };
    
    await submitReport(reportData);
}

// Menu Modal
function showMenu() {
    const modal = document.getElementById('modalMenu');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeMenuModal() {
    const modal = document.getElementById('modalMenu');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// Statistics Modal - NEW
async function showStatistics() {
    const modal = document.getElementById('modalStatistics');
    if (!modal) return;
    
    // Calculate statistics
    const stats = calculateMonthlyStatistics();
    
    // Render charts
    renderStatisticsCharts(stats);
    
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function calculateMonthlyStatistics() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const monthlyData = {};
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
        const date = new Date(currentYear, currentMonth - i, 1);
        const key = date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
        monthlyData[key] = {
            banjir: 0,
            kebakaran: 0,
            kecelakaan: 0,
            kriminal: 0,
            macet: 0,
            lainnya: 0,
            total: 0
        };
    }
    
    // Count reports
    allReportsData.forEach(report => {
        const reportDate = new Date(report.created_at);
        const key = reportDate.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
        
        if (monthlyData[key]) {
            const kategori = report.kategori || 'lainnya';
            monthlyData[key][kategori]++;
            monthlyData[key].total++;
        }
    });
    
    return monthlyData;
}

function renderStatisticsCharts(stats) {
    const container = document.getElementById('statisticsCharts');
    if (!container) return;
    
    const months = Object.keys(stats);
    const categories = ['banjir', 'kebakaran', 'kecelakaan', 'kriminal', 'macet', 'lainnya'];
    
    let html = '<div class="stats-summary">';
    
    // Total summary
    let grandTotal = 0;
    const categoryTotals = {};
    
    categories.forEach(cat => {
        categoryTotals[cat] = 0;
        months.forEach(month => {
            categoryTotals[cat] += stats[month][cat];
            grandTotal += stats[month][cat];
        });
    });
    
    html += `<h3 class="stats-title">Total Laporan: ${grandTotal}</h3>`;
    html += '<div class="stats-grid">';
    
    const categoryIcons = {
        banjir: 'water',
        kebakaran: 'local_fire_department',
        kecelakaan: 'directions_car',
        kriminal: 'gavel',
        macet: 'traffic',
        lainnya: 'more_horiz'
    };
    
    const categoryNames = {
        banjir: 'Banjir',
        kebakaran: 'Kebakaran',
        kecelakaan: 'Kecelakaan',
        kriminal: 'Kriminal',
        macet: 'Macet',
        lainnya: 'Lainnya'
    };
    
    categories.forEach(cat => {
        const color = categoryColors[cat];
        html += `
            <div class="stat-card" style="border-color: ${color};">
                <i class="material-icons" style="color: ${color};">${categoryIcons[cat]}</i>
                <div class="stat-number">${categoryTotals[cat]}</div>
                <div class="stat-label">${categoryNames[cat]}</div>
            </div>
        `;
    });
    
    html += '</div></div>';
    
    // Monthly chart
    html += '<div class="monthly-chart">';
    html += '<h3 class="stats-title">Laporan per Bulan</h3>';
    
    months.forEach(month => {
        const monthData = stats[month];
        const total = monthData.total;
        
        html += `
            <div class="month-bar">
                <div class="month-label">${month}</div>
                <div class="month-bar-container">
        `;
        
        categories.forEach(cat => {
            const count = monthData[cat];
            if (count > 0) {
                const width = total > 0 ? (count / total * 100) : 0;
                const color = categoryColors[cat];
                html += `
                    <div class="month-bar-segment" 
                         style="width: ${width}%; background: ${color};"
                         title="${categoryNames[cat]}: ${count}">
                    </div>
                `;
            }
        });
        
        html += `
                </div>
                <div class="month-total">${total}</div>
            </div>
        `;
    });
    
    html += '</div>';
    
    container.innerHTML = html;
}

// Report List
async function showReportList() {
    if (!supabaseClient) return;
    
    try {
        const { data, error } = await supabaseClient
            .from('reports')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (error) throw error;
        
        const modal = document.getElementById('modalList');
        const listContainer = document.getElementById('reportListContainer');
        
        if (!modal || !listContainer) return;
        
        listContainer.innerHTML = '';
        
        if (!data || data.length === 0) {
            listContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">Belum ada laporan</p>';
        } else {
            data.forEach(report => {
                const reportCard = createReportCard(report);
                listContainer.appendChild(reportCard);
            });
        }
        
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    } catch (error) {
        console.error('❌ Error loading report list:', error);
        showNotification('Gagal memuat daftar laporan', 'error');
    }
}

function createReportCard(report) {
    const div = document.createElement('div');
    div.className = 'report-card';
    
    const color = categoryColors[report.kategori] || '#6B7280';
    const date = new Date(report.created_at);
    const dateStr = date.toLocaleString('id-ID', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const statusBadge = report.kontributor_status === 'relawan' 
        ? '<span class="status-badge relawan">🎖️ Relawan</span>'
        : '<span class="status-badge instansi">🏢 Instansi</span>';
    
    div.innerHTML = `
        <div class="report-card-header" style="background: linear-gradient(135deg, ${color}22, ${color}11);">
            <div class="report-badge" style="background: ${color};">${report.kategori.toUpperCase()}</div>
            <div class="report-time">⏰ ${dateStr}</div>
            ${isAdmin ? `<button class="delete-btn" onclick="deleteReport(${report.id})" title="Hapus Laporan">🗑️</button>` : ''}
        </div>
        ${report.foto_url ? `<img src="${report.foto_url}" class="report-image" alt="${report.kategori}" onerror="this.style.display='none'" />` : ''}
        <div class="report-card-body">
            <h3 class="report-title">${report.deskripsi.split(' - ')[0] || 'Laporan'}</h3>
            <p class="report-desc">${report.deskripsi}</p>
            <div class="report-meta">
                <div class="report-meta-item">
                    <i class="material-icons">person</i>
                    <span>${report.pelapor_nama || 'Anonim'}</span>
                </div>
                <div class="report-meta-item">
                    ${statusBadge}
                </div>
            </div>
        </div>
    `;
    
    div.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) return;
        
        closeListModal();
        if (map) {
            map.setView([report.latitude, report.longitude], 16);
            
            const reportItem = currentReports.get(report.id);
            if (reportItem && reportItem.marker) {
                reportItem.marker.openPopup();
            }
        }
    });
    
    return div;
}

function closeListModal() {
    const modal = document.getElementById('modalList');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// Emergency Modal
function showEmergencyModal() {
    const modal = document.getElementById('modalEmergency');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeEmergencyModal() {
    const modal = document.getElementById('modalEmergency');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// Login
function openLoginModal() {
    const modal = document.getElementById('modalLogin');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeLoginModal() {
    const modal = document.getElementById('modalLogin');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername')?.value;
    const password = document.getElementById('loginPassword')?.value;
    
    if (!username || !password) {
        showNotification('⚠️ Username dan password harus diisi!', 'warning');
        return;
    }
    
    if (username === 'admin' && password === 'admin123') {
        isAdmin = true;
        localStorage.setItem('info24jam_admin', 'true');
        
        closeLoginModal();
        showNotification('✅ Login berhasil! Selamat datang Admin.', 'success');
        
        updateAdminUI();
    } else {
        showNotification('❌ Username atau password salah!', 'error');
    }
}

function logout() {
    isAdmin = false;
    localStorage.removeItem('info24jam_admin');
    updateAdminUI();
    showNotification('✅ Logout berhasil', 'success');
}

function checkAdminStatus() {
    const adminStatus = localStorage.getItem('info24jam_admin');
    if (adminStatus === 'true') {
        isAdmin = true;
        updateAdminUI();
    }
}

function updateAdminUI() {
    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn) {
        if (isAdmin) {
            profileBtn.style.background = '#10b981';
            profileBtn.title = 'Admin - Click to logout';
        } else {
            profileBtn.style.background = 'transparent';
            profileBtn.title = 'Login Admin';
        }
    }
}

// PWA
function setupPWA() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('✅ Service Worker registered'))
                .catch(err => console.log('❌ Service Worker error:', err));
        });
    }
    
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        const btnInstall = document.getElementById('btnInstall');
        if (btnInstall) {
            btnInstall.classList.remove('hidden');
        }
    });
    
    window.addEventListener('appinstalled', () => {
        console.log('✅ PWA installed');
        deferredPrompt = null;
        
        const btnInstall = document.getElementById('btnInstall');
        if (btnInstall) {
            btnInstall.classList.add('hidden');
        }
    });
}

async function installPWA() {
    if (!deferredPrompt) {
        showNotification('Aplikasi sudah terinstall atau tidak support PWA', 'info');
        return;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`Install: ${outcome}`);
    deferredPrompt = null;
}

// Close modals on outside click
document.addEventListener('click', (e) => {
    const modals = ['modalLapor', 'modalList', 'modalEmergency', 'modalLogin', 'modalMenu', 'modalStatistics'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal && e.target === modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    });
});

// Init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}