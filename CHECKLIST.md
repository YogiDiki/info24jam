# ✅ Info 24 Jam - Implementation Checklist

## 📋 Pre-Setup
- [ ] Baca `README.md` untuk overview
- [ ] Buka `SETUP.html` di browser untuk panduan visual
- [ ] Siapkan accounts (Supabase, Cloudinary)

---

## 🔐 Supabase Setup
- [ ] Buat project di supabase.com
- [ ] Pilih region: Indonesia (Jakarta)
- [ ] Tunggu project selesai di-setup (~1-2 menit)
- [ ] Buka **SQL Editor**
- [ ] Copy isi dari `database.sql` ke SQL Editor
- [ ] Jalankan (Run/Execute)
- [ ] Buka **Database → Replication**
- [ ] Verify tabel `reports` ada di `supabase_realtime` publications
- [ ] Toggle semua checkbox (INSERT, UPDATE, DELETE) untuk `reports` ✅
- [ ] Buka **Settings → API**
- [ ] **Copy Project URL**: `https://xxxxx.supabase.co`
- [ ] **Copy anon public key**: `eyJhbGc...`
- [ ] Simpan di tempat aman

---

## 🖼️ Cloudinary Setup
- [ ] Sign up di cloudinary.com
- [ ] Verifikasi email
- [ ] Login ke dashboard
- [ ] Buka **Settings → Upload**
- [ ] Scroll ke "Upload presets"
- [ ] Klik **Add upload preset**
- [ ] Isi form:
  - Name: `info24jam`
  - Unsigned: ✅ **ENABLE** (PENTING!)
  - Folder: `info24jam/reports`
  - Transformation → Quality: `70`
  - Transformation → Format: `webp`
- [ ] Klik **Save**
- [ ] Copy **Cloud name** dari dashboard utama
- [ ] Simpan di tempat aman

---

## 💻 App Configuration
- [ ] Buka `index.html` di browser
- [ ] Klik tombol ⚙️ **"Pengaturan"**
- [ ] Isi 4 field:
  1. **URL Supabase**: Paste dari langkah Supabase
  2. **Supabase Anon Key**: Paste anon key
  3. **Cloudinary Cloud Name**: Paste cloud name
  4. **Cloudinary Upload Preset**: `info24jam`
- [ ] Klik **💾 Simpan**
- [ ] Verify localStorage: Buka DevTools (F12) → Application → Local Storage

---

## 🧪 Testing Aplikasi
- [ ] Buka aplikasi di browser
- [ ] Verify:
  - [ ] Peta terlihat (Leaflet + OpenStreetMap)
  - [ ] Lokasi otomatis update (blue dot di peta)
  - [ ] Header "Info 24 Jam by Emydn Group" terlihat
  - [ ] Tombol "📢 Lapor Darurat" melayang di kanan bawah
- [ ] Click tombol **"📢 Lapor Darurat"**
  - [ ] Modal form muncul
  - [ ] Lokasi GPS sudah terisi (hijau checkmark ✅)
  - [ ] Dropdown kategori berfungsi
  - [ ] Upload area responsif ke drag-drop
- [ ] Buat laporan test:
  - [ ] Kategori: Pilih salah satu (misal "Kebakaran")
  - [ ] Deskripsi: Type "Test laporan"
  - [ ] Foto: Skip (opsional)
  - [ ] Klik **"📤 Kirim Laporan"**
- [ ] Verify hasil:
  - [ ] Marker muncul di peta dengan warna kategori
  - [ ] Modal tertutup otomatis
  - [ ] Alert "Laporan berhasil dikirim"
- [ ] Click marker di peta:
  - [ ] Popup info laporan keluar
  - [ ] Tombol "Lihat Detail" berfungsi
  - [ ] Modal info menampilkan detail lengkap
  - [ ] Tombol delete berfungsi

---

## 📱 PWA Testing
- [ ] Buka DevTools (F12) → Application
- [ ] Verify Service Worker registered
- [ ] Verify manifest.json ter-load
- [ ] Android: Open menu (⋮) → "Install app"
- [ ] iOS: Tap share → "Add to Home Screen"
- [ ] Test offline:
  - [ ] Open DevTools → Network
  - [ ] Checkbox "Offline"
  - [ ] App masih bisa diakses (cache berfungsi)
  - [ ] Marker dan map masih terlihat

---

## 🚀 Deployment
- [ ] Choose deployment platform:
  - [ ] Vercel (recommended): `vercel deploy`
  - [ ] Netlify: `netlify deploy --prod`
  - [ ] Manual hosting: Upload semua file
- [ ] Verify HTTPS aktif (wajib untuk PWA & Geolocation)
- [ ] Test di production URL
- [ ] Test Realtime: Buka 2 tab browser, buat laporan di 1 tab
  - [ ] Laporan muncul di tab 2 tanpa refresh ✨

---

## 📸 Cloudinary Upload Testing (Optional)
- [ ] Buka form lapor
- [ ] Upload foto:
  - [ ] Drag & drop
  - [ ] Atau click upload area
- [ ] Buat laporan dengan foto
- [ ] Verify:
  - [ ] Upload progress working
  - [ ] Foto berhasil di-upload ke Cloudinary
  - [ ] Foto terlihat di detail laporan
  - [ ] Format webp/jpg (compressed)

---

## 🔍 Security Checklist
- [ ] ✅ Hanya anon key di frontend (BUKAN API Secret)
- [ ] ✅ Upload Preset Unsigned di Cloudinary
- [ ] ✅ HTTPS active saat deploy
- [ ] ✅ RLS policies di-setup (opsional, untuk production)
- [ ] ✅ Cloudinary image transformation active (compress)

---

## 📊 Performance Optimization (Optional)
- [ ] Implement marker clustering (banyak marker)
- [ ] Limit reports query: `LIMIT 100`
- [ ] Add pagination untuk reports
- [ ] Optimize images di Cloudinary
- [ ] Enable gzip compression di hosting

---

## 📝 Documentation
- [ ] Update `README.md` dengan info deployment
- [ ] Create `CHANGELOG.md` untuk tracking updates
- [ ] Document custom modifications
- [ ] Add API docs jika ada custom backend

---

## 🎉 Final Checks
- [ ] Semua files sudah tersedia di folder
- [ ] Git repo initialized (opsional)
- [ ] License updated (README.md)
- [ ] Contact info jelas
- [ ] Ready untuk share dengan team!

---

## 🐛 Troubleshooting
Jika ada error, check checklist ini:

### Geolocation tidak jalan
- [ ] Website pakai HTTPS? ✅
- [ ] Browser permission untuk location? ✅
- [ ] GPS device aktif? ✅

### Realtime tidak update
- [ ] Supabase Realtime di-enable? ✅
- [ ] Check DevTools console untuk error
- [ ] Network tab → wss connection active? ✅

### Upload foto error
- [ ] Upload Preset Unsigned? ✅
- [ ] Cloud Name benar? ✅
- [ ] File size < 100MB? ✅

### Map tidak muncul
- [ ] Leaflet library ter-load? (check Network tab)
- [ ] OpenStreetMap accessible? ✅
- [ ] Clear cache & refresh

### Service Worker tidak register
- [ ] Website pakai HTTPS? ✅
- [ ] Console error? ✅

---

## 📞 Need Help?
Refer ke:
- `README.md` - Full documentation
- `SETUP.html` - Visual setup guide
- `database.sql` - Schema & queries
- Supabase Docs: https://supabase.com/docs
- Leaflet Docs: https://leafletjs.com/

---

**Status: ☐ Not Started | 🔄 In Progress | ✅ Complete**

Selamat! 🎉 Aplikasi siap digunakan!
