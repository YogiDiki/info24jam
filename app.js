/* Info 24 Jam - Complete App.js dengan semua fitur aktif */

const CONFIG = {
    SUPABASE_URL: 'https://brdyvgmnidzxrwidpzqm.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZHl2Z21uaWR6eHJ3aWRwenFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5NjI0MjgsImV4cCI6MjA4NDUzODQyOH0.83XgYx8_94fnVbPd0N7q9FAfPFUTjJcliDOzTGNzfRQ',
    CLOUDINARY_CLOUD: 'dj1f8hjcj',
    CLOUDINARY_PRESET: 'laporan_warga'
};

const CATEGORY_COLORS = {
    banjir: '#3B82F6',
    kebakaran: '#EF4444',
    kecelakaan: '#FBBF24',
    kriminal: '#8B5CF6',
    macet: '#F59E0B',
    lainnya: '#6B7280'
};

// Global State
let map, userMarker, supabaseClient;
let userLocation = { lat: -6.2088, lng: 106.8456 };
let reports = new Map();
let isAdmin = false;
let deferredPrompt = null;
let uploadedImageUrl = null;

// Initialize
async function init() {
    console.log('🚀 Starting Info 24 Jam...');
    
    await waitForSupabase();
    supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
    
    initMap();
    getUserLocation();
    setupEvents();
    await loadReports();
    checkAdmin();
    setupPWA();
    
    // Force show install button
    document.getElementById('pwaInstallBanner').style.display = 'flex';
    
    console.log('✅ Ready!');
}

function waitForSupabase() {
    return new Promise(resolve => {
        if (window.supabase) return resolve();
        const check = setInterval(() => {
            if (window.supabase) {
                clearInterval(check);
                resolve();
            }
        }, 100);
    });
}

// Supabase Operations
async function loadReports() {
    try {
        const { data } = await supabaseClient
            .from('reports')
            .select('*')
            .order('created_at', { ascending: false });
        
        reports.clear();
        data?.forEach(r => addMarker(r));
        console.log(`✅ Loaded ${data?.length || 0} reports`);
    } catch (err) {
        console.error('Load error:', err);
    }
}

async function submitReport(formData) {
    try {
        const { error } = await supabaseClient.from('reports').insert([formData]);
        if (error) throw error;
        
        closeModal('modalLapor');
        notify('✅ Laporan terkirim!', 'success');
        await loadReports();
    } catch (err) {
        console.error('Submit error:', err);
        notify('❌ Gagal mengirim', 'error');
    }
}

async function deleteReport(id) {
    if (!isAdmin) return notify('⚠️ Admin only!', 'warning');
    if (!confirm('Hapus laporan?')) return;
    
    try {
        const { error } = await supabaseClient
            .from('reports')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        const item = reports.get(id);
        if (item?.marker) {
            map.removeLayer(item.marker);
            item.marker.remove();
        }
        
        reports.delete(id);
        notify('✅ Laporan berhasil dihapus!', 'success');
        
        if (document.getElementById('modalList')?.classList.contains('show')) {
            await showReportList();
        }
        
        console.log(`✅ Report ${id} deleted successfully`);
        
    } catch (err) {
        console.error('Delete error:', err);
        notify('❌ Gagal menghapus laporan', 'error');
    }
}

// Map
function initMap() {
    map = L.map('map', { zoomControl: false, attributionControl: false })
        .setView([userLocation.lat, userLocation.lng], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    updateUserMarker();
}

function updateUserMarker() {
    if (userMarker) {
        userMarker.setLatLng([userLocation.lat, userLocation.lng]);
    } else {
        const userIcon = L.divIcon({
            className: 'user-location-marker',
            html: `
                <div class="user-marker-container">
                    <div class="user-marker-pulse"></div>
                    <div class="user-marker-inner">
                        <i class="material-icons">person_pin_circle</i>
                    </div>
                </div>
            `,
            iconSize: [36, 36],
            iconAnchor: [18, 36],
            popupAnchor: [0, -36]
        });
        
        userMarker = L.marker([userLocation.lat, userLocation.lng], {
            icon: userIcon,
            zIndexOffset: 1000
        }).addTo(map).bindPopup('<strong>📍 Lokasi Anda Saat Ini</strong>');
    }
}

function addMarker(report) {
    if (reports.has(report.id)) return;
    
    const color = CATEGORY_COLORS[report.kategori] || '#6B7280';
    
    const reportIcon = L.divIcon({
        className: 'report-marker',
        html: `
            <div class="report-marker-container" style="background:${color}">
                <div class="report-marker-icon">
                    ${getCategoryIcon(report.kategori)}
                </div>
            </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -28]
    });
    
    const marker = L.marker([report.latitude, report.longitude], {
        icon: reportIcon,
        zIndexOffset: 500
    }).addTo(map);
    
    marker.bindPopup(`
        <div style="padding:8px;min-width:180px;font-family:'Plus Jakarta Sans',sans-serif">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                <div style="width:10px;height:10px;background:${color};border-radius:2px"></div>
                <strong style="color:${color};font-size:12px">${report.kategori.toUpperCase()}</strong>
            </div>
            <p style="margin:8px 0;color:#333;font-size:13px;line-height:1.3">${report.deskripsi}</p>
            ${report.foto_url ? `<img src="${report.foto_url}" style="width:100%;border-radius:6px;margin:8px 0;max-height:120px;object-fit:cover"/>` : ''}
            <div style="font-size:11px;color:#666;margin-top:8px">
                ${report.pelapor_nama ? `<div>👤 ${report.pelapor_nama}</div>` : ''}
                <div>⏰ ${new Date(report.created_at).toLocaleString('id-ID')}</div>
            </div>
        </div>
    `);
    
    reports.set(report.id, { marker, data: report });
}

// Geolocation
function getUserLocation() {
    if (!navigator.geolocation) return;
    
    navigator.geolocation.watchPosition(
        pos => {
            userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            updateUserMarker();
            map.setView([userLocation.lat, userLocation.lng], 13);
            
            const el = document.getElementById('locationText');
            if (el) el.textContent = `${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}`;
        },
        err => console.warn('Geolocation error:', err),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );
}

function getCategoryIcon(kategori) {
    const icons = {
        banjir: '💧',
        kebakaran: '🔥',
        kecelakaan: '🚗',
        kriminal: '👮',
        macet: '🚦',
        lainnya: '📍'
    };
    return icons[kategori] || '📍';
}

function filterReports(kategori) {
    reports.forEach(({ marker, data }) => {
        if (!kategori || data.kategori === kategori) {
            if (!map.hasLayer(marker)) marker.addTo(map);
        } else {
            if (map.hasLayer(marker)) map.removeLayer(marker);
        }
    });
}

function searchReports(query) {
    query = query.toLowerCase().trim();
    
    reports.forEach(({ marker, data }) => {
        const text = `${data.kategori} ${data.deskripsi} ${data.pelapor_nama || ''}`.toLowerCase();
        
        if (!query || text.includes(query)) {
            if (!map.hasLayer(marker)) marker.addTo(map);
        } else {
            if (map.hasLayer(marker)) map.removeLayer(marker);
        }
    });
}

// Events
function setupEvents() {
    on('menuBtn', 'click', () => openModal('modalMenu'));
    on('profileBtn', 'click', () => {
        if (isAdmin) {
            if (confirm('Logout?')) logout();
        } else {
            openModal('modalLogin');
        }
    });
    
    on('searchInput', 'input', e => searchReports(e.target.value));
    on('searchInput', 'keypress', e => {
        if (e.key === 'Enter') searchReports(e.target.value);
    });
    
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', function() {
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            filterReports(this.dataset.filter || '');
        });
    });
    
    on('btnLapor', 'click', () => openModal('modalLapor'));
    on('formLapor', 'submit', handleSubmit);
    
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    if (uploadArea) uploadArea.addEventListener('click', () => fileInput?.click());
    if (fileInput) fileInput.addEventListener('change', e => handleFileUpload(e.target.files[0]));
    
    on('centerLocation', 'click', () => map?.setView([userLocation.lat, userLocation.lng], 15));
    on('btnEmergency', 'click', () => openModal('modalEmergency'));
    
    document.querySelectorAll('.status-option').forEach(opt => {
        opt.addEventListener('click', function() {
            document.querySelectorAll('.status-option').forEach(o => o.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    on('loginForm', 'submit', handleLogin);
    on('pwaInstallBanner', 'click', installPWA);
    
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', e => {
            if (e.target === modal) closeModal(modal.id);
        });
    });
}

function on(id, event, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
}

// Form Handlers
async function handleSubmit(e) {
    e.preventDefault();
    
    const data = {
        kategori: getValue('kategoriSelect'),
        deskripsi: `${getValue('judulLaporan')} - ${getValue('deskripsiDetail')}`,
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        pelapor_nama: getValue('pelaporNama'),
        pelapor_kontak: getValue('pelaporKontak'),
        kontributor_status: document.querySelector('.status-option.active')?.dataset.status || 'relawan',
        foto_url: uploadedImageUrl,
        created_at: new Date().toISOString()
    };
    
    if (!data.kategori || !data.pelapor_nama || !data.pelapor_kontak) {
        return notify('⚠️ Lengkapi form!', 'warning');
    }
    
    await submitReport(data);
}

async function handleFileUpload(file) {
    if (!file) return;
    
    const preview = document.getElementById('imagePreview');
    const uploadArea = document.getElementById('uploadArea');
    
    const reader = new FileReader();
    reader.onload = e => {
        preview.innerHTML = `
            <img src="${e.target.result}" style="width:100%;border-radius:10px"/>
            <button type="button" class="remove-image-btn" onclick="removeImage()">
                <i class="material-icons">close</i>
            </button>
        `;
        preview.classList.remove('hidden');
        uploadArea.classList.add('hidden');
    };
    reader.readAsDataURL(file);
    
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CONFIG.CLOUDINARY_PRESET);
        
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CONFIG.CLOUDINARY_CLOUD}/image/upload`, {
            method: 'POST',
            body: formData
        });
        
        const data = await res.json();
        uploadedImageUrl = data.secure_url;
        notify('✅ Gambar terupload!', 'success');
    } catch (err) {
        console.error('Upload error:', err);
        notify('❌ Upload gagal', 'error');
    }
}

function removeImage() {
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('imagePreview').classList.add('hidden');
    document.getElementById('uploadArea').classList.remove('hidden');
    document.getElementById('fileInput').value = '';
    uploadedImageUrl = null;
}

// Report List
async function showReportList() {
    try {
        const { data } = await supabaseClient
            .from('reports')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
        
        const container = document.getElementById('reportListContainer');
        if (!container) return;
        
        container.innerHTML = data?.length 
            ? data.map(createReportCard).join('') 
            : '<p style="text-align:center;color:#666;padding:30px 20px;font-size:14px">Belum ada laporan</p>';
        
        container.querySelectorAll('.report-card').forEach((card, i) => {
            card.addEventListener('click', e => {
                if (e.target.closest('.delete-btn')) return;
                
                closeModal('modalList');
                const report = data[i];
                map.setView([report.latitude, report.longitude], 16);
                reports.get(report.id)?.marker.openPopup();
            });
        });
        
        container.querySelectorAll('.delete-btn').forEach((btn, i) => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                deleteReport(data[i].id);
            });
        });
        
        openModal('modalList');
    } catch (err) {
        console.error('List error:', err);
        notify('Gagal load list', 'error');
    }
}

function createReportCard(report) {
    const color = CATEGORY_COLORS[report.kategori] || '#6B7280';
    const date = new Date(report.created_at).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const statusBadge = report.kontributor_status === 'relawan'
        ? '<span class="status-badge relawan">🎖️ Relawan</span>'
        : '<span class="status-badge instansi">🏢 Instansi</span>';
    
    return `
        <div class="report-card">
            <div class="report-card-header" style="background:linear-gradient(135deg,${color}15,${color}05)">
                <div class="report-badge" style="background:${color}">${report.kategori.toUpperCase()}</div>
                <div class="report-time">⏰ ${date}</div>
                ${isAdmin ? `<button class="delete-btn" title="Hapus">🗑️</button>` : ''}
            </div>
            ${report.foto_url ? `<img src="${report.foto_url}" class="report-image" onerror="this.style.display='none'"/>` : ''}
            <div class="report-card-body">
                <h3 class="report-title">${report.deskripsi.split(' - ')[0] || 'Laporan'}</h3>
                <p class="report-desc">${report.deskripsi}</p>
                <div class="report-meta">
                    <div class="report-meta-item">
                        <i class="material-icons">person</i>
                        <span>${report.pelapor_nama || 'Anonim'}</span>
                    </div>
                    <div class="report-meta-item">${statusBadge}</div>
                </div>
            </div>
        </div>
    `;
}

// Statistics
async function showStatistics() {
    try {
        const { data } = await supabaseClient.from('reports').select('*');
        
        const categories = ['banjir', 'kebakaran', 'kecelakaan', 'kriminal', 'macet', 'lainnya'];
        
        const totals = {};
        categories.forEach(cat => totals[cat] = 0);
        
        data?.forEach(r => {
            const cat = r.kategori || 'lainnya';
            totals[cat]++;
        });
        
        const container = document.getElementById('statisticsCharts');
        if (!container) return;
        
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
        
        const total = Object.values(totals).reduce((a, b) => a + b, 0);
        
        container.innerHTML = `
            <h3 style="font-size:15px;font-weight:700;margin-bottom:14px;color:var(--accent-dark-red)">Total Laporan: ${total}</h3>
            <div class="stats-grid">
                ${categories.map(cat => `
                    <div class="stat-card" style="border-color:${CATEGORY_COLORS[cat]}">
                        <i class="material-icons" style="color:${CATEGORY_COLORS[cat]}">${categoryIcons[cat]}</i>
                        <div class="stat-number">${totals[cat]}</div>
                        <div class="stat-label">${categoryNames[cat]}</div>
                    </div>
                `).join('')}
            </div>
        `;
        
        openModal('modalStatistics');
    } catch (err) {
        console.error('Stats error:', err);
    }
}

// Settings Feature - NEW
function showSettings() {
    const container = document.getElementById('settingsContainer');
    if (!container) {
        // Create settings modal if not exists
        createSettingsModal();
        return;
    }
    
    const notifEnabled = localStorage.getItem('info24jam_notif') !== 'false';
    const soundEnabled = localStorage.getItem('info24jam_sound') !== 'false';
    const autoRefresh = localStorage.getItem('info24jam_refresh') !== 'false';
    
    container.innerHTML = `
        <div class="settings-section">
            <h4 style="font-size:13px;font-weight:700;color:var(--accent-dark-red);margin-bottom:12px;text-transform:uppercase;letter-spacing:0.5px">
                <i class="material-icons" style="vertical-align:middle;font-size:16px;margin-right:4px">notifications</i>
                Notifikasi
            </h4>
            <div class="setting-item">
                <div class="setting-info">
                    <div class="setting-name">Notifikasi Push</div>
                    <div class="setting-desc">Terima pemberitahuan laporan baru</div>
                </div>
                <label class="toggle-switch">
                    <input type="checkbox" id="toggleNotif" ${notifEnabled ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
            <div class="setting-item">
                <div class="setting-info">
                    <div class="setting-name">Suara Notifikasi</div>
                    <div class="setting-desc">Aktifkan suara untuk notifikasi</div>
                </div>
                <label class="toggle-switch">
                    <input type="checkbox" id="toggleSound" ${soundEnabled ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
        </div>
        
        <div class="settings-section">
            <h4 style="font-size:13px;font-weight:700;color:var(--accent-dark-red);margin-bottom:12px;text-transform:uppercase;letter-spacing:0.5px">
                <i class="material-icons" style="vertical-align:middle;font-size:16px;margin-right:4px">map</i>
                Peta
            </h4>
            <div class="setting-item">
                <div class="setting-info">
                    <div class="setting-name">Auto Refresh</div>
                    <div class="setting-desc">Perbarui laporan secara otomatis</div>
                </div>
                <label class="toggle-switch">
                    <input type="checkbox" id="toggleRefresh" ${autoRefresh ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
        </div>
        
        <div class="settings-section">
            <h4 style="font-size:13px;font-weight:700;color:var(--accent-dark-red);margin-bottom:12px;text-transform:uppercase;letter-spacing:0.5px">
                <i class="material-icons" style="vertical-align:middle;font-size:16px;margin-right:4px">storage</i>
                Data
            </h4>
            <button class="setting-button" onclick="clearCache()">
                <i class="material-icons">delete_sweep</i>
                <span>Hapus Cache</span>
            </button>
            <button class="setting-button" onclick="exportData()">
                <i class="material-icons">download</i>
                <span>Export Data</span>
            </button>
        </div>
        
        <div class="settings-section">
            <h4 style="font-size:13px;font-weight:700;color:var(--accent-dark-red);margin-bottom:12px;text-transform:uppercase;letter-spacing:0.5px">
                <i class="material-icons" style="vertical-align:middle;font-size:16px;margin-right:4px">info</i>
                Tentang
            </h4>
            <div class="about-info">
                <p><strong>Info 24 Jam</strong></p>
                <p>Versi 1.0.0</p>
                <p style="margin-top:8px;font-size:11px;color:#666;">Layanan Informasi Warga 24 Jam</p>
                <p style="font-size:11px;color:#666;">© 2024 Emydn Group</p>
            </div>
        </div>
    `;
    
    // Add event listeners
    const toggleNotif = document.getElementById('toggleNotif');
    const toggleSound = document.getElementById('toggleSound');
    const toggleRefresh = document.getElementById('toggleRefresh');
    
    if (toggleNotif) {
        toggleNotif.addEventListener('change', e => {
            localStorage.setItem('info24jam_notif', e.target.checked);
            notify(e.target.checked ? '✅ Notifikasi aktif' : '⚠️ Notifikasi nonaktif', 'info');
        });
    }
    
    if (toggleSound) {
        toggleSound.addEventListener('change', e => {
            localStorage.setItem('info24jam_sound', e.target.checked);
            notify(e.target.checked ? '🔊 Suara aktif' : '🔇 Suara nonaktif', 'info');
        });
    }
    
    if (toggleRefresh) {
        toggleRefresh.addEventListener('change', e => {
            localStorage.setItem('info24jam_refresh', e.target.checked);
            notify(e.target.checked ? '🔄 Auto refresh aktif' : '⏸️ Auto refresh nonaktif', 'info');
            if (e.target.checked) startAutoRefresh();
            else stopAutoRefresh();
        });
    }
    
    openModal('modalSettings');
}

function createSettingsModal() {
    const existingModal = document.getElementById('modalSettings');
    if (existingModal) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'modalSettings';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <button class="back-btn" onclick="closeModal('modalSettings')">
                    <i class="material-icons">arrow_back</i>
                </button>
                <div class="modal-title-group">
                    <div class="modal-title">Pengaturan</div>
                    <div class="modal-subtitle">SETTINGS</div>
                </div>
            </div>
            <div class="modal-body" id="settingsContainer"></div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Add necessary CSS
    const style = document.createElement('style');
    style.textContent = `
        .settings-section {
            margin-bottom: 24px;
            padding-bottom: 20px;
            border-bottom: 1px solid var(--border-cream);
        }
        .settings-section:last-child {
            border-bottom: none;
        }
        .setting-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            background: white;
            border: 1px solid var(--border-cream);
            border-radius: 10px;
            margin-bottom: 10px;
        }
        .setting-info {
            flex: 1;
        }
        .setting-name {
            font-size: 13px;
            font-weight: 600;
            color: var(--text-main);
            margin-bottom: 2px;
        }
        .setting-desc {
            font-size: 11px;
            color: var(--text-main);
            opacity: 0.6;
        }
        .toggle-switch {
            position: relative;
            display: inline-block;
            width: 44px;
            height: 24px;
            flex-shrink: 0;
        }
        .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        .toggle-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: .3s;
            border-radius: 24px;
        }
        .toggle-slider:before {
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: .3s;
            border-radius: 50%;
        }
        input:checked + .toggle-slider {
            background-color: var(--accent-dark-red);
        }
        input:checked + .toggle-slider:before {
            transform: translateX(20px);
        }
        .setting-button {
            width: 100%;
            padding: 12px;
            background: white;
            border: 1px solid var(--border-cream);
            border-radius: 10px;
            color: var(--accent-dark-red);
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 10px;
            transition: all 0.2s;
        }
        .setting-button:hover {
            background: var(--accent-red-soft);
            border-color: var(--accent-dark-red);
        }
        .setting-button i {
            font-size: 18px;
        }
        .about-info {
            background: white;
            border: 1px solid var(--border-cream);
            border-radius: 10px;
            padding: 14px;
            text-align: center;
        }
        .about-info p {
            margin: 4px 0;
            font-size: 12px;
            color: var(--text-main);
        }
    `;
    document.head.appendChild(style);
    
    showSettings();
}

function clearCache() {
    if (!confirm('Hapus semua cache aplikasi?')) return;
    
    localStorage.clear();
    notify('✅ Cache berhasil dihapus!', 'success');
    setTimeout(() => location.reload(), 1500);
}

async function exportData() {
    try {
        const { data } = await supabaseClient
            .from('reports')
            .select('*')
            .order('created_at', { ascending: false });
        
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `info24jam-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        notify('✅ Data berhasil di-export!', 'success');
    } catch (err) {
        console.error('Export error:', err);
        notify('❌ Export gagal', 'error');
    }
}

// News Feature - NEW
function showNews() {
    const container = document.getElementById('newsContainer');
    if (!container) {
        createNewsModal();
        return;
    }
    
    // Sample news data - bisa diganti dengan data real dari API
    const newsItems = [
        {
            id: 1,
            title: 'Peningkatan Layanan Info 24 Jam',
            content: 'Sistem pelaporan warga kini lebih cepat dan responsif dengan update terbaru.',
            category: 'Update',
            date: '2024-01-28',
            image: 'https://via.placeholder.com/400x200/700000/FFFFFF?text=Update+Sistem'
        },
        {
            id: 2,
            title: 'Tips Keselamatan saat Banjir',
            content: 'Hindari melintas di area banjir, matikan listrik, dan segera hubungi nomor darurat 112.',
            category: 'Edukasi',
            date: '2024-01-27',
            image: 'https://via.placeholder.com/400x200/3B82F6/FFFFFF?text=Safety+Tips'
        },
        {
            id: 3,
            title: 'Kolaborasi dengan Instansi Terkait',
            content: 'Info 24 Jam kini terintegrasi dengan Polisi, Pemadam, dan Dinas terkait.',
            category: 'Berita',
            date: '2024-01-26',
            image: 'https://via.placeholder.com/400x200/EF4444/FFFFFF?text=Collaboration'
        },
        {
            id: 4,
            title: 'Cara Membuat Laporan yang Baik',
            content: 'Sertakan foto, lokasi akurat, dan deskripsi detail untuk laporan yang efektif.',
            category: 'Tutorial',
            date: '2024-01-25',
            image: 'https://via.placeholder.com/400x200/FBBF24/FFFFFF?text=How+To'
        }
    ];
    
    container.innerHTML = newsItems.map(news => `
        <div class="news-card" onclick="showNewsDetail(${news.id})">
            <img src="${news.image}" class="news-image" alt="${news.title}">
            <div class="news-content">
                <div class="news-header">
                    <span class="news-category">${news.category}</span>
                    <span class="news-date">
                        <i class="material-icons">calendar_today</i>
                        ${new Date(news.date).toLocaleDateString('id-ID')}
                    </span>
                </div>
                <h3 class="news-title">${news.title}</h3>
                <p class="news-excerpt">${news.content}</p>
                <button class="news-read-more">
                    Baca Selengkapnya
                    <i class="material-icons">arrow_forward</i>
                </button>
            </div>
        </div>
    `).join('');
    
    openModal('modalNews');
}

function createNewsModal() {
    const existingModal = document.getElementById('modalNews');
    if (existingModal) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'modalNews';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <button class="back-btn" onclick="closeModal('modalNews')">
                    <i class="material-icons">arrow_back</i>
                </button>
                <div class="modal-title-group">
                    <div class="modal-title">Berita Terkini</div>
                    <div class="modal-subtitle">NEWS & UPDATES</div>
                </div>
            </div>
            <div class="modal-body" id="newsContainer"></div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Add CSS for news
    const style = document.createElement('style');
    style.textContent = `
        .news-card {
            background: white;
            border: 1px solid var(--border-cream);
            border-radius: 10px;
            margin-bottom: 16px;
            overflow: hidden;
            cursor: pointer;
            transition: all 0.2s;
        }
        .news-card:hover {
            border-color: var(--accent-dark-red);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(112, 0, 0, 0.1);
        }
        .news-image {
            width: 100%;
            height: 160px;
            object-fit: cover;
        }
        .news-content {
            padding: 14px;
        }
        .news-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .news-category {
            padding: 4px 10px;
            background: var(--accent-red-soft);
            color: var(--accent-dark-red);
            border-radius: 12px;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .news-date {
            font-size: 11px;
            color: var(--text-main);
            opacity: 0.6;
            display: flex;
            align-items: center;
            gap: 3px;
        }
        .news-date i {
            font-size: 12px;
        }
        .news-title {
            font-size: 14px;
            font-weight: 700;
            color: var(--accent-dark-red);
            margin-bottom: 8px;
            line-height: 1.3;
        }
        .news-excerpt {
            font-size: 12px;
            color: var(--text-main);
            line-height: 1.5;
            margin-bottom: 12px;
            opacity: 0.8;
        }
        .news-read-more {
            background: transparent;
            border: none;
            color: var(--accent-dark-red);
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 0;
        }
        .news-read-more i {
            font-size: 16px;
        }
    `;
    document.head.appendChild(style);
    
    showNews();
}

function showNewsDetail(newsId) {
    notify('📰 Detail berita segera hadir!', 'info');
}

// Help Feature - NEW
function showHelp() {
    const container = document.getElementById('helpContainer');
    if (!container) {
        createHelpModal();
        return;
    }
    
    container.innerHTML = `
        <div class="help-section">
            <div class="help-header">
                <i class="material-icons">live_help</i>
                <h3>Panduan Penggunaan</h3>
            </div>
            
            <div class="faq-item">
                <div class="faq-question" onclick="toggleFAQ(this)">
                    <span>Bagaimana cara membuat laporan?</span>
                    <i class="material-icons">expand_more</i>
                </div>
                <div class="faq-answer">
                    <p>1. Klik tombol <strong>"Lapor"</strong> di pojok kanan bawah</p>
                    <p>2. Isi form dengan data yang lengkap</p>
                    <p>3. Pilih kategori kejadian</p>
                    <p>4. Upload foto (opsional)</p>
                    <p>5. Klik <strong>"Kirim Laporan"</strong></p>
                </div>
            </div>
            
            <div class="faq-item">
                <div class="faq-question" onclick="toggleFAQ(this)">
                    <span>Apa yang harus dilakukan saat darurat?</span>
                    <i class="material-icons">expand_more</i>
                </div>
                <div class="faq-answer">
                    <p>Segera hubungi <strong>Nomor Darurat</strong>:</p>
                    <p>• 112 - Darurat Nasional</p>
                    <p>• 110 - Polisi</p>
                    <p>• 113 - Pemadam Kebakaran</p>
                    <p>• 118/119 - Ambulans</p>
                    <p>Klik tombol <strong>"DARURAT"</strong> untuk akses cepat</p>
                </div>
            </div>
            
            <div class="faq-item">
                <div class="faq-question" onclick="toggleFAQ(this)">
                    <span>Bagaimana cara melihat laporan di peta?</span>
                    <i class="material-icons">expand_more</i>
                </div>
                <div class="faq-answer">
                    <p>• Marker pada peta menunjukkan lokasi laporan</p>
                    <p>• Klik marker untuk melihat detail</p>
                    <p>• Gunakan filter di bagian atas untuk kategori tertentu</p>
                    <p>• Gunakan search untuk mencari laporan spesifik</p>
                </div>
            </div>
            
            <div class="faq-item">
                <div class="faq-question" onclick="toggleFAQ(this)">
                    <span>Apakah laporan saya akan dipantau?</span>
                    <i class="material-icons">expand_more</i>
                </div>
                <div class="faq-answer">
                    <p>Ya! Semua laporan akan:</p>
                    <p>• Terlihat secara real-time di peta</p>
                    <p>• Dapat dilihat oleh warga dan instansi terkait</p>
                    <p>• Membantu respons cepat dari petugas</p>
                </div>
            </div>
            
            <div class="faq-item">
                <div class="faq-question" onclick="toggleFAQ(this)">
                    <span>Bagaimana cara install aplikasi?</span>
                    <i class="material-icons">expand_more</i>
                </div>
                <div class="faq-answer">
                    <p>• Klik tombol <strong>"Instal Aplikasi"</strong> di pojok kiri bawah</p>
                    <p>• Aplikasi dapat diakses offline setelah install</p>
                    <p>• Notifikasi akan muncul untuk laporan penting</p>
                </div>
            </div>
        </div>
        
        <div class="help-section">
            <div class="help-header">
                <i class="material-icons">contact_support</i>
                <h3>Butuh Bantuan Lain?</h3>
            </div>
            
            <div class="contact-options">
                <a href="tel:112" class="contact-option">
                    <i class="material-icons">phone</i>
                    <div>
                        <div class="contact-title">Darurat</div>
                        <div class="contact-detail">112</div>
                    </div>
                </a>
                
                <a href="mailto:support@info24jam.com" class="contact-option">
                    <i class="material-icons">email</i>
                    <div>
                        <div class="contact-title">Email</div>
                        <div class="contact-detail">support@info24jam.com</div>
                    </div>
                </a>
                
                <a href="https://wa.me/6281234567890" class="contact-option" target="_blank">
                    <i class="material-icons">chat</i>
                    <div>
                        <div class="contact-title">WhatsApp</div>
                        <div class="contact-detail">+62 812-3456-7890</div>
                    </div>
                </a>
            </div>
        </div>
    `;
    
    openModal('modalHelp');
}

function createHelpModal() {
    const existingModal = document.getElementById('modalHelp');
    if (existingModal) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'modalHelp';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <button class="back-btn" onclick="closeModal('modalHelp')">
                    <i class="material-icons">arrow_back</i>
                </button>
                <div class="modal-title-group">
                    <div class="modal-title">Bantuan</div>
                    <div class="modal-subtitle">HELP & SUPPORT</div>
                </div>
            </div>
            <div class="modal-body" id="helpContainer"></div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Add CSS
    const style = document.createElement('style');
    style.textContent = `
        .help-section {
            margin-bottom: 24px;
            padding-bottom: 20px;
            border-bottom: 1px solid var(--border-cream);
        }
        .help-section:last-child {
            border-bottom: none;
        }
        .help-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 16px;
        }
        .help-header i {
            font-size: 24px;
            color: var(--accent-dark-red);
        }
        .help-header h3 {
            font-size: 15px;
            font-weight: 700;
            color: var(--accent-dark-red);
        }
        .faq-item {
            background: white;
            border: 1px solid var(--border-cream);
            border-radius: 10px;
            margin-bottom: 10px;
            overflow: hidden;
        }
        .faq-question {
            padding: 12px 14px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            color: var(--accent-dark-red);
            transition: background 0.2s;
        }
        .faq-question:hover {
            background: var(--accent-red-soft);
        }
        .faq-question i {
            font-size: 20px;
            transition: transform 0.3s;
        }
        .faq-item.active .faq-question i {
            transform: rotate(180deg);
        }
        .faq-answer {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease;
            background: var(--cream-light);
        }
        .faq-item.active .faq-answer {
            max-height: 500px;
            padding: 12px 14px;
            border-top: 1px solid var(--border-cream);
        }
        .faq-answer p {
            margin: 6px 0;
            font-size: 12px;
            color: var(--text-main);
            line-height: 1.5;
        }
        .contact-options {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .contact-option {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            background: white;
            border: 1px solid var(--border-cream);
            border-radius: 10px;
            text-decoration: none;
            color: var(--text-main);
            transition: all 0.2s;
        }
        .contact-option:hover {
            border-color: var(--accent-dark-red);
            background: var(--accent-red-soft);
        }
        .contact-option i {
            font-size: 24px;
            color: var(--accent-dark-red);
        }
        .contact-title {
            font-size: 11px;
            font-weight: 600;
            color: var(--accent-dark-red);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .contact-detail {
            font-size: 13px;
            font-weight: 600;
            color: var(--text-main);
        }
    `;
    document.head.appendChild(style);
    
    showHelp();
}

function toggleFAQ(element) {
    const faqItem = element.closest('.faq-item');
    const isActive = faqItem.classList.contains('active');
    
    // Close all FAQs
    document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Toggle clicked FAQ
    if (!isActive) {
        faqItem.classList.add('active');
    }
}

// Auto Refresh - NEW
let autoRefreshInterval = null;

function startAutoRefresh() {
    if (autoRefreshInterval) return;
    
    autoRefreshInterval = setInterval(async () => {
        console.log('🔄 Auto refreshing...');
        await loadReports();
    }, 30000); // Refresh every 30 seconds
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// Login/Admin
async function handleLogin(e) {
    e.preventDefault();
    
    const username = getValue('loginUsername');
    const password = getValue('loginPassword');
    
    if (username === 'admin' && password === 'admin123') {
        isAdmin = true;
        localStorage.setItem('info24jam_admin', 'true');
        closeModal('modalLogin');
        notify('✅ Welcome Admin!', 'success');
        updateAdminUI();
    } else {
        notify('❌ Login gagal!', 'error');
    }
}

function logout() {
    isAdmin = false;
    localStorage.removeItem('info24jam_admin');
    updateAdminUI();
    notify('✅ Logout', 'success');
}

function checkAdmin() {
    if (localStorage.getItem('info24jam_admin') === 'true') {
        isAdmin = true;
        updateAdminUI();
    }
    
    // Start auto refresh if enabled
    if (localStorage.getItem('info24jam_refresh') !== 'false') {
        startAutoRefresh();
    }
}

function updateAdminUI() {
    const btn = document.getElementById('profileBtn');
    if (btn) {
        btn.style.background = isAdmin ? 'var(--accent-red-soft)' : 'transparent';
        btn.title = isAdmin ? 'Logout' : 'Login Admin';
    }
}

// PWA
function setupPWA() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(() => console.log('✅ SW registered'))
            .catch(err => console.log('SW error:', err));
    }
    
    window.addEventListener('beforeinstallprompt', e => {
        e.preventDefault();
        deferredPrompt = e;
        document.getElementById('pwaInstallBanner').style.display = 'flex';
    });
    
    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        document.getElementById('pwaInstallBanner').style.display = 'none';
        notify('✅ Aplikasi berhasil diinstall!', 'success');
    });
    
    setTimeout(() => {
        const installBtn = document.getElementById('pwaInstallBanner');
        if (installBtn.style.display !== 'none') {
            installBtn.style.display = 'flex';
        }
    }, 1000);
}

async function installPWA() {
    if (!deferredPrompt) {
        return notify('Aplikasi sudah terinstall atau tidak dapat diinstall di browser ini', 'info');
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
        deferredPrompt = null;
        document.getElementById('pwaInstallBanner').style.display = 'none';
    }
}

// UI Helpers
function notify(message, type = 'info') {
    const notif = document.createElement('div');
    notif.className = `notification notification-${type}`;
    
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    
    notif.innerHTML = `
        <div class="notification-icon">${icons[type] || icons.info}</div>
        <div class="notification-message">${message}</div>
    `;
    
    document.body.appendChild(notif);
    setTimeout(() => notif.classList.add('show'), 10);
    setTimeout(() => {
        notif.classList.remove('show');
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
        
        if (id === 'modalLapor') {
            document.getElementById('formLapor')?.reset();
            removeImage();
        }
    }
}

function getValue(id) {
    return document.getElementById(id)?.value || '';
}

// Update menu click handlers
window.showReportList = showReportList;
window.showStatistics = showStatistics;
window.showSettings = showSettings;
window.showNews = showNews;
window.showHelp = showHelp;
window.toggleFAQ = toggleFAQ;
window.clearCache = clearCache;
window.exportData = exportData;
window.openModal = openModal;
window.closeModal = closeModal;
window.removeImage = removeImage;

// Init on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}