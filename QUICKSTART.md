# 🚀 Quick Start Guide - Info 24 Jam

Panduan tercepat untuk membuat aplikasi berjalan dalam 10 menit!

---

## ⚡ 3-Step Setup (Tercepat!)

### Step 1️⃣: Buat Supabase Project (3 menit)
```
1. Buka https://supabase.com → Sign up
2. Create New Project → Name: "info24jam"
3. Tunggu project selesai
4. Buka SQL Editor → Paste isi database.sql → Run
5. Buka Database → Replication → Enable reports table (toggle INSERT, UPDATE, DELETE)
6. Buka Settings → API → Copy Project URL dan anon key
```

**Simpan di notepad:**
```
SUPABASE_URL = https://xxxxx.supabase.co
SUPABASE_KEY = eyJhbGc...
```

---

### Step 2️⃣: Konfigurasi Cloudinary (3 menit)
```
1. Buka https://cloudinary.com → Sign up
2. Dashboard → Settings → Upload
3. Klik Add upload preset
4. Name: info24jam
5. PENTING: Unsigned = ON ✅
6. Save
7. Copy Cloud name dari dashboard
```

**Simpan di notepad:**
```
CLOUDINARY_CLOUD = dxxxxx
CLOUDINARY_PRESET = info24jam
```

---

### Step 3️⃣: Konfigurasi Aplikasi (2 menit)
```
1. Buka index.html di browser
2. Klik ⚙️ Pengaturan
3. Isi 4 field:
   - URL Supabase (dari Step 1)
   - Supabase Key (dari Step 1)
   - Cloud Name (dari Step 2)
   - Upload Preset: info24jam
4. Klik 💾 Simpan
5. DONE! 🎉
```

---

## 🧪 Instant Test (2 menit)
```
1. Klik 📢 Lapor Darurat
2. Kategori: Pilih salah satu (misal Kebakaran)
3. Deskripsi: "Test laporan"
4. Klik 📤 Kirim
5. Lihat marker muncul di peta ✨
```

---

## 📁 File Structure
```
info24jam/
├── index.html       ← Buka ini
├── app.js           ← Logic
├── style.css        ← Design
├── sw.js            ← Offline support
├── manifest.json    ← PWA settings
├── utils.js         ← Optional helpers
└── README.md        ← Full docs
```

---

## 🔗 All Files in One Place
```
✅ index.html        - Main HTML
✅ app.js            - Application logic
✅ style.css         - Styling
✅ sw.js             - Service Worker
✅ manifest.json     - PWA manifest
✅ utils.js          - Optional utilities
✅ database.sql      - Supabase schema
✅ README.md         - Full documentation
✅ SETUP.html        - Visual guide
✅ CHECKLIST.md      - Implementation checklist
✅ .env.example      - Configuration template
✅ package.json      - NPM config
```

---

## ❓ Troubleshoot

### "Map tidak muncul"
→ Clear browser cache & refresh (Ctrl+Shift+Delete)

### "Upload error"
→ Cek Upload Preset di Cloudinary: Unsigned = ON

### "Realtime tidak update"
→ Pastikan di Supabase: Database → Replication → reports enabled

### "Geolocation tidak jalan"
→ Pastikan browser permission untuk location aktif

---

## 📱 Install PWA (Bonus!)

**Android:**
- Open Chrome → Menu (⋮) → Install app

**iOS:**
- Open Safari → Share → Add to Home Screen

---

## 🚀 Deploy (Optional)

**Vercel (1 command):**
```bash
npm i -g vercel
vercel
```

**Netlify:**
```bash
npm i -g netlify-cli
netlify deploy --prod --dir=.
```

---

## 📖 Full Docs
Baca `README.md` untuk dokumentasi lengkap.

---

**That's it! 🎉 Aplikasi sudah siap digunakan!**

Untuk fitur advanced, lihat `utils.js` dan `README.md`.
