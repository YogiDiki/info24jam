👋 # MULAI DARI SINI! - Info 24 Jam

**Selamat datang! Panduan ini akan membuat aplikasi Anda berjalan dalam 10 menit.**

---

## 🎯 APA ITU INFO 24 JAM?

**Info 24 Jam** adalah aplikasi PWA (Progressive Web App) untuk crowdsourcing informasi darurat real-time.

Warga bisa lapor:
- 🌊 Banjir
- 🔥 Kebakaran  
- 🚗 Kecelakaan
- ⚠️ Kriminal
- 🚦 Macet
- ❓ Kejadian lainnya

Semua dilacak di peta real-time dengan warna berbeda per kategori. ✨

---

## ⚡ QUICK START (10 MENIT!)

### Langkah 1️⃣: Setup Supabase (3 menit)

```
1. Klik: https://supabase.com
2. Sign up (gratis)
3. Create New Project
   - Name: "info24jam"
   - Region: Indonesia (Jakarta)
   - Password: asal-aman

4. Tunggu project selesai (1-2 menit)

5. Buka SQL Editor
6. Copy-paste isi file: database.sql
7. Klik RUN/Execute
8. Tunggu selesai

9. Buka: Database → Replication
10. Cek 'reports' table ada di list
11. Toggle: INSERT ✅ UPDATE ✅ DELETE ✅

12. Buka: Settings → API
13. Copy: Project URL (https://xxxxx.supabase.co)
14. Copy: anon public key (eyJhbGc...)

Simpan di notepad untuk langkah berikutnya!
```

### Langkah 2️⃣: Setup Cloudinary (3 menit)

```
1. Klik: https://cloudinary.com
2. Sign up (gratis, no CC needed)
3. Verify email

4. Buka: Settings → Upload
5. Scroll ke "Upload presets"
6. Klik: Add upload preset

7. Isi form:
   - Name: info24jam
   - Unsigned: ON ✅ (PENTING!)
   - Folder: info24jam/reports
   - Save

8. Kembali ke dashboard
9. Copy: Cloud name (dxxxxx)

Simpan untuk langkah berikutnya!
```

### Langkah 3️⃣: Configure App (2 menit)

```
1. Buka file: index.html (dengan browser)
2. Klik tombol: ⚙️ PENGATURAN (kanan atas)

3. Isi 4 form:
   
   [1] URL Supabase:
   → Paste: https://xxxxx.supabase.co
   
   [2] Supabase Anon Key:
   → Paste: eyJhbGc...
   
   [3] Cloudinary Cloud Name:
   → Paste: dxxxxx
   
   [4] Cloudinary Upload Preset:
   → Ketik: info24jam

4. Klik: 💾 SIMPAN

5. Modal akan close otomatis
   Kredensial sudah tersimpan di browser!
```

### Langkah 4️⃣: Test (2 menit)

```
1. Klik tombol: 📢 LAPOR DARURAT (merah, kanan bawah)
2. Form akan muncul

3. Isi form:
   - Kategori: Pilih salah satu (misal "Kebakaran")
   - Deskripsi: Ketik "Test laporan darurat"
   - Foto: Skip untuk sekarang (opsional)

4. Klik: 📤 KIRIM LAPORAN
5. Tunggu notifikasi "Laporan berhasil dikirim"

6. Lihat peta → Marker merah 🔥 akan muncul!
7. SELESAI! 🎉
```

---

## 🎓 DOKUMENTASI LENGKAP (Jika Ada Waktu)

Jika setup selesai, baca file ini dalam urutan:

| No | File | Waktu | Apa |
|----|------|-------|-----|
| 1 | **IMPORTANT.md** | 10 min | Jangan lupa ini! |
| 2 | **README.md** | 30 min | Full documentation |
| 3 | **CHECKLIST.md** | 20 min | Verify semua bekerja |
| 4 | **Code files** | Flex | Customization |

---

## ⚠️ JANGAN LUPA!

### 3 Hal Kritis:

1️⃣ **Supabase Realtime HARUS Enabled**
```
Lokasi: Database → Replication
Toggle: INSERT ✅ UPDATE ✅ DELETE ✅
```
Jika lupa → Marker tidak update real-time!

2️⃣ **Cloudinary Preset HARUS Unsigned**
```
Lokasi: Cloudinary → Settings → Upload → Presets
Unsigned: ✅ ON
```
Jika lupa → Upload foto akan error!

3️⃣ **Buka index.html (BUKAN di folder, di browser)**
```
❌ SALAH: Klik index.html file
✅ BENAR: Open dengan browser
```

---

## 🆘 ADA MASALAH?

### "Map tidak muncul"
→ Clear browser cache: Ctrl+Shift+Delete
→ Refresh halaman (F5)

### "Geolocation tidak jalan"
→ Beri izin GPS ke browser
→ Cek: Settings → Privacy → Location: ON
→ Coba di luar rumah (better GPS)

### "Upload foto error"
→ Check Cloudinary: Unsigned = ON
→ Coba file berbeda
→ Lihat Browser console: F12

### "Real-time tidak update"
→ Pastikan Supabase: Database → Replication enable
→ Refresh browser (F5)
→ Check internet connection

---

## 📚 FILE PENTING

Navigasi file:

```
START → index.html              (Main app, buka ini!)
      → IMPORTANT.md            (Don't miss!)
      → QUICKSTART.md           (10 min guide)
      → README.md               (Full docs)
      → CHECKLIST.md            (Verify setup)
      → database.sql            (Untuk Supabase)
      → app.js                  (Customize here)
      → style.css               (Design here)
```

File lengkap ada di folder!

---

## 🚀 SETELAH RUNNING

Sekarang aplikasi sudah berjalan! Anda bisa:

- ✅ **Lapor darurat** - Click 📢 button
- ✅ **Lihat laporan orang** - Click marker
- ✅ **Install PWA** - Seperti app asli
- ✅ **Offline mode** - Works tanpa internet
- ✅ **Share ke teman** - Send URL

---

## 📱 INSTALL DI PHONE

### iOS (iPhone/iPad):
```
1. Open di Safari browser
2. Tap tombol Share (bawah)
3. Pilih "Add to Home Screen"
4. Ketik nama app
5. Tap "Add"
→ App akan muncul di home screen!
```

### Android (Chrome):
```
1. Open di Chrome browser
2. Tap menu (⋮) kanan atas
3. Pilih "Install app"
4. Confirm
→ App akan install otomatis!
```

---

## 🎨 CUSTOMIZATION (OPSIONAL)

Jika ingin customize:

**Ubah warna:**
- Edit `style.css` → `:root` section

**Ubah kategori:**
- Edit `app.js` → `categoryIcons` object

**Ubah lokasi default:**
- Edit `app.js` → `userLocation` variable

**Ubah teks:**
- Edit `index.html` → Any text

Semuanya documented dengan comments! 👍

---

## 🌍 DEPLOY KE PRODUCTION

Jika mau share ke publik:

**Option 1: Vercel (Easiest)**
```bash
npm i -g vercel
vercel
```

**Option 2: Netlify**
```bash
npm i -g netlify-cli
netlify deploy --prod
```

**Option 3: Manual hosting**
```
Upload semua files ke hosting (cPanel, Hostinger, etc)
Ensure HTTPS enabled
```

Semua options ada detailed guide di README.md! 📖

---

## 📞 BANTUAN

**Jika ada pertanyaan:**

1. Baca **README.md** (lengkap banget)
2. Baca **IMPORTANT.md** (jangan lupakan)
3. Check browser console: **F12**
4. Cek file **INDEX.md** untuk dokumentasi index

**Jika ada bug:**
- Document langkah untuk reproduce
- Check console untuk error messages
- Lihat IMPORTANT.md → Troubleshooting

---

## ✅ SUCCESS CHECKLIST

Anda berhasil setup jika:

- ✅ index.html opens di browser
- ✅ Map terlihat (Leaflet + OpenStreetMap)
- ✅ Blue dot muncul (GPS location)
- ✅ ⚙️ Settings button works
- ✅ 📢 Lapor Darurat button works
- ✅ Form submit works
- ✅ Marker muncul di map
- ✅ No red errors di console (F12)

**Jika semua ✅ → SELAMAT! 🎉**

Aplikasi Anda sudah ready!

---

## 📊 TECH USED (Untuk Info)

Aplikasi menggunakan:
- **HTML5 + CSS3 + JavaScript** - Frontend
- **Leaflet.js** - Map library
- **Supabase** - Database & Real-time
- **Cloudinary** - Image storage
- **Service Worker** - Offline support

Semua GRATIS dan Open Source! 🎉

---

## 🎯 NEXT STEPS

1. ✅ Setup Supabase (3 min)
2. ✅ Setup Cloudinary (3 min)
3. ✅ Configure App (2 min)
4. ✅ Test (2 min)
5. 🔄 Read IMPORTANT.md (10 min)
6. 🔄 Read README.md (30 min)
7. 🚀 Deploy (optional)
8. 📱 Install PWA (optional)

---

## 🙏 PESAN TERAKHIR

Info 24 Jam dibuat dengan ❤️ untuk membantu komunitas.

Dengan aplikasi ini, warga bisa saling berbagi informasi darurat real-time.

**Potential impacts:**
- 🚨 Rapid emergency response
- 🤝 Community awareness
- 💪 Mutual help
- 🛡️ Safety for all

Gunakan dengan bijak. Selamatkan nyawa. 💚

---

## 📚 DOKUMENTASI LENGKAP

Folder ini berisi:
- ✅ 22 files
- ✅ 2,500+ lines of code
- ✅ 1,500+ lines of documentation
- ✅ 100% production ready
- ✅ 100% free & open source

Semua yang Anda butuhkan ada di sini! 📦

---

**Status:** Ready for production ✅  
**Last Updated:** 2026-01-21  
**License:** MIT (Free to use & modify)

---

## 🚀 READY? LET'S GO!

```
Step 1: Buka QUICKSTART.md
Step 2: Follow langkah-langkahnya
Step 3: Test aplikasi
Step 4: Celebrate! 🎉
```

**Total time: 10 minutes!** ⚡

---

**Made with ❤️ by Emydn Group**

Terima kasih sudah menggunakan Info 24 Jam!

Happy reporting! 📍🚨
