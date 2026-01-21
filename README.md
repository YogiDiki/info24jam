# 📱 Info 24 Jam - PWA Darurat Real-time
**Platform crowdsourcing untuk berbagi informasi darurat (banjir, kecelakaan, kebakaran, dll) secara real-time**

---

## 📋 Daftar Isi
1. [Fitur Utama](#fitur-utama)
2. [Tech Stack](#tech-stack)
3. [Setup Awal](#setup-awal)
4. [Konfigurasi Supabase](#konfigurasi-supabase)
5. [Konfigurasi Cloudinary](#konfigurasi-cloudinary)
6. [Deploy](#deploy)
7. [Tips & Troubleshooting](#tips--troubleshooting)

---

## ✨ Fitur Utama

✅ **Modern UI Mobile-First** - Desain responsif dengan Tailwind CSS  
✅ **Auto-Geolocation** - Peta otomatis ke lokasi pengguna saat dibuka  
✅ **Form Lapor Intuitif** - Kategori, deskripsi, upload foto otomatis  
✅ **Real-time Map** - Marker laporan muncul tanpa refresh (Supabase Realtime)  
✅ **Custom Markers** - Warna berbeda per kategori (🌊🔥🚗⚠️)  
✅ **PWA Ready** - Bisa di-install di HP, offline support  
✅ **Zero Cost** - Semua tools gratis/open-source  

---

## 🛠️ Tech Stack

### Frontend
- **HTML5** - Struktur semantik
- **Tailwind CSS** - Styling modern
- **Vanilla JavaScript** - Tanpa framework (Single Page App)

### Map & Geolocation
- **Leaflet.js** - Map library open-source
- **OpenStreetMap** - Map tiles gratis
- **Geolocation API** - GPS browser

### Backend & Database
- **Supabase** - PostgreSQL + Realtime (Gratis hingga 50MB/bulan)
- **Supabase Realtime** - WebSocket untuk update real-time

### Storage & CDN
- **Cloudinary** - Upload & serve gambar (Gratis 25GB/bulan)
- **Unsigned Upload Preset** - Upload dari browser tanpa API Key

### PWA
- **manifest.json** - App metadata untuk instalasi
- **Service Worker** - Offline support & caching

---

## 🚀 Setup Awal

### 1. Clone atau Download Repository
```bash
git clone <your-repo-url> info24jam
cd info24jam
```

### 2. Struktur Folder
```
info24jam/
├── index.html          # HTML utama
├── style.css           # Custom styles
├── app.js              # Logic aplikasi
├── sw.js               # Service Worker
├── manifest.json       # PWA manifest
├── README.md           # Dokumentasi (file ini)
├── assets/             # Folder untuk aset
└── icons/              # Folder untuk icon PWA
```

### 3. Buka di Browser
```bash
# Gunakan local server (HTTPS wajib untuk PWA)
npx http-server -c-1 --https

# Atau gunakan Python
python -m http.server 8000

# Atau gunakan Live Server di VSCode
```

---

## 🔐 Konfigurasi Supabase

### Step 1: Buat Project Supabase
1. Pergi ke [supabase.com](https://supabase.com)
2. Sign up atau login
3. Klik "New Project"
4. Isi project name: `info24jam`
5. Pilih region terdekat (Indonesia)
6. Tunggu project dibuat (1-2 menit)

### Step 2: Buat Tabel `reports`
1. Buka Dashboard Supabase
2. Klik **SQL Editor** → **New Query**
3. Paste SQL berikut:

```sql
-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kategori TEXT NOT NULL CHECK (kategori IN ('banjir', 'kebakaran', 'kecelakaan', 'kriminal', 'macet', 'lainnya')),
  deskripsi TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  foto_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index untuk performa
CREATE INDEX idx_reports_kategori ON reports(kategori);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE reports;
```

4. Klik **Run** / **Execute**

### Step 3: Enable Realtime
1. Buka **Database** → **Replication**
2. Di bawah "Publications", cari `supabase_realtime`
3. Pastikan tabel `reports` memiliki ✅ di semua kolom (INSERT, UPDATE, DELETE)
4. Jika tidak, klik toggle untuk enable

### Step 4: Ambil Credentials
1. Buka **Project Settings** → **API**
2. Copy **Project URL** (misal: `https://xxxxx.supabase.co`)
3. Copy **anon public** key (di bawah "Project API keys")

---

## 🖼️ Konfigurasi Cloudinary

### Step 1: Buat Account Cloudinary
1. Pergi ke [cloudinary.com](https://cloudinary.com)
2. Sign up (gratis)
3. Verifikasi email Anda
4. Login ke dashboard

### Step 2: Buat Upload Preset (PENTING!)
1. Buka **Settings** → **Upload**
2. Scroll ke bawah "Upload presets"
3. Klik **Add upload preset**
4. Isi:
   - **Name**: `info24jam` (atau nama lain)
   - **Unsigned**: ✅ **ENABLE** (penting! tanpa ini browser tidak bisa upload)
   - **Folder**: `info24jam/reports` (opsional)
   - **Transformation** (opsional, untuk kompresi):
     - **Quality**: 60-70 (kompresi otomatis)
     - **Format**: webp (format modern)
5. Klik **Save**

### Step 3: Ambil Cloud Name
1. Di halaman utama Dashboard, lihat "Cloud name"
2. Ini biasanya nama unik Anda (misal: `dxxxxx`)
3. Copy Cloud Name ini

---

## ⚙️ Konfigurasi Aplikasi

### 1. Buka Aplikasi di Browser
1. Jalankan server lokal (lihat [Setup Awal](#setup-awal))
2. Buka di browser: `https://localhost:8000` atau `http://localhost:8000`

### 2. Klik Tombol ⚙️ "Pengaturan"
Anda akan lihat form dengan 4 input:

#### Input 1: URL Supabase
```
https://xxxxx.supabase.co
```
Ganti `xxxxx` dengan project ID Anda

#### Input 2: Supabase Anon Key
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
Paste anon public key dari langkah sebelumnya

#### Input 3: Cloudinary Cloud Name
```
dxxxxx
```
Ganti dengan cloud name Anda

#### Input 4: Cloudinary Upload Preset
```
info24jam
```
Ganti dengan nama preset yang Anda buat

### 3. Klik "💾 Simpan"
Kredensial disimpan di localStorage browser (hanya di browser Anda, tidak di server).

### 4. Test
1. Klik tombol **"📢 Lapor Darurat"**
2. Isi form (kategori, deskripsi, optional foto)
3. Klik **"📤 Kirim Laporan"**
4. Jika berhasil, marker akan muncul di peta real-time

---

## 🌍 Deploy

### Option 1: Deploy ke Vercel (Recommended)
```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy
vercel

# 3. Follow instructions
```

### Option 2: Deploy ke Netlify
```bash
# 1. Install Netlify CLI
npm i -g netlify-cli

# 2. Deploy
netlify deploy --prod --dir=.
```

### Option 3: Deploy Manual ke Hosting
1. Upload semua file ke hosting (cPanel, Hostinger, dll)
2. Pastikan URL pakai HTTPS (wajib untuk PWA & Geolocation)
3. Buka di browser dan konfigurasi settings

---

## 📱 Install PWA di HP

### iOS (iPhone/iPad)
1. Buka aplikasi di Safari
2. Tap tombol **Share** (bagian bawah)
3. Pilih **"Add to Home Screen"**
4. Ketik nama aplikasi (misal: "Info 24 Jam")
5. Tap **"Add"**

### Android
1. Buka aplikasi di Chrome
2. Tap tombol menu (⋮) di kanan atas
3. Pilih **"Install app"** atau **"Add to Home Screen"**
4. Confirm

Aplikasi akan terinstall seperti app biasa, bisa offline support!

---

## 🔍 Database Schema

### Tabel: `reports`
```sql
id             | UUID        | Primary Key
kategori       | TEXT        | banjir | kebakaran | kecelakaan | kriminal | macet | lainnya
deskripsi      | TEXT        | Deskripsi detail laporan
latitude       | DECIMAL     | Koordinat lintang (-90 sampai 90)
longitude      | DECIMAL     | Koordinat bujur (-180 sampai 180)
foto_url       | TEXT        | URL gambar dari Cloudinary
created_at     | TIMESTAMP   | Waktu dibuat (default: NOW())
updated_at     | TIMESTAMP   | Waktu update (default: NOW())
```

---

## 🎨 Warna Marker per Kategori

| Kategori | Emoji | Warna | Hex |
|----------|-------|-------|-----|
| Banjir | 🌊 | Biru | #3B82F6 |
| Kebakaran | 🔥 | Merah | #EF4444 |
| Kecelakaan | 🚗 | Kuning | #FBBF24 |
| Kriminal | ⚠️ | Ungu | #8B5CF6 |
| Macet | 🚦 | Oranye | #F59E0B |
| Lainnya | ❓ | Abu-abu | #6B7280 |

---

## 🛡️ Security Tips

1. **Jangan gunakan API Secret di Frontend** - Hanya gunakan anon key
2. **Unsigned Upload Preset** - Wajib untuk Cloudinary
3. **HTTPS Wajib** - PWA & Geolocation tidak jalan di HTTP
4. **Row Level Security (RLS)** - Opsional, tapi recommended untuk production
5. **Kompres Gambar** - Gunakan Cloudinary transformation untuk hemat storage

---

## 🐛 Troubleshooting

### ❌ "Geolocation tidak jalan"
- Pastikan website pakai **HTTPS**
- Beri izin location ke browser
- Cek Settings → Privacy → Location

### ❌ "Realtime tidak update"
- Pastikan Realtime sudah di-enable di Supabase
- Check browser console (F12) untuk error
- Pastikan internet connection aktif

### ❌ "Upload foto error"
- Pastikan Upload Preset sudah **Unsigned**
- Check Cloudinary Cloud Name benar
- Cek ukuran file (max 100MB default)

### ❌ "Map tidak muncul"
- Pastikan Leaflet CSS & JS ter-load (cek Network tab di DevTools)
- Refresh halaman
- Clear browser cache (Ctrl+Shift+Delete)

### ❌ "Service Worker tidak register"
- Pastikan website pakai **HTTPS**
- Check console: `navigator.serviceWorker.getRegistrations()`

---

## 📈 Optimisasi & Best Practices

### Untuk Kompresi Gambar (Cloudinary)
Di Upload Preset, tambahkan transformasi:
- **Quality**: 60-70
- **Format**: webp
- **Max Width**: 1200px

Ini hemat storage & mempercepat load.

### Untuk Performa Map
- Gunakan clustering untuk marker banyak
- Batasi query: `LIMIT 100` laporan terakhir
- Implement pagination

### Untuk Offline Support
Service Worker sudah cache assets utama. Untuk offline form submission:
1. Store laporan di IndexedDB saat offline
2. Sync saat online kembali

---

## 📞 Support & Resources

- **Supabase Docs**: https://supabase.com/docs
- **Leaflet Docs**: https://leafletjs.com/
- **Cloudinary Docs**: https://cloudinary.com/documentation
- **PWA Docs**: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps
- **Tailwind CSS**: https://tailwindcss.com/docs

---

## 📄 License
MIT License - Gratis untuk personal & komersial

---

## 🙏 Credits
Dibuat dengan ❤️ untuk Emydn Group

**Happy Reporting! 📍🚨**
