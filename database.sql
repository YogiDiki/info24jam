-- Info 24 Jam - Database Schema for Supabase
-- Tabel reports dengan kolom pelapor

CREATE TABLE IF NOT EXISTS public.reports (
    id BIGSERIAL PRIMARY KEY,
    kategori TEXT NOT NULL CHECK (kategori IN ('banjir', 'kebakaran', 'kecelakaan', 'kriminal', 'macet', 'lainnya')),
    deskripsi TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    
    -- Reporter Information
    pelapor_nama TEXT NOT NULL,
    pelapor_kontak TEXT NOT NULL,
    
    -- Contributor Status: relawan or instansi (removed user biasa)
    kontributor_status TEXT DEFAULT 'relawan' CHECK (kontributor_status IN ('relawan', 'instansi')),
    
    foto_url TEXT,
    verified BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'resolved', 'rejected')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index untuk performance
CREATE INDEX IF NOT EXISTS idx_reports_kategori ON public.reports(kategori);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_location ON public.reports(latitude, longitude);

-- Enable Row Level Security (RLS)
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read reports
CREATE POLICY "Allow public read access" ON public.reports
    FOR SELECT
    USING (true);

-- Policy: Anyone can insert reports (untuk anonymous reporting)
CREATE POLICY "Allow public insert access" ON public.reports
    FOR INSERT
    WITH CHECK (true);

-- Policy: Only authenticated users can update/delete
CREATE POLICY "Allow authenticated update" ON public.reports
    FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete" ON public.reports
    FOR DELETE
    USING (auth.role() = 'authenticated');

-- Function untuk auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger untuk auto-update
DROP TRIGGER IF EXISTS update_reports_updated_at ON public.reports;
CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON public.reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Sample data (optional)
INSERT INTO public.reports (kategori, deskripsi, latitude, longitude, pelapor_nama, pelapor_kontak, kontributor_status, verified, status) VALUES
('banjir', 'Banjir Besar - Banjir setinggi 1 meter di kawasan perumahan', -6.2088, 106.8456, 'Budi Santoso', '081234567890', 'relawan', true, 'verified'),
('kebakaran', 'Kebakaran Ruko - Kebakaran di ruko 3 lantai, warga diminta mengungsi', -6.1944, 106.8229, 'Siti Nurhaliza', '081234567891', 'instansi', true, 'verified'),
('kecelakaan', 'Kecelakaan Beruntun - Kecelakaan beruntun 5 mobil di tol', -6.2297, 106.8408, 'Ahmad Rifai', '081234567892', 'relawan', false, 'pending'),
('macet', 'Kemacetan Parah - Macet total di Jl. Sudirman akibat demo', -6.2088, 106.8200, 'Dedi Cahyadi', '081234567893', 'relawan', true, 'verified'),
('lainnya', 'Tiang Listrik Tumbang - Menimpa 2 kendaraan', -6.1850, 106.8350, 'Rina Susanti', '081234567894', 'instansi', false, 'pending');

-- Comments
COMMENT ON TABLE public.reports IS 'Tabel untuk menyimpan laporan warga';
COMMENT ON COLUMN public.reports.pelapor_nama IS 'Nama lengkap pelapor untuk mencegah laporan hoax';
COMMENT ON COLUMN public.reports.pelapor_kontak IS 'Nomor HP/WA pelapor untuk verifikasi';
COMMENT ON COLUMN public.reports.kontributor_status IS 'Status kontributor: relawan atau instansi';
COMMENT ON COLUMN public.reports.verified IS 'Status verifikasi laporan oleh admin';
COMMENT ON COLUMN public.reports.status IS 'Status penanganan laporan: pending, verified, resolved, rejected';