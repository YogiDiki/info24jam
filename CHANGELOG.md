# Changelog - Info 24 Jam

All notable changes akan didokumentasikan di file ini.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.0] - 2026-01-21

### ✨ Added (Features Baru)
- **Mobile-first UI** dengan Tailwind CSS
- **Real-time Map** dengan Leaflet.js & OpenStreetMap
- **Auto Geolocation** - Peta otomatis ke lokasi user
- **Form Lapor Intuitif** dengan kategori, deskripsi, upload foto
- **Real-time Updates** menggunakan Supabase Realtime
- **Custom Marker Colors** untuk setiap kategori:
  - 🌊 Banjir (Biru #3B82F6)
  - 🔥 Kebakaran (Merah #EF4444)
  - 🚗 Kecelakaan (Kuning #FBBF24)
  - ⚠️ Kriminal (Ungu #8B5CF6)
  - 🚦 Macet (Oranye #F59E0B)
  - ❓ Lainnya (Abu-abu #6B7280)
- **PWA Support** - Bisa di-install di HP (iOS & Android)
- **Service Worker** untuk offline support
- **Image Upload** integrasi Cloudinary dengan unsigned preset
- **Floating Action Button** untuk quick reporting
- **Settings Modal** untuk konfigurasi Supabase & Cloudinary
- **Report Detail Modal** untuk melihat informasi laporan
- **Marker Popup** dengan info singkat laporan
- **Delete Report** functionality
- **Loading Indicator** saat submit laporan
- **Responsive Design** untuk mobile & desktop

### 🛠️ Technical
- HTML5 semantic structure
- CSS3 dengan Tailwind CDN
- Vanilla JavaScript (No framework)
- Leaflet.js v1.9.4
- Supabase JS client v2.38.0
- Cloudinary widget untuk image upload
- Service Worker dengan caching strategy

### 📚 Documentation
- `README.md` - Full documentation
- `QUICKSTART.md` - 10-minute setup guide
- `SETUP.html` - Visual setup guide
- `CHECKLIST.md` - Implementation checklist
- `database.sql` - Supabase schema & migrations
- `.env.example` - Configuration template
- `CONTRIBUTING.md` - Contribution guidelines
- `LICENSE` - MIT License

### 🔐 Security
- Unsigned Cloudinary upload (no API secret in frontend)
- Anon key only untuk Supabase (no service role key)
- HTTPS required untuk PWA & Geolocation
- Row-level security policies (optional)
- No credentials in version control

---

## [Planned] - Future Versions

### v1.1.0 (Next Release)
- [ ] Marker clustering untuk performance
- [ ] Advanced search & filter
- [ ] Report status tracking (active/resolved)
- [ ] User authentication
- [ ] User profiles & avatars
- [ ] Dark mode support
- [ ] Multi-language (i18n)
- [ ] Analytics dashboard

### v1.2.0
- [ ] Report upvoting/downvoting
- [ ] Community moderation
- [ ] Export reports as CSV/PDF
- [ ] Email notifications
- [ ] Push notifications (Web Push API)
- [ ] Report sharing ke social media
- [ ] Advanced analytics

### v2.0.0
- [ ] Mobile app (React Native / Flutter)
- [ ] Admin dashboard
- [ ] API REST untuk integrations
- [ ] Machine learning untuk spam detection
- [ ] Video upload support
- [ ] Live chat support
- [ ] Premium features

---

## 📝 Release Notes

### Known Issues (v1.0.0)
- GPS accuracy tergantung device & lokasi
- Realtime delays saat traffic tinggi
- Storage limit Cloudinary 25GB/bulan (free tier)
- Supabase free tier: 50MB database

### Workarounds
- Compress images di Cloudinary (quality 60-70)
- Implement pagination untuk banyak markers
- Use clustering library untuk performance
- Archive old reports untuk hemat storage

---

## 🔄 Version History

### [1.0.0] - 2026-01-21
Initial release dengan semua core features

---

## 🎯 How to Report Issues

1. Check existing issues di GitHub
2. Provide detailed information:
   - Browser & OS
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots (jika applicable)

---

## 💡 How to Request Features

1. Open issue dengan tag `enhancement`
2. Describe use case
3. Explain why needed
4. Provide examples (opsional)

---

## 🙏 Contributors

Thanks kepada semua yang berkontribusi!

- Emydn Group - Founder
- Contributors - [List contributors di sini]

---

## 📖 Semantic Versioning

Kami mengikuti [Semantic Versioning](https://semver.org/):
- `MAJOR.MINOR.PATCH`
- MAJOR: Incompatible API changes
- MINOR: Backward-compatible new features
- PATCH: Bug fixes

---

**Last Updated:** 2026-01-21

Untuk update terbaru, check GitHub releases atau subscribe ke notifications.
