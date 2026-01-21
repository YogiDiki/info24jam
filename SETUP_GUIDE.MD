# 🚀 Info 24 Jam - Setup Guide

Platform crowdsourcing darurat real-time untuk warga.

---

## 📋 **STRUKTUR FILE YANG DIPERLUKAN**

```
info24jam/
├── index.html          ✅ WAJIB
├── app.js             ✅ WAJIB
├── sw.js              ✅ WAJIB (Service Worker)
├── manifest.json      ✅ WAJIB (PWA Config)
├── database.sql       ✅ WAJIB (Setup Supabase)
├── icons/
│   ├── icon-192.png   ✅ WAJIB (PWA Icon)
│   └── icon-512.png   ✅ WAJIB (PWA Icon)
└── SETUP_GUIDE.md     📖 Panduan ini
```

### ❌ **FILE YANG BISA DIHAPUS:**
- `.env.example`
- `.gitignore`
- `00_READ_ME_FIRST.md`
- `INDEX.md`
- `LICENSE`
- `maxAttempts)`
- `QUICKSTART.md`
- `README.md`
- `START.md`
- `style.css` (sudah pakai Tailwind inline)
- `utils.js`
- Semua file markdown lainnya

---

## ⚙️ **LANGKAH 1: Setup Supabase**

### 1.1 Buat Project Supabase
1. Buka https://supabase.com
2. Klik **"New Project"**
3. Isi nama project: **info24jam**
4. Pilih region terdekat (Singapore/Jakarta)
5. Buat password database yang kuat

### 1.2 Jalankan Database Schema
1. Di Supabase Dashboard → **SQL Editor**
2. Copy paste isi file `database.sql`
3. Klik **"Run"**
4. Pastikan table `reports` dan `admins` terbuat

### 1.3 Enable Realtime
1. Di Supabase Dashboard → **Database** → **Replication**
2. Cari table `reports`
3. Aktifkan toggle **"Realtime"**

### 1.4 Copy Credentials
1. Di Supabase Dashboard → **Settings** → **API**
2. Copy **Project URL** (contoh: https://xxxxx.supabase.co)
3. Copy **anon public key** (panjang sekali, diawali `eyJh...`)

---

## 📸 **LANGKAH 2: Setup Cloudinary**

### 2.1 Buat Akun Cloudinary
1. Buka https://cloudinary.com
2. Sign up gratis (dapat 25GB storage)

### 2.2 Buat Upload Preset
1. Dashboard → **Settings** → **Upload**
2. Scroll ke **Upload presets**
3. Klik **"Add upload preset"**
4. Isi:
   - **Preset name**: `laporan_warga`
   - **Signing Mode**: **Unsigned** ⚠️ PENTING!
   - **Folder**: `info24jam` (opsional)
5. Klik **"Save"**

### 2.3 Copy Credentials
1. Dashboard → **Account Details**
2. Copy **Cloud name** (contoh: `dxxxxx`)
3. Copy **Upload preset name** yang tadi dibuat

---

## 🔧 **LANGKAH 3: Konfigurasi App**

### 3.1 Edit file `app.js`
Buka file `app.js` baris 9-14, isi dengan kredensial Anda:

```javascript
const CONFIG = {
    SUPABASE_URL: 'https://xxxxx.supabase.co',  // ← ISI
    SUPABASE_KEY: 'eyJhbGci....',              // ← ISI
    CLOUDINARY_CLOUD: 'dxxxxx',                // ← ISI
    CLOUDINARY_PRESET: 'laporan_warga'         // ← ISI
};
```

### 3.2 Ganti Password Admin
Di file `app.js` baris ~550, ganti password admin:

```javascript
if (email === 'admin@info24jam.com' && password === 'admin123') {
```

Ganti `admin123` dengan password kuat Anda!

---

## 🎨 **LANGKAH 4: Buat Icon PWA**

### 4.1 Buat Folder Icons
```bash
mkdir icons
```

### 4.2 Generate Icons
Gunakan tools online untuk generate PWA icons:
- https://www.pwabuilder.com/imageGenerator
- Upload logo/icon Anda
- Download hasil generate (icon-192.png dan icon-512.png)
- Taruh di folder `icons/`

**ATAU** gunakan placeholder:
- Download icon dari: https://via.placeholder.com/192
- Download icon dari: https://via.placeholder.com/512
- Rename jadi `icon-192.png` dan `icon-512.png`

---

## 🌐 **LANGKAH 5: Deploy ke Vercel**

### 5.1 Install Vercel CLI (Opsional)
```bash
npm install -g vercel
```

### 5.2 Deploy Manual (Via Web)
1. Buka https://vercel.com
2. Klik **"New Project"**
3. Import dari GitHub/Upload folder
4. Deploy!

### 5.3 Deploy Via CLI
```bash
cd info24jam
vercel --prod
```

---

## 🔐 **LANGKAH 6: Setup Admin & Auto-Delete**

### 6.1 Login Admin
1. Buka aplikasi yang sudah di-deploy
2. Klik icon **🔐** di pojok kanan atas
3. Login dengan:
   - Email: `admin@info24jam.com`
   - Password: (yang Anda set di app.js)

### 6.2 Setup Auto-Delete (7 Hari)

**Opsi A: Gunakan Cron Job Gratis**
1. Buka https://cron-job.org
2. Buat akun gratis
3. Tambah cron job baru:
   - **URL**: `https://your-app.vercel.app/api/cleanup` (coming soon)
   - **Schedule**: Daily at 00:00

**Opsi B: Manual Delete via SQL**
Jalankan query ini setiap minggu di Supabase SQL Editor:
```sql
DELETE FROM public.reports 
WHERE created_at < NOW() - INTERVAL '7 days';
```

**Opsi C: Edge Function (Recommended)**
Akan dijelaskan di dokumentasi lanjutan.

---

## ✅ **TESTING**

### 1. Test PWA Install
- Buka di Chrome Mobile
- Tunggu popup "Install Info 24 Jam"
- Klik Install
- Icon muncul di home screen

### 2. Test Lapor Darurat
- Klik tombol "📢 Lapor Darurat"
- Pilih kategori
- Isi deskripsi
- Upload foto (opsional)
- Kirim

### 3. Test Real-time
- Buka 2 tab/device berbeda
- Buat laporan di tab 1
- Cek muncul otomatis di tab 2 (tanpa refresh)

### 4. Test Admin
- Login sebagai admin
- Buka detail laporan
- Tombol 🗑️ Hapus muncul
- Logout → tombol hapus hilang

---

## 🎯 **FITUR LENGKAP**

✅ Real-time map dengan marker kategori  
✅ Legend/keterangan warna  
✅ List view dengan filter  
✅ Auto GPS location  
✅ Upload foto dengan preview  
✅ Toast notifications  
✅ **PWA - Install to Home Screen**  
✅ **Offline support**  
✅ **Admin authentication**  
✅ **Auto-delete laporan > 7 hari** (setup manual)  

---

## 🆘 **TROUBLESHOOTING**

### Laporan tidak muncul di peta
- Cek koneksi internet
- Cek kredensial Supabase sudah benar
- Buka Console (F12) → lihat error

### Upload foto gagal
- Cek kredensial Cloudinary sudah benar
- Pastikan Upload Preset mode = **Unsigned**
- Cek ukuran foto < 10MB

### PWA tidak bisa install
- Pastikan akses via HTTPS (bukan HTTP)
- Pastikan file `manifest.json` dan `sw.js` ada
- Pastikan icon 192x192 dan 512x512 ada

### Real-time tidak jalan
- Pastikan Realtime sudah diaktifkan di Supabase
- Cek table `reports` ada di Replication

---

## 📞 **KONTAK & SUPPORT**

Dibuat oleh: **Emydn Group**  
Email: admin@info24jam.com (ganti dengan email Anda)

---

## 📝 **LISENSI**

Open Source - Bebas digunakan dan dimodifikasi

---

**🎉 SELAMAT! Aplikasi Anda siap digunakan!**