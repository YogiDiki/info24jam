-- ==========================================
-- Info 24 Jam - Database Schema
-- Supabase PostgreSQL
-- ==========================================

-- 1. Create reports table
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    kategori VARCHAR(50) NOT NULL,
    deskripsi TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    foto_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Anyone can read reports
CREATE POLICY "Anyone can view reports" 
ON public.reports 
FOR SELECT 
USING (true);

-- 4. Policy: Anyone can create reports
CREATE POLICY "Anyone can create reports" 
ON public.reports 
FOR INSERT 
WITH CHECK (true);

-- 5. Policy: Anyone can delete reports (untuk sekarang, nanti kita batasi untuk admin)
-- Ini akan kita update setelah setup admin
CREATE POLICY "Anyone can delete reports" 
ON public.reports 
FOR DELETE 
USING (true);

-- 6. Create index for faster queries
CREATE INDEX idx_reports_created_at ON public.reports (created_at DESC);
CREATE INDEX idx_reports_kategori ON public.reports (kategori);

-- 7. Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;

-- ==========================================
-- AUTO-DELETE FUNCTION (Hapus laporan > 7 hari)
-- ==========================================

-- Function to delete old reports
CREATE OR REPLACE FUNCTION delete_old_reports()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.reports
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  RAISE NOTICE 'Deleted reports older than 7 days';
END;
$$;

-- Create a cron job to run daily at midnight (requires pg_cron extension)
-- Note: pg_cron mungkin tidak tersedia di Supabase Free Tier
-- Alternatif: gunakan Supabase Edge Functions atau external cron

-- ==========================================
-- ADMIN TABLE (untuk kontrol hapus manual)
-- ==========================================

-- Create admins table
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, -- Gunakan bcrypt hash
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for admins
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated users can read admins
CREATE POLICY "Only authenticated can view admins" 
ON public.admins 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Insert default admin (password: admin123)
-- PENTING: Ganti password ini setelah deployment!
INSERT INTO public.admins (email, password_hash) 
VALUES ('admin@info24jam.com', '$2a$10$rKzVGPZQcWvJXVjZXVjZXe7Z7Z7Z7Z7Z7Z7Z7Z7Z7Z7Z7Z7Z7Z7');

-- ==========================================
-- ALTERNATIVE: Auto-delete via Edge Function
-- ==========================================

-- Jika pg_cron tidak tersedia, buat Edge Function yang dipanggil oleh cron job eksternal
-- File: supabase/functions/cleanup-old-reports/index.ts

/*
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { error } = await supabaseClient
    .from('reports')
    .delete()
    .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ success: true, message: 'Old reports deleted' }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
*/

-- Kemudian setup cron job di cron-job.org atau GitHub Actions untuk memanggil edge function setiap hari

-- ==========================================
-- NOTES FOR PRODUCTION
-- ==========================================

-- 1. Ganti password admin di tabel admins
-- 2. Setup cron job untuk auto-delete (gunakan cron-job.org jika pg_cron tidak ada)
-- 3. Update RLS policy untuk delete - hanya admin yang bisa hapus
-- 4. Backup database secara berkala
-- 5. Monitor storage Cloudinary agar tidak penuh