-- ==========================================
-- Info 24 Jam Database Schema
-- Supabase PostgreSQL Migration
-- ==========================================

-- ==========================================
-- 1. Create reports table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Report Details
  kategori TEXT NOT NULL CHECK (kategori IN ('banjir', 'kebakaran', 'kecelakaan', 'kriminal', 'macet', 'lainnya')),
  deskripsi TEXT NOT NULL,
  
  -- Location
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  
  -- Media
  foto_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Metadata
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'archived')),
  views_count INTEGER DEFAULT 0
);

-- ==========================================
-- 2. Create indexes for performance
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_reports_kategori ON public.reports(kategori);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_location ON public.reports USING GIST (
  ll_to_earth(latitude, longitude)
);

-- ==========================================
-- 3. Create RLS Policies (Optional, for security)
-- ==========================================

-- Enable Row Level Security
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Everyone can view reports
CREATE POLICY "Allow public select" ON public.reports
  FOR SELECT USING (true);

-- Anyone can insert reports (crowdsourcing)
CREATE POLICY "Allow public insert" ON public.reports
  FOR INSERT WITH CHECK (true);

-- Allow users to update their own reports (within 24 hours)
CREATE POLICY "Allow update recent reports" ON public.reports
  FOR UPDATE 
  USING (created_at > NOW() - INTERVAL '24 hours')
  WITH CHECK (created_at > NOW() - INTERVAL '24 hours');

-- Allow delete recent reports
CREATE POLICY "Allow delete recent reports" ON public.reports
  FOR DELETE
  USING (created_at > NOW() - INTERVAL '24 hours');

-- ==========================================
-- 4. Enable Realtime
-- ==========================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;

-- ==========================================
-- 5. Create function for auto-update timestamp
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger
DROP TRIGGER IF EXISTS trigger_update_updated_at ON public.reports;
CREATE TRIGGER trigger_update_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 6. Create view for recent reports (last 7 days)
-- ==========================================
CREATE OR REPLACE VIEW public.recent_reports AS
SELECT * FROM public.reports
WHERE created_at > NOW() - INTERVAL '7 days'
  AND status = 'active'
ORDER BY created_at DESC;

-- ==========================================
-- 7. Create function for distance search
-- ==========================================
CREATE OR REPLACE FUNCTION search_reports_by_distance(
  user_lat DECIMAL,
  user_lng DECIMAL,
  distance_km FLOAT DEFAULT 5
)
RETURNS TABLE(
  id UUID,
  kategori TEXT,
  deskripsi TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  foto_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  distance_m FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.kategori,
    r.deskripsi,
    r.latitude,
    r.longitude,
    r.foto_url,
    r.created_at,
    earth_distance(ll_to_earth(user_lat, user_lng), ll_to_earth(r.latitude, r.longitude))::FLOAT as distance_m
  FROM public.reports r
  WHERE earth_distance(ll_to_earth(user_lat, user_lng), ll_to_earth(r.latitude, r.longitude)) < (distance_km * 1000)
    AND r.status = 'active'
  ORDER BY distance_m ASC;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 8. Sample data (optional, for testing)
-- ==========================================
INSERT INTO public.reports (kategori, deskripsi, latitude, longitude, foto_url, status)
VALUES 
  ('banjir', 'Banjir di Jl. Sudirman, ketinggian air mencapai 1.5 meter', -6.2088, 106.8456, NULL, 'active'),
  ('kebakaran', 'Kebakaran di gedung apartemen, 10 mobil pemadam sudah didatangkan', -6.2100, 106.8500, NULL, 'active'),
  ('kecelakaan', 'Tabrakan 3 kendaraan di Tol dalam kota, lalu lintas macet', -6.2000, 106.8400, NULL, 'active')
ON CONFLICT DO NOTHING;

-- ==========================================
-- 9. Stats and monitoring queries
-- ==========================================

-- Get reports count by category
-- SELECT kategori, COUNT(*) as count FROM public.reports GROUP BY kategori;

-- Get reports from last 24 hours
-- SELECT * FROM public.reports WHERE created_at > NOW() - INTERVAL '1 day' ORDER BY created_at DESC;

-- Get reports with photos only
-- SELECT * FROM public.reports WHERE foto_url IS NOT NULL ORDER BY created_at DESC;

-- ==========================================
-- Notes:
-- 
-- 1. RLS Policies: Uncomment if you want to restrict access. 
--    Currently allows public read/write (crowdsourcing model).
-- 
-- 2. Realtime: Make sure to enable Realtime in Supabase dashboard
--    after running this migration: Database → Replication
-- 
-- 3. Functions: earth_distance() requires pgvector/earthdistance extension
--    Make sure it's enabled in your Supabase project.
-- 
-- 4. Status field: Track if report is active/resolved/archived
-- 
-- 5. Views count: Track popularity of reports (optional)
-- ==========================================
