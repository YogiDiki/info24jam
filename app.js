/* Info 24 Jam - Complete App.js v3.0 */

const CONFIG = {
    SUPABASE_URL: 'https://brdyvgmnidzxrwidpzqm.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZHl2Z21uaWR6eHJ3aWRwenFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5NjI0MjgsImV4cCI6MjA4NDUzODQyOH0.83XgYx8_94fnVbPd0N7q9FAfPFUTjJcliDOzTGNzfRQ',
    CLOUDINARY_CLOUD: 'dj1f8hjcj',
    CLOUDINARY_PRESET: 'laporan_warga'
};

// Dummy images for each category (using Unsplash)
const DUMMY_IMAGES = {
    banjir: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800&q=80',
    kebakaran: 'https://images.unsplash.com/photo-1525771569145-2ab408f2aa84?w=800&q=80',
    kecelakaan: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&q=80',
    kriminal: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800&q=80',
    macet: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800&q=80'
};

let map, userMarker, supabaseClient;
let userLocation = { lat: -6.2088, lng: 106.8456 };
let currentReports = new Map();
let appInitialized = false;
let isAdmin = false;
let deferredPrompt = null;

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
        
        await loadReports();
    } catch (error) {
        console.error('❌ Submit error:', error);
        alert('❌ Gagal mengirim laporan');
    }
}

// Admin: Delete Report
async function deleteReport(reportId) {
    if (!isAdmin) {
        alert('⚠️ Hanya admin yang bisa menghapus laporan!');
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
        
        const reportItem = currentReports.get(reportId);
        if (reportItem && map) {
            map.removeLayer(reportItem.marker);
        }
        currentReports.delete(reportId);
        
        alert('✅ Laporan berhasil dihapus!');
        
        const modalList = document.getElementById('modalList');
        if (modalList && modalList.classList.contains('show')) {
            await showReportList();
        }
    } catch (error) {
        console.error('❌ Delete error:', error);
        alert('❌ Gagal menghapus laporan');
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
    
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', () => fileInput.click());
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
    }
}

async function handleSubmit(e) {
    e.preventDefault();
    
    const judul = document.getElementById('judulLaporan')?.value;
    const kategori = document.getElementById('kategoriSelect')?.value;
    const deskripsi = document.getElementById('deskripsiDetail')?.value;
    const pelaporNama = document.getElementById('pelaporNama')?.value;
    const pelaporKontak = document.getElementById('pelaporKontak')?.value;
    
    if (!judul || !kategori || !deskripsi || !pelaporNama || !pelaporKontak) {
        alert('⚠️ Semua field harus diisi!');
        return;
    }
    
    const fotoUrl = DUMMY_IMAGES[kategori] || null;
    
    const reportData = {
        kategori,
        deskripsi: `${judul} - ${deskripsi}`,
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        pelapor_nama: pelaporNama,
        pelapor_kontak: pelaporKontak,
        foto_url: fotoUrl,
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
        alert('Gagal memuat daftar laporan');
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
    
    div.innerHTML = `
        <div class="report-card-header" style="background: linear-gradient(135deg, ${color}22, ${color}11);">
            <div class="report-badge" style="background: ${color};">${report.kategori.toUpperCase()}</div>
            <div class="report-time">⏰ ${dateStr}</div>
            ${isAdmin ? `<button class="delete-btn" onclick="deleteReport(${report.id})" title="Hapus Laporan">🗑️</button>` : ''}
        </div>
        ${report.foto_url ? `<img src="${report.foto_url}" class="report-image" alt="${report.kategori}" />` : ''}
        <div class="report-card-body">
            <h3 class="report-title">${report.deskripsi.split(' - ')[0] || 'Laporan'}</h3>
            <p class="report-desc">${report.deskripsi}</p>
            <div class="report-meta">
                <div class="report-meta-item">
                    <i class="material-icons">person</i>
                    <span>${report.pelapor_nama || 'Anonim'}</span>
                </div>
                <div class="report-meta-item">
                    <i class="material-icons">location_on</i>
                    <span>${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}</span>
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
        alert('⚠️ Username dan password harus diisi!');
        return;
    }
    
    if (username === 'admin' && password === 'admin123') {
        isAdmin = true;
        localStorage.setItem('info24jam_admin', 'true');
        
        closeLoginModal();
        alert('✅ Login berhasil! Selamat datang Admin.');
        
        updateAdminUI();
    } else {
        alert('❌ Username atau password salah!');
    }
}

function logout() {
    isAdmin = false;
    localStorage.removeItem('info24jam_admin');
    updateAdminUI();
    alert('✅ Logout berhasil');
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
        alert('Aplikasi sudah terinstall atau tidak support PWA');
        return;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`Install: ${outcome}`);
    deferredPrompt = null;
}

// Close modals on outside click
document.addEventListener('click', (e) => {
    const modals = ['modalLapor', 'modalList', 'modalEmergency', 'modalLogin', 'modalMenu'];
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