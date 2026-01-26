        /* Info 24 Jam - Optimized App.js dengan modifikasi PWA */

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
                // 1. Hapus dari database
                const { error } = await supabaseClient
                    .from('reports')
                    .delete()
                    .eq('id', id);
                
                if (error) throw error;
                
                // 2. Hapus dari map
                const item = reports.get(id);
                if (item?.marker) {
                    map.removeLayer(item.marker);
                    item.marker.remove();
                }
                
                // 3. Hapus dari cache
                reports.delete(id);
                
                notify('✅ Laporan berhasil dihapus!', 'success');
                
                // 4. Refresh tampilan jika modal list terbuka
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
                // Buat custom icon untuk user
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
            
            // Buat icon yang berbeda untuk laporan
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

        // Helper untuk icon kategori
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
            // Menu & Profile
            on('menuBtn', 'click', () => openModal('modalMenu'));
            on('profileBtn', 'click', () => {
                if (isAdmin) {
                    if (confirm('Logout?')) logout();
                } else {
                    openModal('modalLogin');
                }
            });
            
            // Search
            on('searchInput', 'input', e => searchReports(e.target.value));
            on('searchInput', 'keypress', e => {
                if (e.key === 'Enter') searchReports(e.target.value);
            });
            
            // Filter chips
            document.querySelectorAll('.filter-chip').forEach(chip => {
                chip.addEventListener('click', function() {
                    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                    this.classList.add('active');
                    filterReports(this.dataset.filter || '');
                });
            });
            
            // Lapor form
            on('btnLapor', 'click', () => openModal('modalLapor'));
            on('formLapor', 'submit', handleSubmit);
            
            // File upload
            const uploadArea = document.getElementById('uploadArea');
            const fileInput = document.getElementById('fileInput');
            if (uploadArea) uploadArea.addEventListener('click', () => fileInput?.click());
            if (fileInput) fileInput.addEventListener('change', e => handleFileUpload(e.target.files[0]));
            
            // Map controls
            on('centerLocation', 'click', () => map?.setView([userLocation.lat, userLocation.lng], 15));
            
            // Emergency
            on('btnEmergency', 'click', () => openModal('modalEmergency'));
            
            // Status toggle
            document.querySelectorAll('.status-option').forEach(opt => {
                opt.addEventListener('click', function() {
                    document.querySelectorAll('.status-option').forEach(o => o.classList.remove('active'));
                    this.classList.add('active');
                });
            });
            
            // Login
            on('loginForm', 'submit', handleLogin);
            
            // PWA Install - PERMANENT SHOW
            on('pwaInstallBanner', 'click', installPWA);
            
            // Close modals on backdrop click
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
            
            // Show preview
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
            
            // Upload to Cloudinary
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
                
                // Add click handlers
                container.querySelectorAll('.report-card').forEach((card, i) => {
                    card.addEventListener('click', e => {
                        if (e.target.closest('.delete-btn')) return;
                        
                        closeModal('modalList');
                        const report = data[i];
                        map.setView([report.latitude, report.longitude], 16);
                        reports.get(report.id)?.marker.openPopup();
                    });
                });
                
                // Add delete handlers
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
                
                // Calculate totals
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
        }

        function updateAdminUI() {
            const btn = document.getElementById('profileBtn');
            if (btn) {
                btn.style.background = isAdmin ? 'var(--accent-red-soft)' : 'transparent';
                btn.title = isAdmin ? 'Logout' : 'Login Admin';
            }
        }

        // PWA - MODIFIED TO ALWAYS SHOW INSTALL BUTTON
        function setupPWA() {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js')
                    .then(() => console.log('✅ SW registered'))
                    .catch(err => console.log('SW error:', err));
            }
            
            window.addEventListener('beforeinstallprompt', e => {
                e.preventDefault();
                deferredPrompt = e;
                // Always show the install button
                document.getElementById('pwaInstallBanner').style.display = 'flex';
            });
            
            window.addEventListener('appinstalled', () => {
                deferredPrompt = null;
                // Hide after install
                document.getElementById('pwaInstallBanner').style.display = 'none';
                notify('✅ Aplikasi berhasil diinstall!', 'success');
            });
            
            // Always show install button, even if PWA is not installable
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
                
                // Reset form if it's lapor modal
                if (id === 'modalLapor') {
                    document.getElementById('formLapor')?.reset();
                    removeImage();
                }
            }
        }

        function getValue(id) {
            return document.getElementById(id)?.value || '';
        }

        // Init on load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }