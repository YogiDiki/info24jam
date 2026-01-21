# 🤝 Contributing to Info 24 Jam

Terima kasih atas minat Anda untuk berkontribusi! Panduan ini membantu Anda memulai.

---

## 🎯 Ways to Contribute

### 1. 🐛 Report Bugs
Jika menemukan bug, buka issue dengan detail:
- Apa yang terjadi?
- Apa yang diharapkan?
- Steps untuk reproduce
- Browser & OS Anda

### 2. ✨ Suggest Features
Ide fitur baru? Buat issue dengan:
- Deskripsi fitur
- Use case
- Contoh implementasi (opsional)

### 3. 📝 Improve Documentation
Fix typos, tambahkan clarification, atau terjemahan baru!

### 4. 💻 Submit Code
Perbaikan bug atau fitur baru? Submit pull request!

---

## 🔧 Development Setup

### Clone Repository
```bash
git clone https://github.com/yourusername/info24jam.git
cd info24jam
```

### Setup Supabase & Cloudinary
Ikuti langkah di QUICKSTART.md

### Run Locally
```bash
# Option 1: Python
python -m http.server 8000

# Option 2: Node
npx http-server -c-1 --https

# Option 3: Live Server di VSCode
```

---

## 📋 Code Style Guidelines

### JavaScript
```javascript
// Use ES6+ syntax
const name = 'Info 24 Jam';

// Use descriptive names
function submitReportToSupabase() { }

// Add comments untuk logic kompleks
// Calculate distance using Haversine formula
const distance = calculateDistance(lat1, lng1, lat2, lng2);

// Use async/await
async function fetchReports() {
    const data = await supabase.from('reports').select('*');
}
```

### CSS
```css
/* Use Tailwind first, custom CSS saat perlu */
/* Group related properties */
.marker {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
```

### HTML
```html
<!-- Use semantic HTML -->
<section id="map"></section>
<button aria-label="Submit report">Submit</button>

<!-- Use data attributes untuk JS -->
<button data-report-id="123" class="report-detail-btn">View</button>
```

---

## 🧪 Testing Checklist

Sebelum submit PR, test:

- [ ] Map loads correctly
- [ ] Geolocation works
- [ ] Form submission works
- [ ] Real-time updates work
- [ ] Image upload works
- [ ] PWA installation works
- [ ] Offline support works
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Cross-browser compatible (Chrome, Firefox, Safari)

---

## 📝 Commit Messages

```
Good:
✨ Add marker clustering for better performance
🐛 Fix geolocation timeout issue
📝 Update documentation
🎨 Improve button styling

Avoid:
"fix stuff"
"changes"
"asdf"
```

---

## 🔄 Pull Request Process

1. **Fork repository**
2. **Create feature branch**: `git checkout -b feature/your-feature`
3. **Make changes**
4. **Test thoroughly**
5. **Commit dengan pesan jelas**: `git commit -m "✨ Add feature"`
6. **Push**: `git push origin feature/your-feature`
7. **Open Pull Request** dengan:
   - Deskripsi changes
   - Screenshots (jika ada UI changes)
   - Testing checklist
   - References ke issues (jika ada)

---

## 📦 Features Ideas

- [ ] Marker clustering (banyak markers)
- [ ] Search & filter reports
- [ ] User authentication
- [ ] User profiles & avatars
- [ ] Report upvoting/downvoting
- [ ] Report status tracking (active/resolved/archived)
- [ ] Export reports as CSV
- [ ] Dark mode
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Email notifications
- [ ] Push notifications
- [ ] Share reports ke social media
- [ ] Community moderation system

---

## 🔒 Security Considerations

Jika fix security issue:
1. **Don't open public issue** - Email maintainer instead
2. **Explain vulnerability** dengan detail
3. **Propose fix**
4. Maintainer akan create private security advisory

---

## 📜 License

Dengan berkontribusi, Anda agree bahwa contributions akan dilicense di bawah MIT License.

---

## 🙋 Questions?

- Email: contact@emydngroup.com
- Create discussion di GitHub
- Join komunitas kami

---

**Thank you untuk berkontribusi! 🎉**

Setiap kontribusi membantu membuat Info 24 Jam lebih baik untuk semua orang.
